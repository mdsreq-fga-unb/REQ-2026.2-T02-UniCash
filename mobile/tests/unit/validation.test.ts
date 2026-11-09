import { validarFormulario, MSG } from '@/features/receitas/validation';
import { form } from '../helpers/dados';

const validar = (extra = {}) => validarFormulario(form(extra), { permitirRecorrencia: true });

describe('validação do formulário (EX01, RN08 a RN10, RN19)', () => {
  it('aceita campos válidos e normaliza os dados', () => {
    const { erros, dados } = validar({ titulo: '  Freela de design  ' });
    expect(erros).toEqual({});
    expect(dados).toEqual({
      data: '2026-10-16',
      titulo: 'Freela de design',
      valorCentavos: 15000,
      descricao: null,
      recorrencia: null,
    });
  });

  describe('campos obrigatórios (RN08)', () => {
    it('data não informada', () => {
      const { erros, dados } = validar({ data: '' });
      expect(erros.data).toBe('Informe a data da receita.');
      expect(dados).toBeNull();
    });

    it('data com formato ou dia inexistente', () => {
      expect(validar({ data: '31/02/2026' }).erros.data).toBe(MSG.dataInvalida);
      expect(validar({ data: '16/10' }).erros.data).toBe(MSG.dataInvalida);
    });

    it('título não informado', () => {
      expect(validar({ titulo: '' }).erros.titulo).toBe('Informe o título da receita.');
    });

    it('título só com espaços', () => {
      expect(validar({ titulo: '     ' }).erros.titulo).toBe('Informe o título da receita.');
    });

    it('valor não informado', () => {
      expect(validar({ valor: '' }).erros.valor).toBe('Informe o valor da receita.');
    });
  });

  describe('valor (RN09)', () => {
    const msg = 'O valor deve ser maior que zero, com no máximo duas casas decimais.';
    it.each(['0', '0,00', '-10'])('rejeita valor menor ou igual a zero: %s', (valor) => {
      expect(validar({ valor }).erros.valor).toBe(msg);
    });

    it('rejeita mais de duas casas decimais', () => {
      expect(validar({ valor: '10,999' }).erros.valor).toBe(msg);
    });

    it('rejeita valor acima do limite', () => {
      expect(validar({ valor: '1.000.000.000,00' }).erros.valor).toBe('O valor máximo permitido é R$ 999.999.999,99.');
    });

    it('aceita o limite exato', () => {
      expect(validar({ valor: '999.999.999,99' }).erros.valor).toBeUndefined();
    });
  });

  describe('título e descrição (RN10)', () => {
    it('título com exatamente 80 caracteres é aceito', () => {
      expect(validar({ titulo: 'a'.repeat(80) }).erros.titulo).toBeUndefined();
    });

    it('título com mais de 80 caracteres é rejeitado', () => {
      expect(validar({ titulo: 'a'.repeat(81) }).erros.titulo).toBe('O título deve ter até 80 caracteres.');
    });

    it('descrição vazia é aceita e vira nula', () => {
      const { erros, dados } = validar({ descricao: '' });
      expect(erros.descricao).toBeUndefined();
      expect(dados?.descricao).toBeNull();
    });

    it('descrição só com espaços vira nula', () => {
      expect(validar({ descricao: '   ' }).dados?.descricao).toBeNull();
    });

    it('descrição com 255 caracteres é aceita', () => {
      const { erros, dados } = validar({ descricao: 'd'.repeat(255) });
      expect(erros.descricao).toBeUndefined();
      expect(dados?.descricao).toHaveLength(255);
    });

    it('descrição com mais de 255 caracteres é rejeitada', () => {
      expect(validar({ descricao: 'd'.repeat(256) }).erros.descricao).toBe('A descrição deve ter até 255 caracteres.');
    });
  });

  describe('recorrência (RN19)', () => {
    const rec = { recorrente: true, intervalo: '1', unidade: 'mes' as const, termino: '' };

    it('aceita recorrência sem data de término', () => {
      const { dados } = validar(rec);
      expect(dados?.recorrencia).toEqual({ intervalo: 1, unidade: 'mes', termino: null });
    });

    it.each(['dia', 'mes', 'ano'] as const)('aceita a unidade %s', (unidade) => {
      expect(validar({ ...rec, unidade }).dados?.recorrencia?.unidade).toBe(unidade);
    });

    it.each(['0', '', '00', 'abc', '-1'])('rejeita intervalo "%s"', (intervalo) => {
      const { erros, dados } = validar({ ...rec, intervalo });
      expect(erros.intervalo).toBe('O intervalo da recorrência deve ser maior que zero.');
      expect(dados).toBeNull();
    });

    it('rejeita término anterior ao início', () => {
      const { erros } = validar({ ...rec, termino: '15/10/2026' });
      expect(erros.termino).toBe('A data de término deve ser igual ou posterior à data de início.');
    });

    it('aceita término igual ao início', () => {
      const { erros, dados } = validar({ ...rec, termino: '16/10/2026' });
      expect(erros.termino).toBeUndefined();
      expect(dados?.recorrencia?.termino).toBe('2026-10-16');
    });

    it('aceita término posterior ao início', () => {
      expect(validar({ ...rec, termino: '16/12/2026' }).dados?.recorrencia?.termino).toBe('2026-12-16');
    });

    it('rejeita término com formato inválido', () => {
      expect(validar({ ...rec, termino: '31/02/2027' }).erros.termino).toBe(MSG.terminoInvalido);
    });

    it('ignora os campos de recorrência quando o interruptor está desligado', () => {
      const { erros, dados } = validar({ recorrente: false, intervalo: '0', termino: '01/01/2000' });
      expect(erros).toEqual({});
      expect(dados?.recorrencia).toBeNull();
    });
  });

  it('mostra o motivo de cada campo inválido ao mesmo tempo (EX01)', () => {
    const { erros, dados } = validar({ data: '', titulo: '', valor: '', descricao: 'x'.repeat(300) });
    expect(Object.keys(erros).sort()).toEqual(['data', 'descricao', 'titulo', 'valor']);
    expect(dados).toBeNull();
  });
});
