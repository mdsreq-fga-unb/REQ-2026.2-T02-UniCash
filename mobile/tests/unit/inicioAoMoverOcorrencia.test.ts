import { inicioAoMoverOcorrencia } from '@/features/receitas/dates';

describe('inicioAoMoverOcorrencia (editar a data com alcance "todas")', () => {
  const mensal = { inicio: '2026-08-10', intervalo: 1, unidade: 'mes' as const };

  it('mover a primeira ocorrência muda o início para a nova data', () => {
    expect(inicioAoMoverOcorrencia(mensal, '2026-08-10', '2026-03-10')).toBe('2026-03-10');
  });

  it('mover uma ocorrência do meio desloca o início pela mesma quantidade de intervalos', () => {
    expect(inicioAoMoverOcorrencia(mensal, '2026-10-10', '2026-09-10')).toBe('2026-07-10');
    expect(inicioAoMoverOcorrencia(mensal, '2026-10-10', '2026-12-05')).toBe('2026-10-05');
  });

  it('funciona com dias e anos', () => {
    expect(inicioAoMoverOcorrencia({ inicio: '2026-08-01', intervalo: 7, unidade: 'dia' }, '2026-08-15', '2026-08-16')).toBe(
      '2026-08-02',
    );
    expect(inicioAoMoverOcorrencia({ inicio: '2024-05-01', intervalo: 1, unidade: 'ano' }, '2026-05-01', '2026-06-01')).toBe(
      '2024-06-01',
    );
  });

  it('ocorrência fora da grade da série (já movida sozinha) faz a série começar na nova data', () => {
    expect(inicioAoMoverOcorrencia(mensal, '2026-09-15', '2026-04-10')).toBe('2026-04-10');
  });
});
