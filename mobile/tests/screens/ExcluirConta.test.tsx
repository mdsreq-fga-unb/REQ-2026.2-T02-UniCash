import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ExcluirConta } from '@/components/conta/ExcluirConta';
import { solicitarExclusaoConta } from '@/features/conta/remocao';
import { ErroConta } from '@/features/conta/types';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/conta/remocao', () => ({ solicitarExclusaoConta: jest.fn() }));

const solicitar = jest.mocked(solicitarExclusaoConta);

beforeEach(() => jest.clearAllMocks());

async function confirmar() {
  await fireEvent.changeText(screen.getByLabelText('Senha atual'), 'senha-teste');
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar exclusão' }));
}

it('permite cancelar e exige a senha antes de confirmar', async () => {
  const voltar = jest.fn();
  await render(<ExcluirConta voltar={voltar} />);
  const botao = screen.getByRole('button', { name: 'Confirmar exclusão' });
  expect(botao.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(voltar).toHaveBeenCalledTimes(1);
  expect(solicitar).not.toHaveBeenCalled();
});

it.each([
  ['sem-conexao', 'Conecte-se à internet para confirmar o pedido.'],
  ['credenciais', 'A senha atual está incorreta.'],
  ['falha', 'Não foi possível concluir a operação. Tente novamente.'],
] as const)('informa %s e libera nova tentativa', async (codigo, mensagem) => {
  solicitar.mockRejectedValueOnce(new ErroConta(codigo));
  await render(<ExcluirConta voltar={jest.fn()} />);
  await confirmar();
  expect(await screen.findByText(mensagem)).toBeTruthy();
  expect(solicitar).toHaveBeenCalledWith('senha-teste', expect.any(Function));
});

it.each([false, true])('mostra a confirmação do servidor com falha local = %s', async falha => {
  solicitar.mockImplementationOnce(async (_senha, recebido) => {
    recebido();
    if (falha) throw new Error('SQLite indisponível');
  });
  await render(<ExcluirConta voltar={jest.fn()} />);
  await confirmar();
  expect(await screen.findByText('Solicitação de exclusão recebida')).toBeTruthy();
  if (falha) expect(await screen.findByText('A limpeza local será retomada ao reabrir o app.')).toBeTruthy();
  const voltar = await screen.findByRole('button', { name: 'Voltar à entrada' });
  await fireEvent.press(voltar);
  expect(router.replace).toHaveBeenCalledWith('/conta/entrar');
});
