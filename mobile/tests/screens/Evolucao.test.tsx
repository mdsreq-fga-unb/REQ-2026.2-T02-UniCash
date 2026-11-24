import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ResumoFinanceiro from '@/app/index';
import { calcularResumo, type ResumoMensal } from '@/features/resumo/service';
import {
  calcularEvolucao,
  FalhaEvolucao,
  mesesDaJanela,
  MSG_FALHA_EVOLUCAO,
  type EvolucaoMensal,
} from '@/features/evolucao/service';
import { mesAnterior, nomeMes, proximoMes } from '@/features/receitas/dates';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/resumo/service', () => ({
  ...jest.requireActual('@/features/resumo/service'),
  calcularResumo: jest.fn(),
}));
jest.mock('@/features/evolucao/service', () => ({
  ...jest.requireActual('@/features/evolucao/service'),
  calcularEvolucao: jest.fn(),
}));

const resumir = calcularResumo as jest.Mock;
const evoluir = calcularEvolucao as jest.Mock;

const hoje = new Date();
const atual = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

function resumo(ano: number, mes: number, extra: Partial<ResumoMensal> = {}): ResumoMensal {
  return {
    ano,
    mes,
    totalReceitasCentavos: 0,
    totalDespesasCentavos: 0,
    saldoCentavos: 0,
    receitasPorDia: [],
    metas: [],
    semLancamentos: false,
    ...extra,
  };
}

/** Série da janela que termina em (fimAno, fimMes); receitas = 1000 × posição, despesas = 500 × posição. */
function serie(fimAno: number, fimMes: number, extra: Partial<EvolucaoMensal> = {}): EvolucaoMensal {
  return {
    fimAno,
    fimMes,
    meses: mesesDaJanela({ ano: fimAno, mes: fimMes }).map((m, i) => ({
      ...m,
      receitasCentavos: (i + 1) * 1000,
      despesasCentavos: (i + 1) * 500,
    })),
    semLancamentos: false,
    ...extra,
  };
}

const barra = (m: { ano: number; mes: number }) => screen.getByTestId(`barra-${m.ano}-${m.mes}`);
const alturaDe = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).height;

