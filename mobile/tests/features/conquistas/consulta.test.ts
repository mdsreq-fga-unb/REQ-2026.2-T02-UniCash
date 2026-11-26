import { getDb } from '@/db/database';
import { consultarConquistas, consultarSelo, FalhaLeituraConquistas } from '@/features/conquistas/consulta';
import { fonteMetasExemplo } from '@/features/conquistas/metas';
import { excluirReceita, registrarReceita } from '@/features/receitas/service';
import { registrarDespesa } from '@/features/despesas/service';
import type { DespesaInput } from '@/features/despesas/types';
import { fixarHoje, restaurarTempo } from '../../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../../helpers/fakeDb';
import { input } from '../../helpers/dados';

jest.mock('@/lib/firebase', () => {
  throw new Error('Conquistas não podem depender do Firebase (RN06)');
});
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

function despesa(data: string, valorCentavos: number): DespesaInput {
  return {
    data,
    titulo: 'Mercado',
    valorCentavos,
    descricao: null,
    categoriaId: null,
    fixaOuVariavel: 'variavel',
    essencial: 1,
    recorrencia: null,
  };
}

let banco: BancoFalso;
beforeEach(() => {
  banco = instalarBanco();
  fixarHoje('2026-11-20');
});
afterEach(restaurarTempo);

describe('consultarConquistas (UC13, fluxo B)', () => {
  it('meses encerrados no verde geram selos; o mês corrente não entra', async () => {
    await registrarReceita(input({ data: '2026-09-05', valorCentavos: 1000 }));
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 320000 }));
    await registrarDespesa(despesa('2026-10-10', 278000));
    await registrarReceita(input({ data: '2026-11-05', valorCentavos: 5000 }));

    const r = await consultarConquistas(fonteMetasExemplo);

    expect(r.selos.map((s) => s.chave)).toEqual(['no-verde:2026-10', 'no-verde:2026-09', 'primeira-meta']);
    expect(r.totalPontos).toBe(300);
    const outubro = r.selos[0].referencia;
    expect(outubro).toEqual({ tipo: 'mes', mes: '2026-10', receitasCentavos: 320000, despesasCentavos: 278000, saldoCentavos: 42000 });
  });

  it('FA08: excluir a receita que deixava o mês no verde retira o selo; recriar devolve', async () => {
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 1000 }));
    expect((await consultarConquistas()).selos.map((s) => s.chave)).toEqual(['no-verde:2026-10']);

    await excluirReceita(banco.receitas()[0].id);
    expect((await consultarConquistas()).selos).toEqual([]);

    await registrarReceita(input({ data: '2026-10-06', valorCentavos: 1000 }));
    expect((await consultarConquistas()).selos.map((s) => s.chave)).toEqual(['no-verde:2026-10']);
  });

  it('sem metas na produção: nenhum ponto (UC12 ainda não existe)', async () => {
    expect((await consultarConquistas()).totalPontos).toBe(0);
  });

  it('falha de leitura vira FalhaLeituraConquistas (EX03)', async () => {
    (getDb as jest.Mock).mockRejectedValueOnce(new Error('disco'));
    await expect(consultarConquistas()).rejects.toBeInstanceOf(FalhaLeituraConquistas);
  });

  it('consultarSelo devolve o selo pela chave, ou null se ele não vale mais', async () => {
    await registrarReceita(input({ data: '2026-10-05', valorCentavos: 1000 }));
    expect((await consultarSelo('no-verde:2026-10'))?.nome).toBe('No verde em outubro');
    expect(await consultarSelo('no-verde:2026-09')).toBeNull();
  });
});
