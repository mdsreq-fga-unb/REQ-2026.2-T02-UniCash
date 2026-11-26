import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { intervaloDoMes } from '@/features/resumo/service';
import { avaliar } from './avaliacao';
import { obterFonteMetas } from './metas';
import type { FonteMetas, ResumoConquistas, Selo, TotaisMes } from './types';

/** EX03: falha ao ler a base local. */
export class FalhaLeituraConquistas extends Error {
  constructor(causa: unknown) {
    super(`Falha ao ler conquistas: ${String(causa)}`);
    this.name = 'FalhaLeituraConquistas';
  }
}

/**
 * Totais de cada mês encerrado, numa só instrução (retrato consistente da base).
 * Usa o mesmo início de mês do resumo mensal (`intervaloDoMes`), conforme a clarificação 2 da spec.
 */
export async function lerTotaisMensais(db: SQLiteDatabase, hoje = new Date()): Promise<TotaisMes[]> {
  const { inicio } = intervaloDoMes(hoje.getFullYear(), hoje.getMonth() + 1);
  const linhas = await db.getAllAsync<{ mes: string; receitas: number; despesas: number }>(
    `SELECT mes, SUM(receitas) AS receitas, SUM(despesas) AS despesas FROM (
       SELECT substr(data, 1, 7) AS mes, valor_centavos AS receitas, 0 AS despesas
       FROM receitas WHERE excluido_em IS NULL AND data < ?
       UNION ALL
       SELECT substr(data, 1, 7) AS mes, 0 AS receitas, valor_centavos AS despesas
       FROM despesas WHERE excluido_em IS NULL AND data < ?
     ) GROUP BY mes ORDER BY mes`,
    [inicio, inicio],
  );
  return linhas.map((l) => ({ mes: l.mes, receitasCentavos: l.receitas, despesasCentavos: l.despesas }));
}

/** UC13 fluxo B: lê lançamentos e metas locais (RN06) do dono da sessão (RNF03). Não grava. */
export async function consultarConquistas(fonte: FonteMetas = obterFonteMetas()): Promise<ResumoConquistas> {
  try {
    const db = await getDb();
    const [meses, metas] = await Promise.all([lerTotaisMensais(db), fonte.concluidas()]);
    return avaliar({ meses, metas });
  } catch (e) {
    throw new FalhaLeituraConquistas(e);
  }
}

/** B3: detalhe de um selo; null quando o marco deixou de valer (FA08). */
export async function consultarSelo(chave: string, fonte: FonteMetas = obterFonteMetas()): Promise<Selo | null> {
  const { selos } = await consultarConquistas(fonte);
  return selos.find((s) => s.chave === chave) ?? null;
}