describe('Evolução mensal na tela do resumo (UC07)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resumir.mockImplementation(async (ano: number, mes: number) => resumo(ano, mes));
    evoluir.mockImplementation(async (ano: number, mes: number) => serie(ano, mes));
  });

  it('passos 1 a 4: abre com o mês corrente e os 5 anteriores, com receitas e despesas de cada mês', async () => {
    await render(<ResumoFinanceiro />);

    expect(await screen.findByTestId('secao-evolucao')).toBeTruthy();
    await waitFor(() => expect(barra(atual)).toBeTruthy());
    expect(evoluir).toHaveBeenCalledWith(atual.ano, atual.mes);

    const janela = mesesDaJanela(atual);
    janela.forEach((m, i) => {
      expect(barra(m).props.accessibilityLabel).toBe(
        `${nomeMes(m.ano, m.mes)}: receitas R$ ${(i + 1) * 10},00, despesas R$ ${(i + 1) * 5},00`,
      );
    });
    expect(screen.queryByTestId(`barra-${proximoMes(atual.ano, atual.mes).ano}-${proximoMes(atual.ano, atual.mes).mes}`)).toBeNull();

    // mês selecionado destacado, com o detalhe dos valores
    expect(barra(atual).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('evolucao-detalhe')).toHaveTextContent(
      `${nomeMes(atual.ano, atual.mes)}Receitas R$ 60,00 · Despesas R$ 30,00`,
    );
  });

  it('barras proporcionais ao maior valor da janela', async () => {
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(barra(atual)).toBeTruthy());

    // maior valor: receitas do último mês (6000) = altura cheia (120)
    expect(alturaDe(`barra-receitas-${atual.ano}-${atual.mes}`)).toBe(120);
    expect(alturaDe(`barra-despesas-${atual.ano}-${atual.mes}`)).toBe(60);
    const primeiro = mesesDaJanela(atual)[0];
    expect(alturaDe(`barra-receitas-${primeiro.ano}-${primeiro.mes}`)).toBe(20);
  });

  it('FA01: mês sem receitas ou sem despesas mostra a barra zerada', async () => {
    evoluir.mockImplementation(async (ano: number, mes: number) => {
      const s = serie(ano, mes);
      s.meses[5] = { ...s.meses[5], receitasCentavos: 0 };
      s.meses[4] = { ...s.meses[4], despesasCentavos: 0 };
      return s;
    });
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(barra(atual)).toBeTruthy());

    const [penultimo, ultimo] = mesesDaJanela(atual).slice(-2);
    expect(alturaDe(`barra-receitas-${ultimo.ano}-${ultimo.mes}`)).toBe(0);
    expect(alturaDe(`barra-despesas-${penultimo.ano}-${penultimo.mes}`)).toBe(0);
    expect(barra(ultimo).props.accessibilityLabel).toContain('receitas R$ 0,00');
  });

  it('passos 5 e 6: tocar numa barra seleciona o mês do resumo, sem deslocar a janela', async () => {
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(barra(atual)).toBeTruthy());
    const alvo = mesesDaJanela(atual)[1];
    evoluir.mockClear();

    await fireEvent.press(barra(alvo));

    expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(alvo.ano, alvo.mes));
    await waitFor(() => expect(resumir).toHaveBeenLastCalledWith(alvo.ano, alvo.mes));
    expect(barra(alvo).props.accessibilityState).toMatchObject({ selected: true });
    expect(barra(atual).props.accessibilityState).toMatchObject({ selected: false });
    // a janela é a mesma: continua terminando no mês corrente e não é recalculada
    expect(evoluir).not.toHaveBeenCalled();
    expect(barra(atual)).toBeTruthy();
  });

  it('seletor dentro da janela: muda o mês selecionado e mantém a janela', async () => {
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(barra(atual)).toBeTruthy());
    evoluir.mockClear();

    await fireEvent.press(screen.getByLabelText('Mês anterior'));
    const anterior = mesAnterior(atual.ano, atual.mes);

    await waitFor(() => expect(barra(anterior).props.accessibilityState).toMatchObject({ selected: true }));
    expect(evoluir).not.toHaveBeenCalled();
  });

  it('FA05: seletor fora da janela desloca o gráfico para terminar no mês escolhido', async () => {
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(barra(atual)).toBeTruthy());

    // para frente: o mês seguinte está fora da janela
    await fireEvent.press(screen.getByLabelText('Próximo mês'));
    const seguinte = proximoMes(atual.ano, atual.mes);
    await waitFor(() => expect(evoluir).toHaveBeenLastCalledWith(seguinte.ano, seguinte.mes));
    expect(await screen.findByTestId(`barra-${seguinte.ano}-${seguinte.mes}`)).toBeTruthy();
    const primeiroAntigo = mesesDaJanela(atual)[0];
    expect(screen.queryByTestId(`barra-${primeiroAntigo.ano}-${primeiroAntigo.mes}`)).toBeNull();

    // para trás: 6 meses antes do mês selecionado sai da janela
    let alvo = seguinte;
    for (let i = 0; i < 6; i++) {
      await fireEvent.press(screen.getByLabelText('Mês anterior'));
      alvo = mesAnterior(alvo.ano, alvo.mes);
    }
    await waitFor(() => expect(evoluir).toHaveBeenLastCalledWith(alvo.ano, alvo.mes));
    expect(await screen.findByTestId(`barra-${alvo.ano}-${alvo.mes}`)).toBeTruthy();
    expect(barra(alvo).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('FA02: sem lançamentos, mostra o estado vazio com o tutorial e esconde o gráfico', async () => {
    resumir.mockImplementation(async (ano: number, mes: number) => resumo(ano, mes, { semLancamentos: true }));
    evoluir.mockImplementation(async (ano: number, mes: number) => serie(ano, mes, { semLancamentos: true }));
    await render(<ResumoFinanceiro />);

    expect(await screen.findByText('Nenhum lançamento ainda')).toBeTruthy();
    expect(screen.queryByTestId('secao-evolucao')).toBeNull();
    await fireEvent.press(screen.getByText('Ver tutorial'));
    expect(router.push).toHaveBeenCalledWith('/tutorial');
  });

  it('FA02: se só a evolução indicar base vazia, a seção some sem afetar o resumo', async () => {
    evoluir.mockImplementation(async (ano: number, mes: number) => serie(ano, mes, { semLancamentos: true }));
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(evoluir).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('evolucao-carregando')).toBeNull());
    expect(screen.queryByTestId(`barra-${atual.ano}-${atual.mes}`)).toBeNull();
  });

  it('EX01: falha mostra a mensagem e "Tentar novamente" recalcula o gráfico (retorno ao passo 2)', async () => {
    evoluir.mockRejectedValueOnce(new FalhaEvolucao('boom'));
    await render(<ResumoFinanceiro />);

    expect(await screen.findByText(MSG_FALHA_EVOLUCAO)).toBe(
      screen.getByText('Não foi possível carregar a evolução mensal. Tente novamente.'),
    );
    expect(screen.queryByTestId(`barra-${atual.ano}-${atual.mes}`)).toBeNull();

    await fireEvent.press(screen.getByLabelText('Tentar carregar a evolução mensal novamente'));

    expect(await screen.findByTestId(`barra-${atual.ano}-${atual.mes}`)).toBeTruthy();
    expect(screen.queryByText(MSG_FALHA_EVOLUCAO)).toBeNull();
    expect(evoluir).toHaveBeenLastCalledWith(atual.ano, atual.mes);
  });

  it('a falha da evolução não esconde o resumo nem os atalhos', async () => {
    resumir.mockImplementation(async (ano: number, mes: number) =>
      resumo(ano, mes, { saldoCentavos: 1000, totalReceitasCentavos: 1000 }),
    );
    evoluir.mockRejectedValue(new FalhaEvolucao('boom'));
    await render(<ResumoFinanceiro />);

    expect(await screen.findByText(MSG_FALHA_EVOLUCAO)).toBeTruthy();
    expect(await screen.findByTestId('saldo')).toHaveTextContent('+ R$ 10,00');
    expect(screen.getByRole('button', { name: 'Categorias' })).toBeTruthy();
  });

  it('enquanto calcula, mostra o carregamento na seção', async () => {
    evoluir.mockReturnValue(new Promise(() => {}));
    await render(<ResumoFinanceiro />);
    expect(await screen.findByTestId('evolucao-carregando')).toBeTruthy();
  });

  it('recalcula quando a preparação do app ou a restauração terminam', async () => {
    evoluir.mockImplementationOnce(async (ano: number, mes: number) => serie(ano, mes, { semLancamentos: true }));
    await render(<ResumoFinanceiro />);
    await waitFor(() => expect(evoluir).toHaveBeenCalled());
    expect(screen.queryByTestId(`barra-${atual.ano}-${atual.mes}`)).toBeNull();

    await act(async () => avisarBaseAtualizada());

    expect(await screen.findByTestId(`barra-${atual.ano}-${atual.mes}`)).toBeTruthy();
  });
});
