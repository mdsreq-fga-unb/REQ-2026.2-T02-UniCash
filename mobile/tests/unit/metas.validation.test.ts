import {
  EntradaMetaInvalida,
  MSG_META,
  derivarInicioDeCriadoEm,
  parseValorAcumulado,
  validarDadosMeta,
  validarFormularioMeta,
} from '@/features/metas/validation';
import type { FormMetaValores, MetaInput } from '@/features/metas/types';

const form = (extra: Partial<FormMetaValores> = {}): FormMetaValores => ({
  objetivo: 'Viagem de férias',
  tipo: 'gasto',
  valorAlvo: '1.234,56',
  prazo: '31/12/2027',
  categoriaId: 'c1',
  valorAcumulado: '',
  ...extra,
});

const input = (extra: Partial<MetaInput> = {}): MetaInput => ({
  objetivo: 'Viagem',
  tipo: 'gasto',
  valorAlvoCentavos: 100_000,
  prazo: '2027-01-31',
  categoriaId: 'c1',
  valorAcumuladoCentavos: null,
  ...extra,
});

describe('validação de metas (UC12)', () => {
  describe('formulário', () => {
    it('aceita gasto válido e converte valor, prazo e categoria', () => {
      const r = validarFormularioMeta(form());
      expect(r.erros).toEqual({});
      expect(r.dados).toEqual({
        objetivo: 'Viagem de férias',
        tipo: 'gasto',
        valorAlvoCentavos: 123_456,
        prazo: '2027-12-31',
        categoriaId: 'c1',
        valorAcumuladoCentavos: null,
      });
    });

    it('aceita investimento com valor acumulado zero', () => {
      const r = validarFormularioMeta(
        form({ tipo: 'investimento', categoriaId: '', valorAcumulado: '0,00' }),
      );
      expect(r.erros).toEqual({});
      expect(r.dados).toMatchObject({
        tipo: 'investimento',
        categoriaId: null,
        valorAcumuladoCentavos: 0,
      });
    });

    it('remove espaços das pontas do objetivo', () => {
      const r = validarFormularioMeta(form({ objetivo: '  Reserva  ' }));
      expect(r.dados?.objetivo).toBe('Reserva');
    });

    it('objetivo vazio ou só com espaços', () => {
      const r = validarFormularioMeta(form({ objetivo: '   ' }));
      expect(r.erros.objetivo).toBe(MSG_META.objetivoVazio);
      expect(r.dados).toBeNull();
    });

    it('objetivo com 80 caracteres é aceito e 81 é rejeitado', () => {
      const ok = 'a'.repeat(80);
      expect(validarFormularioMeta(form({ objetivo: ok })).dados?.objetivo).toBe(ok);
      const r = validarFormularioMeta(form({ objetivo: 'a'.repeat(81) }));
      expect(r.erros.objetivo).toBe(MSG_META.objetivoLongo);
    });

    it('conta caracteres por code point (80 emojis aceitos, 81 rejeitados)', () => {
      const ok = '😀'.repeat(80);
      expect(validarFormularioMeta(form({ objetivo: ok })).dados?.objetivo).toBe(ok);
      const r = validarFormularioMeta(form({ objetivo: '😀'.repeat(81) }));
      expect(r.erros.objetivo).toBe(MSG_META.objetivoLongo);
    });

    it('gasto exige categoria', () => {
      const r = validarFormularioMeta(form({ categoriaId: '' }));
      expect(r.erros.categoriaId).toBe(MSG_META.categoriaVazia);
      expect(r.dados).toBeNull();
    });

    it('valor vazio', () => {
      const r = validarFormularioMeta(form({ valorAlvo: '' }));
      expect(r.erros.valorAlvo).toBe(MSG_META.valorVazio);
    });

    it.each(['0', '-1', '1,234', 'abc'])('valor inválido: %s', (valor) => {
      const r = validarFormularioMeta(form({ valorAlvo: valor }));
      expect(r.erros.valorAlvo).toBe(MSG_META.valorInvalido);
    });

    it('valor acima do teto', () => {
      const r = validarFormularioMeta(form({ valorAlvo: '1.000.000.000,00' }));
      expect(r.erros.valorAlvo).toBe(MSG_META.valorLimite);
    });

    it('aceita os valores-limite de R$ 0,01 e R$ 999.999.999,99', () => {
      expect(validarFormularioMeta(form({ valorAlvo: '0,01' })).dados?.valorAlvoCentavos).toBe(1);
      expect(
        validarFormularioMeta(form({ valorAlvo: '999.999.999,99' })).dados?.valorAlvoCentavos,
      ).toBe(99_999_999_999);
    });

    it('prazo vazio', () => {
      const r = validarFormularioMeta(form({ prazo: '' }));
      expect(r.erros.prazo).toBe(MSG_META.prazoVazio);
    });

    it('prazo com formato inválido ou data inexistente', () => {
      expect(validarFormularioMeta(form({ prazo: '2026-12-31' })).erros.prazo).toBe(
        MSG_META.prazoInvalido,
      );
      expect(validarFormularioMeta(form({ prazo: '31/02/2026' })).erros.prazo).toBe(
        MSG_META.prazoInvalido,
      );
    });

    it('tipo inválido', () => {
      const r = validarFormularioMeta(form({ tipo: 'outro' as never }));
      expect(r.erros.tipo).toBe(MSG_META.tipoInvalido);
    });

    it('rejeita valor acumulado negativo e acima do teto', () => {
      expect(
        validarFormularioMeta(
          form({ tipo: 'investimento', valorAcumulado: '-1,00' }),
        ).erros.valorAcumulado,
      ).toBe(MSG_META.valorAcumuladoInvalido);
      expect(
        validarFormularioMeta(
          form({ tipo: 'investimento', valorAcumulado: '1.000.000.000,00' }),
        ).erros.valorAcumulado,
      ).toBe(MSG_META.valorAcumuladoLimite);
    });

    it('investimento vazio significa não informado', () => {
      const r = validarFormularioMeta(
        form({ tipo: 'investimento', categoriaId: '', valorAcumulado: '   ' }),
      );
      expect(r.dados?.valorAcumuladoCentavos).toBeNull();
    });
  });

  describe('serviço (defesa em profundidade)', () => {
    it('normaliza objetivo e prazo', () => {
      expect(
        validarDadosMeta({
          objetivo: '  Viagem  ',
          tipo: 'gasto',
          valorAlvoCentavos: 500_000,
          prazo: '2027-01-31',
          categoriaId: 'c1',
        }),
      ).toEqual({
        objetivo: 'Viagem',
        tipo: 'gasto',
        valorAlvoCentavos: 500_000,
        prazo: '2027-01-31',
        categoriaId: 'c1',
        valorAcumuladoCentavos: null,
      });
    });

    it('rejeita tipo diferente do atual', () => {
      expect(() =>
        validarDadosMeta(input({ tipo: 'investimento' }), { tipoAtual: 'gasto' }),
      ).toThrow(MSG_META.tipoImutavel);
    });

    it('gasto exige categoria e não aceita acumulado', () => {
      expect(() => validarDadosMeta(input({ categoriaId: null }))).toThrow(
        MSG_META.categoriaVazia,
      );
      expect(() =>
        validarDadosMeta(input({ valorAcumuladoCentavos: 0 })),
      ).toThrow(MSG_META.valorAcumuladoNaoSeAplica);
    });

    it('investimento não aceita categoria e aceita acumulado zero', () => {
      expect(() =>
        validarDadosMeta(input({ tipo: 'investimento', categoriaId: 'c1' })),
      ).toThrow(MSG_META.categoriaNaoSeAplica);
      expect(
        validarDadosMeta(
          input({
            tipo: 'investimento',
            categoriaId: null,
            valorAcumuladoCentavos: 0,
          }),
        ),
      ).toMatchObject({ valorAcumuladoCentavos: 0 });
    });

    it.each([
      ['objetivo', '', MSG_META.objetivoVazio],
      ['objetivo', 'a'.repeat(81), MSG_META.objetivoLongo],
      ['valorAlvoCentavos', 0, MSG_META.valorInvalido],
      ['valorAlvoCentavos', -1, MSG_META.valorInvalido],
      ['valorAlvoCentavos', 1.5, MSG_META.valorInvalido],
      ['valorAlvoCentavos', 100_000_000_000, MSG_META.valorLimite],
      ['prazo', '', MSG_META.prazoVazio],
      ['prazo', '2026-02-31', MSG_META.prazoInvalido],
      ['tipo', 'outro', MSG_META.tipoInvalido],
    ])('rejeita %s inválido', (campo, valor, mensagem) => {
      const dados = { ...input(), [campo]: valor };
      expect(() => validarDadosMeta(dados as never)).toThrow(EntradaMetaInvalida);
      expect(() => validarDadosMeta(dados as never)).toThrow(mensagem);
    });
  });

  describe('compatibilidade e valor acumulado', () => {
    it('deriva início de criado_em somente quando a data é válida', () => {
      expect(derivarInicioDeCriadoEm('2026-01-10T12:00:00.000Z')).toBe('2026-01-10');
      expect(derivarInicioDeCriadoEm('data-invalida')).toBeNull();
      expect(derivarInicioDeCriadoEm('2026-02-31T00:00:00.000Z')).toBeNull();
    });

    it('parse do acumulado aceita zero, rejeita negativo e preserva o limite', () => {
      expect(parseValorAcumulado('0')).toEqual({ ok: true, centavos: 0 });
      expect(parseValorAcumulado('0,00')).toEqual({ ok: true, centavos: 0 });
      expect(parseValorAcumulado('10,50')).toEqual({ ok: true, centavos: 1050 });
      expect(parseValorAcumulado('-1,00')).toEqual({ ok: false, erro: 'invalido' });
      expect(parseValorAcumulado('1.000.000.000,00')).toEqual({
        ok: false,
        erro: 'limite',
      });
    });
  });
});
