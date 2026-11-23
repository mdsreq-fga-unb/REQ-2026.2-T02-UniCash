import { getDb } from '@/db/database';
import { editarReceita, excluirReceita, registrarReceita } from '@/features/receitas/service';
import { editarDespesa, excluirDespesa, registrarDespesa } from '@/features/despesas/service';
import type { DespesaInput } from '@/features/despesas/types';
import {
  calcularResumo,
  FalhaCalculo,
  intervaloDoMes,
  progressoMetasDoMes,
  receitasPorDia,
  saldoDoMes,
  totalDespesasDoMes,
  totalReceitasDoMes,
} from '@/features/resumo/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

// RN06/RN07/RF61: o resumo nunca consulta a nuvem. Se algum módulo do resumo importar o Firebase, o teste quebra.
jest.mock('@/lib/firebase', () => {
  throw new Error('O resumo não pode depender do Firebase');
});
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

function despesa(extra: Partial<DespesaInput> = {}): DespesaInput {
  return {
    data: '2026-10-16',
    titulo: 'Mercado',
    valorCentavos: 5000,
    descricao: null,
    categoriaId: null,
    fixaOuVariavel: 'variavel',
    essencial: 1,
    recorrencia: null,
    ...extra,
  };
}

describe('Resumo financeiro (UC03)', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  it('intervalo do mês cobre [dia 1, dia 1 do mês seguinte), inclusive na virada do ano', () => {
    expect(intervaloDoMes(2026, 10)).toEqual({ inicio: '2026-10-01', fim: '2026-11-01' });
    expect(intervaloDoMes(2026, 12)).toEqual({ inicio: '2026-12-01', fim: '2027-01-01' });
  });

  describe('RF11 - total de receitas por dia e do mês', () => {
    beforeEach(async () => {
      await registrarReceita(input({ data: '2026-10-01', valorCentavos: 10050 }));
      await registrarReceita(input({ data: '2026-10-16', valorCentavos: 2525 }));
      await registrarReceita(input({ data: '2026-10-16', valorCentavos: 7475 }));
      await registrarReceita(input({ data: '2026-10-31', valorCentavos: 1 }));
      // fora do mês
      await registrarReceita(input({ data: '2026-09-30', valorCentavos: 99999 }));
      await registrarReceita(input({ data: '2026-11-01', valorCentavos: 88888 }));
    });

    it('total do mês igual à soma de referência', async () => {
      expect(await totalReceitasDoMes(2026, 10)).toBe(10050 + 2525 + 7475 + 1);
    });

    it('visão por dia mostra só os dias com lançamento, com o total de cada dia', async () => {
      expect(await receitasPorDia(2026, 10)).toEqual([
        { data: '2026-10-01', totalCentavos: 10050 },
        { data: '2026-10-16', totalCentavos: 10000 },
        { data: '2026-10-31', totalCentavos: 1 },
      ]);
    });

    it('a soma dos dias bate com o total do mês', async () => {
      const dias = await receitasPorDia(2026, 10);
      const soma = dias.reduce((s, d) => s + d.totalCentavos, 0);
      expect(soma).toBe(await totalReceitasDoMes(2026, 10));
    });

    it('ignora receitas excluídas', async () => {
      const id = banco.receitas().find((r) => r.data === '2026-10-01').id;
      await excluirReceita(id);
      expect(await totalReceitasDoMes(2026, 10)).toBe(2525 + 7475 + 1);
      expect((await receitasPorDia(2026, 10)).map((d) => d.data)).toEqual(['2026-10-16', '2026-10-31']);
    });
  });

  describe('RF40 - saldo, despesas e metas', () => {
    beforeEach(async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 150000 }));
      await registrarDespesa(despesa({ data: '2026-10-06', valorCentavos: 45090 }));
      await registrarDespesa(despesa({ data: '2026-10-20', valorCentavos: 12345 }));
      await registrarDespesa(despesa({ data: '2026-11-02', valorCentavos: 70000 }));
    });

    it('total de despesas e saldo comparados com valores de referência', async () => {
      expect(await totalDespesasDoMes(2026, 10)).toBe(57435);
      expect(await saldoDoMes(2026, 10)).toBe(150000 - 57435);
    });

    it('saldo negativo quando as despesas superam as receitas', async () => {
      expect(await saldoDoMes(2026, 11)).toBe(-70000);
    });

    it('calcularResumo reúne os mesmos valores das funções isoladas', async () => {
      const r = await calcularResumo(2026, 10);
      expect(r).toEqual({
        ano: 2026,
        mes: 10,
        totalReceitasCentavos: await totalReceitasDoMes(2026, 10),
        totalDespesasCentavos: await totalDespesasDoMes(2026, 10),
        saldoCentavos: await saldoDoMes(2026, 10),
        receitasPorDia: await receitasPorDia(2026, 10),
        metas: await progressoMetasDoMes(2026, 10),
        semLancamentos: false,
      });
    });

    it('progresso das metas é vazio enquanto não existem metas (RF12)', async () => {
      expect(await progressoMetasDoMes(2026, 10)).toEqual([]);
    });

    it('ignora despesas excluídas', async () => {
      const id = banco.despesas().find((d) => d.data === '2026-10-20').id;
      await excluirDespesa(id);
      expect(await totalDespesasDoMes(2026, 10)).toBe(45090);
    });
  });

  describe('fluxos alternativos', () => {
    it('FA01: mês sem receitas tem total zero, e a lista por dia vem vazia', async () => {
      await registrarDespesa(despesa({ data: '2026-10-10', valorCentavos: 3000 }));
      const r = await calcularResumo(2026, 10);
      expect(r.totalReceitasCentavos).toBe(0);
      expect(r.receitasPorDia).toEqual([]);
      expect(r.saldoCentavos).toBe(-3000);
      expect(r.semLancamentos).toBe(false);
    });

    it('FA02: usuário sem lançamentos → semLancamentos e tudo zerado', async () => {
      const r = await calcularResumo(2026, 10);
      expect(r).toMatchObject({
        totalReceitasCentavos: 0,
        totalDespesasCentavos: 0,
        saldoCentavos: 0,
        receitasPorDia: [],
        metas: [],
        semLancamentos: true,
      });
    });

    it('FA02: lançamentos só excluídos contam como sem lançamentos', async () => {
      await registrarReceita(input({ data: '2026-10-10' }));
      await excluirReceita(banco.receitas()[0].id);
      expect((await calcularResumo(2026, 10)).semLancamentos).toBe(true);
    });

    it('mês vazio com lançamentos em outros meses não é estado vazio', async () => {
      await registrarReceita(input({ data: '2026-03-10' }));
      const r = await calcularResumo(2026, 10);
      expect(r.semLancamentos).toBe(false);
      expect(r.totalReceitasCentavos).toBe(0);
    });

    it('FA04: navegação para meses anteriores e futuros inclui lançamentos de data futura', async () => {
      await registrarReceita(input({ data: '2026-08-15', valorCentavos: 1000 }));
      await registrarReceita(input({ data: '2027-01-15', valorCentavos: 2000 }));
      await registrarDespesa(despesa({ data: '2027-01-20', valorCentavos: 500 }));
      expect((await calcularResumo(2026, 8)).totalReceitasCentavos).toBe(1000);
      const futuro = await calcularResumo(2027, 1);
      expect(futuro.totalReceitasCentavos).toBe(2000);
      expect(futuro.totalDespesasCentavos).toBe(500);
      expect(futuro.receitasPorDia).toEqual([{ data: '2027-01-15', totalCentavos: 2000 }]);
    });

    it('FA05: recalcula após editar e excluir lançamentos', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      await registrarDespesa(despesa({ data: '2026-10-06', valorCentavos: 4000 }));
      expect((await calcularResumo(2026, 10)).saldoCentavos).toBe(6000);

      const idReceita = banco.receitas()[0].id;
      const idDespesa = banco.despesas()[0].id;
      await editarReceita(idReceita, input({ data: '2026-10-05', valorCentavos: 12000 }));
      await editarDespesa(idDespesa, despesa({ data: '2026-10-06', valorCentavos: 1000 }));
      let r = await calcularResumo(2026, 10);
      expect(r.totalReceitasCentavos).toBe(12000);
      expect(r.totalDespesasCentavos).toBe(1000);
      expect(r.saldoCentavos).toBe(11000);

      // mover a receita para outro mês tira do resumo de outubro
      await editarReceita(idReceita, input({ data: '2026-11-05', valorCentavos: 12000 }));
      r = await calcularResumo(2026, 10);
      expect(r.totalReceitasCentavos).toBe(0);
      expect((await calcularResumo(2026, 11)).totalReceitasCentavos).toBe(12000);

      await excluirDespesa(idDespesa);
      r = await calcularResumo(2026, 10);
      expect(r.totalDespesasCentavos).toBe(0);
    });

    it('FA03: calcula com a base local, sem conta e sem conexão (o Firebase nem é carregado)', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      expect((await calcularResumo(2026, 10)).totalReceitasCentavos).toBe(10000);
    });
  });

  describe('EX01 - falha na leitura ou no cálculo', () => {
    it('falha ao abrir a base vira FalhaCalculo', async () => {
      (getDb as jest.Mock).mockRejectedValueOnce(new Error('base indisponível'));
      await expect(calcularResumo(2026, 10)).rejects.toBeInstanceOf(FalhaCalculo);
    });

    it('consulta sem resultado vira FalhaCalculo', async () => {
    const api = await getDb();
    const vazia = jest.spyOn(api, 'getFirstAsync').mockResolvedValueOnce(null);
    await expect(calcularResumo(2026, 10)).rejects.toBeInstanceOf(FalhaCalculo);
    vazia.mockRestore();
  });

  it('falha numa consulta vira FalhaCalculo, e tentar de novo recalcula', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      const api = await getDb();
      const original = api.getFirstAsync;
      (api as any).getFirstAsync = jest.fn().mockRejectedValueOnce(new Error('SQLITE_IOERR'));
      await expect(calcularResumo(2026, 10)).rejects.toBeInstanceOf(FalhaCalculo);
      (api as any).getFirstAsync = original;
      expect((await calcularResumo(2026, 10)).totalReceitasCentavos).toBe(10000);
    });
  });

  it('lê todos os totais numa única consulta, sem transação que bloqueie gravações', async () => {
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 2500 }));
    await registrarDespesa(despesa({ data: '2026-10-06', valorCentavos: 4000 }));
    const api = await getDb();
    const primeira = jest.spyOn(api, 'getFirstAsync');
    const todas = jest.spyOn(api, 'getAllAsync');
    const transacao = jest.spyOn(api, 'withExclusiveTransactionAsync');

    const r = await calcularResumo(2026, 10);

    expect(primeira).toHaveBeenCalledTimes(1);
    expect(todas).not.toHaveBeenCalled();
    expect(transacao).not.toHaveBeenCalled();
    expect(r.totalReceitasCentavos).toBe(r.receitasPorDia.reduce((s, d) => s + d.totalCentavos, 0));
    expect(r.receitasPorDia).toEqual([{ data: '2026-10-05', totalCentavos: 12500 }]);
    jest.restoreAllMocks();
  });

  it('gravações durante a abertura do app não falham por causa do resumo', async () => {
    // ao abrir o app, o resumo é calculado enquanto as recorrências são geradas (_layout.tsx)
    await Promise.all([calcularResumo(2026, 10), registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }))]);
    await Promise.all([calcularResumo(2026, 10), registrarDespesa(despesa({ data: '2026-10-06', valorCentavos: 4000 }))]);
    expect(banco.receitas()).toHaveLength(1);
    expect(banco.despesas()).toHaveLength(1);
    expect((await calcularResumo(2026, 10)).saldoCentavos).toBe(6000);
  });

  it('pós-condição: calcular e navegar pelo resumo não altera nenhum dado', async () => {
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
    await registrarDespesa(despesa({ data: '2026-10-06', valorCentavos: 4000 }));
    const antes = banco.instantaneo();
    const gravacoes = banco.chamadas;

    for (const [a, m] of [[2026, 10], [2026, 9], [2026, 11], [2027, 1], [2026, 10]]) {
      await calcularResumo(a, m);
      await totalReceitasDoMes(a, m);
      await totalDespesasDoMes(a, m);
      await saldoDoMes(a, m);
      await receitasPorDia(a, m);
      await progressoMetasDoMes(a, m);
    }

    expect(banco.chamadas).toBe(gravacoes);
    expect(banco.instantaneo()).toEqual(antes);
  });

  it('RNF07: soma de muitos valores com centavos sem diferença de arredondamento', async () => {
    // 0,10 + 0,20 em ponto flutuante dá 0,30000000000000004; em centavos inteiros, não.
    const valores: number[] = [];
    for (let i = 0; i < 300; i++) valores.push(i % 2 === 0 ? 10 : 20);
    for (let i = 1; i <= 100; i++) valores.push(i * 333 + 7); // centavos "quebrados"
    valores.push(99_999_999_999); // valor máximo aceito

    const linha = banco.sqlite.prepare(
      `INSERT INTO receitas (id, valor_centavos, data, titulo, criado_em, atualizado_em)
       VALUES (?, ?, ?, 'x', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')`,
    );
    valores.forEach((v, i) => linha.run(`r${i}`, v, `2026-10-${String((i % 28) + 1).padStart(2, '0')}`));

    const referencia = valores.reduce((s, v) => s + v, 0);
    expect(Number.isSafeInteger(referencia)).toBe(true);
    const r = await calcularResumo(2026, 10);
    expect(r.totalReceitasCentavos).toBe(referencia);
    expect(Number.isInteger(r.totalReceitasCentavos)).toBe(true);
    expect(r.receitasPorDia.reduce((s, d) => s + d.totalCentavos, 0)).toBe(referencia);
  });
});
