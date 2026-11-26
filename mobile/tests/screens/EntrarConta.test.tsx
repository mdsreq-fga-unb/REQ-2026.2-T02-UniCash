// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Entrar from '@/app/conta/entrar';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

const email = () => screen.getByPlaceholderText('voce@exemplo.com');
const senha = () => screen.getByPlaceholderText('Digite sua senha');
const entrar = () => fireEvent.press(screen.getByTestId('entrar'));

beforeEach(() => reiniciar());

describe('Entrada (fluxo B)', () => {
  it('B2: campos vazios não chamam o serviço', async () => {
    await render(<Entrar />);
    await entrar();
    expect(await screen.findByText(MSG.emailVazio)).toBeTruthy();
    expect(screen.getByText(MSG.senhaVazia)).toBeTruthy();
    expect(servico.entrar).not.toHaveBeenCalled();
  });

  it('B2: na entrada só confere o preenchimento, sem exigir a política de senha', async () => {
    await render(<Entrar />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await fireEvent.changeText(senha(), 'a');
    await entrar();
    await waitFor(() => expect(servico.entrar).toHaveBeenCalled());
  });

  it('B3-B5: credenciais corretas iniciam a sessão e levam à tela inicial', async () => {
    await render(<Entrar />);
    await fireEvent.changeText(email(), '  ana@exemplo.com ');
    await fireEvent.changeText(senha(), 'Abcdef1!');
    await entrar();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(servico.entrar).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'Abcdef1!' });
  });

  it('EX04: credenciais rejeitadas mostram mensagem única, preservam o e-mail e limpam a senha', async () => {
    servico.entrar.mockRejectedValue(new ErroConta('credenciais'));
    await render(<Entrar />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await fireEvent.changeText(senha(), 'errada');
    await entrar();
    expect(await screen.findByText(MSG.credenciaisRejeitadas)).toBeTruthy();
    expect(email().props.value).toBe('ana@exemplo.com');
    expect(senha().props.value).toBe('');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('EX05: sem conexão usa o texto de entrada', async () => {
    servico.entrar.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<Entrar />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await fireEvent.changeText(senha(), 'Abcdef1!');
    await entrar();
    expect(await screen.findByText(MSG.semConexaoEntrar)).toBeTruthy();
    expect(screen.queryByText(MSG.semConexaoContinuar)).toBeNull();
  });

  it('EX11: e-mail não confirmado leva à confirmação, com aviso e o e-mail', async () => {
    servico.entrar.mockRejectedValue(new ErroConta('email-nao-confirmado'));
    await render(<Entrar />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await fireEvent.changeText(senha(), 'Abcdef1!');
    await entrar();
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/conta/confirmar-email',
        params: { email: 'ana@exemplo.com', aviso: 'nao-confirmado' },
      }),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('depois de redefinir a senha, mostra o aviso de sucesso (C5)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ aviso: 'senha-redefinida' });
    await render(<Entrar />);
    expect(screen.getByText('Senha redefinida. Entre com a nova senha.')).toBeTruthy();
  });

  it('sem o parâmetro, não mostra o aviso de senha redefinida', async () => {
    await render(<Entrar />);
    expect(screen.queryByText('Senha redefinida. Entre com a nova senha.')).toBeNull();
  });

  it('"Esqueci minha senha" abre a recuperação (fluxo C)', async () => {
    await render(<Entrar />);
    await fireEvent.press(screen.getByText('Esqueci minha senha'));
    expect(router.push).toHaveBeenCalledWith('/conta/recuperar-senha');
  });

  it('FA05: "Continuar sem conta" não chama o serviço', async () => {
    await render(<Entrar />);
    await fireEvent.press(screen.getByTestId('continuar-sem-conta'));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(servico.entrar).not.toHaveBeenCalled();
  });

  it('"Criar conta" leva ao cadastro', async () => {
    await render(<Entrar />);
    await fireEvent.press(screen.getByText('Não tenho conta · Criar conta'));
    expect(router.replace).toHaveBeenCalledWith('/conta/cadastro');
  });
});
