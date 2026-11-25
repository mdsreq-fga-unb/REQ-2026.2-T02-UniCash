import { fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app/index';
import { calcularResumo } from '@/features/resumo/service';
import { router } from '../helpers/expoRouterMock';

// A tela inicial é o resumo financeiro (UC03); os atalhos ficam disponíveis em qualquer estado dele.
jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/resumo/service', () => ({
  ...jest.requireActual('@/features/resumo/service'),
  calcularResumo: jest.fn(),
}));

const hoje = new Date();

describe('Home (navegação da UC06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Cálculo que nunca termina: os atalhos não podem depender do resumo carregado.
    (calcularResumo as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it('oferece acesso a Categorias e navega para /categorias', async () => {
    await render(<Home />);

    expect(await screen.findByRole('button', { name: 'Categorias' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Categorias' }));
    expect(router.push).toHaveBeenCalledWith('/categorias');
  });

  it('mantém o acesso a Receitas', async () => {
    await render(<Home />);

    expect(await screen.findByRole('button', { name: 'Receitas' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
        expect(router.push).toHaveBeenCalledWith({ pathname: '/receitas', params: { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1) } });
  });

  it('UC08: oferece acesso ao saldo inicial e navega para /saldo-inicial', async () => {
    await render(<Home />);

    expect(
      await screen.findByRole('button', { name: 'Saldo inicial' }),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Saldo inicial' }),
    );

    expect(router.push).toHaveBeenCalledWith('/saldo-inicial');
  });
});
