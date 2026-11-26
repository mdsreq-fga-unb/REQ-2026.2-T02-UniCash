import { fireEvent, render, screen } from '@testing-library/react-native';
import TelaSaldoInicial from '@/app/saldo-inicial';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { lerSaldoInicial, salvarSaldoInicial } from '@/features/saldoInicial/service';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/sync', () => ({ sincronizarEmSegundoPlano: jest.fn() }));
jest.mock('@/features/saldoInicial/service', () => ({
  lerSaldoInicial: jest.fn(),
  salvarSaldoInicial: jest.fn(),
}));

const ler = jest.mocked(lerSaldoInicial);
const salvar = jest.mocked(salvarSaldoInicial);

beforeEach(() => {
  jest.resetAllMocks();
  ler.mockResolvedValue(null);
});

async function apertarSalvar() {
  await fireEvent.press(await screen.findByLabelText('Salvar saldo inicial'));
}

it('exibe a referência atual e permite substituir um saldo negativo por zero', async () => {
  ler.mockResolvedValue({ valor_centavos: -12550, mes_referencia: '2026-11', sync_status: 'pendente', revisao: 0 });
  await render(<TelaSaldoInicial />);
  expect(await screen.findByText('Saldo inicial atual: -R$ 125,50 · 2026-11')).toBeTruthy();
  expect(screen.getByText('Sincronização pendente')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Valor em reais'), '0');
  await fireEvent.press(screen.getByLabelText('Próximo mês'));
  await apertarSalvar();
  expect(salvar).toHaveBeenCalledWith({ valor_centavos: 0, mes_referencia: '2026-12' });
  expect(await screen.findByText('Saldo inicial salvo neste aparelho.')).toBeTruthy();
  expect(sincronizarEmSegundoPlano).toHaveBeenCalled();
});

it('explica entradas inválidas antes da escrita', async () => {
  await render(<TelaSaldoInicial />);
  await apertarSalvar();
  expect(screen.getByText(/Informe um valor em reais/)).toBeTruthy();
  expect(screen.getByText('Informe um mês válido no formato AAAA-MM.')).toBeTruthy();
  expect(salvar).not.toHaveBeenCalled();
});

it('informa falha de gravação e mantém os dados preenchidos', async () => {
  salvar.mockRejectedValue(new Error('SQLite'));
  await render(<TelaSaldoInicial />);
  await fireEvent.changeText(await screen.findByLabelText('Valor em reais'), '-125,50');
  await fireEvent.changeText(screen.getByLabelText('Mês de referência'), '2026-11');
  await apertarSalvar();
  expect(await screen.findByText('Não foi possível salvar o saldo inicial. Tente novamente.')).toBeTruthy();
  expect(screen.getByLabelText('Valor em reais').props.value).toBe('-125,50');
  expect(sincronizarEmSegundoPlano).not.toHaveBeenCalled();
});
