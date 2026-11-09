import {
  VALOR_MAXIMO_CENTAVOS,
  centavosParaTexto,
  formatarBRL,
  parseValor,
} from '@/features/receitas/money';

describe('parseValor (RN09)', () => {
  it.each([
    ['150,00', 15000],
    ['1.234,56', 123456],
    ['0,01', 1],
    ['10', 1000],
    ['1234.5', 123450],
    ['R$ 99,90', 9990],
    ['1.234.567', 123456700],
  ])('aceita "%s" como %i centavos', (texto, centavos) => {
    expect(parseValor(texto)).toEqual({ ok: true, centavos });
  });

  it('aceita exatamente o limite (R$ 999.999.999,99)', () => {
    expect(parseValor('999.999.999,99')).toEqual({ ok: true, centavos: VALOR_MAXIMO_CENTAVOS });
  });

  it('rejeita valor ausente', () => {
    expect(parseValor('')).toEqual({ ok: false, erro: 'vazio' });
    expect(parseValor('   ')).toEqual({ ok: false, erro: 'vazio' });
  });

  it.each(['0', '0,00', '-5', '-0,01', 'abc', '1,2,3', '12a'])('rejeita "%s" (≤ 0 ou formato inválido)', (texto) => {
    expect(parseValor(texto)).toEqual({ ok: false, erro: 'invalido' });
  });

  it('rejeita mais de duas casas decimais', () => {
    expect(parseValor('1,234')).toEqual({ ok: false, erro: 'invalido' });
    expect(parseValor('10,001')).toEqual({ ok: false, erro: 'invalido' });
  });

  it('rejeita valor acima do limite', () => {
    expect(parseValor('1.000.000.000,00')).toEqual({ ok: false, erro: 'limite' });
    expect(parseValor('9999999999999,00')).toEqual({ ok: false, erro: 'limite' });
  });
});

describe('formatação', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatarBRL(123456)).toBe('R$ 1.234,56');
    expect(formatarBRL(5)).toBe('R$ 0,05');
    expect(formatarBRL(100)).toBe('R$ 1,00');
    expect(formatarBRL(VALOR_MAXIMO_CENTAVOS)).toBe('R$ 999.999.999,99');
  });

  it('gera o texto editável do campo de valor', () => {
    expect(centavosParaTexto(123456)).toBe('1234,56');
    expect(centavosParaTexto(15000)).toBe('150,00');
  });

  it('ida e volta: texto -> centavos -> texto', () => {
    const r = parseValor(centavosParaTexto(987654));
    expect(r).toEqual({ ok: true, centavos: 987654 });
  });
});
