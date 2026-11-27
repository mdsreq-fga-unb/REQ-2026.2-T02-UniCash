import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb, getDbDoDono } from '@/db/database';
import { notificationPermission } from '@/features/notificacoes/permissao';
import { notificationPreferences, UID_LOCAL } from '@/features/notificacoes/preferencias';
import type {
  DonoPreferencias,
  NotificationPermission,
  NotificationPreferences,
} from '@/features/notificacoes/types';
import { MARCOS } from './config';
import { consultarConquistas } from './consulta';
import { emissorExpo } from './emissor';
import { registrarDesbloqueio } from './historico';
import { MSG } from './mensagens';
import { obterFonteMetas } from './metas';
import type { EmissorNotificacao, FonteMetas, Selo } from './types';

type Status = 'emitida' | 'pendente';

export interface DependenciasEmissao {
  fonte?: FonteMetas;
  preferencias?: NotificationPreferences;
  permissao?: NotificationPermission;
  emissor?: EmissorNotificacao;
  /** Base do dono capturado no início da avaliação (RNF03). */
  abrirBase?: (dono: DonoPreferencias) => Promise<SQLiteDatabase>;
}

/** Mesma regra das preferências do UC14: com conta, a base daquele dono; sem conta, a base local em uso. */
const abrirBasePadrao = (dono: DonoPreferencias) => (dono.uid === UID_LOCAL ? getDb() : getDbDoDono(dono.uid));

/** A sessão mudou no meio da avaliação: nada mais é gravado nem notificado para o dono antigo. */
class DonoMudou extends Error {}
class FalhaAgendamento extends Error {}

// Se o Expo confirmou e o commit falhou, a próxima avaliação só confirma o SQLite.
const avisosConfirmados = new WeakMap<SQLiteDatabase, Set<string>>();

const CHAVE_LINHA_BASE = 'conquistas_linha_base';

const gravar = (db: SQLiteDatabase, chave: string, status: Status) => {
  const agora = new Date().toISOString();
  return db.runAsync(
    `INSERT INTO conquistas_emitidas (chave, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?)
     ON CONFLICT (chave) DO UPDATE SET status = excluded.status, atualizado_em = excluded.atualizado_em`,
    [chave, status, agora, agora],
  );
};

function conteudo(selo: Selo) {
  const ref = selo.referencia.tipo === 'mes' ? selo.referencia.mes : selo.referencia.titulo;
  return {
    titulo: MSG.tituloNotificacao(selo.nome),
    corpo: MARCOS[selo.marco].fraseNotificacao(ref),
    rota: '/conquistas' as const,
  };
}

