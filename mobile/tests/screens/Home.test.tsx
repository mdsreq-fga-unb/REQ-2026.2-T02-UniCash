import { fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app/index';
import { calcularResumo } from '@/features/resumo/service';
import { router } from '../helpers/expoRouterMock';

// A tela inicial é o resumo financeiro (UC03); os atalhos de navegação aparecem com o resumo carregado.
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
    (calcularResumo as jest.Mock).mockResolvedValue({
      ano: hoje.getFullYear(),
      mes: hoje.getMonth() + 1,
      totalReceitasCentavos: 0,
      totalDespesasCentavos: 0,
      saldoCentavos: 0,
      receitasPorDia: [],
      metas: [],
      semLancamentos: false,
    });
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
    expect(router.push).toHaveBeenCalledWith('/receitas');
  });
});
