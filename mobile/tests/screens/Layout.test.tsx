import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { completarRecorrencias } from '@/features/receitas/service';
import { completarRecorrenciasDespesas } from '@/features/despesas/service';
import { sincronizarPendentes } from '@/features/receitas/sync';

const mockStack = jest.fn((_props: unknown) => null);

jest.mock('expo-router', () => ({
  Stack: (props: unknown) => mockStack(props),
}));
jest.mock('@/features/receitas/service', () => ({
  completarRecorrencias: jest.fn(),
}));
jest.mock('@/features/despesas/service', () => ({
  completarRecorrenciasDespesas: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn(),
}));

const completar = completarRecorrencias as jest.Mock;
const completarDespesas = jest.mocked(completarRecorrenciasDespesas);
const sincronizar = sincronizarPendentes as jest.Mock;

describe('Layout raiz: ao abrir o app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    completar.mockResolvedValue(undefined);
    completarDespesas.mockResolvedValue(undefined);
    sincronizar.mockResolvedValue(false);
  });

  it('completa as séries sem término e só depois tenta sincronizar', async () => {
    const ordem: string[] = [];
    completar.mockImplementation(async () => {
      ordem.push('receitas');
    });
    completarDespesas.mockImplementation(async () => {
      ordem.push('despesas');
    });
    sincronizar.mockImplementation(async () => {
      ordem.push('sincronizar');
      return false;
    });

    await render(<RootLayout />);

    await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));
    expect(completar).toHaveBeenCalledTimes(1);
    expect(ordem).toEqual(['receitas', 'despesas', 'sincronizar']);
  });

  it('registra as falhas das duas rotinas e ainda tenta sincronizar', async () => {
    const erroReceitas = new Error('falha nas receitas');
    const erroDespesas = new Error('falha nas despesas');
    completar.mockRejectedValue(erroReceitas);
    completarDespesas.mockRejectedValue(erroDespesas);
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(<RootLayout />);

      await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));
      expect(aviso).toHaveBeenCalledWith(expect.stringContaining('receitas'), erroReceitas);
      expect(aviso).toHaveBeenCalledWith(expect.stringContaining('despesas'), erroDespesas);
      expect(mockStack).toHaveBeenCalled();
    } finally {
      aviso.mockRestore();
    }
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
