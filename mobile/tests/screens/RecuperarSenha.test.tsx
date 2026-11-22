// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import RecuperarSenha from '@/app/conta/recuperar-senha';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

const email = () => screen.getByPlaceholderText('voce@exemplo.com');
const enviar = () => fireEvent.press(screen.getByTestId('enviar-recuperacao'));

beforeEach(() => reiniciar());

describe('Recuperar senha (fluxo C, passos 1-2)', () => {
  it('e-mail vazio não chama o serviço', async () => {
    await render(<RecuperarSenha />);
    await enviar();
    expect(await screen.findByText(MSG.emailVazio)).toBeTruthy();
    expect(servico.enviarRecuperacao).not.toHaveBeenCalled();
  });

  it('e-mail inválido não chama o serviço', async () => {
    await render(<RecuperarSenha />);
    await fireEvent.changeText(email(), 'abc');
    await enviar();
    expect(await screen.findByText(MSG.emailInvalido)).toBeTruthy();
    expect(servico.enviarRecuperacao).not.toHaveBeenCalled();
  });

  it('C2: envia e responde de forma neutra, com o prazo de 5 minutos', async () => {
    await render(<RecuperarSenha />);
    await fireEvent.changeText(email(), '  ana@exemplo.com ');
    await enviar();
    expect(await screen.findByText(/Se existir uma conta com esse e-mail, a ligação foi enviada\./)).toBeTruthy();
    expect(screen.getByText(/vale por 5 minutos e só pode ser usada uma vez/)).toBeTruthy();
    expect(servico.enviarRecuperacao).toHaveBeenCalledWith('ana@exemplo.com');
  });

  it('depois de enviar, oferece voltar para a entrada', async () => {
    await render(<RecuperarSenha />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await enviar();
    await fireEvent.press(await screen.findByText('Voltar para entrar'));
    expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
  });

  it('EX03: sem conexão preserva o e-mail e não mostra a resposta de sucesso', async () => {
    servico.enviarRecuperacao.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<RecuperarSenha />);
    await fireEvent.changeText(email(), 'ana@exemplo.com');
    await enviar();
    expect(await screen.findByText(MSG.semConexaoContinuar)).toBeTruthy();
    expect(email().props.value).toBe('ana@exemplo.com');
    expect(screen.queryByText(/a ligação foi enviada/)).toBeNull();
  });

  it('FA05: cancelar não envia nada', async () => {
    await render(<RecuperarSenha />);
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(router.back).toHaveBeenCalled();
    expect(servico.enviarRecuperacao).not.toHaveBeenCalled();
  });
});
