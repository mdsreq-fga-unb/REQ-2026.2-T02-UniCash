import { fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app/index';
import { definirSessao } from '@/features/conta/sessao';
import { resetarContinuidadeSemConta, salvarContinuidadeSemConta } from '@/features/conta/onboarding';
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
    definirSessao({ status: 'sem-sessao' });
    resetarContinuidadeSemConta();
    // Cálculo que nunca termina: os atalhos não podem depender do resumo carregado.
    (calcularResumo as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it('abre o cadastro na primeira inicialização sem sessão', async () => {
    await render(<Home />);
    expect(await screen.findByText('redirect:/conta/cadastro')).toBeTruthy();
  });

  it('oferece acesso a Categorias e navega para /categorias', async () => {
    await salvarContinuidadeSemConta();
    await render(<Home />);

    expect(await screen.findByRole('button', { name: 'Categorias' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Categorias' }));
    expect(router.push).toHaveBeenCalledWith('/categorias');
  });

  it('oferece acesso ao Perfil e navega para /perfil (UC14)', async () => {
    await salvarContinuidadeSemConta();
    await render(<Home />);

    expect(await screen.findByRole('button', { name: 'Perfil' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Perfil' }));
    expect(router.push).toHaveBeenCalledWith('/perfil');
  });

  it('mantém o acesso a Receitas', async () => {
    await salvarContinuidadeSemConta();
    await render(<Home />);

    expect(await screen.findByRole('button', { name: 'Receitas' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/receitas', params: { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1) } });
  });
});
