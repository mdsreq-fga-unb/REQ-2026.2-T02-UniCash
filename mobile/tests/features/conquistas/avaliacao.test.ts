import { avaliar } from '@/features/conquistas/avaliacao';
import { METAS_EXEMPLO } from '@/features/conquistas/metas';
import type { TotaisMes } from '@/features/conquistas/types';

const mes = (m: string, receitas: number, despesas: number): TotaisMes => ({
  mes: m,
  receitasCentavos: receitas,
  despesasCentavos: despesas,
});

describe('avaliar (UC13, RF44 e RF45)', () => {
  it('mês com receitas maiores que despesas gera o selo "No verde" no último dia do mês', () => {
    const r = avaliar({ meses: [mes('2026-10', 320000, 278000)], metas: [] });
    expect(r.selos).toEqual([
      {
        chave: 'no-verde:2026-10',
        marco: 'no-verde',
        nome: 'No verde em outubro',
        descricao: 'Fechou o mês com saldo positivo',
        data: '2026-10-31',
        referencia: { tipo: 'mes', mes: '2026-10', receitasCentavos: 320000, despesasCentavos: 278000, saldoCentavos: 42000 },
      },
    ]);
  });

  it('último dia considera meses de 28, 29 e 30 dias', () => {
    const r = avaliar({ meses: [mes('2028-02', 2, 1), mes('2026-09', 2, 1)], metas: [] });
    expect(r.selos.map((s) => s.data)).toEqual(['2028-02-29', '2026-09-30']);
  });

  it.each([
    ['saldo zero', mes('2026-10', 1000, 1000)],
    ['saldo negativo', mes('2026-10', 1000, 1001)],
    ['mês sem lançamentos', mes('2026-10', 0, 0)],
  ])('%s não gera selo', (_, m) => {
    expect(avaliar({ meses: [m], metas: [] }).selos).toEqual([]);
  });

  it('sem metas: nenhum ponto e nenhum selo "Primeira meta concluída"', () => {
    const r = avaliar({ meses: [], metas: [] });
    expect(r).toEqual({ totalPontos: 0, metasConcluidas: 0, pontosPorMeta: 100, selos: [], pontuacoes: [] });
  });

  it('três metas: 300 pontos e um único selo de primeira meta, com a data da mais antiga', () => {
    const r = avaliar({ meses: [], metas: METAS_EXEMPLO });
    expect(r.totalPontos).toBe(300);
    expect(r.metasConcluidas).toBe(3);
    expect(r.selos).toHaveLength(1);
    expect(r.selos[0]).toMatchObject({
      chave: 'primeira-meta',
      data: '2026-09-12',
      referencia: { tipo: 'meta', metaId: 'viagem', titulo: 'Viagem de julho' },
    });
    expect(r.pontuacoes.map((p) => [p.concluidaEm, p.titulo, p.pontos])).toEqual([
      ['2026-10-15', 'Reserva de emergência', 100],
      ['2026-10-02', 'Celular novo', 100],
      ['2026-09-12', 'Viagem de julho', 100],
    ]);
  });

  it('ordena selos por data decrescente, como no protótipo [CQ1]', () => {
    const r = avaliar({
      meses: [mes('2026-09', 2, 1), mes('2026-10', 2, 1)],
      metas: [{ id: 'm', titulo: 'Meta', concluidaEm: '2026-10-15' }],
    });
    expect(r.selos.map((s) => [s.nome, s.data])).toEqual([
      ['No verde em outubro', '2026-10-31'],
      ['Primeira meta concluída', '2026-10-15'],
      ['No verde em setembro', '2026-09-30'],
    ]);
  });

  it('entrada repetida não duplica selo nem pontos (FA02, FA03)', () => {
    const r = avaliar({
      meses: [mes('2026-10', 2, 1), mes('2026-10', 2, 1)],
      metas: [METAS_EXEMPLO[0], METAS_EXEMPLO[0]],
    });
    expect(r.selos.map((s) => s.chave)).toEqual(['no-verde:2026-10', 'primeira-meta']);
    expect(r.totalPontos).toBe(100);
  });
});
