import { getDb } from '@/db/database';
import { obterSessao } from '@/features/conta/sessao';
import type { SessionState } from '@/features/conta/types';
import { ESTADO_INICIAL } from './padroes';
import type { NotificationPreferences, TipoAlerta } from './types';

interface BaseMinima {
  getAllAsync<T>(sql: string, params: unknown[]): Promise<T[]>;
  runAsync(sql: string, params: unknown[]): Promise<unknown>;
}

const UID_LOCAL = 'local';

/** UC14: preferências por dono (RNF03). Com conta, cada gravação fica pendente de sincronização (FA05). */
export function criarPreferencias(
  obterBase: () => Promise<BaseMinima> = getDb as unknown as () => Promise<BaseMinima>,
  sessaoAtual: () => SessionState = obterSessao,
): NotificationPreferences {
  const dono = () => {
    const sessao = sessaoAtual();
    return sessao.status === 'ativa' ? { uid: sessao.uid, estadoSync: 'pendente' } : { uid: UID_LOCAL, estadoSync: 'local' };
  };

  async function listar(): Promise<Record<TipoAlerta, boolean>> {
    const base = await obterBase();
    const linhas = await base.getAllAsync<{ tipo: TipoAlerta; ativo: number }>(
      'SELECT tipo, ativo FROM preferencias_notificacao WHERE uid = ?',
      [dono().uid],
    );
    const valores = { ...ESTADO_INICIAL };
    for (const { tipo, ativo } of linhas) if (tipo in valores) valores[tipo] = ativo === 1;
    return valores;
  }

  return {
    listar,
    async isEnabled(tipo) {
      try {
        return (await listar())[tipo];
      } catch {
        return false;
      }
    },
    async definir(tipo, ativo) {
      const base = await obterBase();
      const { uid, estadoSync } = dono();
      await base.runAsync(
        `INSERT INTO preferencias_notificacao (uid, tipo, ativo, atualizado_em, estado_sync) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (uid, tipo) DO UPDATE SET ativo = excluded.ativo, atualizado_em = excluded.atualizado_em,
           estado_sync = excluded.estado_sync`,
        [uid, tipo, ativo ? 1 : 0, new Date().toISOString(), estadoSync],
      );
    },
  };
}

export const notificationPreferences = criarPreferencias();
