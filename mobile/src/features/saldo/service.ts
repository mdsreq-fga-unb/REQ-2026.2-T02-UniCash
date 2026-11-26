import { getDb } from '@/db/database';
import { adicionarMeses, parseBR } from '@/features/receitas/dates';
import { VALOR_MAXIMO_CENTAVOS } from '@/features/receitas/money';
import { salvarSaldoInicial as salvarReferencia } from '@/features/saldoInicial/service';
import { calcularSaldo, calcularSaldoAnterior, indicadorSaldo } from './calculo';

export type TotaisDoMes = { receitas: number; despesas: number };

type SaldoInicial = { mes: string; centavos: number };

export async function consultarResumoMensal(inicio: string, totaisDoMes?: TotaisDoMes) {
  const anterior = adicionarMeses(inicio, -1);
  // O resumo da tela já leu os totais do mês junto com as receitas por dia.
  const fim = totaisDoMes ? inicio : adicionarMeses(inicio, 1);
  const db = await getDb();
  const linhas = await db.getAllAsync<{
    mes: string | null;
    receitas: number;
    despesas: number;
    referencia: string | null;
    inicial: number | null;
  }>(
    `WITH referencia AS (
       SELECT mes_referencia AS mes, valor_centavos FROM saldo_inicial WHERE id = 1
     ), lancamentos AS (
       SELECT data, valor_centavos AS receitas, 0 AS despesas FROM receitas
       WHERE excluido_em IS NULL AND data >= ? AND data < ?
       UNION ALL
       SELECT data, 0, valor_centavos FROM despesas WHERE excluido_em IS NULL AND data >= ? AND data < ?
     ), totais AS (
       SELECT substr(data, 1, 7) AS mes, SUM(receitas) AS receitas, SUM(despesas) AS despesas
       FROM lancamentos WHERE data >= COALESCE((SELECT mes || '-01' FROM referencia), '')
       GROUP BY substr(data, 1, 7)
     )
     SELECT mes, receitas, despesas, NULL AS referencia, NULL AS inicial FROM totais
     UNION ALL
     SELECT NULL, 0, 0, mes, valor_centavos FROM referencia`,
    [anterior, fim, anterior, fim],
  );

  const mes = inicio.slice(0, 7);
  const referencia = linhas.find((linha) => linha.referencia !== null);
  const inicial = referencia?.referencia && referencia.inicial !== null
    ? { mes: referencia.referencia, centavos: referencia.inicial }
    : null;
  const totais = inicial && mes < inicial.mes
    ? undefined
    : totaisDoMes ?? linhas.find((linha) => linha.mes === mes);
  const { receitas, despesas } = totais ?? { receitas: 0, despesas: 0 };
  const saldo = calcularSaldo({ receitas, despesas });
  const saldoAnterior = calcularSaldoAnterior(
    mes,
    linhas.find((linha) => linha.mes === anterior.slice(0, 7)) ?? null,
    inicial,
  );
  return { receitas, despesas, saldo, saldoAnterior, inicial, indicador: indicadorSaldo(saldo, receitas) };
}

export async function salvarSaldoInicial({ mes, centavos }: SaldoInicial) {
  const [ano, numero] = mes.split('-');
  if (parseBR(`01/${numero}/${ano}`)?.slice(0, 7) !== mes ||
      !Number.isSafeInteger(centavos) || Math.abs(centavos) > VALOR_MAXIMO_CENTAVOS) {
    throw new RangeError('Saldo inicial inválido');
  }
  await salvarReferencia({ mes_referencia: mes, valor_centavos: centavos });
}
