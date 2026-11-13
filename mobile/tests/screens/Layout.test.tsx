import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { completarRecorrencias } from '@/features/receitas/service';
import { sincronizarPendentes } from '@/features/receitas/sync';

const mockStack = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => ({
  Stack: (props: unknown) => mockStack(props),
}));
jest.mock('@/features/receitas/service', () => ({
  completarRecorrencias: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn(),
}));

const completar = completarRecorrencias as jest.Mock;
const sincronizar = sincronizarPendentes as jest.Mock;

describe('Layout raiz: ao abrir o app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    completar.mockResolvedValue(undefined);
    sincronizar.mockResolvedValue(false);
  });

  it('completa as séries sem término e só depois tenta sincronizar', async () => {
    const ordem: string[] = [];
    completar.mockImplementation(async () => {
      ordem.push('completar');
    });
    sincronizar.mockImplementation(async () => {
      ordem.push('sincronizar');
      return false;
    });

    await render(<RootLayout />);

    await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));
    expect(completar).toHaveBeenCalledTimes(1);
    expect(ordem).toEqual(['completar', 'sincronizar']);
  });

  it('se completar as séries falhar, o app abre normalmente e ainda tenta sincronizar', async () => {
    completar.mockRejectedValue(new Error('falha de leitura'));

    await render(<RootLayout />);

    await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));
    expect(mockStack).toHaveBeenCalled(); // a navegação foi renderizada
  });

  it('renderiza a navegação sem cabeçalho nativo', async () => {
    await render(<RootLayout />);
    expect(mockStack).toHaveBeenCalledWith(expect.objectContaining({ screenOptions: { headerShown: false } }));
    await waitFor(() => expect(sincronizar).toHaveBeenCalled());
  });

  it('executa só uma vez por abertura, mesmo se o layout renderizar de novo', async () => {
    const { rerender } = await render(<RootLayout />);
    await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));

    await rerender(<RootLayout />);

    expect(completar).toHaveBeenCalledTimes(1);
    expect(sincronizar).toHaveBeenCalledTimes(1);
  });
});