import { getDb } from '@/db/database';
import { consultarConquistas, consultarSelo, FalhaLeituraConquistas } from '@/features/conquistas/consulta';
import { fonteMetasExemplo } from '@/features/conquistas/metas';
import { excluirReceita, registrarReceita } from '@/features/receitas/service';
import { registrarDespesa } from '@/features/despesas/service';
import type { DespesaInput } from '@/features/despesas/types';
import { fixarHoje, restaurarTempo } from '../../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../../helpers/fakeDb';
import { input } from '../../helpers/dados';

jest.mock('@/lib/firebase', () => ({
  get auth() {
    throw new Error('Conquistas não podem consultar a sessão do Firebase (RN06)');
  },
  get db() {
    throw new Error('Conquistas não podem depender do Firestore (RN06)');
  },
}));
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

  it('sem metas cadastradas: nenhum ponto', async () => {
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

  describe('metas reais do UC12 (RF45)', () => {
    const meta = (id: string, tipo: string, alvo: number, acumulado: number | null, informado: string | null, excluido: string | null = null) =>
      banco.sqlite
        .prepare(
          `INSERT INTO metas (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
             valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, '2027-12-31', '2026-01-01', ?, ?, ?, 'pendente', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
        )
        .run(id, `Meta ${id}`, tipo, alvo, tipo === 'gasto' ? 'cat' : null, acumulado, informado, excluido);

    it('conta só a meta de investimento que alcançou o alvo, com a data do último informe', async () => {
      meta('alcancada', 'investimento', 100_000, 100_000, '2026-10-15T13:00:00.000Z');
      meta('ultrapassada', 'investimento', 50_000, 60_000, '2026-09-02T10:00:00.000Z');
      meta('em-andamento', 'investimento', 100_000, 99_999, '2026-10-20T10:00:00.000Z');
      meta('sem-informe', 'investimento', 100_000, null, null);
      meta('excluida', 'investimento', 100_000, 100_000, '2026-10-01T10:00:00.000Z', '2026-10-02T00:00:00.000Z');
      meta('gasto', 'gasto', 100_000, null, null);

      const r = await consultarConquistas();

      expect(r.pontuacoes.map((p) => [p.metaId, p.concluidaEm])).toEqual([
        ['alcancada', '2026-10-15'],
        ['ultrapassada', '2026-09-02'],
      ]);
      expect(r.totalPontos).toBe(200);
      expect(r.selos.find((s) => s.chave === 'primeira-meta')).toMatchObject({
        data: '2026-09-02',
        referencia: { tipo: 'meta', metaId: 'ultrapassada', titulo: 'Meta ultrapassada' },
      });
    });

    it('meta que deixa de estar alcançada sai da pontuação (FA08)', async () => {
      meta('m', 'investimento', 100_000, 100_000, '2026-10-15T13:00:00.000Z');
      expect((await consultarConquistas()).totalPontos).toBe(100);
      banco.sqlite.prepare("UPDATE metas SET valor_acumulado_centavos = 10 WHERE id = 'm'").run();
      expect((await consultarConquistas()).totalPontos).toBe(0);
    });
  });
});
