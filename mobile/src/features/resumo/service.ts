import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { primeiroDiaDoMes, proximoMes } from '@/features/receitas/dates';

/**
 * Cálculos do resumo financeiro (UC03, RF11, RF40).
 *
 * Tudo é calculado na hora a partir da base local (RN06, RN07): nada é persistido,
 * nada é lido da nuvem. Valores somados como inteiros em centavos (RNF07).
 */

/** Falha ao ler ou calcular os totais (UC03 EX01). */
export class FalhaCalculo extends Error {}

export const MSG_FALHA_CALCULO = 'Não foi possível calcular os totais. Tente novamente.';

export interface TotalDoDia {
  /** Data ISO (AAAA-MM-DD). */
  data: string;
  totalCentavos: number;
}

/** Progresso de uma meta no período (RF36/RF40). Metas ainda não existem na base (RF12). */
export interface ProgressoMeta {
  id: string;
  titulo: string;
  alvoCentavos: number;
  realizadoCentavos: number;
}

export interface ResumoMensal {
  ano: number;
  mes: number;
  totalReceitasCentavos: number;
  totalDespesasCentavos: number;
  /** Saldo do mês = receitas − despesas (RN15). O saldo anterior (RF35) fica no UC04. */
  saldoCentavos: number;
  /** Só os dias do mês que têm ao menos uma receita, em ordem crescente (RF11). */
  receitasPorDia: TotalDoDia[];
  metas: ProgressoMeta[];
  /** Nenhuma receita nem despesa em toda a base (FA02 → estado vazio com tutorial). */
  semLancamentos: boolean;
}

type Tabela = 'receitas' | 'despesas';

/** Intervalo [inicio, fim) do mês. Inclui datas futuras do próprio mês (RN12, FA04). */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const p = proximoMes(ano, mes);
  return { inicio: primeiroDiaDoMes(ano, mes), fim: primeiroDiaDoMes(p.ano, p.mes) };
}

async function calculo<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaCalculo(String(e));
  }
}

// ------------------------------------------------- funções base (recebem a conexão)

async function somaNoIntervalo(db: SQLiteDatabase, tabela: Tabela, inicio: string, fim: string) {
  const r = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(valor_centavos) AS total FROM ${tabela}
     WHERE excluido_em IS NULL AND data >= ? AND data < ?`,
    [inicio, fim],
  );
  return r?.total ?? 0;
}

async function receitasPorDiaNoIntervalo(db: SQLiteDatabase, inicio: string, fim: string) {
  const linhas = await db.getAllAsync<{ data: string; total: number }>(
    `SELECT data, SUM(valor_centavos) AS total FROM receitas
     WHERE excluido_em IS NULL AND data >= ? AND data < ?
     GROUP BY data
     ORDER BY data`,
    [inicio, fim],
  );
  return linhas.map((l) => ({ data: l.data, totalCentavos: l.total }));
}

async function existeLancamento(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ existe: number }>(
    `SELECT EXISTS (SELECT 1 FROM receitas WHERE excluido_em IS NULL)
         OR EXISTS (SELECT 1 FROM despesas WHERE excluido_em IS NULL) AS existe`,
  );
  return r?.existe === 1;
}

/** Placeholder até existir a tabela de metas (RF12). */
async function metasDoPeriodo(_db: SQLiteDatabase, _inicio: string, _fim: string): Promise<ProgressoMeta[]> {
  return [];
}

// ------------------------------------------------- funções públicas compartilhadas

/** Total de receitas do mês (RF11). */
export function totalReceitasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => somaNoIntervalo(db, 'receitas', inicio, fim));
}

/** Total de despesas do mês (RF40). */
export function totalDespesasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => somaNoIntervalo(db, 'despesas', inicio, fim));
}

/** Total de receitas de cada dia do mês que tem lançamento (RF11). */
export function receitasPorDia(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => receitasPorDiaNoIntervalo(db, inicio, fim));
}

/** Saldo do mês: receitas − despesas (RN15, UC04). */
export function saldoDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo(async (db) => {
    const receitas = await somaNoIntervalo(db, 'receitas', inicio, fim);
    const despesas = await somaNoIntervalo(db, 'despesas', inicio, fim);
    return receitas - despesas;
  });
}

/** Progresso das metas do período (RF40). Vazio enquanto não houver metas (RF12). */
export function progressoMetasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => metasDoPeriodo(db, inicio, fim));
}

/** Tudo o que a tela de resumo mostra, numa só leitura da base local (UC03 passo 3). Somente leitura. */
export function calcularResumo(ano: number, mes: number): Promise<ResumoMensal> {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo(async (db) => {
    const totalReceitasCentavos = await somaNoIntervalo(db, 'receitas', inicio, fim);
    const totalDespesasCentavos = await somaNoIntervalo(db, 'despesas', inicio, fim);
    const porDia = await receitasPorDiaNoIntervalo(db, inicio, fim);
    const metas = await metasDoPeriodo(db, inicio, fim);
    const semLancamentos = !(await existeLancamento(db));
    return {
      ano,
      mes,
      totalReceitasCentavos,
      totalDespesasCentavos,
      saldoCentavos: totalReceitasCentavos - totalDespesasCentavos,
      receitasPorDia: porDia,
      metas,
      semLancamentos,
    };
  });
}
