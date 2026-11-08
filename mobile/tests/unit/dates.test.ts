import {
  adicionarDias,
  adicionarIntervalo,
  adicionarMeses,
  formatarBR,
  mascararData,
  mesAnterior,
  nomeMes,
  parseBR,
  primeiroDiaDoMes,
  proximoMes,
} from '@/features/receitas/dates';

describe('datas', () => {
  it('converte DD/MM/AAAA em AAAA-MM-DD e volta', () => {
    expect(parseBR('16/10/2026')).toBe('2026-10-16');
    expect(formatarBR('2026-10-16')).toBe('16/10/2026');
  });

  it.each(['', '16/10/26', '2026-10-16', '31/02/2026', '00/10/2026', '16/13/2026', '29/02/2025'])(
    'rejeita "%s"',
    (t) => expect(parseBR(t)).toBeNull(),
  );

  it('aceita 29/02 em ano bissexto', () => {
    expect(parseBR('29/02/2024')).toBe('2024-02-29');
  });

  it('aplica a máscara enquanto digita', () => {
    expect(mascararData('1')).toBe('1');
    expect(mascararData('1610')).toBe('16/10');
    expect(mascararData('16102026')).toBe('16/10/2026');
    expect(mascararData('16/10/2026999')).toBe('16/10/2026');
  });

  it('soma dias atravessando mês e ano', () => {
    expect(adicionarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(adicionarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(adicionarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('soma meses preservando o dia quando possível e usando o último dia quando não', () => {
    expect(adicionarMeses('2026-01-15', 1)).toBe('2026-02-15');
    expect(adicionarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(adicionarMeses('2024-01-31', 1)).toBe('2024-02-29');
    expect(adicionarMeses('2026-11-30', 3)).toBe('2027-02-28');
    expect(adicionarMeses('2026-10-16', 12)).toBe('2027-10-16');
  });

  it('soma intervalo por unidade a partir da data inicial (sem acumular arredondamento)', () => {
    expect(adicionarIntervalo('2026-10-01', 10, 'dia')).toBe('2026-10-11');
    expect(adicionarIntervalo('2026-01-31', 2, 'mes')).toBe('2026-03-31');
    expect(adicionarIntervalo('2024-02-29', 1, 'ano')).toBe('2025-02-28');
    expect(adicionarIntervalo('2024-02-29', 4, 'ano')).toBe('2028-02-29');
  });

  it('navega entre meses', () => {
    expect(proximoMes(2026, 12)).toEqual({ ano: 2027, mes: 1 });
    expect(mesAnterior(2026, 1)).toEqual({ ano: 2025, mes: 12 });
    expect(primeiroDiaDoMes(2026, 3)).toBe('2026-03-01');
    expect(nomeMes(2026, 10)).toBe('Outubro/2026');
  });
});
