import { hojeISO } from '@/features/receitas/dates';
import type { Meta, MetaTipo, SituacaoMeta } from './types';

/**
 * Progresso calculado de uma meta.
 *
 * `null` em valor/percentual significa que o valor realizado ainda não pode ser
 * determinado. Isso acontece porque a issue #106 ainda não definiu quais
 * lançamentos compõem cada tipo de meta nem os critérios de conclusão.
 * A interface não deve apresentar um número inventado nesse caso.
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
  situacao: SituacaoMeta;
  progressoIndisponivel: boolean;
}

/**
 * Contrato substituível para a parte de negócio da UC12 que depende da issue
 * #106. Retornar `null` mantém a interface em estado explícito de pendência.
 */
export interface ValorRealizadoCalculator {
  calcular(meta: Meta): Promise<number | null>;
}

/** Adaptador padrão: nenhum valor realizado é inventado sem decisão aprovada. */
export const calculadoraIndisponivel: ValorRealizadoCalculator = {
  async calcular() {
    return null;
  },
};

/**
 * Cálculo puramente matemático, sem persistência e sem regra de negócio
 * dependente da issue #106. O valor realizado é fornecido pelo chamador.
 */
export function calcularProgresso(
  meta: Pick<Meta, 'id' | 'tipo' | 'prazo' | 'valor_alvo_centavos'>,
  valorRealizadoCentavos: number,
  hoje: string = hojeISO(),
): ProgressoMeta {
  const alvo = meta.valor_alvo_centavos;
  if (!Number.isSafeInteger(alvo) || alvo <= 0) {
    throw new RangeError('valor alvo deve ser inteiro positivo');
  }
  if (!Number.isSafeInteger(valorRealizadoCentavos) || valorRealizadoCentavos < 0) {
    throw new RangeError('valor realizado deve ser inteiro não negativo');
  }

  // Arredonda para uma casa decimal sem ponto flutuante persistido.
  const percentual = Math.round((valorRealizadoCentavos * 1000) / alvo) / 10;
  const restante = Math.max(0, alvo - valorRealizadoCentavos);

  return {
    metaId: meta.id,
    tipo: meta.tipo,
    valorAlvoCentavos: alvo,
    valorRealizadoCentavos,
    valorRestanteCentavos: restante,
    percentual,
    prazo: meta.prazo,
    situacao: situacaoProvisoria(percentual, meta.prazo, hoje),
    progressoIndisponivel: false,
  };
}

/**
 * Situação provisória: usa apenas os marcos de 80% e 100% citados na UC12 e o
 * prazo. O critério definitivo de conclusão continua pendente na issue #106.
 */
export function situacaoProvisoria(
  percentual: number,
  prazo: string,
  hoje: string,
): SituacaoMeta {
  if (percentual > 100) return 'ultrapassada';
  if (percentual >= 100) return 'atingida';
  if (prazo < hoje) return 'vencida';
  if (percentual >= 80) return 'atencao';
  return 'em_andamento';
}

/** Executa o adaptador e devolve uma pendência explícita quando não há valor. */
export async function calcularProgressoDaMeta(
  meta: Meta,
  calculadora: ValorRealizadoCalculator = calculadoraIndisponivel,
  hoje: string = hojeISO(),
): Promise<ProgressoMeta> {
  const valor = await calculadora.calcular(meta);
  if (valor === null || valor === undefined) {
    return {
      metaId: meta.id,
      tipo: meta.tipo,
      valorAlvoCentavos: meta.valor_alvo_centavos,
      valorRealizadoCentavos: null,
      valorRestanteCentavos: null,
      percentual: null,
      prazo: meta.prazo,
      situacao: 'indefinida',
      progressoIndisponivel: true,
    };
  }
  return calcularProgresso(meta, valor, hoje);
}

export function rotuloSituacao(situacao: SituacaoMeta): string {
  switch (situacao) {
    case 'indefinida':
      return 'A definir (issue #106)';
    case 'em_andamento':
      return 'Em andamento';
    case 'atencao':
      return 'Atenção';
    case 'atingida':
      return 'Meta atingida';
    case 'ultrapassada':
      return 'Acima da meta';
    case 'vencida':
      return 'Prazo vencido';
  }
}
