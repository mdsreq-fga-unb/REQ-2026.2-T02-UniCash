// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RedefinirSenha from '@/app/conta/redefinir-senha';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

const senha = () => screen.getByPlaceholderText('Mín. 8 caracteres');
const redefinir = () => fireEvent.press(screen.getByTestId('redefinir'));

beforeEach(() => reiniciar({ codigo: 'cod123' }));

describe('Redefinir senha (fluxo C, passos 3-5)', () => {
  it('EX06: sem código na ligação, trata como inválida e oferece nova ligação', () => {
    reiniciar({});
    render(<RedefinirSenha />);
    expect(screen.getByText(MSG.ligacaoInvalida)).toBeTruthy();
    fireEvent.press(screen.getByText('Solicitar nova ligação'));
    expect(router.replace).toHaveBeenCalledWith('/conta/recuperar-senha');
    expect(screen.queryByTestId('redefinir')).toBeNull();
  });

  it('C4: senha vazia é recusada', async () => {
    render(<RedefinirSenha />);
    redefinir();
    expect(await screen.findByText(MSG.senhaVazia)).toBeTruthy();
    expect(servico.redefinirSenha).not.toHaveBeenCalled();
  });

  it('valor-limite: senha de 7 caracteres é recusada pela mesma política do cadastro', async () => {
    render(<RedefinirSenha />);
    fireEvent.changeText(senha(), 'Abcde1!');
    redefinir();
    expect(await screen.findByText(MSG.senhaForaDaPolitica)).toBeTruthy();
    expect(servico.redefinirSenha).not.toHaveBeenCalled();
  });

  it.each([
    ['sem maiúscula', 'abcdef1!'],
    ['sem minúscula', 'ABCDEF1!'],
    ['sem caractere especial', 'Abcdefg1'],
  ])('senha %s é recusada', async (_n, s) => {
    render(<RedefinirSenha />);
    fireEvent.changeText(senha(), s);
    redefinir();
    expect(await screen.findByText(MSG.senhaForaDaPolitica)).toBeTruthy();
  });

  it('C4-C5: senha de 8 caracteres válida grava e leva à entrada com o aviso', async () => {
    render(<RedefinirSenha />);
    fireEvent.changeText(senha(), 'Abcdef1!');
    redefinir();
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/conta/entrar',
        params: { aviso: 'senha-redefinida' },
      }),
    );
    expect(servico.redefinirSenha).toHaveBeenCalledWith({ codigo: 'cod123', novaSenha: 'Abcdef1!' });
  });

  it('EX06: ligação expirada ou já usada troca o formulário por "Solicitar nova ligação"', async () => {
    servico.redefinirSenha.mockRejectedValue(new ErroConta('ligacao-invalida'));
    render(<RedefinirSenha />);
    fireEvent.changeText(senha(), 'Abcdef1!');
    redefinir();
    expect(await screen.findByText(MSG.ligacaoInvalida)).toBeTruthy();
    expect(screen.getByText('Solicitar nova ligação')).toBeTruthy();
    expect(screen.queryByTestId('redefinir')).toBeNull();
  });

  it('EX03: sem conexão limpa a senha e mantém o formulário', async () => {
    servico.redefinirSenha.mockRejectedValue(new ErroConta('sem-conexao'));
    render(<RedefinirSenha />);
    fireEvent.changeText(senha(), 'Abcdef1!');
    redefinir();
    expect(await screen.findByText(MSG.semConexaoContinuar)).toBeTruthy();
    expect(senha().props.value).toBe('');
    expect(screen.getByTestId('redefinir')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
