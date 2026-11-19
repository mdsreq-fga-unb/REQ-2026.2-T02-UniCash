

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
import { setFeedback } from '@/lib/feedback';
import { contarPendentes } from '@/features/receitas/pendencias';
import {
  consumirAcessoNegado,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { MSG_DESPESA } from '@/features/despesas/validation';
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

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
}));
jest.mock('@/features/receitas/pendencias', () => ({
  contarPendentes: jest.fn().mockResolvedValue(0),
}));

const listar = listarDespesas as jest.Mock;

describe('Lista de despesas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contarPendentes as jest.Mock).mockResolvedValue(0);
    (sincronizarPendentes as jest.Mock).mockResolvedValue(false);
    (consumirAcessoNegado as jest.Mock).mockReturnValue(false);
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

  describe('filtro por categoria (B, FA04)', () => {
    it('mostra "Todas" e as sete categorias padrão', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);

      for (const nome of [
        'Todas',
        'Casa',
        'Alimentação',
        'Mobilidade',
        'Estudos',
        'Saúde',
        'Lazer',
        'Reserva financeira',
      ]) {
        expect(await screen.findByText(nome)).toBeTruthy();
      }
    });

    it('escolher uma categoria refaz a consulta com ela e "Todas" volta ao normal', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await fireEvent.press(screen.getByText('Saúde'));

      await waitFor(() => {
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'saude',
        );
      });

      await fireEvent.press(screen.getByText('Todas'));

      await waitFor(() => {
        const ultima = listar.mock.calls[listar.mock.calls.length - 1];
        expect(ultima).toHaveLength(2);
      });
    });

    it('FA04: categoria sem resultados mostra "Nenhum registro" e sugere alterar o filtro', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await fireEvent.press(screen.getByText('Lazer'));

      expect(await screen.findByText('Nenhum registro')).toBeTruthy();
      expect(
        screen.getByText(
          'Altere o filtro de categoria ou o período para ver outras despesas.',
        ),
      ).toBeTruthy();
    });

    it('a lista exibe a categoria de cada despesa', async () => {
      listar.mockResolvedValue({
        itens: [
          despesaLinha({ id: '1', titulo: 'Aluguel', categoria_id: 'casa' }),
        ],
        total: 150000,
      });

      await render(<ListaDespesas />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByTestId('categoria-despesa').props.children).toBe('Casa');
    });
  });

  describe('sincronização', () => {
    it('tenta sincronizar ao focar a lista (A7, C4, D4)', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await waitFor(() => {
        expect(sincronizarPendentes).toHaveBeenCalled();
      });
    });

    it('recarrega a lista quando a nuvem atualizou algum registro local', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (sincronizarPendentes as jest.Mock).mockResolvedValue(true);

      await render(<ListaDespesas />);

      await waitFor(() => {
        expect(listar.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('mostra o indicador de pendências no singular', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (contarPendentes as jest.Mock).mockResolvedValue(1);

      await render(<ListaDespesas />);

      expect(await screen.findByText('↻ 1 pendente')).toBeTruthy();
    });

    it('mostra o indicador de pendências no plural', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (contarPendentes as jest.Mock).mockResolvedValue(3);

      await render(<ListaDespesas />);

      expect(await screen.findByText('↻ 3 pendentes')).toBeTruthy();
    });

    it('não mostra o indicador sem pendências', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      expect(screen.queryByText(/pendente/)).toBeNull();
    });

    it('mantém a lista quando o contador de pendências falha', async () => {
      listar.mockResolvedValue({
        itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
        total: 150000,
      });
      (contarPendentes as jest.Mock).mockRejectedValue(new Error('disco'));

      await render(<ListaDespesas />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
    });

    it('EX06: nuvem negou o acesso → mensagem e dados locais intactos', async () => {
      listar.mockResolvedValue({
        itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
        total: 150000,
      });
      (consumirAcessoNegado as jest.Mock).mockReturnValue(true);

      await render(<ListaDespesas />);

      expect(await screen.findByText(MSG_DESPESA.semAcesso)).toBeTruthy();
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });
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
