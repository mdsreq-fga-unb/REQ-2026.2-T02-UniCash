import { criarCategoria, editarCategoria, excluirCategoria, semearCategoriasPadrao } from '@/features/categorias/service';
import { editarDespesa, excluirDespesa, registrarDespesa } from '@/features/despesas/service';
import type { DespesaInput } from '@/features/despesas/types';
import { registrarReceita } from '@/features/receitas/service';
import { definirAlertasAtivos, type Alerta } from '@/features/alertas/service';
import { emitirAlertasPendentes } from '@/features/alertas/notificacoes';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('UC05 — Monitorar limites de gastos', () => {
  let banco: BancoFalso;
  let categoriaId: string;

  const despesa = (valorCentavos: number, extra: Partial<DespesaInput> = {}): DespesaInput => ({
    data: '2026-10-16',
    titulo: 'Compra',
    valorCentavos,
    categoriaId,
    descricao: null,
    fixaOuVariavel: null,
    essencial: null,
    recorrencia: null,
    ...extra,
  });

  const alertas = () =>
    banco.sqlite.prepare('SELECT * FROM alertas ORDER BY periodo, tipo').all() as Alerta[];

  const notificador = () => ({
    disponivel: jest.fn(async () => true),
    emitir: jest.fn(async (_id: string, _titulo: string, _mensagem: string) => {}),
  });

  beforeEach(async () => {
    banco = instalarBanco();
    categoriaId = await criarCategoria({ nome: 'Mercado', limite: { tipo: 'valor', valor: 10_000 } });
  });

  afterEach(() => banco.sqlite.close());

  it('emite aproximação em 80%, mantém 100% na mesma faixa e ultrapassa acima de 100%', async () => {
    const local = notificador();
    await registrarDespesa(despesa(7999));
    expect(alertas()).toEqual([]);
    await registrarDespesa(despesa(1));
    expect(alertas()).toEqual([expect.objectContaining({ tipo: 'aproximacao', gasto_centavos: 8000 })]);
    await emitirAlertasPendentes(local);
    await registrarDespesa(despesa(2000));
    expect(alertas()).toHaveLength(1);
    await registrarDespesa(despesa(1));
    expect(alertas()[1]).toMatchObject({ tipo: 'ultrapassagem', gasto_centavos: 10001 });
    await emitirAlertasPendentes(local);
    expect(local.emitir).toHaveBeenCalledTimes(2);
    expect(local.emitir.mock.calls[0][2]).toContain('Mercado (2026-10)');
  });

  it('gera só ultrapassagem em um salto, deduplica no mês e volta a emitir no mês seguinte', async () => {
    const local = notificador();
    await registrarDespesa(despesa(15000));
    expect(alertas().map((a) => a.tipo)).toEqual(['ultrapassagem']);
    await emitirAlertasPendentes(local);

    const id = banco.despesas()[0].id;
    await editarDespesa(id, despesa(7000));
    await editarDespesa(id, despesa(15000));
    await emitirAlertasPendentes(local);
    expect(local.emitir).toHaveBeenCalledTimes(1);

    await registrarDespesa(despesa(15000, { data: '2026-11-01' }));
    await emitirAlertasPendentes(local);
    expect(local.emitir).toHaveBeenCalledTimes(2);
    expect(alertas().map((a) => a.periodo)).toEqual(['2026-10', '2026-11']);
  });

  it('calcula limite percentual só quando há renda no período', async () => {
    await editarCategoria(categoriaId, { nome: 'Mercado', limite: { tipo: 'percentual_renda', valor: 2500 } });
    await registrarDespesa(despesa(2000));
    await registrarReceita(input({ valorCentavos: 10000, data: '2026-09-30' }));
    expect(alertas()).toEqual([]);
    await registrarReceita(input({ valorCentavos: 10000 }));
    expect(alertas()[0]).toMatchObject({ tipo: 'aproximacao', limite_centavos: 2500 });
  });

  it('ignora despesas sem categoria e categorias sem limite, mas aceita categorias padrão com limite', async () => {
    await registrarDespesa(despesa(20000, { categoriaId: null }));
    await editarCategoria(categoriaId, { nome: 'Mercado', limite: null });
    await registrarDespesa(despesa(20000));
    expect(alertas()).toEqual([]);

    await semearCategoriasPadrao();
    const padrao = banco.sqlite.prepare('SELECT id, nome FROM categorias WHERE padrao = 1 LIMIT 1')
      .get() as { id: string; nome: string };
    await editarCategoria(padrao.id, { nome: padrao.nome, limite: { tipo: 'valor', valor: 1000 } });
    await registrarDespesa(despesa(800, { categoriaId: padrao.id }));
    expect(alertas()[0]).toMatchObject({ tipo: 'aproximacao', ref_id: padrao.id });
  });

  it('recalcula o limite editado e remove pendências ao excluir categoria ou despesa', async () => {
    await registrarDespesa(despesa(5000));
    const id = banco.despesas()[0].id;
    await editarCategoria(categoriaId, { nome: 'Mercado', limite: { tipo: 'valor', valor: 5000 } });
    expect(alertas()[0]).toMatchObject({ tipo: 'aproximacao', limite_centavos: 5000 });
    await excluirDespesa(id);
    expect(alertas()).toEqual([]);
    await registrarDespesa(despesa(6000));
    expect(alertas()[0]).toMatchObject({ tipo: 'ultrapassagem' });
    await excluirCategoria(categoriaId);
    expect(alertas()).toEqual([]);
  });

  it('respeita a preferência desativada e cancela as notificações pendentes', async () => {
    await registrarDespesa(despesa(8000));
    await definirAlertasAtivos(false);
    await registrarDespesa(despesa(3000));
    const local = notificador();
    await emitirAlertasPendentes(local);
    expect(local.emitir).not.toHaveBeenCalled();
    expect(alertas()).toEqual([]);
    expect(banco.despesas()).toHaveLength(2);
  });

  it('reverte a despesa se a gravação da pendência falha', async () => {
    banco.sqlite.exec(`
      CREATE TRIGGER falhar_alerta BEFORE INSERT ON alertas
      BEGIN SELECT RAISE(ABORT, 'falha'); END;
    `);
    await expect(registrarDespesa(despesa(8000))).rejects.toThrow();
    expect(alertas()).toEqual([]);
    expect(banco.despesas()).toEqual([]);
  });

  it('preserva a despesa e deixa emitido_em nulo quando a notificação falha', async () => {
    await registrarDespesa(despesa(8000));
    const local = notificador();
    local.emitir.mockRejectedValueOnce(new Error('Falha do sistema'));
    await expect(emitirAlertasPendentes(local)).rejects.toThrow('Falha do sistema');
    expect(banco.despesas()).toHaveLength(1);
    expect(alertas()[0].emitido_em).toBeNull();
    await emitirAlertasPendentes(local);
    expect(alertas()[0].emitido_em).toEqual(expect.any(String));
    await emitirAlertasPendentes(local);
    expect(local.emitir).toHaveBeenCalledTimes(2);
  });
});
