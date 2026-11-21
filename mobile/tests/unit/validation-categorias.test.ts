import {
  parsePercentualParaCentesimos,
  validarDadosCategoria,
  validarFormularioCategoria,
  MSG_CAT,
  EntradaCategoriaInvalida,
} from '@/features/categorias/validation';

describe('parsePercentualParaCentesimos (faixa provisória 0,01%–100%)', () => {
  const casosValidos: Array<[string, number]> = [
    ['1', 100],
    ['12,5', 1250],
    ['12.5', 1250],
    ['0,01', 1],
    ['0.05', 5],
    ['50', 5_000],
    ['99,99', 9_999],
    ['100', 10_000],
    ['100,00', 10_000],
    [' 5 ', 500],
    ['007,5', 750],
  ];

  it.each(casosValidos)('aceita "%s" → %i centésimos', (texto, esperado) => {
    expect(parsePercentualParaCentesimos(texto)).toBe(esperado);
  });

  it.each([
    ['', 'texto vazio'],
    ['0', 'zero'],
    ['0,00', 'zero com casas'],
    ['0,001', 'abaixo do mínimo (três casas)'],
    ['100,01', 'acima do máximo'],
    ['101', 'acima do máximo'],
    ['200000', 'muito acima do máximo'],
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
    ['99999999999999999999', 'muitos dígitos'],
    ['99999999999999999999,99', 'muitos dígitos com casas'],
  ])('rejeita %s (%s)', (texto) => {
    expect(parsePercentualParaCentesimos(texto)).toBeNull();
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

  it('conta caracteres Unicode por code point: 30 emojis aceitos e 31 rejeitados (RN13)', () => {
    expect(() => validarDadosCategoria('😀'.repeat(30), null)).not.toThrow();
    expect(() => validarDadosCategoria('😀'.repeat(31), null)).toThrow(MSG_CAT.nomeLongo);
  });

  it('mantém acentos e caracteres comuns no limite de 30 e 31 (RN13)', () => {
    expect(() => validarDadosCategoria('á'.repeat(30), null)).not.toThrow();
    expect(() => validarDadosCategoria('á'.repeat(31), null)).toThrow(MSG_CAT.nomeLongo);
    expect(() => validarDadosCategoria('a'.repeat(30), null)).not.toThrow();
    expect(() => validarDadosCategoria('a'.repeat(31), null)).toThrow(MSG_CAT.nomeLongo);
  });

  it('aceita os limites válidos: nome com 30 caracteres e valor de 1 centavo (RN13, RN09)', () => {
    const nome30 = 'a'.repeat(30);
    const r = validarDadosCategoria(nome30, { tipo: 'valor', valor: 1 });
    expect(r.nome).toBe(nome30);
    expect(r.limite).toEqual({ tipo: 'valor', valor: 1 });
  });

  it.each([
    [{ tipo: 'valor', valor: 0 }, 'valor zero'],
    [{ tipo: 'valor', valor: -100 }, 'valor negativo'],
    [{ tipo: 'valor', valor: 10.5 }, 'valor não inteiro'],
    [{ tipo: 'valor', valor: 100_000_000_000 }, 'valor acima do teto'],
    [{ tipo: 'percentual_renda', valor: 0 }, 'percentual zero'],
    [{ tipo: 'percentual_renda', valor: -10 }, 'percentual negativo'],
    [{ tipo: 'percentual_renda', valor: 1.5 }, 'percentual não inteiro'],
    [{ tipo: 'percentual_renda', valor: 10_001 }, 'percentual acima de 100%'],
    [{ tipo: 'percentual_renda', valor: 200_000 }, 'percentual muito acima de 100%'],
    [{ tipo: 'percentual_renda', valor: 9_007_199_254_740_993 }, 'percentual acima de MAX_SAFE_INTEGER'],
    [{ tipo: 'outro', valor: 10 }, 'tipo desconhecido'],
  ] as any[])('rejeita limite inválido: %j (%s)', (limite) => {
    expect(() => validarDadosCategoria('X', limite)).toThrow(EntradaCategoriaInvalida);
  });

  it('tipo desconhecido usa mensagem amigável (defesa em profundidade)', () => {
    expect(() => validarDadosCategoria('X', { tipo: 'outro', valor: 1 } as any)).toThrow(
      MSG_CAT.dadosInvalidos,
    );
  });

  it.each([
    [1, '0,01%'],
    [5_000, '50%'],
    [9_999, '99,99%'],
    [10_000, '100%'],
  ])('aceita percentual de %i centésimos (%s) no domínio', (valor) => {
    expect(() => validarDadosCategoria('X', { tipo: 'percentual_renda', valor })).not.toThrow();
  });

  it('rejeita percentual fora da faixa provisória com a mensagem literal', () => {
    expect(() =>
      validarDadosCategoria('X', { tipo: 'percentual_renda', valor: 10_001 }),
    ).toThrow(MSG_CAT.limitePercentualInvalido);
    expect(() =>
      validarDadosCategoria('X', { tipo: 'percentual_renda', valor: 0 }),
    ).toThrow(MSG_CAT.limitePercentualInvalido);
  });

  it('monetário rejeita inteiro não seguro e mantém o teto de centavos', () => {
    expect(() =>
      validarDadosCategoria('X', { tipo: 'valor', valor: 9_007_199_254_740_993 }),
    ).toThrow(EntradaCategoriaInvalida);
    expect(() =>
      validarDadosCategoria('X', { tipo: 'valor', valor: 99_999_999_999 }),
    ).not.toThrow();
  });

  describe('validarFormularioCategoria — faixa provisória 0,01%–100%', () => {
    const base = {
      nome: 'X',
      comLimite: true,
      limiteTipo: 'percentual_renda' as const,
      limiteValor: '',
      limitePercentual: '',
    };

    it.each([
      ['0,01', 1],
      ['50', 5_000],
      ['99,99', 9_999],
      ['100', 10_000],
      ['100,00', 10_000],
    ])('aceita "%s" → %i centésimos', (texto, esperado) => {
      const r = validarFormularioCategoria({ ...base, limitePercentual: texto });
      expect(r.erros).toEqual({});
      expect(r.dados).toEqual({ nome: 'X', limite: { tipo: 'percentual_renda', valor: esperado } });
    });

    it.each(['0', '0,001', '100,01', '101', '200000', '1,999', '1 2'])(
      'rejeita "%s"',
      (texto) => {
        expect(validarFormularioCategoria({ ...base, limitePercentual: texto }).dados).toBeNull();
      },
    );

    it('vazio usa a mensagem específica e fora da faixa usa a mensagem literal', () => {
      expect(
        validarFormularioCategoria({ ...base, limitePercentual: '' }).erros.limitePercentual,
      ).toBe(MSG_CAT.limitePercentualVazio);
      expect(
        validarFormularioCategoria({ ...base, limitePercentual: '100,01' }).erros
          .limitePercentual,
      ).toBe(MSG_CAT.limitePercentualInvalido);
      expect(MSG_CAT.limitePercentualInvalido).toBe(
        'O percentual deve ser maior que 0% e até 100%.',
      );
    });
  });
});
