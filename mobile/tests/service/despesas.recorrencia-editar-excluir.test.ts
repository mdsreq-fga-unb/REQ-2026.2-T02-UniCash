import {
  editarDespesa,
  excluirDespesa,
  registrarDespesa,
} from '@/features/despesas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import type { DespesaInput } from '@/features/despesas/types';

function inputDespesa(extra: Partial<DespesaInput> = {}): DespesaInput {
  return {
    data: '2026-10-16',
    titulo: 'Aluguel',
    valorCentavos: 150000,
    descricao: 'Aluguel',
    categoriaId: null,
    fixaOuVariavel: 'fixa',
    essencial: 1,
    recorrencia: {
      intervalo: 1,
      unidade: 'mes',
      termino: '2027-01-16',
    },
    ...extra,
  };
}

describe('Edição e exclusão de despesas recorrentes', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });

  afterEach(restaurarTempo);

  async function criarSerie() {
    await registrarDespesa(inputDespesa());
    const serie = banco.recorrencias()[0];
    const despesas = banco.despesas().sort((a, b) => a.data.localeCompare(b.data));

    return { serie, despesas };
  }

  it('edita somente a ocorrência selecionada', async () => {
    const { despesas } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Aluguel alterado',
        recorrencia: null,
      }),
      'esta',
    );

    const atualizadas = banco.despesas();

    expect(atualizadas.find((d) => d.id === despesas[1].id)?.titulo)
      .toBe('Aluguel alterado');

    expect(atualizadas.find((d) => d.id === despesas[0].id)?.titulo)
      .toBe('Aluguel');

    expect(atualizadas.find((d) => d.id === despesas[2].id)?.titulo)
      .toBe('Aluguel');
  });

  it('edita esta ocorrência e as próximas', async () => {
    const { despesas } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Novo aluguel',
      }),
      'proximas',
    );

    const ativas = banco.despesas().filter((d) => !d.excluido_em);

    expect(ativas.filter((d) => d.data < despesas[1].data)
      .every((d) => d.titulo === 'Aluguel')).toBe(true);

    expect(ativas.filter((d) => d.data >= despesas[1].data)
      .every((d) => d.titulo === 'Novo aluguel')).toBe(true);
  });

  it('edita todas as ocorrências da série', async () => {
    const { despesas } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Série alterada',
      }),
      'todas',
    );

    const ativas = banco.despesas().filter((d) => !d.excluido_em);

    expect(ativas).toHaveLength(4);
    expect(ativas.every((d) => d.titulo === 'Série alterada')).toBe(true);
  });

  it('exclui somente a ocorrência selecionada', async () => {
    const { despesas } = await criarSerie();

    await excluirDespesa(despesas[1].id, 'esta');

    const ativas = banco.despesas().filter((d) => !d.excluido_em);

    expect(ativas).toHaveLength(3);
    expect(banco.despesas().find((d) => d.id === despesas[1].id)?.excluido_em)
      .toBeTruthy();
  });

  it('exclui a ocorrência selecionada e as próximas', async () => {
    const { despesas, serie } = await criarSerie();

    await excluirDespesa(despesas[1].id, 'proximas');

    const ativas = banco.despesas().filter((d) => !d.excluido_em);

    expect(ativas.map((d) => d.data)).toEqual(['2026-10-16']);

    expect(banco.recorrencias().find((r) => r.id === serie.id)?.termino)
      .toBe('2026-11-15');
  });

  it('exclui todas as ocorrências e desativa a série', async () => {
    const { despesas, serie } = await criarSerie();

    await excluirDespesa(despesas[1].id, 'todas');

    expect(banco.despesas().filter((d) => !d.excluido_em)).toHaveLength(0);

    expect(banco.recorrencias().find((r) => r.id === serie.id)?.ativa)
      .toBe(0);
  });
});