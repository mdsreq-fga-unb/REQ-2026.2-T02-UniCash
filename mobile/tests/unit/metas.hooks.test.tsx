import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useMeta, useMetas } from '@/features/metas/useMetas';
import type { ValorRealizadoCalculator } from '@/features/metas/progresso';
import type { Meta } from '@/features/metas/types';
import { buscarMeta, listarMetas } from '@/features/metas/service';

jest.mock('@/features/metas/service', () => ({
  buscarMeta: jest.fn(),
  listarMetas: jest.fn(),
}));

const buscar = buscarMeta as jest.Mock;
const listar = listarMetas as jest.Mock;

const meta = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Mercado',
  tipo: 'gasto',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-11-01',
  categoria_id: 'c1',
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  sync_status: 'sincronizado',
  excluido_em: null,
  criado_em: '2026-11-01T00:00:00Z',
  atualizado_em: '2026-11-01T00:00:00Z',
  ...extra,
});

describe('hooks de metas (UC12)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useMeta calcula o progresso no mês solicitado', async () => {
    buscar.mockResolvedValue(meta());
    const calculadora: ValorRealizadoCalculator = {
      calcular: jest.fn().mockResolvedValue(50_000),
    };

    const { result } = await renderHook(() =>
      useMeta('m1', calculadora, { ano: 2026, mes: 11 }),
    );

    await act(async () => {
      await result.current.recarregar();
    });
    await waitFor(() => expect(result.current.meta).not.toBeNull());
    expect(calculadora.calcular).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
      expect.objectContaining({
        ano: 2026,
        mes: 11,
        inicio: '2026-11-01',
        fim: '2026-11-30',
      }),
    );
    expect(result.current.progresso).toMatchObject({
      percentual: 50.0,
      situacaoProgresso: 'dentro_do_limite',
      progressoIndisponivel: false,
    });
  });

  it('useMetas calcula cada meta e mantém indisponível sem valor declarado', async () => {
    listar.mockResolvedValue([
      meta({ id: 'g1', tipo: 'gasto', categoria_id: 'c1' }),
      meta({
        id: 'i1',
        tipo: 'investimento',
        categoria_id: null,
        valor_acumulado_centavos: null,
      }),
    ]);
    const calculadora: ValorRealizadoCalculator = {
      calcular: jest.fn(async (item) =>
        item.tipo === 'gasto' ? 50_000 : null,
      ),
    };

    const { result } = await renderHook(() => useMetas(calculadora));

    await act(async () => {
      await result.current.recarregar();
    });
    await waitFor(() => expect(result.current.itens).toHaveLength(2));
    expect(result.current.progressos.g1.percentual).toBe(50.0);
    expect(result.current.progressos.i1).toMatchObject({
      percentual: null,
      situacaoProgresso: 'indisponivel',
      progressoIndisponivel: true,
    });
  });
});
