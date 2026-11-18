import { calcularSaldo, calcularSaldoAnterior, indicadorSaldo } from '@/features/saldo/calculo';
import { formatarBRL } from '@/features/receitas/money';

describe('saldo mensal', () => {
  it('calcula a diferença entre receitas e despesas', () => {
    expect(calcularSaldo({ receitas: 245000, despesas: 116550 })).toBe(128450);
    expect(calcularSaldo({ receitas: 0, despesas: 0 })).toBe(0);
    expect(formatarBRL(calcularSaldo({ receitas: 100, despesas: 205 }))).toBe('−R$ 1,05');
  });

  it('usa o saldo inicial somente no mês de referência e ignora meses anteriores', () => {
    const inicial = { mes: '2026-10', centavos: -300 };
    const anterior = { receitas: 200, despesas: 200 };
    expect(calcularSaldoAnterior('2026-09', anterior, inicial)).toBeNull();
    expect(calcularSaldoAnterior('2026-10', anterior, inicial)).toBe(-300);
    expect(calcularSaldoAnterior('2026-11', anterior, inicial)).toBe(0);
    expect(calcularSaldoAnterior('2026-11', { receitas: 100, despesas: 200 }, inicial)).toBe(-100);
    expect(calcularSaldoAnterior('2026-11', { receitas: 200, despesas: 100 }, null)).toBe(100);
    expect(calcularSaldoAnterior('2026-11', null, null)).toBeNull();
  });

  it('exibe o percentual com uma casa decimal sem alterar a faixa', () => {
    expect(indicadorSaldo(52, 100).texto).toBe('52,0% da receita disponível');
    expect(indicadorSaldo(8001, 10000)).toEqual({
      cor: '#854D0E',
      texto: '80,0% da receita disponível',
    });
  });

  it.each([
    [91, 100, '#166534'],
    [90, 100, '#854D0E'],
    [81, 100, '#854D0E'],
    [80, 100, '#9A3412'],
    [52, 100, '#9A3412'],
    [50, 100, '#9A3412'],
    [49, 100, '#B91C1C'],
    [0, 100, '#B91C1C'],
    [-1, 100, '#B91C1C'],
    [0, 0, '#171717'],
    [-1, 0, '#171717'],
  ])('usa a faixa correta para saldo %i e receitas %i', (saldo, receitas, cor) => {
    expect(indicadorSaldo(saldo, receitas).cor).toBe(cor);
  });
});
