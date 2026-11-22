// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Conta from '@/app/conta';
import { definirSessao } from '@/features/conta/sessao';
import { MSG } from '@/features/conta/validation';

const sair = () => fireEvent.press(screen.getByTestId('sair'));

function comSessao() {
  definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
}

beforeEach(() => reiniciar());

describe('Área Conta (fluxo D)', () => {
  it('sem sessão segue para a entrada', () => {
    render(<Conta />);
    expect(screen.getByText('redirect:/conta/entrar')).toBeTruthy();
  });

  it('FA06: com sessão mostra o e-mail e só o "Sair"', () => {
    comSessao();
    render(<Conta />);
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.getByTestId('sair')).toBeTruthy();
    expect(screen.queryByText('Criar conta')).toBeNull();
    expect(screen.queryByText('Entrar')).toBeNull();
  });

  it('D2-D3: sem pendências, encerra a sessão e informa que os dados continuam no aparelho', async () => {
    comSessao();
    render(<Conta />);
    sair();
    expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
    expect(screen.getByText('Seus dados continuam disponíveis neste aparelho.')).toBeTruthy();
    expect(servico.sair).toHaveBeenCalledTimes(1);
  });

  it('depois de sair, "Entrar de novo" e "Voltar ao início" navegam', async () => {
    comSessao();
    render(<Conta />);
    sair();
    fireEvent.press(await screen.findByText('Entrar de novo'));
    expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
    fireEvent.press(screen.getByText('Voltar ao início'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('EX09: falha ao invalidar a sessão informa o erro e mantém a sessão ativa', async () => {
    comSessao();
    servico.sair.mockRejectedValue(new Error('falha'));
    render(<Conta />);
    sair();
    expect(await screen.findByText(MSG.falhaSair)).toBeTruthy();
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.queryByText('Sessão encerrada')).toBeNull();
  });

  describe('FA03: alterações pendentes ao sair', () => {
    beforeEach(() => servico.contarPendentes.mockResolvedValue(3));

    it('avisa e não encerra antes de decidir', async () => {
      comSessao();
      render(<Conta />);
      sair();
      expect(await screen.findByText(/Há 3 alterações pendentes de sincronização/)).toBeTruthy();
      expect(servico.sair).not.toHaveBeenCalled();
    });

    it('usa o singular quando há uma só', async () => {
      servico.contarPendentes.mockResolvedValue(1);
      comSessao();
      render(<Conta />);
      sair();
      expect(await screen.findByText(/Há 1 alteração pendente de sincronização/)).toBeTruthy();
    });

    it('"Sincronizar e sair" sincroniza e depois encerra', async () => {
      comSessao();
      render(<Conta />);
      sair();
      fireEvent.press(await screen.findByText('Sincronizar e sair'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
      expect(servico.sincronizarAgora).toHaveBeenCalled();
      expect(servico.sincronizarAgora.mock.invocationCallOrder[0]).toBeLessThan(servico.sair.mock.invocationCallOrder[0]);
    });

    it('sem conexão ao sincronizar: avisa, não encerra, e permite sair mesmo assim', async () => {
      servico.sincronizarAgora.mockRejectedValue(new Error('offline'));
      comSessao();
      render(<Conta />);
      sair();
      fireEvent.press(await screen.findByText('Sincronizar e sair'));
      expect(await screen.findByText(/Não foi possível sincronizar agora/)).toBeTruthy();
      expect(servico.sair).not.toHaveBeenCalled();

      fireEvent.press(screen.getByText('Sair mesmo assim'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
    });

    it('"Sair mesmo assim" encerra sem sincronizar', async () => {
      comSessao();
      render(<Conta />);
      sair();
      fireEvent.press(await screen.findByText('Sair mesmo assim'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
      expect(servico.sincronizarAgora).not.toHaveBeenCalled();
    });

    it('"Cancelar" fecha o aviso e mantém a sessão', async () => {
      comSessao();
      render(<Conta />);
      sair();
      fireEvent.press(await screen.findByText('Cancelar'));
      await waitFor(() => expect(screen.queryByText(/alterações pendentes de sincronização/)).toBeNull());
      expect(servico.sair).not.toHaveBeenCalled();
      expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    });
  });

  it('falha ao contar as pendências não impede de sair', async () => {
    comSessao();
    servico.contarPendentes.mockRejectedValue(new Error('x'));
    render(<Conta />);
    sair();
    expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
  });
});
