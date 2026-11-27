import { getDb, getDbDoDono } from '@/db/database';
import { obterSessao } from '@/features/conta/sessao';
import type { SessionState } from '@/features/conta/types';
import { ESTADO_INICIAL } from './padroes';
import type { DonoPreferencias, NotificationPreferences, TipoAlerta } from './types';

interface BaseMinima {
  getAllAsync<T>(sql: string, params: unknown[]): Promise<T[]>;
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

export const UID_LOCAL = 'local';

/** Com conta, abre a base daquele dono; sem conta, a base local em uso. */
function abrirBasePadrao(dono: DonoPreferencias): Promise<BaseMinima> {
  return (dono.uid === UID_LOCAL ? getDb() : getDbDoDono(dono.uid)) as unknown as Promise<BaseMinima>;
}

/** UC14: preferências por dono (RNF03). Com conta, cada gravação fica pendente de sincronização (FA05). */
export function criarPreferencias(
  abrirBase: (dono: DonoPreferencias) => Promise<BaseMinima> = abrirBasePadrao,
  sessaoAtual: () => SessionState = obterSessao,
): NotificationPreferences {
  function donoAtual(): DonoPreferencias {
    const sessao = sessaoAtual();
    return { uid: sessao.status === 'ativa' ? sessao.uid : UID_LOCAL };
  }

  async function listar(dono: DonoPreferencias = donoAtual()): Promise<Record<TipoAlerta, boolean>> {
    const base = await abrirBase(dono);
    const linhas = await base.getAllAsync<{ tipo: TipoAlerta; ativo: number }>(
      'SELECT tipo, ativo FROM preferencias_notificacao WHERE uid = ?',
      [dono.uid],
    );
    const valores = { ...ESTADO_INICIAL };
    for (const { tipo, ativo } of linhas) if (tipo in valores) valores[tipo] = ativo === 1;
    return valores;
  }

  return {
    donoAtual,
    listar,
    async isEnabled(tipo, dono) {
      try {
        return (await listar(dono))[tipo];
      } catch {
        return false;
      }
    },
    async definir(tipo, ativo, dono = donoAtual()) {
      // O dono é resolvido antes de abrir a base: uma troca de sessão durante a abertura não muda o destino.
      const base = await abrirBase(dono);
      const estadoSync = dono.uid === UID_LOCAL ? 'local' : 'pendente';
      await base.runAsync(
        `INSERT INTO preferencias_notificacao (uid, tipo, ativo, atualizado_em, estado_sync) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (uid, tipo) DO UPDATE SET ativo = excluded.ativo, atualizado_em = excluded.atualizado_em,
           estado_sync = excluded.estado_sync`,
        [dono.uid, tipo, ativo ? 1 : 0, new Date().toISOString(), estadoSync],
      );
    },
  };
}

export const notificationPreferences = criarPreferencias();
