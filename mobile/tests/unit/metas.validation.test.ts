import {
  EntradaMetaInvalida,
  MSG_META,
  validarDadosMeta,
  validarFormularioMeta,
} from '@/features/metas/validation';
import type { FormMetaValores } from '@/features/metas/types';

const form = (extra: Partial<FormMetaValores> = {}): FormMetaValores => ({
  objetivo: 'Viagem de férias',
  tipo: 'investimento',
  valorAlvo: '1.234,56',
  prazo: '31/12/2027',
  ...extra,
});

describe('validação de metas (UC12)', () => {
  describe('formulário', () => {
    it('aceita dados válidos e converte valor e prazo', () => {
      const r = validarFormularioMeta(form());
      expect(r.erros).toEqual({});
      expect(r.dados).toEqual({
        objetivo: 'Viagem de férias',
        tipo: 'investimento',
        valorAlvoCentavos: 123_456,
        prazo: '2027-12-31',
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
  });

  describe('serviço (defesa em profundidade)', () => {
    it('normaliza objetivo e prazo', () => {
      expect(
        validarDadosMeta({
          objetivo: '  Viagem  ',
          tipo: 'gasto',
          valorAlvoCentavos: 500_000,
          prazo: '2027-01-31',
        }),
      ).toEqual({
        objetivo: 'Viagem',
        tipo: 'gasto',
        valorAlvoCentavos: 500_000,
        prazo: '2027-01-31',
      });
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
      const input = {
        objetivo: 'Viagem',
        tipo: 'gasto' as const,
        valorAlvoCentavos: 1000,
        prazo: '2027-01-31',
        [campo]: valor,
      };
      expect(() => validarDadosMeta(input as never)).toThrow(EntradaMetaInvalida);
      expect(() => validarDadosMeta(input as never)).toThrow(mensagem);
    });
  });
});
