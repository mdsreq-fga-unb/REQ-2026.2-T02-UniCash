import { getDb } from '@/db/database';
import { notificationPermission } from '@/features/notificacoes/permissao';
import { notificationPreferences } from '@/features/notificacoes/preferencias';
import type { NotificationPermission, NotificationPreferences } from '@/features/notificacoes/types';
import { MARCOS } from './config';
import { consultarConquistas } from './consulta';
import { emissorExpo } from './emissor';
import { MSG } from './mensagens';
import { obterFonteMetas } from './metas';
import type { EmissorNotificacao, FonteMetas, Selo } from './types';

type Status = 'emitida' | 'pendente';

export interface DependenciasEmissao {
  fonte?: FonteMetas;
  preferencias?: NotificationPreferences;
  permissao?: NotificationPermission;
  emissor?: EmissorNotificacao;
}

const CHAVE_LINHA_BASE = 'conquistas_linha_base';

const gravar = (db: Awaited<ReturnType<typeof getDb>>, chave: string, status: Status) => {
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
  } = deps;

  const db = await getDb();
  const { selos } = await consultarConquistas(fonte);
  const linhaBase = await db.getFirstAsync<{ valor: number }>(
    'SELECT valor FROM preferencias_locais WHERE chave = ?',
    [CHAVE_LINHA_BASE],
  );

  // FR-009a: na primeira avaliação, o histórico vira linha de base, sem notificação. Tudo ou nada (EX01).
  if (!linhaBase) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const s of selos) await gravar(tx, s.chave, 'emitida');
      await tx.runAsync('INSERT OR REPLACE INTO preferencias_locais (chave, valor) VALUES (?, 1)', [CHAVE_LINHA_BASE]);
    });
    return;
  }

  const registros = new Map(
    (await db.getAllAsync<{ chave: string; status: Status }>('SELECT chave, status FROM conquistas_emitidas')).map(
      (r) => [r.chave, r.status],
    ),
  );
  // Selo que some e volta mantém a linha 'emitida' e não é notificado de novo (FR-007a).
  const aEmitir = selos.filter((s) => registros.get(s.chave) !== 'emitida');
  if (aEmitir.length === 0) return;

  // FA04: com o alerta desligado, só a notificação some; o aviso não fica guardado para depois.
  if (!(await preferencias.isEnabled('conquistas'))) {
    for (const s of aEmitir) await gravar(db, s.chave, 'emitida');
    return;
  }

  if ((await permissao.consultar()) !== 'concedida') {
    for (const s of aEmitir) if (!registros.has(s.chave)) await gravar(db, s.chave, 'pendente');
    return;
  }

  // FA05: uma notificação por selo. EX02: falha não marca a emissão.
  for (const s of aEmitir) {
    try {
      await emissor.emitir(conteudo(s));
      await gravar(db, s.chave, 'emitida');
    } catch {
      await gravar(db, s.chave, 'pendente');
    }
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
          console.warn('[UC13] avaliação de conquistas falhou; nova tentativa na próxima operação', e);
        }
      } while (repetir);
    } finally {
      emAndamento = null;
    }
  })();
  return emAndamento;
}
