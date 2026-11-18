import { getDb } from '@/db/database';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app/index';
import { instalarBanco } from '../helpers/fakeDb';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';

jest.mock('expo-router', () => ({
  ...require('../helpers/expoRouterMock'),
  Link: require('react-native').Text,
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/sync', () => ({ sincronizarEmSegundoPlano: jest.fn() }));

describe('Resumo financeiro', () => {
  let banco: ReturnType<typeof instalarBanco>;
  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-11-18');
  });
  afterEach(restaurarTempo);

  it('salva uma despesa, exibe o alerta e permite dispensá-lo', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Nova despesa'));
    await fireEvent.changeText(screen.getByLabelText('Valor da despesa'), '25,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    const alerta = await screen.findByRole('alert');
    expect(screen.getByText('R$ 0,00 → −R$ 25,50')).toEqual(alerta);
    expect(await screen.findByText('Sem receitas no mês')).toBeTruthy();

    await fireEvent.press(screen.getByText('Dispensar aviso'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('grava um saldo inicial negativo para o mês escolhido', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByLabelText('Mês anterior'));
    await screen.findByText('Outubro/2026');
    await fireEvent.press(await screen.findByText('Informar saldo inicial'));
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial do mês selecionado'), '-35,10');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Saldo anterior · −R$ 35,10')).toBeTruthy();
    await fireEvent.press(screen.getByText('Alterar saldo inicial'));
    expect(screen.getByLabelText('Saldo inicial do mês selecionado').props.value).toBe('-35,10');
  });
  it('edita uma despesa e confirma sua exclusão pelo resumo', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Nova despesa'));
    await fireEvent.changeText(screen.getByLabelText('Valor da despesa'), '25,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await fireEvent.press(await screen.findByLabelText('Editar despesa de 18/11/2026 · R$ 25,50'));
    await fireEvent.changeText(screen.getByLabelText('Valor da despesa'), '30,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('−R$ 30,00')).toBeTruthy();

    await fireEvent.press(await screen.findByLabelText('Editar despesa de 18/11/2026 · R$ 30,00'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para edição' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir despesa' }));
    await screen.findByText('Nova despesa');
    expect(screen.queryByText('−R$ 30,00')).toBeNull();
  });

  it('recupera o resumo e os avisos após falha de leitura', async () => {
    (getDb as jest.Mock).mockRejectedValueOnce(new Error('Falha de leitura'))
      .mockRejectedValueOnce(new Error('Falha de leitura'));
    await render(<Home />);
    expect(await screen.findByText('Não foi possível calcular o saldo.')).toBeTruthy();
    expect(screen.getByText('Atualizar avisos')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(await screen.findByText('Saldo do mês')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Próximo mês'));
    expect(await screen.findByText('Dezembro/2026')).toBeTruthy();
  });

  it('informa valores e datas inválidos e permite tentar novamente após falha de gravação', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Nova despesa'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um valor válido.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Valor da despesa'), '25,50');
    await fireEvent.changeText(screen.getByLabelText('Data da despesa'), '31112026');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe uma data válida.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Data da despesa'), '18112026');
    banco.falharNaOperacao(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível concluir a operação. Tente novamente.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    await screen.findByText('Dispensar aviso');
    banco.falharNaOperacao(1);
    await fireEvent.press(screen.getByText('Dispensar aviso'));
    await fireEvent.press(await screen.findByText('Atualizar avisos'));
    await fireEvent.press(await screen.findByText('Dispensar aviso'));
    expect(screen.queryByText('Dispensar aviso')).toBeNull();
  });

  it('trata despesa excluída enquanto o formulário estava aberto', async () => {
    banco.sqlite.prepare('INSERT INTO despesas (data, valor_centavos) VALUES (?, ?)').run('2026-11-18', 100);
    await render(<Home />);
    await fireEvent.press(await screen.findByLabelText('Editar despesa de 18/11/2026 · R$ 1,00'));
    banco.sqlite.prepare('DELETE FROM despesas').run();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir despesa' }));
    expect(await screen.findByText('Esta despesa já foi excluída.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para edição' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Esta despesa já foi excluída.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Nova despesa')).toBeTruthy();
  });

  it('preserva zero e preenche o saldo inicial gravado ao abrir a edição', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Informar saldo inicial'));
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial do mês selecionado'), '0,00');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    await fireEvent.press(await screen.findByText('Alterar saldo inicial'));
    expect(screen.getByLabelText('Saldo inicial do mês selecionado').props.value).toBe('0,00');
  });

  it.each([false, true])('ignora uma consulta antiga depois da troca de mês (falha: %s)', async (falha) => {
    const db = await getDb();
    let concluir!: (valor: typeof db) => void;
    let rejeitar!: (erro: Error) => void;
    const leituraAntiga = new Promise<typeof db>((resolve, reject) => {
      concluir = resolve;
      rejeitar = reject;
    });
    (getDb as jest.Mock).mockReturnValueOnce(leituraAntiga)
      .mockReturnValueOnce(leituraAntiga).mockReturnValueOnce(leituraAntiga);
    await render(<Home />);
    await fireEvent.press(screen.getByLabelText('Próximo mês'));
    await screen.findByText('Saldo do mês');

    await act(async () => {
      if (falha) rejeitar(new Error('Consulta antiga'));
      else concluir(db);
    });
    expect(screen.getByText('Dezembro/2026')).toBeTruthy();
    expect(screen.queryByText('Não foi possível calcular o saldo.')).toBeNull();
    expect(screen.queryByText('Atualizar avisos')).toBeNull();
  });

  it('grava uma única despesa mesmo com dois toques antes do commit', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Nova despesa'));
    await fireEvent.changeText(screen.getByLabelText('Valor da despesa'), '1,00');
    const db = await getDb();
    let liberar!: (valor: typeof db) => void;
    (getDb as jest.Mock).mockReturnValueOnce(new Promise((resolve) => { liberar = resolve; }));
    const onPress = screen.getByRole('button', { name: 'Salvar' }).props.onClick ??
      screen.getByRole('button', { name: 'Salvar' }).props.onPress;
    await act(async () => {
      onPress();
      onPress();
      liberar(db);
    });
    await screen.findByText('Nova despesa');
    expect(banco.sqlite.prepare('SELECT COUNT(*) AS total FROM despesas').get()).toEqual({ total: 1 });
  });

});
