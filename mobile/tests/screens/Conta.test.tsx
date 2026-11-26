// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { criarAuthFirebase } from '@/features/conta/auth.firebase';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Conta from '@/app/conta';
import { remocaoConta } from '@/features/conta/remocao';
import { definirSessao } from '@/features/conta/sessao';
import { MSG } from '@/features/conta/validation';

jest.mock('@/features/conta/remocao', () => ({ AutorizacaoDeRemocaoIndisponivel: Error, remocaoConta: { excluir: jest.fn() } }));
jest.mock('@/features/conta/auth.firebase', () => ({ criarAuthFirebase: jest.fn() }));

const sair = () => fireEvent.press(screen.getByTestId('sair'));

function comSessao() {
  definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
}

beforeEach(() => reiniciar());

describe('Área Conta (fluxo D)', () => {
  it('sem sessão segue para a entrada', async () => {
    await render(<Conta />);
    expect(screen.getByText('redirect:/conta/entrar')).toBeTruthy();
  });

  it('FA06: com sessão mostra o e-mail e oferece "Sair"', async () => {
    comSessao();
    await render(<Conta />);
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.getByTestId('sair')).toBeTruthy();
    expect(screen.queryByText('Criar conta')).toBeNull();
    expect(screen.queryByText('Entrar')).toBeNull();
  });

  it('D2-D3: sem pendências, encerra a sessão e informa que os dados continuam no aparelho', async () => {
    comSessao();
    await render(<Conta />);
    await sair();
    expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
    expect(screen.getByText('Seus dados continuam disponíveis neste aparelho.')).toBeTruthy();
    expect(servico.sair).toHaveBeenCalledTimes(1);
  });

  it('depois de sair, "Entrar de novo" e "Voltar ao início" navegam', async () => {
    comSessao();
    await render(<Conta />);
    await sair();
    await fireEvent.press(await screen.findByText('Entrar de novo'));
    expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
    await fireEvent.press(screen.getByText('Voltar ao início'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('EX09: falha ao invalidar a sessão informa o erro e mantém a sessão ativa', async () => {
    comSessao();
    servico.sair.mockRejectedValue(new Error('falha'));
    await render(<Conta />);
    await sair();
    expect(await screen.findByText(MSG.falhaSair)).toBeTruthy();
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.queryByText('Sessão encerrada')).toBeNull();
  });

  describe('FA03: alterações pendentes ao sair', () => {
    beforeEach(() => servico.contarPendentes.mockResolvedValue(3));

    it('avisa e não encerra antes de decidir', async () => {
      comSessao();
      await render(<Conta />);
      await sair();
      expect(await screen.findByText(/Há 3 alterações pendentes de sincronização/)).toBeTruthy();
      expect(servico.sair).not.toHaveBeenCalled();
    });

    it('usa o singular quando há uma só', async () => {
      servico.contarPendentes.mockResolvedValue(1);
      comSessao();
      await render(<Conta />);
      await sair();
      expect(await screen.findByText(/Há 1 alteração pendente de sincronização/)).toBeTruthy();
    });

    it('"Sincronizar e sair" sincroniza e depois encerra', async () => {
      comSessao();
      await render(<Conta />);
      await sair();
      await fireEvent.press(await screen.findByText('Sincronizar e sair'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
      expect(servico.sincronizarAgora).toHaveBeenCalled();
      expect(servico.sincronizarAgora.mock.invocationCallOrder[0]).toBeLessThan(servico.sair.mock.invocationCallOrder[0]);
    });

    it('sem conexão ao sincronizar: avisa, não encerra, e permite sair mesmo assim', async () => {
      servico.sincronizarAgora.mockRejectedValue(new Error('offline'));
      comSessao();
      await render(<Conta />);
      await sair();
      await fireEvent.press(await screen.findByText('Sincronizar e sair'));
      expect(await screen.findByText(/Não foi possível sincronizar agora/)).toBeTruthy();
      expect(servico.sair).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByText('Sair mesmo assim'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
    });

    it('"Sair mesmo assim" encerra sem sincronizar', async () => {
      comSessao();
      await render(<Conta />);
      await sair();
      await fireEvent.press(await screen.findByText('Sair mesmo assim'));
      expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
      expect(servico.sincronizarAgora).not.toHaveBeenCalled();
    });

    it('"Cancelar" fecha o aviso e mantém a sessão', async () => {
      comSessao();
      await render(<Conta />);
      await sair();
      await fireEvent.press(await screen.findByText('Cancelar'));
      await waitFor(() => expect(screen.queryByText(/alterações pendentes de sincronização/)).toBeNull());
      expect(servico.sair).not.toHaveBeenCalled();
      expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    });
  });

  it('falha ao contar as pendências não impede de sair', async () => {
    comSessao();
    servico.contarPendentes.mockRejectedValue(new Error('x'));
    await render(<Conta />);
    await sair();
    expect(await screen.findByText('Sessão encerrada')).toBeTruthy();
  });
});


describe('Perfil (UC11)', () => {
  const auth = {
    changePassword: jest.fn().mockResolvedValue(undefined),
    requestEmailChange: jest.fn().mockResolvedValue(undefined),
    confirmEmailChange: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(criarAuthFirebase).mockReturnValue(auth as unknown as ReturnType<typeof criarAuthFirebase>);
    await AsyncStorage.clear();
    comSessao();
  });

  async function editar() {
    await render(<Conta />);
    await fireEvent.press(screen.getByRole('button', { name: 'Editar perfil' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled());
  }

  it.each([
    ['Abcde1!', false],
    ['Abcdef1!', true],
    ['abcdef1!', false],
    ['ABCDEF1!', false],
    ['Abcdef12', false],
  ])('valida a política de senha para %s', async (senha, valida) => {
    await editar();
    await fireEvent.changeText(screen.getByLabelText('Senha atual'), 'Atual@123');
    await fireEvent.changeText(screen.getByLabelText('Nova senha (opcional)'), senha);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    if (valida) {
      expect(await screen.findByText('Senha alterada.')).toBeTruthy();
      expect(auth.changePassword).toHaveBeenCalledWith({ senhaAtual: 'Atual@123', novaSenha: senha });
    } else {
      expect(await screen.findByText(MSG.senhaForaDaPolitica)).toBeTruthy();
      expect(auth.changePassword).not.toHaveBeenCalled();
    }
  });

  it('mantém a troca pendente ao reabrir o formulário e volta a verificá-la', async () => {
    await editar();
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'nova@exemplo.com');
    await fireEvent.changeText(screen.getByLabelText('Senha atual'), 'Atual@123');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Confirmação pendente para nova@exemplo.com.')).toBeTruthy();
    expect(auth.requestEmailChange).toHaveBeenCalledWith({ novoEmail: 'nova@exemplo.com', senhaAtual: 'Atual@123' });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Editar perfil' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Já confirmei' }));
    expect(await screen.findByText('Novo e-mail confirmado.')).toBeTruthy();
    expect(auth.confirmEmailChange).toHaveBeenCalledWith(undefined, 'nova@exemplo.com');
  });
});


describe('Exclusão de conta (UC11)', () => {
  const excluir = jest.mocked(remocaoConta.excluir);

  beforeEach(() => {
    excluir.mockReset();
    comSessao();
  });

  async function abrirConfirmacao() {
    await render(<Conta />);
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }));
  }

  it('informa os prazos de remoção e permite cancelar', async () => {
    await abrirConfirmacao();
    expect(screen.getByText(/até 30 dias.*até 60 dias/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(excluir).not.toHaveBeenCalled();
  });

  it('confirma para o usuário ativo, encerra a sessão e retorna ao uso sem conta', async () => {
    excluir.mockImplementation(async () => definirSessao({ status: 'sem-sessao' }));
    await abrirConfirmacao();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta definitivamente' }));
    expect(excluir).toHaveBeenCalledWith('u1');
    expect(await screen.findByText('Conta excluída neste aparelho')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar sem conta' }));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
