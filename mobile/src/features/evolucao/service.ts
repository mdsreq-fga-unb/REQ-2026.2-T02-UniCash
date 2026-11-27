import { getDb } from '@/db/database';
import { mesAnterior, primeiroDiaDoMes, proximoMes } from '@/features/receitas/dates';

/**
 * Cálculo da evolução mensal (UC07, RF68): total de receitas e de despesas de cada mês da janela
 * do gráfico. Tudo é calculado na hora a partir da base local (RN06, RN07), sem nuvem e sem
 * contadores persistidos, com valores somados como inteiros em centavos (RNF07).
 */

/** Falha ao ler ou calcular a série (UC07 EX01). */
export class FalhaEvolucao extends Error {}

export const MSG_FALHA_EVOLUCAO = 'Não foi possível carregar a evolução mensal. Tente novamente.';

/** Quantidade de meses do gráfico: o mês final da janela e os 5 anteriores (RN12). */
export const MESES_NO_GRAFICO = 6;

export interface MesDoGrafico {
  ano: number;
  mes: number;
  receitasCentavos: number;
  despesasCentavos: number;
}

export interface EvolucaoMensal {
  /** Último mês da janela; os meses vêm em ordem crescente e terminam nele. */
  fimAno: number;
  fimMes: number;
  meses: MesDoGrafico[];
  /** Nenhuma receita nem despesa em toda a base (FA02). */
  semLancamentos: boolean;
}

type AnoMes = { ano: number; mes: number };

/** Os 6 meses que terminam em `fim`, em ordem crescente. */
export function mesesDaJanela(fim: AnoMes): AnoMes[] {
  const meses: AnoMes[] = [fim];
  while (meses.length < MESES_NO_GRAFICO) meses.unshift(mesAnterior(meses[0].ano, meses[0].mes));
  return meses;
}

/**
 * Último mês da janela depois de selecionar `selecionado` (FA05): se ele já está entre os 6 meses
 * exibidos, a janela não muda; senão, ela se desloca para terminar nele.
 */
export function ajustarFimDaJanela(fim: AnoMes, selecionado: AnoMes): AnoMes {
  const dentro = mesesDaJanela(fim).some((m) => m.ano === selecionado.ano && m.mes === selecionado.mes);
  return dentro ? fim : selecionado;
}

const chave = (m: AnoMes) => `${m.ano}-${String(m.mes).padStart(2, '0')}`;

/**
 * Série do gráfico para a janela que termina em (fimAno, fimMes). Somente leitura.
 *
 * Uma única instrução SQL: o SQLite a executa sobre um retrato consistente da base, sem bloquear
 * gravações. Meses sem lançamento entram com zero (FA01); datas futuras contam no mês delas (FA04).
 */
export async function calcularEvolucao(fimAno: number, fimMes: number): Promise<EvolucaoMensal> {
  const meses = mesesDaJanela({ ano: fimAno, mes: fimMes });
  const inicio = primeiroDiaDoMes(meses[0].ano, meses[0].mes);
  const depois = proximoMes(fimAno, fimMes);
  const fim = primeiroDiaDoMes(depois.ano, depois.mes);
  const porMes = (tabela: 'receitas' | 'despesas') =>
    `(SELECT json_group_array(json_object('mes', mes, 'total', total))
        FROM (SELECT substr(data, 1, 7) AS mes, SUM(valor_centavos) AS total FROM ${tabela}
              WHERE excluido_em IS NULL AND data >= ? AND data < ? GROUP BY mes))`;

  try {
    const db = await getDb();
    const r = await db.getFirstAsync<{ receitas: string; despesas: string; existe: number }>(
      `SELECT
         ${porMes('receitas')} AS receitas,
         ${porMes('despesas')} AS despesas,
         (EXISTS (SELECT 1 FROM receitas WHERE excluido_em IS NULL)
          OR EXISTS (SELECT 1 FROM despesas WHERE excluido_em IS NULL)) AS existe`,
      [inicio, fim, inicio, fim],
    );
    if (!r) throw new Error('consulta da evolução sem resultado');

    const totais = (json: string) =>
      new Map((JSON.parse(json) as { mes: string; total: number }[]).map((l) => [l.mes, l.total]));
    const receitas = totais(r.receitas);
    const despesas = totais(r.despesas);

    return {
      fimAno,
      fimMes,
      meses: meses.map((m) => ({
        ...m,
        receitasCentavos: receitas.get(chave(m)) ?? 0,
        despesasCentavos: despesas.get(chave(m)) ?? 0,
      })),
      semLancamentos: r.existe !== 1,
    };
  } catch (e) {
    throw new FalhaEvolucao(String(e));
  }
}
