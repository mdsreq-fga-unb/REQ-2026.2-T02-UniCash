
import { intervaloDoFiltro } from '@/features/despesas/useDespesas';

describe('intervaloDoFiltro', () => {
  describe('filtro por data', () => {
    it('inclui o dia selecionado', () => {
      expect(
        intervaloDoFiltro({ modo: 'data', data: '2026-11-16' }),
      ).toEqual({
        inicio: '2026-11-16',
        fim: '2026-11-17',
      });
    });

    it('trata corretamente o último dia do mês', () => {
      expect(
        intervaloDoFiltro({ modo: 'data', data: '2026-01-31' }),
      ).toEqual({
        inicio: '2026-01-31',
        fim: '2026-02-01',
      });
    });
  });

  describe('filtro por período', () => {
    it('inclui a data final selecionada', () => {
      expect(
        intervaloDoFiltro({
          modo: 'periodo',
          de: '2026-11-10',
          ate: '2026-11-16',
        }),
      ).toEqual({
        inicio: '2026-11-10',
        fim: '2026-11-17',
      });
    });

    it('trata período que termina em dezembro', () => {
      expect(
        intervaloDoFiltro({
          modo: 'periodo',
          de: '2026-12-20',
          ate: '2026-12-31',
        }),
      ).toEqual({
        inicio: '2026-12-20',
        fim: '2027-01-01',
      });
    });
  });

  describe('filtro por mês', () => {
    it('inclui todo o mês de janeiro', () => {
      expect(
        intervaloDoFiltro({ modo: 'mes', ano: 2026, mes: 1 }),
      ).toEqual({
        inicio: '2026-01-01',
        fim: '2026-02-01',
      });
    });

    it('trata dezembro e a virada do ano', () => {
      expect(
        intervaloDoFiltro({ modo: 'mes', ano: 2026, mes: 12 }),
      ).toEqual({
        inicio: '2026-12-01',
        fim: '2027-01-01',
      });
    });

    it('trata fevereiro de ano bissexto', () => {
      expect(
        intervaloDoFiltro({ modo: 'mes', ano: 2028, mes: 2 }),
      ).toEqual({
        inicio: '2028-02-01',
        fim: '2028-03-01',
      });
    });

    it('trata fevereiro de ano não bissexto', () => {
      expect(
        intervaloDoFiltro({ modo: 'mes', ano: 2027, mes: 2 }),
      ).toEqual({
        inicio: '2027-02-01',
        fim: '2027-03-01',
      });
    });
  });
});
