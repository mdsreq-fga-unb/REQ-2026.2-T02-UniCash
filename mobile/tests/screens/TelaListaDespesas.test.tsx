

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import ListaDespesas from '@/app/despesas/index';
import {
  FalhaLeitura,
  listarDespesas,
} from '@/features/despesas/service';
import { setFeedback } from '@/features/receitas/feedback';
import { router } from '../helpers/expoRouterMock';
import { despesaLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/features/despesas/service', () => ({
  ...jest.requireActual('@/features/despesas/service'),
  listarDespesas: jest.fn(),
}));

const listar = listarDespesas as jest.Mock;

describe('Lista de despesas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista as despesas com data, título, valor e total', async () => {
    listar.mockResolvedValue({
      itens: [
        despesaLinha({
          id: '1',
          titulo: 'Aluguel',
          data: '2026-11-10',
          valor_centavos: 150000,
        }),
        despesaLinha({
          id: '2',
          titulo: 'Conta de luz',
          data: '2026-11-05',
          valor_centavos: 25000,
        }),
      ],
      total: 175000,
    });

    await render(<ListaDespesas />);

    expect(await screen.findByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Conta de luz')).toBeTruthy();
    expect(screen.getByText('Despesa · 10/11/2026')).toBeTruthy();
    expect(screen.getByText('Despesa · 05/11/2026')).toBeTruthy();

    expect(screen.getByText(/1\.750,00/)).toBeTruthy();
  });

  it('mostra o estado vazio quando não existem despesas', async () => {
    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Nenhuma despesa neste período'),
    ).toBeTruthy();

    expect(
      screen.getByText('Toque em + para registrar uma despesa.'),
    ).toBeTruthy();
  });

  it('abre o detalhe ao tocar em uma despesa', async () => {
    listar.mockResolvedValue({
      itens: [
        despesaLinha({
          id: 'despesa-teste',
          titulo: 'Aluguel',
        }),
      ],
      total: 150000,
    });

    await render(<ListaDespesas />);

    await fireEvent.press(await screen.findByText('Aluguel'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/despesas/[id]',
      params: { id: 'despesa-teste' },
    });
  });

  it('o botão + abre o cadastro de nova despesa', async () => {
    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    await screen.findByText('Nenhuma despesa neste período');

    await fireEvent.press(screen.getByLabelText('Nova despesa'));

    expect(router.push).toHaveBeenCalledWith('/despesas/nova');
  });

  it('mostra a mensagem de sucesso ao voltar do cadastro', async () => {
    setFeedback({
      tipo: 'sucesso',
      texto: 'Despesa salva com sucesso.',
    });

    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Despesa salva com sucesso.'),
    ).toBeTruthy();
  });

  it('mostra a mensagem de erro recebida de outra tela', async () => {
    setFeedback({
      tipo: 'erro',
      texto: 'Não foi possível salvar a despesa.',
    });

    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Não foi possível salvar a despesa.'),
    ).toBeTruthy();
  });

  describe('falha na leitura local', () => {
    it('mostra a mensagem de erro e a opção de tentar novamente', async () => {
      listar.mockRejectedValue(new FalhaLeitura('disco'));

      await render(<ListaDespesas />);

      expect(
        await screen.findByText(
          'Não foi possível carregar as despesas. Tente novamente.',
        ),
      ).toBeTruthy();

      expect(screen.getByText('Tentar novamente')).toBeTruthy();
    });

    it('recupera a listagem ao tentar novamente', async () => {
      listar.mockRejectedValueOnce(new FalhaLeitura('disco'));

      listar.mockResolvedValue({
        itens: [
          despesaLinha({
            id: 'recuperada',
            titulo: 'Despesa recuperada',
          }),
        ],
        total: 150000,
      });

      await render(<ListaDespesas />);

      await fireEvent.press(
        await screen.findByText('Tentar novamente'),
      );

      expect(
        await screen.findByText('Despesa recuperada'),
      ).toBeTruthy();

      await waitFor(() => {
        expect(listar).toHaveBeenCalledTimes(2);
      });
    });
  });
});
