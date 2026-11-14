import { fireEvent, render, screen } from '@testing-library/react-native';
import Detalhe from '@/app/receitas/[id]/index';
import Editar from '@/app/receitas/[id]/editar';
import { buscarReceita } from '@/features/receitas/service';
import { router } from '../helpers/expoRouterMock';
import { receitaLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  buscarReceita: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const buscar = buscarReceita as jest.Mock;

describe('Botão voltar do cabeçalho', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buscar.mockResolvedValue({ receita: receitaLinha(), recorrencia: null });
  });

  it('detalhe: volta para a lista', async () => {
    await render(<Detalhe />);
    await screen.findByText('Detalhe do lançamento');
    await fireEvent.press(screen.getByLabelText('Voltar'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('edição: volta sem salvar', async () => {
    await render(<Editar />);
    await screen.findByText('Editar lançamento');
    await fireEvent.press(screen.getByLabelText('Voltar'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
