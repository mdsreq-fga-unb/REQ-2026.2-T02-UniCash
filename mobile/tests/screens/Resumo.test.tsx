import { iniciarConta } from '@/features/conta';
import { definirSessao } from '@/features/conta/sessao';
import { criarSincronizacaoDoApp } from '@/features/conta/sync.app';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { salvarContinuidadeSemConta } from '@/features/conta/onboarding';
import ResumoFinanceiro from '@/app/index';
import { calcularResumo, FalhaCalculo, MSG_FALHA_CALCULO, type ResumoMensal } from '@/features/resumo/service';
import { instalarBanco } from '../helpers/fakeDb';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import { router } from '../helpers/expoRouterMock';
import { mesAnterior, nomeMes, proximoMes } from '@/features/receitas/dates';

jest.mock('@/features/conta/auth.firebase', () => ({
  criarAuthFirebase: jest.fn(),
  iniciarObservadorDeSessao: jest.fn(),
}));
jest.mock('@/features/conta/service.firebase', () => ({ criarContaServiceFirebase: jest.fn() }));
jest.mock('@/features/conta/sync.app', () => ({ criarSincronizacaoDoApp: jest.fn() }));
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
    ano: atual.ano,
    mes: atual.mes,
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

beforeEach(async () => { await salvarContinuidadeSemConta(); });

