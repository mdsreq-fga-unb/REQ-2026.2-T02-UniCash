export type LimiteCategoria =
  | { tipo: 'reais'; centavos: number }
  | { tipo: 'percentual'; centesimosDePercentual: number };

export type DadosCategoria = {
  categoriaId: string;
  gastoCentavos: number;
  limite: LimiteCategoria | null;
};

export const faixasConsumo = [
  { faixa: 'verde', maximo: 50, inclusivo: false },
  { faixa: 'amarela', maximo: 80, inclusivo: false },
  { faixa: 'laranja', maximo: 90, inclusivo: true },
  { faixa: 'vermelha', maximo: null, inclusivo: false },
] as const;

type FaixaConsumo = (typeof faixasConsumo)[number]['faixa'];

export type ConsumoCategoria = Pick<DadosCategoria, 'categoriaId' | 'gastoCentavos'> & (
  | { status: 'ok'; limiteEfetivoCentavos: number; consumoPercentual: number; faixa: FaixaConsumo }
  | { status: 'sem_limite' | 'indisponivel'; limiteEfetivoCentavos: null; consumoPercentual: null; faixa: null }
);

/** Recebe totais do mesmo mês, já agrupados por categoria. Despesas sem categoria ficam fora. */
export function calcularConsumoPorCategoria(
  categorias: readonly DadosCategoria[],
  rendaCentavos: number,
): ConsumoCategoria[] {
  if (!Number.isSafeInteger(rendaCentavos) || rendaCentavos < 0) {
    throw new RangeError('Renda mensal inválida');
  }

  return categorias.map(({ categoriaId, gastoCentavos, limite }) => {
    if (!Number.isSafeInteger(gastoCentavos) || gastoCentavos < 0) {
      throw new RangeError('Gasto mensal da categoria inválido');
    }
    const base = { categoriaId, gastoCentavos };
    const semIndicador = { limiteEfetivoCentavos: null, consumoPercentual: null, faixa: null };
    if (limite === null) return { ...base, ...semIndicador, status: 'sem_limite' };

    const percentual = limite.tipo === 'percentual';
    const valor = percentual ? limite.centesimosDePercentual : limite.centavos;
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      throw new RangeError('Limite da categoria inválido');
    }
    if (percentual && rendaCentavos === 0) return { ...base, ...semIndicador, status: 'indisponivel' };

    // Compara as frações exatas. A conversão para exibição vem depois da classificação.
    const numeradorLimite = BigInt(valor) * (percentual ? BigInt(rendaCentavos) : BigInt(1));
    const denominadorLimite = BigInt(percentual ? 10000 : 1);
    const numeradorConsumo = BigInt(gastoCentavos) * BigInt(100) * denominadorLimite;
    const faixa = faixasConsumo.find(({ maximo, inclusivo }) => {
      if (maximo === null) return true;
      const corte = BigInt(maximo) * numeradorLimite;
      return inclusivo ? numeradorConsumo <= corte : numeradorConsumo < corte;
    })!;

    return {
      ...base,
      status: 'ok',
      limiteEfetivoCentavos: Number(numeradorLimite) / Number(denominadorLimite),
      consumoPercentual: Number(numeradorConsumo) / Number(numeradorLimite),
      faixa: faixa.faixa,
    };
  });
}
