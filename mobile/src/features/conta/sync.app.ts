import { getDb } from '@/db/database';
import {
  definirEnvioAutomatico,
  restaurarDaNuvem,
  sincronizarEmSegundoPlano,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import type { SincronizacaoPort } from './sync';
import { ErroConta } from './types';

/**
 * Adaptador do UC10 sobre a sincronização que já existe (features/receitas/sync.ts), que cobre
 * receitas, despesas e recorrências em usuarios/{uid}/... com o estado `sync_status`
 * ('pendente' | 'sincronizado'). As categorias ainda não sincronizam e ficam de fora.
 */
const TABELAS = ['receitas', 'despesas', 'recorrencias'] as const;

/**
 * Só as tabelas que existem neste esquema: a base pode ainda não ter `despesas` (antes do merge com a
 * UC02). Consultar uma tabela inexistente lançaria "no such table" e derrubaria o envio, a contagem
 * de pendências e a restauração.
 */
async function tabelasSincronizaveis(): Promise<string[]> {
  const banco = await getDb();
  const linhas = await banco.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  const existentes = new Set(linhas.map((l) => l.name));
  return TABELAS.filter((t) => existentes.has(t));
}

async function contarPendentes(): Promise<number> {
  const banco = await getDb();
  let total = 0;
  for (const tabela of await tabelasSincronizaveis()) {
    const r = await banco.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${tabela} WHERE sync_status = 'pendente'`,
    );
    total += r?.n ?? 0;
  }
  return total;
}

async function estaVazio(): Promise<boolean> {
  const banco = await getDb();
  for (const tabela of await tabelasSincronizaveis()) {
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
      const tabelas = await tabelasSincronizaveis();
      await banco.withTransactionAsync(async () => {
        for (const tabela of tabelas) {
          await banco.runAsync(`UPDATE ${tabela} SET sync_status = 'pendente'`);
        }
      });
    },

    contarPendentes,

    /**
     * O sincronizarPendentes() da develop não lança em falha de rede: ele mantém as pendências.
     * Por isso o sucesso é conferido pelas pendências que sobraram (EX08, FA03).
     * Não consome consumirAcessoNegado(): esse aviso pertence à tela de receitas (UC01 EX07).
     * É um envio pedido pela pessoa: se o envio automático estava pausado (FA01), volta a ficar ligado.
     */
    async sincronizar() {
      try {
        await sincronizarPendentes({ manual: true });
      } catch {
        throw new ErroConta('falha');
      }
      if ((await contarPendentes()) > 0) throw new ErroConta('sem-conexao');
    },

    /** FA01: depois de um cadastro novo, nada sobe sozinho até a pessoa decidir sobre os dados do aparelho. */
    async pausarEnvioAutomatico() {
      await definirEnvioAutomatico(false);
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
