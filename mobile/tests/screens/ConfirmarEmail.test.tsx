// Deve ser o primeiro import: registra os mocks de expo-router e do serviço de conta.
import { reiniciar, servico } from '../helpers/mocksConta';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ConfirmarEmail from '@/app/conta/confirmar-email';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

const jaConfirmei = () => fireEvent.press(screen.getByTestId('ja-confirmei'));

beforeEach(() => reiniciar({ email: 'ana@exemplo.com' }));

describe('Confirmação do e-mail (fluxo E)', () => {
  it('informa o e-mail e o prazo de 5 minutos (A6)', async () => {
    await render(<ConfirmarEmail />);
    expect(screen.getByText(/ana@exemplo\.com/)).toBeTruthy();
    expect(screen.getByText(/A ligação vale por 5 minutos/)).toBeTruthy();
  });

  it('E4-E5: confirmado, pergunta se envia os dados do aparelho', async () => {
    servico.verificarConfirmacao.mockResolvedValue(true);
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    expect(await screen.findByText('Enviar seus dados para a conta?')).toBeTruthy();
    expect(servico.verificarConfirmacao).toHaveBeenCalledWith('ana@exemplo.com');
  });

  it('E6: aceitar envia os dados e vai para a tela inicial', async () => {
    servico.verificarConfirmacao.mockResolvedValue(true);
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    await fireEvent.press(await screen.findByText('Enviar meus dados'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(servico.enviarDadosDoAparelho).toHaveBeenCalledTimes(1);
  });

  it('FA01: recusar não envia nada e segue para a tela inicial', async () => {
    servico.verificarConfirmacao.mockResolvedValue(true);
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    await fireEvent.press(await screen.findByText('Não enviar'));
    expect(servico.enviarDadosDoAparelho).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('EX08: falha no envio inicial não impede de seguir (registros ficam pendentes)', async () => {
    servico.verificarConfirmacao.mockResolvedValue(true);
    servico.enviarDadosDoAparelho.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    await fireEvent.press(await screen.findByText('Enviar meus dados'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('EX11: ainda não confirmado mostra o aviso e não abre o diálogo', async () => {
    servico.verificarConfirmacao.mockResolvedValue(false);
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    expect(await screen.findByText(MSG.emailNaoConfirmado)).toBeTruthy();
    expect(screen.queryByText('Enviar seus dados para a conta?')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('EX11: vindo da entrada, já abre com o aviso', async () => {
    reiniciar({ email: 'ana@exemplo.com', aviso: 'nao-confirmado' });
    await render(<ConfirmarEmail />);
    expect(screen.getByText(MSG.emailNaoConfirmado)).toBeTruthy();
  });

  it('EX03: sem conexão ao verificar', async () => {
    servico.verificarConfirmacao.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    expect(await screen.findByText(MSG.semConexaoContinuar)).toBeTruthy();
  });

  it('EX06: ligação expirada ou já usada, com o reenvio disponível', async () => {
    servico.verificarConfirmacao.mockRejectedValue(new ErroConta('ligacao-invalida'));
    await render(<ConfirmarEmail />);
    await jaConfirmei();
    expect(await screen.findByText(MSG.ligacaoInvalida)).toBeTruthy();
    expect(screen.getByTestId('reenviar')).toBeTruthy();
  });

  it('FA07: reenviar manda nova ligação e informa o prazo', async () => {
    await render(<ConfirmarEmail />);
    await fireEvent.press(screen.getByTestId('reenviar'));
    expect(await screen.findByText(/Enviamos uma nova ligação para ana@exemplo\.com\. Ela vale por 5 minutos\./)).toBeTruthy();
    expect(servico.reenviarConfirmacao).toHaveBeenCalledWith('ana@exemplo.com');
  });

  it('FA07: falha no reenvio mostra o erro e não o aviso de sucesso', async () => {
    servico.reenviarConfirmacao.mockRejectedValue(new ErroConta('sem-conexao'));
    await render(<ConfirmarEmail />);
    await fireEvent.press(screen.getByTestId('reenviar'));
    expect(await screen.findByText(MSG.semConexaoContinuar)).toBeTruthy();
    expect(screen.queryByText(/Enviamos uma nova ligação/)).toBeNull();
  });

  it('voltar leva à entrada', async () => {
    await render(<ConfirmarEmail />);
    await fireEvent.press(screen.getByLabelText('Voltar'));
    expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
  });
});
