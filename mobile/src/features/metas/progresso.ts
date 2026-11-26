import { hojeISO } from '@/features/receitas/dates';
import type { PeriodoMensal } from './periodo';
import { periodoAtualDaMeta } from './periodo';
import type {
  Meta,
  MetaTipo,
  SituacaoPrazo,
  SituacaoProgresso,
} from './types';

/**
 * Progresso calculado de uma meta.
 *
 * `null` em valor/percentual significa que o valor realizado não pode ser
 * determinado (categoria ausente, investimento sem valor declarado ou início
 * desconhecido). A interface não deve apresentar zero nesses casos.
 */
export interface ProgressoMeta {
  metaId: string;
  tipo: MetaTipo;
  valorAlvoCentavos: number;
  valorRealizadoCentavos: number | null;
  valorRestanteCentavos: number | null;
  /** Percentual com uma casa decimal; pode passar de 100. */
  percentual: number | null;
  prazo: string;
  situacaoProgresso: SituacaoProgresso;
  situacaoPrazo: SituacaoPrazo;
  progressoIndisponivel: boolean;
  /** Mês consultado; nulo para investimento ou legado sem início. */
  periodo: PeriodoMensal | null;
}

/**
 * Contrato substituível para o valor realizado. O período é obrigatório para
 * metas de gasto e ignorado no investimento.
 */
export interface ValorRealizadoCalculator {
  calcular(meta: Meta, periodo: PeriodoMensal | null): Promise<number | null>;
}

/** Adaptador neutro: não inventa valor realizado. */
export const calculadoraIndisponivel: ValorRealizadoCalculator = {
  async calcular() {
    return null;
  },
};

/**
 * Cálculo puramente matemático, sem persistência. As comparações usam os
 * valores inteiros exatos; o percentual exibido é arredondado em separado para
 * uma casa decimal e não altera a classificação.
 */
export function calcularProgresso(
  meta: Pick<Meta, 'id' | 'tipo' | 'prazo' | 'valor_alvo_centavos'>,
  valorRealizadoCentavos: number,
  hoje: string = hojeISO(),
  periodo: PeriodoMensal | null = null,
): ProgressoMeta {
  const alvo = meta.valor_alvo_centavos;
  if (!Number.isSafeInteger(alvo) || alvo <= 0) {
    throw new RangeError('valor alvo deve ser inteiro positivo');
  }
  if (!Number.isSafeInteger(valorRealizadoCentavos) || valorRealizadoCentavos < 0) {
    throw new RangeError('valor realizado deve ser inteiro não negativo');
  }

  return {
    metaId: meta.id,
    tipo: meta.tipo,
    valorAlvoCentavos: alvo,
    valorRealizadoCentavos,
    valorRestanteCentavos: Math.max(0, alvo - valorRealizadoCentavos),
    percentual: percentualExibido(valorRealizadoCentavos, alvo),
    prazo: meta.prazo,
    situacaoProgresso: situacaoDoProgresso(meta.tipo, alvo, valorRealizadoCentavos),
    situacaoPrazo: situacaoDoPrazo(meta.prazo, hoje),
    progressoIndisponivel: false,
    periodo,
  };
}

/** Percentual com uma casa decimal, arredondado apenas para exibição. */
export function percentualExibido(realizadoCentavos: number, alvoCentavos: number): number {
  return Math.round((realizadoCentavos * 1000) / alvoCentavos) / 10;
}

/**
 * Classificação exata, sem usar o percentual arredondado.
 * Gasto: <80% dentro; 80%–<100% próximo; =100% atingido; >100% ultrapassado.
 * Investimento: >=100% alcançado; abaixo em andamento.
 */
export function situacaoDoProgresso(
  tipo: MetaTipo,
  alvoCentavos: number,
  realizadoCentavos: number,
): SituacaoProgresso {
  if (tipo === 'investimento') {
    return realizadoCentavos >= alvoCentavos ? 'alcancada' : 'em_andamento';
  }
  if (realizadoCentavos * 100 < alvoCentavos * 80) return 'dentro_do_limite';
  if (realizadoCentavos < alvoCentavos) return 'proximo_do_limite';
  if (realizadoCentavos === alvoCentavos) return 'limite_atingido';
  return 'limite_ultrapassado';
}

/** O prazo final é inclusivo: só fica vencida no dia seguinte. */
export function situacaoDoPrazo(prazo: string, hoje: string): SituacaoPrazo {
  return hoje > prazo ? 'vencida' : 'em_vigor';
}

/** Executa o adaptador e devolve uma pendência explícita quando não há valor. */
export async function calcularProgressoDaMeta(
  meta: Meta,
  calculadora: ValorRealizadoCalculator = calculadoraIndisponivel,
  hoje: string = hojeISO(),
  periodo: PeriodoMensal | null = null,
): Promise<ProgressoMeta> {
  const periodoEfetivo =
    meta.tipo === 'gasto' ? (periodo ?? periodoAtualDaMeta(meta, hoje)) : null;
  const valor = await calculadora.calcular(meta, periodoEfetivo);

  if (valor === null || valor === undefined) {
    return {
      metaId: meta.id,
      tipo: meta.tipo,
      valorAlvoCentavos: meta.valor_alvo_centavos,
      valorRealizadoCentavos: null,
      valorRestanteCentavos: null,
      percentual: null,
      prazo: meta.prazo,
      situacaoProgresso: 'indisponivel',
      situacaoPrazo: situacaoDoPrazo(meta.prazo, hoje),
      progressoIndisponivel: true,
      periodo: periodoEfetivo,
    };
  }

  return calcularProgresso(meta, valor, hoje, periodoEfetivo);
}

export function rotuloSituacaoProgresso(situacao: SituacaoProgresso): string {
  switch (situacao) {
    case 'indisponivel':
      return 'Indisponível';
    case 'dentro_do_limite':
      return 'Dentro do limite';
    case 'proximo_do_limite':
      return 'Próximo do limite';
    case 'limite_atingido':
      return 'Limite atingido';
    case 'limite_ultrapassado':
      return 'Limite ultrapassado';
    case 'em_andamento':
      return 'Em andamento';
    case 'alcancada':
      return 'Alcançada';
  }
}

export function rotuloSituacaoPrazo(situacao: SituacaoPrazo): string {
  return situacao === 'vencida' ? 'Prazo vencido' : 'Prazo em vigor';
}

/** @deprecated use rotuloSituacaoProgresso. */
export function rotuloSituacao(situacao: SituacaoProgresso): string {
  return rotuloSituacaoProgresso(situacao);
}
