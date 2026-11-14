
import {
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
    expect(validar({ data: '31/02/2026' }).erros.data).toBeDefined();
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
        expect(validar({ valor }).erros.valor).toBeDefined();
      },
    );

    it('rejeita mais de duas casas decimais', () => {
      expect(validar({ valor: '10,999' }).erros.valor).toBeDefined();
    });

    it('rejeita valor acima do limite', () => {
      expect(
        validar({ valor: '1.000.000.000,00' }).erros.valor,
      ).toBeDefined();
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
      expect(
        validar({ titulo: 'a'.repeat(81) }).erros.titulo,
      ).toBeDefined();
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
      expect(
        validar({ descricao: 'd'.repeat(256) }).erros.descricao,
      ).toBeDefined();
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
        expect(
          validar({ ...recorrente, intervalo }).erros.intervalo,
        ).toBeDefined();
      },
    );

    it('rejeita término anterior ao início', () => {
      expect(
        validar({ ...recorrente, termino: '15/10/2026' }).erros.termino,
      ).toBeDefined();
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
