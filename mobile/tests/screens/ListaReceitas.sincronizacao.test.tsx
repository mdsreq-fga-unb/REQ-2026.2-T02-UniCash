import { render, screen, waitFor } from '@testing-library/react-native';
import ListaReceitas from '@/app/receitas/index';
import { listarReceitas } from '@/features/receitas/service';
import { contarPendentes } from '@/features/receitas/pendencias';
import { sincronizarPendentes } from '@/features/receitas/sync';
import { receitaLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  listarReceitas: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
}));
jest.mock('@/features/receitas/pendencias', () => ({ contarPendentes: jest.fn().mockResolvedValue(0) }));

const listar = listarReceitas as jest.Mock;

describe('Lista de receitas: sincronização ao abrir (EX05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contarPendentes as jest.Mock).mockResolvedValue(0);
    (sincronizarPendentes as jest.Mock).mockResolvedValue(false);
    listar.mockResolvedValue({ itens: [receitaLinha()], total: 15000 });
  });

  it('se a sincronização atualizou algo a partir da nuvem, a lista é recarregada', async () => {
    (sincronizarPendentes as jest.Mock).mockResolvedValueOnce(true);
    await render(<ListaReceitas />);
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('sem mudanças vindas da nuvem, a lista é carregada uma única vez', async () => {
    await render(<ListaReceitas />);
    await screen.findByText('Freela de design');
    await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('o cabeçalho usa o singular com um registro pendente', async () => {
    (contarPendentes as jest.Mock).mockResolvedValue(1);
    await render(<ListaReceitas />);
    expect(await screen.findByText(/\b1 pendente\b/)).toBeTruthy();
  });
});
