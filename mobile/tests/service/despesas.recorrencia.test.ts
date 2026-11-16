import {
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
    descricao: 'Aluguel do apartamento',
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

describe('Recorrência de despesas', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });

  afterEach(restaurarTempo);

  it('cria uma série identificada como despesa', async () => {
    await registrarDespesa(inputDespesa());

    const series = banco.recorrencias();

    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      tipo: 'despesa',
      intervalo: 1,
      unidade: 'mes',
      inicio: '2026-10-16',
      termino: '2027-01-16',
      ativa: 1,
      valor_centavos: 150000,
      titulo: 'Aluguel',
      sync_status: 'pendente',
    });
  });

  it('gera as ocorrências até a data final, inclusive', async () => {
    await registrarDespesa(inputDespesa());

    const series = banco.recorrencias();
    const despesas = banco.despesas();

    expect(despesas).toHaveLength(4);
    expect(despesas.map((d) => d.data)).toEqual([
      '2026-10-16',
      '2026-11-16',
      '2026-12-16',
      '2027-01-16',
    ]);

    expect(despesas.every((d) => d.recorrencia_id === series[0].id)).toBe(true);
    expect(despesas.every((d) => d.sync_status === 'pendente')).toBe(true);
  });

  it('usa IDs determinísticos para cada ocorrência', async () => {
    await registrarDespesa(inputDespesa());

    const serie = banco.recorrencias()[0];
    const despesas = banco.despesas();

    expect(despesas.map((d) => d.id)).toEqual([
      `${serie.id}_2026-10-16`,
      `${serie.id}_2026-11-16`,
      `${serie.id}_2026-12-16`,
      `${serie.id}_2027-01-16`,
    ]);
  });

  it('reverte a criação da série se ocorrer falha na gravação', async () => {
    banco.falharNaOperacao(2);

    await expect(
      registrarDespesa(inputDespesa()),
    ).rejects.toBeInstanceOf(FalhaPersistencia);

    expect(banco.recorrencias()).toHaveLength(0);
    expect(banco.despesas()).toHaveLength(0);
  });
});