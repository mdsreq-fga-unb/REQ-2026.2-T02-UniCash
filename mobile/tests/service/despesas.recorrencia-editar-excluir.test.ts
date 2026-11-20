import {
  completarRecorrenciasDespesas,
  editarDespesa,
  excluirDespesa,
  FalhaPersistencia,
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

  it('exclui todas as ocorrências e marca a série como excluída sem apagar o histórico', async () => {
    const { despesas, serie } = await criarSerie();
    const antes = banco.despesas();

    await excluirDespesa(despesas[1].id, 'todas');

    expect(banco.despesas().filter((d) => !d.excluido_em)).toHaveLength(0);

    expect(banco.recorrencias().find((r) => r.id === serie.id)).toMatchObject({
      ativa: 0,
      excluido_em: expect.any(String),
    });

    for (const original of antes) {
      expect(banco.despesas().find((d) => d.id === original.id)).toMatchObject({
        valor_centavos: original.valor_centavos,
        data: original.data,
        titulo: original.titulo,
        descricao: original.descricao,
        recorrencia_id: original.recorrencia_id,
        excluido_em: expect.any(String),
      });
    }
  });

  it('encerrar a série não gera tombstone', async () => {
    const { despesas, serie } = await criarSerie();

    await excluirDespesa(despesas[1].id, 'proximas');

    expect(banco.recorrencias().find((r) => r.id === serie.id)).toMatchObject({
      termino: '2026-11-15',
      excluido_em: null,
    });
  });

  it('série excluída não gera novas ocorrências ao abrir o app', async () => {
    await registrarDespesa(
      inputDespesa({
        recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
      }),
    );
    const primeira = banco.despesas()[0];

    await excluirDespesa(primeira.id, 'todas');
    const total = banco.despesas().length;

    fixarHoje('2027-06-01');
    await completarRecorrenciasDespesas();

    expect(banco.despesas()).toHaveLength(total);
    expect(banco.despesas().every((d) => d.excluido_em !== null)).toBe(true);
  });

  it.each(['proximas', 'todas'] as const)(
    'RN11: falha no meio da exclusão com alcance "%s" reverte tudo',
    async (escopo) => {
      const { despesas } = await criarSerie();
      const antes = banco.instantaneo();

      banco.falharNaOperacao(2); // a 2ª gravação falha (depois da lápide das ocorrências)

      await expect(excluirDespesa(despesas[1].id, escopo)).rejects.toBeInstanceOf(
        FalhaPersistencia,
      );

      expect(banco.instantaneo()).toEqual(antes);
    },
  );

  it('remove a repetição e edita esta e as próximas ocorrências', async () => {
    const { despesas, serie } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Aluguel sem repetição',
        recorrencia: null,
      }),
      'proximas',
    );

    const ativas = banco.despesas().filter((d) => !d.excluido_em);
    const serieAtualizada = banco.recorrencias().find((r) => r.id === serie.id);

    expect(ativas).toHaveLength(2);
    expect(ativas.some((d) => d.id === despesas[0].id)).toBe(true);
    expect(ativas.find((d) => d.id === despesas[1].id)?.titulo)
      .toBe('Aluguel sem repetição');
    expect(ativas.some((d) => d.id === despesas[2].id)).toBe(false);
    expect(serieAtualizada?.termino).toBe(despesas[1].data);
  });

  it('preserva a despesa adiada ao remover a repetição desta e das próximas', async () => {
    const { despesas, serie } = await criarSerie();
    const [anterior, selecionada, ...seguintes] = despesas;
    const novaData = '2026-11-20';

    await editarDespesa(
      selecionada.id,
      inputDespesa({ data: novaData, recorrencia: null }),
      'proximas',
    );

    expect(banco.recorrencias().find((r) => r.id === serie.id)?.termino).toBe(novaData);

    const ocorrencias = banco.despesas();
    expect(ocorrencias.find((d) => d.id === selecionada.id)).toMatchObject({
      data: novaData,
      excluido_em: null,
    });
    expect(ocorrencias.filter((d) => !d.excluido_em).map((d) => d.id).sort())
      .toEqual([anterior.id, selecionada.id].sort());
    for (const seguinte of seguintes) {
      expect(ocorrencias.find((d) => d.id === seguinte.id)?.excluido_em).toEqual(expect.any(String));
    }
  });

  it('remove a repetição e edita todas as ocorrências', async () => {
    const { despesas, serie } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Aluguel definitivo',
        recorrencia: null,
      }),
      'todas',
    );

    const ativas = banco.despesas().filter((d) => !d.excluido_em);
    const selecionada = banco.despesas().find((d) => d.id === despesas[1].id);
    const serieAtualizada = banco.recorrencias().find((r) => r.id === serie.id);

    expect(ativas).toHaveLength(1);
    expect(selecionada?.titulo).toBe('Aluguel definitivo');
    expect(selecionada?.recorrencia_id).toBeNull();
    expect(serieAtualizada?.ativa).toBe(0);
  });

  it('altera a recorrência desta e das próximas ocorrências', async () => {
    const { despesas, serie } = await criarSerie();

    await editarDespesa(
      despesas[1].id,
      inputDespesa({
        data: despesas[1].data,
        titulo: 'Aluguel a cada dois meses',
        recorrencia: {
          intervalo: 2,
          unidade: 'mes',
          termino: '2027-03-16',
        },
      }),
      'proximas',
    );

    const series = banco.recorrencias();
    const serieAntiga = series.find((r) => r.id === serie.id);
    const novaSerie = series.find((r) => r.id !== serie.id);

    expect(serieAntiga?.termino).toBe('2026-11-15');
    expect(serieAntiga?.ativa).toBe(1);
    expect(novaSerie?.intervalo).toBe(2);
    expect(novaSerie?.unidade).toBe('mes');
    expect(novaSerie?.inicio).toBe(despesas[1].data);

    const ativas = banco.despesas().filter((d) => !d.excluido_em);
    expect(ativas.some((d) => d.id === despesas[0].id)).toBe(true);
    expect(ativas.some((d) => d.recorrencia_id === novaSerie?.id)).toBe(true);
  });

  it('altera a recorrência de toda a série', async () => {
    const { serie } = await criarSerie();

    await editarDespesa(
      banco.despesas().find((d) => d.data === '2026-11-16')!.id,
      inputDespesa({
        data: '2026-11-16',
        titulo: 'Nova série de aluguel',
        recorrencia: {
          intervalo: 2,
          unidade: 'mes',
          termino: '2027-02-16',
        },
      }),
      'todas',
    );

    const series = banco.recorrencias();
    const serieAntiga = series.find((r) => r.id === serie.id);
    const novaSerie = series.find((r) => r.id !== serie.id);

    expect(serieAntiga?.ativa).toBe(0);
    expect(novaSerie?.intervalo).toBe(2);
    expect(novaSerie?.unidade).toBe('mes');
    expect(novaSerie?.inicio).toBe(serie.inicio);

    const ativas = banco.despesas().filter((d) => !d.excluido_em);
    expect(ativas.map((d) => d.data).sort()).toEqual(['2026-10-16', '2026-12-16', '2027-02-16']);
    expect(ativas.every((d) => d.recorrencia_id === novaSerie?.id)).toBe(true);
  });

    it('transforma uma despesa avulsa em recorrente', async () => {
    await registrarDespesa(
      inputDespesa({
        recorrencia: null,
      }),
    );

    const despesaAvulsa = banco.despesas()[0];

    await editarDespesa(
      despesaAvulsa.id,
      inputDespesa({
        data: despesaAvulsa.data,
        titulo: 'Aluguel recorrente',
        recorrencia: {
          intervalo: 1,
          unidade: 'mes',
          termino: '2027-01-16',
        },
      }),
    );

    const despesas = banco.despesas();
    const ativas = despesas.filter((d) => !d.excluido_em);
    const series = banco.recorrencias();

    expect(series).toHaveLength(1);
    expect(series[0].intervalo).toBe(1);
    expect(series[0].unidade).toBe('mes');

    expect(despesas.find((d) => d.id === despesaAvulsa.id)?.excluido_em)
      .toBeTruthy();

    expect(ativas).toHaveLength(4);
    expect(ativas.every((d) => d.titulo === 'Aluguel recorrente')).toBe(true);
    expect(ativas.every((d) => d.recorrencia_id === series[0].id)).toBe(true);
  });
    it('desativa a série antiga ao alterar a recorrência a partir da primeira ocorrência', async () => {
    const { despesas, serie } = await criarSerie();

    await editarDespesa(
      despesas[0].id,
      inputDespesa({
        data: despesas[0].data,
        titulo: 'Aluguel a cada dois meses',
        recorrencia: {
          intervalo: 2,
          unidade: 'mes',
          termino: '2027-03-16',
        },
      }),
      'proximas',
    );

    const series = banco.recorrencias();
    const serieAntiga = series.find((r) => r.id === serie.id);
    const novaSerie = series.find((r) => r.id !== serie.id);

    expect(serieAntiga?.ativa).toBe(0);
    expect(novaSerie?.intervalo).toBe(2);
    expect(novaSerie?.unidade).toBe('mes');
    expect(novaSerie?.inicio).toBe(despesas[0].data);

    const ativas = banco.despesas().filter((d) => !d.excluido_em);

    expect(ativas.length).toBeGreaterThan(0);
    expect(ativas.every((d) => d.recorrencia_id === novaSerie?.id)).toBe(true);
  });
  it('altera somente a data final da recorrência nas próximas ocorrências', async () => {
  const { despesas, serie } = await criarSerie();

  await editarDespesa(
    despesas[1].id,
    inputDespesa({
      data: despesas[1].data,
      titulo: 'Aluguel com novo término',
      recorrencia: {
        intervalo: 1,
        unidade: 'mes',
        termino: '2027-02-16',
      },
    }),
    'proximas',
  );

  const series = banco.recorrencias();
  const serieAntiga = series.find((r) => r.id === serie.id);
  const novaSerie = series.find((r) => r.id !== serie.id);

  expect(serieAntiga?.termino).toBe('2026-11-15');
  expect(novaSerie?.intervalo).toBe(1);
  expect(novaSerie?.unidade).toBe('mes');
  expect(novaSerie?.termino).toBe('2027-02-16');
});
it('mantém a data da ocorrência como término ao remover a repetição com data anterior', async () => {
  const { despesas, serie } = await criarSerie();

  await editarDespesa(
    despesas[1].id,
    inputDespesa({
      data: '2026-11-01',
      titulo: 'Aluguel sem repetição',
      recorrencia: null,
    }),
    'proximas',
  );

  const serieAtualizada = banco.recorrencias().find((r) => r.id === serie.id);

  expect(serieAtualizada?.termino).toBe(despesas[1].data);
});
});