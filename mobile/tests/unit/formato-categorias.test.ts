import { centesimosParaTextoPercentual } from '@/features/categorias/formato';

describe('centesimosParaTextoPercentual (formatação exata, sem arredondamento)', () => {
  it.each([
    [1, '0,01%'],
    [5, '0,05%'],
    [50, '0,5%'],
    [100, '1%'],
    [101, '1,01%'],
    [110, '1,1%'],
    [1250, '12,5%'],
    [10_000, '100%'],
    [10_100, '101%'],
    [999_999, '9999,99%'],
  ] as Array<[number, string]>)('%i centésimos → "%s"', (entrada, esperado) => {
    expect(centesimosParaTextoPercentual(entrada)).toBe(esperado);
  });

  it('0 → "0%"', () => {
    expect(centesimosParaTextoPercentual(0)).toBe('0%');
  });

  it('é exato no limite de inteiro seguro (sem perda de precisão)', () => {
    // MAX_SAFE_INTEGER = 9.007.199.254.740.991 centésimos = 90071992547409,91%
    expect(centesimosParaTextoPercentual(Number.MAX_SAFE_INTEGER)).toBe('90071992547409,91%');
  });

  it('aceita somente inteiros seguros não negativos', () => {
    expect(() => centesimosParaTextoPercentual(1.5)).toThrow(RangeError);
    expect(() => centesimosParaTextoPercentual(-100)).toThrow(RangeError);
    // 9.007.199.254.740.992 está acima de MAX_SAFE_INTEGER (não é seguro).
    expect(() => centesimosParaTextoPercentual(9_007_199_254_740_992)).toThrow(RangeError);
    expect(() => centesimosParaTextoPercentual(Number.NaN)).toThrow(RangeError);
    expect(() => centesimosParaTextoPercentual(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
