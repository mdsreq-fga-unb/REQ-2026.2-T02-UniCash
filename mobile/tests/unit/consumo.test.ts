import { calcularConsumoPorCategoria, type DadosCategoria } from '@/features/consumo/calculo';

function calcular(gastoCentavos: number, limite: DadosCategoria['limite'], rendaCentavos = 0) {
  return calcularConsumoPorCategoria([{ categoriaId: 'alimentacao', gastoCentavos, limite }], rendaCentavos)[0];
}

describe('UC09 · consumo por categoria', () => {
  it.each([
    [0, 'verde'], [4999, 'verde'], [5000, 'amarela'], [7999, 'amarela'],
    [8000, 'laranja'], [9000, 'laranja'], [9001, 'vermelha'],
    [10000, 'vermelha'], [10001, 'vermelha'],
  ])('classifica %i centavos sobre um limite de 100 reais como %s', (gasto, faixa) => {
    expect(calcular(gasto, { tipo: 'reais', centavos: 10000 })).toEqual({
      categoriaId: 'alimentacao', gastoCentavos: gasto, status: 'ok',
      limiteEfetivoCentavos: 10000, consumoPercentual: gasto / 100, faixa,
    });
  });

  it('usa a renda do mês e preserva frações de centavo no limite efetivo', () => {
    const limite = { tipo: 'percentual', centesimosDePercentual: 5000 } as const;
    expect(calcular(36, limite, 101)).toMatchObject({ limiteEfetivoCentavos: 50.5, faixa: 'amarela' });
    expect(calcular(36, limite, 80)).toMatchObject({ consumoPercentual: 90, faixa: 'laranja' });
    expect(calcular(36, limite, 79)).toMatchObject({ faixa: 'vermelha' });
  });

  it('diferencia ausência de limite de limite percentual indisponível', () => {
    const semIndicador = { limiteEfetivoCentavos: null, consumoPercentual: null, faixa: null };
    expect(calcular(300, null)).toMatchObject({ ...semIndicador, status: 'sem_limite', gastoCentavos: 300 });
    expect(calcular(300, { tipo: 'percentual', centesimosDePercentual: 2000 }))
      .toMatchObject({ ...semIndicador, status: 'indisponivel', gastoCentavos: 300 });
  });

  it('preserva a precisão na fronteira para inteiros grandes', () => {
    expect(calcular(7199999999999999, { tipo: 'reais', centavos: 9000000000000000 }))
      .toMatchObject({ faixa: 'amarela' });
  });

  it('sinaliza dados inválidos ao chamador', () => {
    expect(() => calcular(0, null, -1)).toThrow('Renda mensal inválida');
    expect(() => calcular(0.5, null)).toThrow('Gasto mensal da categoria inválido');
    expect(() => calcular(0, { tipo: 'reais', centavos: 0 })).toThrow('Limite da categoria inválido');
  });
});
