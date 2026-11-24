import { fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app';
import { calcularResumo } from '@/features/resumo/service';
import { router } from '../helpers/expoRouterMock';

// A tela inicial é o resumo financeiro (UC03); o atalho para Despesas fica disponível em qualquer estado dele.
jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/evolucao/service', () => {
  const real = jest.requireActual('@/features/evolucao/service');
  // Evolução sem valores, mas com lançamentos: o gráfico aparece e não interfere no resumo.
  return {
    ...real,
    calcularEvolucao: jest.fn(async (fimAno: number, fimMes: number) => ({
      fimAno,
      fimMes,
      meses: real.mesesDaJanela({ ano: fimAno, mes: fimMes }).map((m: { ano: number; mes: number }) => ({
        ...m,
        receitasCentavos: 0,
        despesasCentavos: 0,
      })),
      semLancamentos: false,
    })),
  };
});
jest.mock('@/features/resumo/service', () => ({
  ...jest.requireActual('@/features/resumo/service'),
  calcularResumo: jest.fn(),
}));

const hoje = new Date();

it('RNF27: permite abrir a lista de despesas diretamente da tela inicial, mesmo com o resumo carregando', async () => {
  (calcularResumo as jest.Mock).mockReturnValue(new Promise(() => {}));
  await render(<Home />);

  await fireEvent.press(await screen.findByRole('button', { name: 'Despesas' }));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/despesas',
    params: { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1) },
  });
});

it('RNF27: com o resumo carregado, o atalho de despesas continua disponível', async () => {
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
  await render(<Home />);

  await fireEvent.press(await screen.findByRole('button', { name: 'Despesas' }));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/despesas', params: { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1) } });
});

it('RNF27: sem lançamentos, a tela inicial leva direto ao registro de despesa', async () => {
  (calcularResumo as jest.Mock).mockResolvedValue({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
    totalReceitasCentavos: 0,
    totalDespesasCentavos: 0,
    saldoCentavos: 0,
    receitasPorDia: [],
    metas: [],
    semLancamentos: true,
  });
  await render(<Home />);

  await fireEvent.press(await screen.findByRole('button', { name: 'Registrar despesa' }));

  expect(router.push).toHaveBeenCalledWith('/despesas/nova');
});
