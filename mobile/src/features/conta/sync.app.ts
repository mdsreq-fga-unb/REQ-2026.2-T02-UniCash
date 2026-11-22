import { getDb } from '@/db/database';
import { restaurarDaNuvem, sincronizarEmSegundoPlano, sincronizarPendentes } from '@/features/receitas/sync';
import type { SincronizacaoPort } from './sync';
import { ErroConta } from './types';

/**
 * Adaptador do UC10 sobre a sincronização que já existe (features/receitas/sync.ts), que cobre
 * receitas, despesas e recorrências em usuarios/{uid}/... com o estado `sync_status`
 * ('pendente' | 'sincronizado'). As categorias ainda não sincronizam e ficam de fora.
 */
const TABELAS = ['receitas', 'despesas', 'recorrencias'] as const;

async function contarPendentes(): Promise<number> {
  const banco = await getDb();
  let total = 0;
  for (const tabela of TABELAS) {
    const r = await banco.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${tabela} WHERE sync_status = 'pendente'`,
    );
    total += r?.n ?? 0;
  }
  return total;
}

async function estaVazio(): Promise<boolean> {
  const banco = await getDb();
  for (const tabela of TABELAS) {
    const r = await banco.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabela}`);
    if ((r?.n ?? 0) > 0) return false;
  }
  return true;
}

export function criarSincronizacaoDoApp(): SincronizacaoPort {
  return {
    /** E6: os registros que já estavam no aparelho passam a pendentes e sobem no próximo envio. */
    async marcarTodosComoPendentes() {
      const banco = await getDb();
      await banco.withTransactionAsync(async () => {
        for (const tabela of TABELAS) {
          await banco.runAsync(`UPDATE ${tabela} SET sync_status = 'pendente'`);
        }
      });
    },

    contarPendentes,

    /**
     * O sincronizarPendentes() da develop não lança em falha de rede: ele mantém as pendências.
     * Por isso o sucesso é conferido pelas pendências que sobraram (EX08, FA03).
     * Não consome consumirAcessoNegado(): esse aviso pertence à tela de receitas (UC01 EX07).
     */
    async sincronizar() {
      try {
        await sincronizarPendentes();
      } catch {
        throw new ErroConta('falha');
      }
      if ((await contarPendentes()) > 0) throw new ErroConta('sem-conexao');
    },

    /** B4: retoma o envio das alterações pendentes. A sincronização só roda com conta (auth.currentUser). */
    async retomar() {
      sincronizarEmSegundoPlano();
    },

    /** D2: sem conta, sincronizarPendentes() já não faz nada; os dados locais permanecem (RN06). */
    async suspender() {},

    /** FA02 / RNF40: aparelho novo ou reinstalado (sem receitas, despesas nem recorrências). */
    async restaurarSeAparelhoVazio() {
      if (!(await estaVazio())) return;
      try {
        await restaurarDaNuvem();
      } catch {
        throw new ErroConta('falha');
      }
    },
  };
}
