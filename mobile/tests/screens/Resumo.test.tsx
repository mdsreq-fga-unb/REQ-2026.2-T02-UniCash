import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ResumoFinanceiro from '@/app/index';
import { calcularResumo, FalhaCalculo, MSG_FALHA_CALCULO, type ResumoMensal } from '@/features/resumo/service';
import { router } from '../helpers/expoRouterMock';
import { mesAnterior, nomeMes, proximoMes } from '@/features/receitas/dates';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/resumo/service', () => ({
  ...jest.requireActual('@/features/resumo/service'),
  calcularResumo: jest.fn(),
}));

const calcular = calcularResumo as jest.Mock;

// Como nas demais telas, o mês corrente vem do relógio real (o relógio falso atrapalha o act do RNTL).
const hoje = new Date();
const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

function resumo(extra: Partial<ResumoMensal> = {}): ResumoMensal {
  return {
    ano: 2026,
    mes: 10,
    totalReceitasCentavos: 150000,
    totalDespesasCentavos: 57435,
    saldoCentavos: 92565,
    receitasPorDia: [
      { data: '2026-10-05', totalCentavos: 100000 },
      { data: '2026-10-16', totalCentavos: 50000 },
    ],
    metas: [],
    semLancamentos: false,
    ...extra,
  };
}

describe('Tela de resumo financeiro (UC03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('abre no mês corrente e mostra saldo, receitas, despesas, metas e receitas por dia (RF40, RF11)', async () => {
    calcular.mockResolvedValue(resumo());
    await render(<ResumoFinanceiro />);

    expect(await screen.findByTestId('saldo')).toHaveTextContent('+ R$ 925,65');
    expect(calcular).toHaveBeenCalledWith(atual.ano, atual.mes);
    expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(atual.ano, atual.mes));
    expect(screen.getByTestId('total-receitas')).toHaveTextContent('R$ 1.500,00');
    expect(screen.getByTestId('total-despesas')).toHaveTextContent('R$ 574,35');
    expect(screen.getByText('Nenhuma meta no período.')).toBeTruthy();
    expect(screen.getByTestId('dia-2026-10-05')).toHaveTextContent('Seg, 05/10+ R$ 1.000,00');
    expect(screen.getByTestId('dia-2026-10-16')).toHaveTextContent('Sex, 16/10+ R$ 500,00');
    expect(screen.queryByTestId('dia-2026-10-10')).toBeNull();
  });

  it('saldo negativo aparece com sinal de menos', async () => {
    calcular.mockResolvedValue(resumo({ totalReceitasCentavos: 0, saldoCentavos: -3000, receitasPorDia: [] }));
    await render(<ResumoFinanceiro />);
    expect(await screen.findByTestId('saldo')).toHaveTextContent('− R$ 30,00');
    expect(screen.getByText('Saídas maiores que entradas')).toBeTruthy();
  });

  it('FA01: mês sem receitas mostra total zero e aviso na visão por dia', async () => {
    calcular.mockResolvedValue(resumo({ totalReceitasCentavos: 0, saldoCentavos: -57435, receitasPorDia: [] }));
    await render(<ResumoFinanceiro />);
    expect(await screen.findByTestId('total-receitas')).toHaveTextContent('R$ 0,00');
    expect(screen.getByText('Nenhuma receita neste mês.')).toBeTruthy();
  });

  it('mostra o progresso das metas quando houver', async () => {
    calcular.mockResolvedValue(
      resumo({ metas: [{ id: 'm1', titulo: 'Viagem', alvoCentavos: 100000, realizadoCentavos: 25000 }] }),
    );
    await render(<ResumoFinanceiro />);
    expect(await screen.findByText('Viagem')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('R$ 250,00 de R$ 1.000,00')).toBeTruthy();
  });

  it('seletor navega para meses anteriores e futuros e recalcula (passos 5 e 6)', async () => {
    calcular.mockImplementation(async (ano: number, mes: number) => resumo({ ano, mes }));
    await render(<ResumoFinanceiro />);
    await screen.findByTestId('saldo');

    // três meses à frente (atravessa a virada do ano quando o mês corrente é outubro ou depois)
    let alvo = atual;
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByLabelText('Próximo mês'));
      alvo = proximoMes(alvo.ano, alvo.mes);
      const esperado = alvo;
      await waitFor(() => expect(calcular).toHaveBeenLastCalledWith(esperado.ano, esperado.mes));
    }
    expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(alvo.ano, alvo.mes));

    // quatro meses para trás: um mês antes do corrente
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByLabelText('Mês anterior'));
    const anterior = mesAnterior(atual.ano, atual.mes);
    await waitFor(() => expect(calcular).toHaveBeenLastCalledWith(anterior.ano, anterior.mes));
    expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(anterior.ano, anterior.mes));
  });

  it('FA02: sem lançamentos mostra estado vazio com atalho para o tutorial (RF55)', async () => {
    calcular.mockResolvedValue(
      resumo({
        totalReceitasCentavos: 0,
        totalDespesasCentavos: 0,
        saldoCentavos: 0,
        receitasPorDia: [],
        semLancamentos: true,
      }),
    );
    await render(<ResumoFinanceiro />);

    expect(await screen.findByText('Nenhum lançamento ainda')).toBeTruthy();
    expect(screen.queryByTestId('saldo')).toBeNull();
    await fireEvent.press(screen.getByText('Ver tutorial'));
    expect(router.push).toHaveBeenCalledWith('/tutorial');
    await fireEvent.press(screen.getByText('Registrar receita'));
    expect(router.push).toHaveBeenCalledWith('/receitas/nova');
    await fireEvent.press(screen.getByText('Registrar despesa'));
    expect(router.push).toHaveBeenCalledWith('/despesas/nova');
  });

  it('EX01: falha mostra a mensagem e "Tentar novamente" refaz o cálculo do mês (retorno ao passo 2)', async () => {
    calcular.mockRejectedValueOnce(new FalhaCalculo('boom')).mockResolvedValue(resumo());
    await render(<ResumoFinanceiro />);

    expect(await screen.findByText(MSG_FALHA_CALCULO)).toBeTruthy();
    expect(MSG_FALHA_CALCULO).toBe('Não foi possível calcular os totais. Tente novamente.');
    expect(screen.queryByTestId('saldo')).toBeNull();

    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(await screen.findByTestId('saldo')).toHaveTextContent('+ R$ 925,65');
    expect(screen.queryByText(MSG_FALHA_CALCULO)).toBeNull();
    expect(calcular).toHaveBeenCalledTimes(2);
    expect(calcular).toHaveBeenLastCalledWith(atual.ano, atual.mes);
  });

  it('atalhos levam às listas de receitas e despesas', async () => {
    calcular.mockResolvedValue(resumo());
    await render(<ResumoFinanceiro />);
    await screen.findByTestId('saldo');
    await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
    expect(router.push).toHaveBeenCalledWith('/receitas');
    await fireEvent.press(screen.getByRole('button', { name: 'Despesas' }));
    expect(router.push).toHaveBeenCalledWith('/despesas');
  });
});
