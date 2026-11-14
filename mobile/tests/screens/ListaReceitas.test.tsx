import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ListaReceitas from '@/app/receitas/index';
import { FalhaLeitura, listarReceitas } from '@/features/receitas/service';
import { contarPendentes } from '@/features/receitas/pendencias';
import { setFeedback } from '@/features/receitas/feedback';
import { MSG } from '@/features/receitas/validation';
import { router } from '../helpers/expoRouterMock';
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
}));
jest.mock('@/features/receitas/pendencias', () => ({ contarPendentes: jest.fn().mockResolvedValue(0) }));

const listar = listarReceitas as jest.Mock;

describe('Lista de receitas (protótipo F6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contarPendentes as jest.Mock).mockResolvedValue(0);
  });

  it('lista com data completa, título e valor, mais o total', async () => {
    listar.mockResolvedValue({
      itens: [
        receitaLinha({ id: '1', titulo: 'Bolsa de monitoria', data: '2026-10-10', valor_centavos: 10000 }),
        receitaLinha({ id: '2', titulo: 'Estágio', data: '2026-10-05', valor_centavos: 5000 }),
      ],
      total: 15000,
    });
    await render(<ListaReceitas />);

    expect(await screen.findByText('Bolsa de monitoria')).toBeTruthy();
    expect(screen.getByText('Receita · 10/10/2026')).toBeTruthy();
    expect(screen.getByText('+ R$ 100,00')).toBeTruthy();
    expect(screen.getByText('Estágio')).toBeTruthy();
    expect(screen.getByText('+ R$ 150,00')).toBeTruthy(); // total
  });

  it('estado vazio', async () => {
    listar.mockResolvedValue({ itens: [], total: 0 });
    await render(<ListaReceitas />);
    expect(await screen.findByText('Nenhuma receita neste período')).toBeTruthy();
  });

  it('abre o detalhe ao tocar em uma receita', async () => {
    listar.mockResolvedValue({ itens: [receitaLinha({ id: 'xyz', titulo: 'Estágio' })], total: 15000 });
    await render(<ListaReceitas />);
    await fireEvent.press(await screen.findByText('Estágio'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/receitas/[id]', params: { id: 'xyz' } });
  });

  it('o botão + abre o registro de nova receita', async () => {
    listar.mockResolvedValue({ itens: [], total: 0 });
    await render(<ListaReceitas />);
    await screen.findByText('Nenhuma receita neste período');
    await fireEvent.press(screen.getByLabelText('Nova receita'));
    expect(router.push).toHaveBeenCalledWith('/receitas/nova');
  });

  describe('indicadores de sincronização', () => {
    it('receita pendente mostra "Sincronização pendente"', async () => {
      listar.mockResolvedValue({ itens: [receitaLinha({ sync_status: 'pendente' })], total: 15000 });
      await render(<ListaReceitas />);
      expect(await screen.findByText('Sincronização pendente')).toBeTruthy();
    });

    it('receita sincronizada não mostra o indicador', async () => {
      listar.mockResolvedValue({ itens: [receitaLinha({ sync_status: 'sincronizado' })], total: 15000 });
      await render(<ListaReceitas />);
      await screen.findByText('Freela de design');
      expect(screen.queryByText('Sincronização pendente')).toBeNull();
    });

    it('o cabeçalho mostra quantos registros estão pendentes', async () => {
      (contarPendentes as jest.Mock).mockResolvedValue(2);
      listar.mockResolvedValue({ itens: [], total: 0 });
      await render(<ListaReceitas />);
      expect(await screen.findByText(/2 pendentes/)).toBeTruthy();
    });
  });

  it('mostra a mensagem de sucesso uma única vez ao voltar do registro', async () => {
    setFeedback({ tipo: 'sucesso', texto: 'Salvo no dispositivo. Sincronização pendente.' });
    listar.mockResolvedValue({ itens: [], total: 0 });
    await render(<ListaReceitas />);
    expect(await screen.findByText(/Salvo no dispositivo\. Sincronização pendente\./)).toBeTruthy();
  });

  it('EX06/EX03: mensagem de erro vinda de outra tela aparece na lista', async () => {
    setFeedback({ tipo: 'erro', texto: MSG.indisponivel });
    listar.mockResolvedValue({ itens: [], total: 0 });
    await render(<ListaReceitas />);
    expect(await screen.findByText(/Esta receita não está mais disponível\./)).toBeTruthy();
  });

  describe('EX08: falha na leitura local', () => {
    it('mostra a mensagem e a ação "Tentar novamente"', async () => {
      listar.mockRejectedValue(new FalhaLeitura('disco'));
      await render(<ListaReceitas />);
      expect(await screen.findByText('Não foi possível carregar as receitas. Tente novamente.')).toBeTruthy();
      expect(screen.getByText('Tentar novamente')).toBeTruthy();
    });

    it('ao tentar novamente, volta a carregar a lista (passo 1)', async () => {
      listar.mockRejectedValueOnce(new FalhaLeitura('disco'));
      listar.mockResolvedValue({ itens: [receitaLinha({ titulo: 'Recuperada' })], total: 15000 });
      await render(<ListaReceitas />);

      await fireEvent.press(await screen.findByText('Tentar novamente'));

      expect(await screen.findByText('Recuperada')).toBeTruthy();
      await waitFor(() => expect(screen.queryByText(MSG.falhaLeitura)).toBeNull());
    });
  });
});