async function executar(deps: DependenciasEmissao): Promise<void> {
  const {
    fonte = obterFonteMetas(),
    preferencias = notificationPreferences,
    permissao = notificationPermission,
    emissor = emissorExpo,
    abrirBase = abrirBasePadrao,
  } = deps;

  // RNF03: o dono é capturado uma vez; leituras, gravações e a preferência usam sempre esse dono.
  const dono = preferencias.donoAtual();
  const conferirDono = () => {
    if (preferencias.donoAtual().uid !== dono.uid) throw new DonoMudou();
  };
  const db = await abrirBase(dono);
  conferirDono();
  const { selos } = await consultarConquistas(fonte, db);
  const linhaBase = await db.getFirstAsync<{ valor: number }>(
    'SELECT valor FROM preferencias_locais WHERE chave = ?',
    [CHAVE_LINHA_BASE],
  );

  // FR-009a: na primeira avaliação, o histórico vira linha de base, sem notificação. Tudo ou nada (EX01).
  if (!linhaBase) {
    conferirDono();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const s of selos) {
        conferirDono();
        await registrarDesbloqueio(tx, s);
        await tx.runAsync(
          "INSERT OR IGNORE INTO conquistas_emitidas (chave, status, criado_em, atualizado_em) VALUES (?, 'emitida', ?, ?)",
          [s.chave, new Date().toISOString(), new Date().toISOString()],
        );
      }
      conferirDono();
      await tx.runAsync('INSERT OR REPLACE INTO preferencias_locais (chave, valor) VALUES (?, 1)', [CHAVE_LINHA_BASE]);
    });
    return;
  }

  const registros = new Map(
    (await db.getAllAsync<{ chave: string; status: Status }>('SELECT chave, status FROM conquistas_emitidas')).map(
      (r) => [r.chave, r.status],
    ),
  );
  for (const selo of selos) {
    conferirDono();
    await registrarDesbloqueio(db, selo);
  }

  // Selo que some e volta mantém a linha 'emitida' e não é notificado de novo (FR-007a).
  const aEmitir = selos.filter((s) => registros.get(s.chave) !== 'emitida');
  if (aEmitir.length === 0) return;

  // FA04: com o alerta desligado, só a notificação some; o aviso não fica guardado para depois.
  if (!(await preferencias.isEnabled('conquistas', dono))) {
    for (const s of aEmitir) {
      conferirDono();
      await gravar(db, s.chave, 'emitida');
    }
    return;
  }

  if ((await permissao.consultar()) !== 'concedida') {
    for (const s of aEmitir.filter((selo) => !registros.has(selo.chave))) {
      conferirDono();
      await gravar(db, s.chave, 'pendente');
    }
    return;
  }

  const confirmados = avisosConfirmados.get(db) ?? new Set<string>();
  avisosConfirmados.set(db, confirmados);
  for (const s of aEmitir) {
    conferirDono();
    if (!registros.has(s.chave)) {
      await db.runAsync(
        "INSERT OR IGNORE INTO conquistas_emitidas (chave, status, criado_em, atualizado_em) VALUES (?, 'pendente', ?, ?)",
        [s.chave, new Date().toISOString(), new Date().toISOString()],
      );
    }

    // A troca de dono ou a rejeição do Expo reverte a própria transação. A
    // tentativa continua pendente mesmo se o SQLite não aceitar novas escritas.
    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        conferirDono();
        const registro = await tx.getFirstAsync<{ status: Status }>(
          'SELECT status FROM conquistas_emitidas WHERE chave = ?', [s.chave],
        );
        if (registro?.status === 'emitida') return;
        conferirDono();
        await gravar(tx, s.chave, 'emitida');
        if (confirmados.has(s.chave)) return;

        const aviso = conteudo(s);
        conferirDono();
        try {
          await emissor.emitir(aviso);
          confirmados.add(s.chave);
        } catch (causa) {
          throw new FalhaAgendamento('Falha ao agendar a notificação de conquista', { cause: causa });
        }
      });
    } catch (e) {
      if (e instanceof FalhaAgendamento) continue;
      throw e;
    }
    confirmados.delete(s.chave);
  }
}

let emAndamento: Promise<void> | null = null;
let repetir = false;

/**
 * UC13 fluxo A, passo 3 (RF46). Uma execução por vez: chamadas durante uma execução agendam
 * uma única repetição, para não perder dados novos nem notificar em dobro (SC-002).
 * Nunca lança: a avaliação é refeita na próxima chamada (EX01).
 */
export function avaliarEEmitir(deps: DependenciasEmissao = {}): Promise<void> {
  if (emAndamento) {
    repetir = true;
    return emAndamento;
  }
  emAndamento = (async () => {
    try {
      do {
        repetir = false;
        try {
          await executar(deps);
        } catch (e) {
          // Troca de conta no meio: a avaliação do novo dono vem do aviso de base atualizada.
          if (!(e instanceof DonoMudou)) {
            console.warn('[UC13] avaliação de conquistas falhou; nova tentativa na próxima operação', e);
          }
        }
      } while (repetir);
    } finally {
      emAndamento = null;
    }
  })();
  return emAndamento;
}
