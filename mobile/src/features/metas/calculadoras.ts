import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import type { PeriodoMensal } from './periodo';
import { periodoAtualDaMeta } from './periodo';
import type { ValorRealizadoCalculator } from './progresso';
import type { Meta } from './types';

/**
 * Soma as despesas ativas da categoria no período mensal inclusivo.
 *
 * Retorna null quando a meta não tem categoria, a categoria não está ativa ou
 * o período não existe. Nesses casos o progresso fica indisponível — nunca é
 * apresentado como zero artificial.
 */
export async function calcularRealizadoGasto(
  meta: Pick<Meta, 'tipo' | 'categoria_id' | 'inicio' | 'prazo' | 'valor_alvo_centavos'>,
  periodo: PeriodoMensal | null,
  db?: SQLiteDatabase,
): Promise<number | null> {
  if (meta.tipo !== 'gasto' || !meta.categoria_id || !periodo) return null;

  const conexao = db ?? (await getDb());
  const categoria = await conexao.getFirstAsync<{ id: string }>(
    'SELECT id FROM categorias WHERE id = ? AND excluido_em IS NULL',
    [meta.categoria_id],
  );
  if (!categoria) return null;

  const resultado = await conexao.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(valor_centavos), 0) AS total
       FROM despesas
      WHERE excluido_em IS NULL
        AND categoria_id = ?
        AND data >= ?
        AND data <= ?`,
    [meta.categoria_id, periodo.inicio, periodo.fim],
  );

  return resultado?.total ?? 0;
}

/** Investimento: o realizado é exatamente o valor acumulado declarado. */
export function calcularRealizadoInvestimento(
  meta: Pick<Meta, 'tipo' | 'valor_acumulado_centavos'>,
): number | null {
  if (meta.tipo !== 'investimento') return null;
  return meta.valor_acumulado_centavos;
}

/** Calculadora real usada pela interface. */
export const calculadoraReal: ValorRealizadoCalculator = {
  async calcular(meta, periodo) {
    if (meta.tipo === 'investimento') return calcularRealizadoInvestimento(meta);

    const periodoEfetivo = periodo ?? periodoAtualDaMeta(meta);
    return calcularRealizadoGasto(meta, periodoEfetivo);
  },
};
