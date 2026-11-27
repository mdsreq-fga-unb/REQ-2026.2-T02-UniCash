import { act, renderHook } from '@testing-library/react-native';
import { calcularEvolucao, FalhaEvolucao, type EvolucaoMensal } from '@/features/evolucao/service';
import { useEvolucao } from '@/features/evolucao/useEvolucao';

jest.mock('@/features/evolucao/service', () => ({
  ...jest.requireActual('@/features/evolucao/service'),
  calcularEvolucao: jest.fn(),
}));

const calcular = calcularEvolucao as jest.Mock;

function serie(fimAno: number, fimMes: number): EvolucaoMensal {
  return { fimAno, fimMes, meses: [], semLancamentos: false };
}

function pendente() {
  let resolver!: (r: EvolucaoMensal) => void;
  let rejeitar!: (e: Error) => void;
  const promessa = new Promise<EvolucaoMensal>((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  return { promessa, resolver, rejeitar };
}

describe('useEvolucao', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calcula a janela pedida', async () => {
    calcular.mockResolvedValue(serie(2026, 10));
    const { result } = await renderHook(() => useEvolucao(2026, 10));
    await act(() => result.current.recarregar());
    expect(calcular).toHaveBeenCalledWith(2026, 10);
    expect(result.current.evolucao).toEqual(serie(2026, 10));
    expect(result.current.falhou).toBe(false);
  });

  it('EX01: falha limpa a série e marca a falha', async () => {
    calcular.mockRejectedValue(new FalhaEvolucao('boom'));
    const { result } = await renderHook(() => useEvolucao(2026, 10));
    await act(() => result.current.recarregar());
    expect(result.current.evolucao).toBeNull();
    expect(result.current.falhou).toBe(true);
  });

  it('descarta a resposta e a falha atrasadas de uma janela anterior', async () => {
    const antiga = pendente();
    const antigaComFalha = pendente();
    calcular
      .mockReturnValueOnce(antiga.promessa)
      .mockReturnValueOnce(antigaComFalha.promessa)
      .mockResolvedValueOnce(serie(2026, 11));

    const { result, rerender } = await renderHook(({ mes }: { mes: number }) => useEvolucao(2026, mes), {
      initialProps: { mes: 10 },
    });
    let p1!: Promise<void>;
    let p2!: Promise<void>;
    await act(async () => {
      p1 = result.current.recarregar();
      p2 = result.current.recarregar();
    });
    await rerender({ mes: 11 });
    await act(() => result.current.recarregar());

    await act(async () => {
      antiga.resolver(serie(2026, 10));
      antigaComFalha.rejeitar(new FalhaEvolucao('atrasada'));
      await p1;
      await p2;
    });

    expect(result.current.evolucao).toEqual(serie(2026, 11));
    expect(result.current.falhou).toBe(false);
  });
});
