import { lerMesDeParametros } from '@/features/receitas/dates';

describe('lerMesDeParametros (atalho do resumo para as listas)', () => {
  it('aceita ano e mês válidos vindos da rota', () => {
    expect(lerMesDeParametros('2026', '3')).toEqual({ ano: 2026, mes: 3 });
    expect(lerMesDeParametros('2025', '12')).toEqual({ ano: 2025, mes: 12 });
  });

  it.each([
    [undefined, undefined],
    ['2026', undefined],
    [['2026'], '3'],
    ['26', '3'],
    ['2026', '0'],
    ['2026', '13'],
    ['1800', '1'],
    ['2026', 'mar'],
  ])('rejeita ano %p e mês %p', (ano, mes) => {
    expect(lerMesDeParametros(ano, mes)).toBeNull();
  });
});
