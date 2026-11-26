import { act, renderHook } from '@testing-library/react-native';
import { calcularResumo, FalhaCalculo, type ResumoMensal } from '@/features/resumo/service';
import { useResumo } from '@/features/resumo/useResumo';

jest.mock('@/features/resumo/service', () => ({
  ...jest.requireActual('@/features/resumo/service'),
  calcularResumo: jest.fn(),
}));

const calcular = calcularResumo as jest.Mock;

function resumo(ano: number, mes: number): ResumoMensal {
  return {
    ano,
    mes,
    totalReceitasCentavos: 0,
    totalDespesasCentavos: 0,
    saldoCentavos: 0,
    receitasPorDia: [],
    metas: [],
    semLancamentos: false,
  };
}

/** Promessa que o teste resolve ou rejeita quando quiser. */
function pendente() {
  let resolver!: (r: ResumoMensal) => void;
  let rejeitar!: (e: Error) => void;
  const promessa = new Promise<ResumoMensal>((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  return { promessa, resolver, rejeitar };
}

describe('useResumo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calcula o mês pedido e informa o carregamento', async () => {
    calcular.mockResolvedValue(resumo(2026, 10));
    const { result } = await renderHook(() => useResumo(2026, 10));
    expect(result.current.carregando).toBe(true);

    await act(() => result.current.recarregar());
    expect(calcular).toHaveBeenCalledWith(2026, 10);
    expect(result.current.resumo).toEqual(resumo(2026, 10));
    expect(result.current.carregando).toBe(false);
    expect(result.current.falhou).toBe(false);
  });

  it('EX01: falha limpa o resumo e marca a falha', async () => {
    calcular.mockRejectedValue(new FalhaCalculo('boom'));
    const { result } = await renderHook(() => useResumo(2026, 10));
    await act(() => result.current.recarregar());
    expect(result.current.resumo).toBeNull();
    expect(result.current.falhou).toBe(true);
    expect(result.current.carregando).toBe(false);
  });

  it('troca rápida de mês: a resposta atrasada do mês antigo é descartada', async () => {
    const outubro = pendente();
    const novembro = pendente();
    calcular.mockReturnValueOnce(outubro.promessa).mockReturnValueOnce(novembro.promessa);

    const { result, rerender } = await renderHook(({ mes }: { mes: number }) => useResumo(2026, mes), {
      initialProps: { mes: 10 },
    });
    let pedidoOutubro!: Promise<void>;
    await act(async () => {
      pedidoOutubro = result.current.recarregar();
    });

    await rerender({ mes: 11 });
    let pedidoNovembro!: Promise<void>;
    await act(async () => {
      pedidoNovembro = result.current.recarregar();
    });

    // novembro termina primeiro; outubro chega depois e não pode sobrescrever
    await act(async () => {
      novembro.resolver(resumo(2026, 11));
      await pedidoNovembro;
    });
    await act(async () => {
      outubro.resolver(resumo(2026, 10));
      await pedidoOutubro;
    });

    expect(result.current.resumo).toEqual(resumo(2026, 11));
    expect(result.current.carregando).toBe(false);
  });

  it('troca rápida de mês: a falha atrasada do mês antigo também é descartada', async () => {
    const outubro = pendente();
    calcular.mockReturnValueOnce(outubro.promessa).mockResolvedValueOnce(resumo(2026, 11));

    const { result, rerender } = await renderHook(({ mes }: { mes: number }) => useResumo(2026, mes), {
      initialProps: { mes: 10 },
    });
    let pedidoOutubro!: Promise<void>;
    await act(async () => {
      pedidoOutubro = result.current.recarregar();
    });
    await rerender({ mes: 11 });
    await act(() => result.current.recarregar());

    await act(async () => {
      outubro.rejeitar(new FalhaCalculo('atrasada'));
      await pedidoOutubro;
    });

    expect(result.current.falhou).toBe(false);
    expect(result.current.resumo).toEqual(resumo(2026, 11));
  });
});
