import {
  parsePercentualParaCentesimos,
  validarDadosCategoria,
  validarFormularioCategoria,
  MSG_CAT,
  EntradaCategoriaInvalida,
} from '@/features/categorias/validation';

describe('parsePercentualParaCentesimos (conversão segura, sem máximo)', () => {
  const casosValidos: Array<[string, number]> = [
    ['1', 100],
    ['12,5', 1250],
    ['12.5', 1250],
    ['0,01', 1],
    ['0.05', 5],
    ['100', 10_000],
    [' 5 ', 500],
    ['007,5', 750],
    ['1234,56', 123_456],
  ];

  it.each(casosValidos)('aceita "%s" → %i centésimos', (texto, esperado) => {
    expect(parsePercentualParaCentesimos(texto)).toBe(esperado);
  });

  it.each([
    ['', 'texto vazio'],
    ['1e2', 'notação científica'],
    ['0x1f', 'hexadecimal'],
    ['Infinity', 'palavra reservada'],
    ['+5', 'sinal positivo'],
    ['-5', 'sinal negativo'],
    ['5.', 'ponto sem casas'],
    ['.5', 'sem dígito inteiro'],
    ['1.2.3', 'dois pontos'],
    ['1,2,3', 'duas vírgulas'],
    ['abc', 'texto'],
    ['1,999', 'três casas decimais'],
    ['1 2', 'espaço interno'],
    ['12 ,5', 'espaço interno'],
  ])('rejeita %s (%s)', (texto) => {
    expect(parsePercentualParaCentesimos(texto)).toBeNull();
  });

  it('não impõe máximo percentual (decisão da cliente pendente)', () => {
    expect(parsePercentualParaCentesimos('500')).toBe(50_000);
    expect(parsePercentualParaCentesimos('999999')).toBe(99_999_900);
  });

  it('rejeita resultado acima de Number.MAX_SAFE_INTEGER (overflow/precisão)', () => {
    // MAX_SAFE_INTEGER = 9.007.199.254.740.991 centésimos: limite exato é aceito.
    expect(parsePercentualParaCentesimos('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER);
    // Um centésimo acima já não é representável com segurança.
    expect(parsePercentualParaCentesimos('90071992547409.92')).toBeNull();
    // Muito acima do limite, com muitas casas inteiras.
    expect(parsePercentualParaCentesimos('99999999999999999999')).toBeNull();
    expect(parsePercentualParaCentesimos('99999999999999999999,99')).toBeNull();
  });
});

describe('validarDadosCategoria (domínio compartilhado formulário × serviço, RN13/RN14)', () => {
  it('aceita sem limite e normaliza o nome', () => {
    const r = validarDadosCategoria('  Alimentação  ', null);
    expect(r).toEqual({ nome: 'Alimentação', nomeNormalizado: 'alimentação', limite: null });
  });

  it('aceita limite por valor dentro do teto do schema', () => {
    const r = validarDadosCategoria('Mercado', { tipo: 'valor', valor: 99_999_999_999 });
    expect(r.limite).toEqual({ tipo: 'valor', valor: 99_999_999_999 });
  });

  it('rejeita nome vazio e nome longo', () => {
    expect(() => validarDadosCategoria('   ', null)).toThrow(MSG_CAT.nomeVazio);
    expect(() => validarDadosCategoria('a'.repeat(31), null)).toThrow(MSG_CAT.nomeLongo);
  });

  it.each([
    [{ tipo: 'valor', valor: 0 }, 'valor zero'],
    [{ tipo: 'valor', valor: -100 }, 'valor negativo'],
    [{ tipo: 'valor', valor: 10.5 }, 'valor não inteiro'],
    [{ tipo: 'valor', valor: 100_000_000_000 }, 'valor acima do teto'],
    [{ tipo: 'percentual_renda', valor: 0 }, 'percentual zero'],
    [{ tipo: 'percentual_renda', valor: -10 }, 'percentual negativo'],
    [{ tipo: 'percentual_renda', valor: 1.5 }, 'percentual não inteiro'],
    [{ tipo: 'percentual_renda', valor: 9_007_199_254_740_993 }, 'percentual acima de MAX_SAFE_INTEGER'],
    [{ tipo: 'outro', valor: 10 }, 'tipo desconhecido'],
  ] as any[])('rejeita limite inválido: %j (%s)', (limite) => {
    expect(() => validarDadosCategoria('X', limite)).toThrow(EntradaCategoriaInvalida);
  });

  it('não impõe máximo percentual no domínio (decisão da cliente pendente)', () => {
    expect(() =>
      validarDadosCategoria('X', { tipo: 'percentual_renda', valor: 50_000 }),
    ).not.toThrow();
  });

  it('exige inteiro seguro no percentual (Number.isSafeInteger)', () => {
    // O literal já é arredondado pelo próprio Number para 9.007.199.254.740.992,
    // que está acima de MAX_SAFE_INTEGER — exatamente o caso que deve ser rejeitado.
    expect(() =>
      validarDadosCategoria('X', { tipo: 'percentual_renda', valor: 9_007_199_254_740_993 }),
    ).toThrow(EntradaCategoriaInvalida);
    // O limite exato de segurança ainda é aceito.
    expect(() =>
      validarDadosCategoria('X', { tipo: 'percentual_renda', valor: Number.MAX_SAFE_INTEGER }),
    ).not.toThrow();
  });

  it('monetário rejeita inteiro não seguro e mantém o teto de centavos', () => {
    expect(() =>
      validarDadosCategoria('X', { tipo: 'valor', valor: 9_007_199_254_740_993 }),
    ).toThrow(EntradaCategoriaInvalida);
    expect(() =>
      validarDadosCategoria('X', { tipo: 'valor', valor: 99_999_999_999 }),
    ).not.toThrow();
  });

  describe('validarFormularioCategoria — sem teto percentual provisório', () => {
    const base = {
      nome: 'X',
      comLimite: true,
      limiteTipo: 'percentual_renda' as const,
      limiteValor: '',
      limitePercentual: '',
    };

    it('aceita percentual acima de 100% (cap provisório removido)', () => {
      const r = validarFormularioCategoria({ ...base, limitePercentual: '101' });
      expect(r.erros).toEqual({});
      expect(r.dados).toEqual({ nome: 'X', limite: { tipo: 'percentual_renda', valor: 10_100 } });
    });

    it('continua exigindo positivo e formato com até duas casas', () => {
      expect(validarFormularioCategoria({ ...base, limitePercentual: '0' }).dados).toBeNull();
      expect(validarFormularioCategoria({ ...base, limitePercentual: '1,999' }).dados).toBeNull();
      expect(validarFormularioCategoria({ ...base, limitePercentual: '1 2' }).dados).toBeNull();
    });
  });
});
