
import {
  excedeLimiteOcorrencias,
  validarFormularioDespesa,
  MSG_DESPESA,
} from '@/features/despesas/validation';
import type { FormValoresDespesa } from '@/features/despesas/types';

const formulario = (
  extra: Partial<FormValoresDespesa> = {},
): FormValoresDespesa => ({
  valor: '150,00',
  data: '16/10/2026',
  titulo: 'Conta de luz',
  descricao: '',
  categoriaId: '',
  fixaOuVariavel: 'fixa',
  essencial: 'essencial',
  recorrente: false,
  intervalo: '1',
  unidade: 'mes',
  termino: '',
  ...extra,
});

const validar = (extra = {}) =>
  validarFormularioDespesa(formulario(extra), {
    permitirRecorrencia: true,
  });

describe('validação do formulário de despesas', () => {
  it('aceita campos válidos e normaliza os dados', () => {
    const { erros, dados } = validar({
      titulo: '  Conta de luz  ',
    });

    expect(erros).toEqual({});
    expect(dados).toEqual({
      data: '2026-10-16',
      titulo: 'Conta de luz',
      valorCentavos: 15000,
      descricao: null,
      categoriaId: null,
      fixaOuVariavel: 'fixa',
      essencial: 1,
      recorrencia: null,
    });
  });

describe('campos obrigatórios', () => {
  it('rejeita data vazia', () => {
    expect(validar({ data: '' }).erros.data).toBe(
      'Informe a data da despesa.',
    );
  });

  it('rejeita data inválida', () => {
    expect(validar({ data: '31/02/2026' }).erros.data).toBe(
      MSG_DESPESA.dataInvalida,
    );
  });

  it('rejeita título vazio', () => {
    expect(validar({ titulo: '' }).erros.titulo).toBe(
      'Informe o título da despesa.',
    );
  });

  it('rejeita título com espaços', () => {
    expect(validar({ titulo: '   ' }).erros.titulo).toBe(
      'Informe o título da despesa.',
    );
  });

  it('rejeita valor vazio', () => {
    expect(validar({ valor: '' }).erros.valor).toBe(
      'Informe o valor da despesa.',
    );
  });
});


  describe('valor', () => {
    it.each(['0', '0,00', '-10'])(
      'rejeita valor inválido: %s',
      (valor) => {
        expect(validar({ valor }).erros.valor).toBe(MSG_DESPESA.valorInvalido);
      },
    );

    it.each([
      ['0,01', 1],
      ['0,10', 10],
      ['10,5', 1050],
      ['10,99', 1099],
      ['10', 1000],
    ])('aceita %s como %i centavos (RN09: valor-limite e 1 casa decimal)', (valor, centavos) => {
      const { erros, dados } = validar({ valor });

      expect(erros.valor).toBeUndefined();
      expect(dados?.valorCentavos).toBe(centavos);
    });

    it('rejeita mais de duas casas decimais', () => {
      expect(validar({ valor: '10,999' }).erros.valor).toBe(
        MSG_DESPESA.valorInvalido,
      );
    });

    it('rejeita valor acima do limite', () => {
      expect(validar({ valor: '1.000.000.000,00' }).erros.valor).toBe(
        MSG_DESPESA.valorLimite,
      );
    });

    it('aceita o limite máximo', () => {
      expect(
        validar({ valor: '999.999.999,99' }).erros.valor,
      ).toBeUndefined();
    });
  });

  describe('título e descrição', () => {
    it('aceita título com 80 caracteres', () => {
      expect(
        validar({ titulo: 'a'.repeat(80) }).erros.titulo,
      ).toBeUndefined();
    });

    it('rejeita título com 81 caracteres', () => {
      expect(validar({ titulo: 'a'.repeat(81) }).erros.titulo).toBe(
        MSG_DESPESA.tituloLongo,
      );
    });

    it('transforma descrição vazia em nula', () => {
      expect(validar({ descricao: '' }).dados?.descricao).toBeNull();
    });

    it('aceita descrição com 255 caracteres', () => {
      expect(
        validar({ descricao: 'd'.repeat(255) }).erros.descricao,
      ).toBeUndefined();
    });

    it('rejeita descrição com 256 caracteres', () => {
      expect(validar({ descricao: 'd'.repeat(256) }).erros.descricao).toBe(
        MSG_DESPESA.descricaoLonga,
      );
    });
  });

  describe('classificação da despesa', () => {
    it('aceita despesa fixa', () => {
      expect(
        validar({ fixaOuVariavel: 'fixa' }).dados?.fixaOuVariavel,
      ).toBe('fixa');
    });

    it('aceita despesa variável', () => {
      expect(
        validar({ fixaOuVariavel: 'variavel' }).dados?.fixaOuVariavel,
      ).toBe('variavel');
    });

    it('converte despesa essencial para 1', () => {
      expect(validar({ essencial: 'essencial' }).dados?.essencial).toBe(1);
    });

    it('converte despesa não essencial para 0', () => {
      expect(
        validar({ essencial: 'nao_essencial' }).dados?.essencial,
      ).toBe(0);
    });
  });

  describe('recorrência', () => {
    const recorrente = {
      recorrente: true,
      intervalo: '1',
      unidade: 'mes' as const,
      termino: '',
    };

    it('aceita recorrência sem término', () => {
      expect(validar(recorrente).dados?.recorrencia).toEqual({
        intervalo: 1,
        unidade: 'mes',
        termino: null,
      });
    });

    it.each(['dia', 'mes', 'ano'] as const)(
      'aceita unidade %s',
      (unidade) => {
        expect(
          validar({ ...recorrente, unidade }).dados?.recorrencia?.unidade,
        ).toBe(unidade);
      },
    );

    it.each(['0', '', 'abc', '-1'])(
      'rejeita intervalo inválido: %s',
      (intervalo) => {
        expect(validar({ ...recorrente, intervalo }).erros.intervalo).toBe(
          MSG_DESPESA.intervaloInvalido,
        );
      },
    );

    it('rejeita término anterior ao início', () => {
      expect(
        validar({ ...recorrente, termino: '15/10/2026' }).erros.termino,
      ).toBe(MSG_DESPESA.terminoAnterior);
    });

    it('aceita término igual ao início', () => {
      expect(
        validar({ ...recorrente, termino: '16/10/2026' }).erros.termino,
      ).toBeUndefined();
    });

    it('aceita término posterior ao início', () => {
      expect(
        validar({ ...recorrente, termino: '16/12/2026' }).erros.termino,
      ).toBeUndefined();
    });

    it('rejeita término com data inválida', () => {
      expect(
        validar({ ...recorrente, termino: '31/02/2027' }).erros.termino,
      ).toBe(MSG_DESPESA.terminoInvalido);
    });

    describe('limite de ocorrências (FA07)', () => {
      it('série diária que passaria de 3700 ocorrências devolve erro em vez de truncar', () => {
        const { erros, dados } = validar({
          ...recorrente,
          unidade: 'dia',
          termino: '31/12/2100',
        });

        expect(erros.termino).toBe(MSG_DESPESA.recorrenciaLonga);
        expect(dados).toBeNull();
      });

      it('série mensal até 2100 está dentro do limite', () => {
        const { erros, dados } = validar({
          ...recorrente,
          unidade: 'mes',
          termino: '31/12/2100',
        });

        expect(erros.termino).toBeUndefined();
        expect(dados?.recorrencia?.termino).toBe('2100-12-31');
      });

      it('série anual longa está dentro do limite', () => {
        expect(
          validar({ ...recorrente, unidade: 'ano', termino: '16/10/2100' })
            .erros.termino,
        ).toBeUndefined();
      });

      it('valor-limite: 3700 ocorrências diárias é aceito e 3701 é rejeitado', () => {
        // 16/10/2026 + 3699 dias = 3700ª ocorrência; + 3700 dias = 3701ª.
        expect(excedeLimiteOcorrencias('2026-10-16', '2036-12-01', 1, 'dia')).toBe(false);
        expect(excedeLimiteOcorrencias('2026-10-16', '2036-12-02', 1, 'dia')).toBe(true);
      });

      it('intervalo maior reduz o número de ocorrências', () => {
        expect(
          validar({
            ...recorrente,
            unidade: 'dia',
            intervalo: '30', // ~900 ocorrências até 2100 (7 em 7 dias ainda passaria de 3700)
            termino: '31/12/2100',
          }).erros.termino,
        ).toBeUndefined();
      });
    });

    it('ignora recorrência quando desativada', () => {
      const { erros, dados } = validar({
        recorrente: false,
        intervalo: '0',
      });

      expect(erros).toEqual({});
      expect(dados?.recorrencia).toBeNull();
    });
  });
});