describe('Tela de resumo financeiro (UC03)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    instalarBanco();
  });

  it('abre no mês corrente e mostra saldo, receitas, despesas, metas e receitas por dia (RF40, RF11)', async () => {
    calcular.mockResolvedValue(resumo());
    await render(<ResumoFinanceiro />);

    expect(await screen.findByTestId('saldo')).toHaveTextContent('R$ 925,65');
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
    calcular.mockResolvedValue(resumo({ totalReceitasCentavos: 0, totalDespesasCentavos: 3000, saldoCentavos: -3000, receitasPorDia: [] }));
    await render(<ResumoFinanceiro />);
    expect(await screen.findByTestId('saldo')).toHaveTextContent('−R$ 30,00');
    expect(screen.getByText('Sem receitas no mês')).toBeTruthy();
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

  it('ao trocar de mês, não mostra os valores do mês anterior sob o título novo enquanto recalcula', async () => {
    calcular.mockResolvedValueOnce(resumo());
    await render(<ResumoFinanceiro />);
    expect(await screen.findByTestId('saldo')).toHaveTextContent('R$ 925,65');

    // o cálculo do mês seguinte fica pendente até resolvermos manualmente
    const seguinte = proximoMes(atual.ano, atual.mes);
    let concluir!: (r: ResumoMensal) => void;
    calcular.mockReturnValueOnce(new Promise<ResumoMensal>((ok) => (concluir = ok)));
    await fireEvent.press(screen.getByLabelText('Próximo mês'));

    expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(seguinte.ano, seguinte.mes));
    expect(screen.getByTestId('carregando')).toBeTruthy();
    expect(screen.queryByTestId('saldo')).toBeNull();
    expect(screen.queryByTestId('total-receitas')).toBeNull();

    concluir(resumo({ ...seguinte, saldoCentavos: -100, totalReceitasCentavos: 0, totalDespesasCentavos: 100, receitasPorDia: [] }));
    expect(await screen.findByTestId('saldo')).toHaveTextContent('−R$ 1,00');
    expect(screen.queryByTestId('carregando')).toBeNull();
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
    expect(await screen.findByTestId('saldo')).toHaveTextContent('R$ 0,00');
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
    expect(await screen.findByTestId('saldo')).toHaveTextContent('R$ 925,65');
    expect(screen.queryByText(MSG_FALHA_CALCULO)).toBeNull();
    expect(calcular).toHaveBeenCalledTimes(2);
    expect(calcular).toHaveBeenLastCalledWith(atual.ano, atual.mes);
  });

  it('atalhos abrem as listas no mês selecionado no resumo', async () => {
    calcular.mockImplementation(async (ano: number, mes: number) => resumo({ ano, mes }));
    await render(<ResumoFinanceiro />);
    await screen.findByTestId('saldo');

    await fireEvent.press(screen.getByLabelText('Mês anterior'));
    const anterior = mesAnterior(atual.ano, atual.mes);
    await waitFor(() => expect(screen.getByTestId('mes-selecionado')).toHaveTextContent(nomeMes(anterior.ano, anterior.mes)));
    await screen.findByTestId('saldo');

    const params = { ano: String(anterior.ano), mes: String(anterior.mes) };
    await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/receitas', params });
    await fireEvent.press(screen.getByRole('button', { name: 'Despesas' }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/despesas', params });
  });

  it('atalhos levam às listas de receitas, despesas e categorias', async () => {
    calcular.mockResolvedValue(resumo());
    await render(<ResumoFinanceiro />);
    await screen.findByTestId('saldo');
    await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/receitas', params: { ano: String(atual.ano), mes: String(atual.mes) } });
    await fireEvent.press(screen.getByRole('button', { name: 'Despesas' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/despesas', params: { ano: String(atual.ano), mes: String(atual.mes) } });
    await fireEvent.press(screen.getByRole('button', { name: 'Categorias' }));
    expect(router.push).toHaveBeenCalledWith('/categorias');
  });

  describe('atalhos em todos os estados', () => {
    const vazio = () =>
      resumo({ totalReceitasCentavos: 0, totalDespesasCentavos: 0, saldoCentavos: 0, receitasPorDia: [], semLancamentos: true });

    it('FA02: no estado vazio, Categorias continua acessível', async () => {
      calcular.mockResolvedValue(vazio());
      await render(<ResumoFinanceiro />);
      expect(await screen.findByText('Nenhum lançamento ainda')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Categorias' }));
      expect(router.push).toHaveBeenCalledWith('/categorias');
    });

    it('EX01: na falha, os atalhos continuam disponíveis', async () => {
      calcular.mockRejectedValue(new FalhaCalculo('boom'));
      await render(<ResumoFinanceiro />);
      expect(await screen.findByText(MSG_FALHA_CALCULO)).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Receitas' }));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/receitas',
        params: { ano: String(atual.ano), mes: String(atual.mes) },
      });
      expect(screen.getByRole('button', { name: 'Despesas' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Categorias' })).toBeTruthy();
    });

    it('enquanto calcula, os atalhos já estão disponíveis', async () => {
      calcular.mockReturnValue(new Promise(() => {}));
      await render(<ResumoFinanceiro />);
      expect(screen.getByTestId('carregando')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Categorias' })).toBeTruthy();
    });
  });

  describe('recálculo quando a base muda por fora da tela', () => {
    it('atualiza o saldo na mesma tela quando termina a restauração iniciada pelo login', async () => {
      let terminarRestauracao!: () => void;
      const restauracao = new Promise<void>((resolve) => { terminarRestauracao = resolve; });
      const restaurar = jest.fn(() => restauracao);
      (criarSincronizacaoDoApp as jest.Mock).mockReturnValue({
        retomar: jest.fn().mockResolvedValue(undefined),
        restaurarSeAparelhoVazio: restaurar,
        suspender: jest.fn().mockResolvedValue(undefined),
      });
      calcular.mockResolvedValue(
        resumo({ totalReceitasCentavos: 0, totalDespesasCentavos: 0, saldoCentavos: 0, receitasPorDia: [], semLancamentos: true }),
      );
      iniciarConta();
      definirSessao({ status: 'ativa', uid: 'u1', email: 'teste@example.com' });
      try {
        await render(<ResumoFinanceiro />);
        expect(await screen.findByText('Nenhum lançamento ainda')).toBeTruthy();
        expect(restaurar).toHaveBeenCalledWith('u1');

        calcular.mockResolvedValue(resumo());
        await act(async () => terminarRestauracao());

        await waitFor(() => expect(screen.getByTestId('saldo')).toHaveTextContent('R$ 925,65'));
        expect(screen.queryByText('Nenhum lançamento ainda')).toBeNull();
      } finally {
        await act(async () => definirSessao({ status: 'sem-sessao' }));
      }
    });

    it('EX01 durante a preparação: recalcula ao receber o sinal de pronto, sem tocar em "Tentar novamente"', async () => {
      calcular.mockRejectedValueOnce(new FalhaCalculo('base ainda não preparada'));
      await render(<ResumoFinanceiro />);
      expect(await screen.findByText(MSG_FALHA_CALCULO)).toBeTruthy();

      calcular.mockResolvedValueOnce(resumo());
      await act(async () => avisarBaseAtualizada());

      await waitFor(() => expect(screen.getByTestId('saldo')).toHaveTextContent('R$ 925,65'));
      expect(screen.queryByText(MSG_FALHA_CALCULO)).toBeNull();
    });

    it('recalcula o mês selecionado, não o mês inicial', async () => {
      calcular.mockImplementation(async (ano: number, mes: number) => resumo({ ano, mes }));
      await render(<ResumoFinanceiro />);
      await screen.findByTestId('saldo');
      await fireEvent.press(screen.getByLabelText('Próximo mês'));
      const seguinte = proximoMes(atual.ano, atual.mes);
      await waitFor(() => expect(calcular).toHaveBeenLastCalledWith(seguinte.ano, seguinte.mes));

      calcular.mockClear();
      await act(async () => avisarBaseAtualizada());
      expect(calcular).toHaveBeenCalledWith(seguinte.ano, seguinte.mes);
      expect(calcular).not.toHaveBeenCalledWith(atual.ano, atual.mes);
    });

    it('deixa de ouvir o sinal ao sair da tela', async () => {
      calcular.mockResolvedValue(resumo());
      const { unmount } = await render(<ResumoFinanceiro />);
      await screen.findByTestId('saldo');
      await unmount();

      calcular.mockClear();
      avisarBaseAtualizada();
      expect(calcular).not.toHaveBeenCalled();
    });
  });
});

it('mostra o consumo do mesmo mês do Resumo e atualiza após mudar o período', async () => {
  const { sqlite } = instalarBanco();
  const dia = `${atual.ano}-${String(atual.mes).padStart(2, '0')}-01`;
  sqlite.exec(`INSERT INTO categorias
    (id, nome, nome_normalizado, limite_tipo, limite_centavos, criado_em, atualizado_em)
    VALUES ('consumo-resumo', 'Alimentação', 'alimentacao', 'valor', 10000, 't', 't')`);
  sqlite.prepare(`INSERT INTO despesas
    (id, valor_centavos, data, titulo, categoria_id, fixa_ou_variavel, essencial, criado_em, atualizado_em)
    VALUES ('d-resumo', 8000, ?, 'Mercado', 'consumo-resumo', 'variavel', 0, 't', 't')`).run(dia);
  calcular.mockResolvedValue(resumo());
  await render(<ResumoFinanceiro />);
  expect(await screen.findByText('80% · Próximo do limite')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
  expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
  expect(screen.queryByText('80% · Próximo do limite')).toBeNull();

  await act(async () => { avisarBaseAtualizada(); avisarBaseAtualizada(); });
  expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
});
