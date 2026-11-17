import { act, renderHook } from '@testing-library/react-native';
import { useExclusao } from '@/components/receitas/useExclusao';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

describe('useExclusao sem receita carregada', () => {
  it('não mostra diálogos nem inicia o fluxo enquanto não há alvo', async () => {
    const { result } = await renderHook(() => useExclusao(null));
    expect(result.current.dialogos).toBeNull();

    await act(async () => {
      result.current.iniciar();
    });

    expect(result.current.dialogos).toBeNull();
  });
});
