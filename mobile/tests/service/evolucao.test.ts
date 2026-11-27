import { getDb } from '@/db/database';
import { editarReceita, excluirReceita, registrarReceita } from '@/features/receitas/service';
import { editarDespesa, excluirDespesa, registrarDespesa } from '@/features/despesas/service';
import type { DespesaInput } from '@/features/despesas/types';
import {
  ajustarFimDaJanela,
  calcularEvolucao,
  FalhaEvolucao,
  MESES_NO_GRAFICO,
  mesesDaJanela,
} from '@/features/evolucao/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

// RN06/RN07/RF61: a evolução nunca consulta a nuvem. Os serviços usados para montar a massa de teste
// carregam o Firebase pelos alertas da UC05; qualquer uso de sessão ou Firestore quebra o teste.
jest.mock('@/lib/firebase', () => ({
  get auth() {
    throw new Error('A evolução mensal não pode consultar a sessão');
  },
  get db() {
    throw new Error('A evolução mensal não pode consultar o Firestore');
  },
}));
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

/** Totais de um mês da série, para comparar com a soma de referência. */
async function mes(fimAno: number, fimMes: number, ano: number, m: number) {
  const r = await calcularEvolucao(fimAno, fimMes);
  return r.meses.find((x) => x.ano === ano && x.mes === m);
}

