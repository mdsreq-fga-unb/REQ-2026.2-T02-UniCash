import { posicaoNaSerie } from '@/features/receitas/dates';

describe('posicaoNaSerie (posição da ocorrência editada na série)', () => {
  const mensal = { inicio: '2026-08-10', intervalo: 1, unidade: 'mes' as const };

  it('a primeira ocorrência é a posição 0', () => {
    expect(posicaoNaSerie(mensal, '2026-08-10')).toBe(0);
  });

  it('conta os intervalos até a ocorrência', () => {
    expect(posicaoNaSerie(mensal, '2026-10-10')).toBe(2);
    expect(posicaoNaSerie({ inicio: '2026-08-01', intervalo: 7, unidade: 'dia' }, '2026-08-15')).toBe(2);
    expect(posicaoNaSerie({ inicio: '2024-05-01', intervalo: 1, unidade: 'ano' }, '2026-05-01')).toBe(2);
  });

  it('considera os meses curtos da grade (31/01 → 28/02 → 31/03)', () => {
    const fimDeMes = { inicio: '2026-01-31', intervalo: 1, unidade: 'mes' as const };
    expect(posicaoNaSerie(fimDeMes, '2026-02-28')).toBe(1);
    expect(posicaoNaSerie(fimDeMes, '2026-03-31')).toBe(2);
  });

  it('data fora da grade (ocorrência já movida sozinha) retorna null', () => {
    expect(posicaoNaSerie(mensal, '2026-09-15')).toBeNull();
    expect(posicaoNaSerie(mensal, '2026-07-10')).toBeNull();
  });
});
