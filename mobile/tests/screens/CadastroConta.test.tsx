// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Cadastro from '@/app/conta/cadastro';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL = 'voce@exemplo.com';
const SENHA = 'Crie uma senha (mín. 8 caracteres)';

const email = () => screen.getByPlaceholderText(EMAIL);
const senha = () => screen.getByPlaceholderText(SENHA);
const criar = () => fireEvent.press(screen.getByTestId('criar-conta'));

async function preencher(e: string, s: string) {
  await fireEvent.changeText(email(), e);
  await fireEvent.changeText(senha(), s);
}

beforeEach(() => reiniciar());

describe('Cadastro (fluxo A)', () => {
  it('A2: informa a finalidade dos dados (RNF32) e não pede CPF', async () => {
    await render(<Cadastro />);
    expect(screen.getByText(/Usamos seu e-mail só para criar a conta/)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/CPF/i)).toBeNull();
    expect(screen.queryByText(/^CPF$/i)).toBeNull();
  });

  it('A4 / EX01: campos vazios mostram os dois motivos e não chamam o serviço', async () => {
    await render(<Cadastro />);
    await criar();
    expect(await screen.findByText(MSG.emailVazio)).toBeTruthy();
    expect(screen.getByText(MSG.senhaVazia)).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('EX01: e-mail em formato inválido', async () => {
    await render(<Cadastro />);
    await preencher('abc', 'Abcdef1!');
    await criar();
    expect(await screen.findByText(MSG.emailInvalido)).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('EX01: preserva o e-mail digitado e limpa só a senha', async () => {
    await render(<Cadastro />);
    await preencher('abc', 'Abcdef1!');
    await criar();
    await screen.findByText(MSG.emailInvalido);
    expect(email().props.value).toBe('abc');
    expect(senha().props.value).toBe('');
  });

  it('valor-limite: senha de 7 caracteres é recusada', async () => {
    await render(<Cadastro />);
    await preencher(EMAIL.replace('voce', 'ana'), 'Abcde1!');
    await criar();
    expect(await screen.findByText(MSG.senhaForaDaPolitica)).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it.each([
    ['sem maiúscula', 'abcdef1!'],
    ['sem minúscula', 'ABCDEF1!'],
    ['sem caractere especial', 'Abcdefg1'],
  ])('EX01: senha %s é recusada', async (_n, s) => {
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', s);
    await criar();
    expect(await screen.findByText(MSG.senhaForaDaPolitica)).toBeTruthy();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('valor-limite: senha de 8 caracteres válida cadastra e segue para a confirmação (A6)', async () => {
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', 'Abcdef1!');
    await criar();
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/conta/confirmar-email',
        params: { email: 'ana@exemplo.com' },
      }),
    );
    expect(servico.cadastrar).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'Abcdef1!', nome: undefined });
  });

  it('envia o nome quando informado e o e-mail sem espaços', async () => {
    await render(<Cadastro />);
    await fireEvent.changeText(screen.getByPlaceholderText('Como você quer ser chamado?'), '  Ana  ');
    await preencher('  ana@exemplo.com  ', 'Abcdef1!');
    await criar();
    await waitFor(() => expect(servico.cadastrar).toHaveBeenCalled());
    expect(servico.cadastrar).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'Abcdef1!', nome: 'Ana' });
  });

  it('EX02: e-mail já em uso aparece ao lado do campo e preserva o e-mail', async () => {
    servico.cadastrar.mockRejectedValue(new ErroConta('email-em-uso'));
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', 'Abcdef1!');
    await criar();
    expect(await screen.findByText(MSG.emailEmUso)).toBeTruthy();
    expect(email().props.value).toBe('ana@exemplo.com');
    expect(senha().props.value).toBe('');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('EX03: sem conexão', async () => {
    servico.cadastrar.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', 'Abcdef1!');
    await criar();
    expect(await screen.findByText(MSG.semConexaoContinuar)).toBeTruthy();
    expect(email().props.value).toBe('ana@exemplo.com');
    expect(senha().props.value).toBe('');
  });

  it('EX07: falha ao criar a conta', async () => {
    servico.cadastrar.mockRejectedValue(new ErroConta('falha'));
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', 'Abcdef1!');
    await criar();
    expect(await screen.findByText(MSG.falhaCriarConta)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('EX10: dados recusados pelas Security Rules mostram o motivo', async () => {
    servico.cadastrar.mockRejectedValue(new ErroConta('regras-recusadas', 'Dados recusados pelo servidor.'));
    await render(<Cadastro />);
    await preencher('ana@exemplo.com', 'Abcdef1!');
    await criar();
    expect(await screen.findByText('Dados recusados pelo servidor.')).toBeTruthy();
  });

  it('FA05: "Continuar sem conta" não cria nada', async () => {
    await render(<Cadastro />);
    await fireEvent.press(screen.getByTestId('continuar-sem-conta'));
    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('unicash:continuar-sem-conta', '1'),
    );
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('"Já tenho conta" leva à entrada', async () => {
    await render(<Cadastro />);
    await fireEvent.press(screen.getByText('Já tenho conta · Entrar'));
    expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
  });
});