describe('Evolução mensal (UC07)', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  describe('janela do gráfico (RN12, FA05)', () => {
    it('tem 6 meses: o mês final e os 5 anteriores, em ordem crescente', () => {
      expect(MESES_NO_GRAFICO).toBe(6);
      expect(mesesDaJanela({ ano: 2026, mes: 10 })).toEqual([
        { ano: 2026, mes: 5 },
        { ano: 2026, mes: 6 },
        { ano: 2026, mes: 7 },
        { ano: 2026, mes: 8 },
        { ano: 2026, mes: 9 },
        { ano: 2026, mes: 10 },
      ]);
    });

    it('atravessa a virada do ano', () => {
      expect(mesesDaJanela({ ano: 2027, mes: 2 })).toEqual([
        { ano: 2026, mes: 9 },
        { ano: 2026, mes: 10 },
        { ano: 2026, mes: 11 },
        { ano: 2026, mes: 12 },
        { ano: 2027, mes: 1 },
        { ano: 2027, mes: 2 },
      ]);
    });

    it('mês dentro da janela não desloca a janela', () => {
      const fim = { ano: 2026, mes: 10 };
      expect(ajustarFimDaJanela(fim, { ano: 2026, mes: 10 })).toBe(fim);
      expect(ajustarFimDaJanela(fim, { ano: 2026, mes: 5 })).toBe(fim);
    });

    it('FA05: mês fora da janela faz a janela terminar nele, para frente e para trás', () => {
      const fim = { ano: 2026, mes: 10 };
      expect(ajustarFimDaJanela(fim, { ano: 2026, mes: 11 })).toEqual({ ano: 2026, mes: 11 });
      expect(ajustarFimDaJanela(fim, { ano: 2026, mes: 4 })).toEqual({ ano: 2026, mes: 4 });
      expect(ajustarFimDaJanela(fim, { ano: 2025, mes: 10 })).toEqual({ ano: 2025, mes: 10 });
    });
  });

  describe('RF68 - totais de receitas e despesas de cada mês', () => {
    beforeEach(async () => {
      await registrarReceita(input({ data: '2026-10-01', valorCentavos: 10050 }));
      await registrarReceita(input({ data: '2026-10-31', valorCentavos: 2525 }));
      await registrarReceita(input({ data: '2026-07-15', valorCentavos: 7475 }));
      await registrarDespesa(despesa({ data: '2026-10-10', valorCentavos: 4000 }));
      await registrarDespesa(despesa({ data: '2026-05-01', valorCentavos: 1234 }));
      await registrarDespesa(despesa({ data: '2026-05-31', valorCentavos: 66 }));
    });

    it('cada mês bate com a soma de referência', async () => {
      const r = await calcularEvolucao(2026, 10);
      expect(r.meses).toEqual([
        { ano: 2026, mes: 5, receitasCentavos: 0, despesasCentavos: 1234 + 66 },
        { ano: 2026, mes: 6, receitasCentavos: 0, despesasCentavos: 0 },
        { ano: 2026, mes: 7, receitasCentavos: 7475, despesasCentavos: 0 },
        { ano: 2026, mes: 8, receitasCentavos: 0, despesasCentavos: 0 },
        { ano: 2026, mes: 9, receitasCentavos: 0, despesasCentavos: 0 },
        { ano: 2026, mes: 10, receitasCentavos: 10050 + 2525, despesasCentavos: 4000 },
      ]);
      expect(r).toMatchObject({ fimAno: 2026, fimMes: 10, semLancamentos: false });
    });

    it('ignora lançamentos excluídos', async () => {
      await excluirReceita(banco.receitas().find((x) => x.data === '2026-10-01').id);
      await excluirDespesa(banco.despesas().find((x) => x.data === '2026-05-01').id);
      expect(await mes(2026, 10, 2026, 10)).toMatchObject({ receitasCentavos: 2525 });
      expect(await mes(2026, 10, 2026, 5)).toMatchObject({ despesasCentavos: 66 });
    });

    it('lê tudo numa única consulta, sem transação', async () => {
      const api = await getDb();
      const primeira = jest.spyOn(api, 'getFirstAsync');
      const transacao = jest.spyOn(api, 'withExclusiveTransactionAsync');
      await calcularEvolucao(2026, 10);
      expect(primeira).toHaveBeenCalledTimes(1);
      expect(transacao).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  it('com mais de 6 meses de dados, mostra só o mês final e os 5 anteriores', async () => {
    for (let m = 1; m <= 12; m++) {
      await registrarReceita(input({ data: `2026-${String(m).padStart(2, '0')}-10`, valorCentavos: m * 100 }));
    }
    const r = await calcularEvolucao(2026, 9);
    expect(r.meses).toHaveLength(6);
    expect(r.meses.map((x) => x.mes)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(r.meses.map((x) => x.receitasCentavos)).toEqual([400, 500, 600, 700, 800, 900]);
  });

  describe('fluxos alternativos', () => {
    it('FA01: mês sem receitas ou sem despesas tem a barra zerada', async () => {
      await registrarReceita(input({ data: '2026-09-05', valorCentavos: 1000 }));
      await registrarDespesa(despesa({ data: '2026-10-05', valorCentavos: 500 }));
      expect(await mes(2026, 10, 2026, 9)).toMatchObject({ receitasCentavos: 1000, despesasCentavos: 0 });
      expect(await mes(2026, 10, 2026, 10)).toMatchObject({ receitasCentavos: 0, despesasCentavos: 500 });
    });

    it('FA02: sem nenhum lançamento, marca semLancamentos e zera todos os meses', async () => {
      const r = await calcularEvolucao(2026, 10);
      expect(r.semLancamentos).toBe(true);
      expect(r.meses.every((x) => x.receitasCentavos === 0 && x.despesasCentavos === 0)).toBe(true);
    });

    it('FA02: lançamentos fora da janela não são estado vazio', async () => {
      await registrarReceita(input({ data: '2025-01-10' }));
      expect((await calcularEvolucao(2026, 10)).semLancamentos).toBe(false);
    });

    it('FA03: calcula com a base local, sem conta e sem conexão (o Firebase nem é carregado)', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      expect(await mes(2026, 10, 2026, 10)).toMatchObject({ receitasCentavos: 10000 });
    });

    it('FA04: lançamentos de data futura contam no mês deles', async () => {
      await registrarReceita(input({ data: '2027-02-20', valorCentavos: 3000 }));
      await registrarDespesa(despesa({ data: '2027-01-02', valorCentavos: 700 }));
      const r = await calcularEvolucao(2027, 2);
      expect(r.meses.at(-1)).toMatchObject({ ano: 2027, mes: 2, receitasCentavos: 3000 });
      expect(r.meses.at(-2)).toMatchObject({ ano: 2027, mes: 1, despesasCentavos: 700 });
    });

    it('FA06: recalcula após editar e excluir lançamentos', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      await registrarDespesa(despesa({ data: '2026-09-06', valorCentavos: 4000 }));
      const idReceita = banco.receitas()[0].id;
      const idDespesa = banco.despesas()[0].id;

      await editarReceita(idReceita, input({ data: '2026-08-05', valorCentavos: 12000 }));
      await editarDespesa(idDespesa, despesa({ data: '2026-09-06', valorCentavos: 1000 }));
      expect(await mes(2026, 10, 2026, 10)).toMatchObject({ receitasCentavos: 0 });
      expect(await mes(2026, 10, 2026, 8)).toMatchObject({ receitasCentavos: 12000 });
      expect(await mes(2026, 10, 2026, 9)).toMatchObject({ despesasCentavos: 1000 });

      await excluirDespesa(idDespesa);
      expect(await mes(2026, 10, 2026, 9)).toMatchObject({ despesasCentavos: 0 });
    });
  });

  describe('EX01 - falha na leitura ou no cálculo', () => {
    it('falha ao abrir a base vira FalhaEvolucao', async () => {
      (getDb as jest.Mock).mockRejectedValueOnce(new Error('base indisponível'));
      await expect(calcularEvolucao(2026, 10)).rejects.toBeInstanceOf(FalhaEvolucao);
    });

    it('consulta sem resultado vira FalhaEvolucao, e tentar de novo recalcula', async () => {
      await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
      const api = await getDb();
      const vazia = jest.spyOn(api, 'getFirstAsync').mockResolvedValueOnce(null);
      await expect(calcularEvolucao(2026, 10)).rejects.toBeInstanceOf(FalhaEvolucao);
      vazia.mockRestore();
      expect(await mes(2026, 10, 2026, 10)).toMatchObject({ receitasCentavos: 10000 });
    });
  });

  it('pós-condição: calcular e navegar pelo gráfico não altera nenhum dado', async () => {
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 10000 }));
    await registrarDespesa(despesa({ data: '2026-09-06', valorCentavos: 4000 }));
    const antes = banco.instantaneo();
    const gravacoes = banco.chamadas;

    for (const [a, m] of [[2026, 10], [2026, 4], [2026, 11], [2027, 3], [2026, 10]]) {
      await calcularEvolucao(a, m);
    }

    expect(banco.chamadas).toBe(gravacoes);
    expect(banco.instantaneo()).toEqual(antes);
  });

  it('RNF07: soma de muitos valores com centavos sem diferença de arredondamento', async () => {
    const valores: number[] = [];
    for (let i = 0; i < 300; i++) valores.push(i % 2 === 0 ? 10 : 20);
    for (let i = 1; i <= 100; i++) valores.push(i * 333 + 7);
    valores.push(99_999_999_999);

    const linhaReceita = banco.sqlite.prepare(
      `INSERT INTO receitas (id, valor_centavos, data, titulo, criado_em, atualizado_em)
       VALUES (?, ?, ?, 'x', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')`,
    );
    valores.forEach((v, i) => linhaReceita.run(`r${i}`, v, `2026-10-${String((i % 28) + 1).padStart(2, '0')}`));

    const referencia = valores.reduce((s, v) => s + v, 0);
    expect(Number.isSafeInteger(referencia)).toBe(true);
    const outubro = await mes(2026, 10, 2026, 10);
    expect(outubro?.receitasCentavos).toBe(referencia);
    expect(Number.isInteger(outubro?.receitasCentavos)).toBe(true);
  });
});
