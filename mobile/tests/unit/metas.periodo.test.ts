import {
  periodoAnterior,
  periodoAtualDaMeta,
  periodoDoMes,
  periodoSeguinte,
  periodosDaMeta,
  rotuloPeriodo,
  ultimoDiaDoMes,
} from '@/features/metas/periodo';
import type { Meta } from '@/features/metas/types';

const meta = (inicio: string | null, prazo: string) =>
  ({ inicio, prazo } as Pick<Meta, 'inicio' | 'prazo'>);

describe('períodos mensais da meta (UC12)', () => {
  it('calcula o último dia do mês, incluindo fevereiro bissexto', () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe('2026-02-28');
    expect(ultimoDiaDoMes(2028, 2)).toBe('2028-02-29');
    expect(ultimoDiaDoMes(2026, 12)).toBe('2026-12-31');
  });

  it('primeiro mês é parcial quando a meta começa no meio do mês', () => {
    expect(periodoDoMes(meta('2026-11-25', '2026-12-31'), 2026, 11)).toEqual({
      ano: 2026,
      mes: 11,
      inicio: '2026-11-25',
      fim: '2026-11-30',
    });
  });

  it('último mês é parcial quando o prazo cai no meio do mês', () => {
    expect(periodoDoMes(meta('2026-11-25', '2026-12-15'), 2026, 12)).toEqual({
      ano: 2026,
      mes: 12,
      inicio: '2026-12-01',
      fim: '2026-12-15',
    });
  });

  it('mês fora da vigência não tem período', () => {
    expect(periodoDoMes(meta('2026-11-25', '2026-12-15'), 2026, 10)).toBeNull();
    expect(periodoDoMes(meta('2026-11-25', '2026-12-15'), 2027, 1)).toBeNull();
  });

  it('lista todos os meses da vigência sem ratear o alvo', () => {
    expect(periodosDaMeta(meta('2026-11-25', '2027-01-10'))).toEqual([
      { ano: 2026, mes: 11, inicio: '2026-11-25', fim: '2026-11-30' },
      { ano: 2026, mes: 12, inicio: '2026-12-01', fim: '2026-12-31' },
      { ano: 2027, mes: 1, inicio: '2027-01-01', fim: '2027-01-10' },
    ]);
  });

  it('legado sem início não tem período consultável', () => {
    expect(periodosDaMeta(meta(null, '2027-01-10'))).toEqual([]);
    expect(periodoAtualDaMeta(meta(null, '2027-01-10'), '2026-11-25')).toBeNull();
  });

  it('mês corrente é limitado ao primeiro/último mês da vigência', () => {
    const futuro = meta('2027-01-10', '2027-03-20');
    expect(periodoAtualDaMeta(futuro, '2026-11-25')).toMatchObject({
      ano: 2027,
      mes: 1,
      inicio: '2027-01-10',
      fim: '2027-01-31',
    });

    const passado = meta('2026-01-10', '2026-03-20');
    expect(periodoAtualDaMeta(passado, '2026-11-25')).toMatchObject({
      ano: 2026,
      mes: 3,
      inicio: '2026-03-01',
      fim: '2026-03-20',
    });
  });

  it('rótulo e navegação entre meses', () => {
    const p = { ano: 2026, mes: 12, inicio: '2026-12-01', fim: '2026-12-31' };
    expect(rotuloPeriodo(p)).toBe('Dezembro/2026');
    expect(periodoAnterior(p)).toEqual({ ano: 2026, mes: 11 });
    expect(periodoSeguinte(p)).toEqual({ ano: 2027, mes: 1 });
  });
});
