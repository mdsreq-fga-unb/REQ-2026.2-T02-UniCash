import {
  formatarSaldo,
  percentualMeta,
  percentualMetaExibido,
  rotuloDia,
} from '@/features/resumo/format';

describe('formatação do resumo', () => {
  it('saldo com sinal e 2 casas (RNF07)', () => {
    expect(formatarSaldo(0)).toBe('R$ 0,00');
    expect(formatarSaldo(1)).toBe('+ R$ 0,01');
    expect(formatarSaldo(-1)).toBe('− R$ 0,01');
    expect(formatarSaldo(123456789)).toBe('+ R$ 1.234.567,89');
    expect(formatarSaldo(-100000)).toBe('− R$ 1.000,00');
  });

  it('rótulo do dia com dia da semana', () => {
    expect(rotuloDia('2026-10-16')).toBe('Sex, 16/10');
    expect(rotuloDia('2027-01-03')).toBe('Dom, 03/01');
  });

  it('percentual da meta limitado a 0–100', () => {
    expect(percentualMeta(25000, 100000)).toBe(25);
    expect(percentualMeta(1, 3)).toBe(33);
    expect(percentualMeta(200, 100)).toBe(100);
    expect(percentualMeta(10, 0)).toBe(0);
  });

  it('percentual exibido tem uma casa e pode ultrapassar 100', () => {
    expect(percentualMetaExibido(25000, 100000)).toBe(25.0);
    expect(percentualMetaExibido(99950, 100000)).toBe(100.0);
    expect(percentualMetaExibido(125000, 100000)).toBe(125.0);
    expect(percentualMetaExibido(10, 0)).toBe(0);
  });
});
