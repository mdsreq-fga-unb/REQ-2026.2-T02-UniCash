import { registrarDespesa } from '@/features/despesas/service';
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

  it('exibe e dispensa o alerta de uma despesa registrada pelo UC02', async () => {
    await registrarDespesa({
      data: '2026-11-18', valorCentavos: 2550, titulo: 'Despesa de teste',
      descricao: null, categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
    });
    await render(<Home />);
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

  it('informa erros de validação e gravação do saldo inicial', async () => {
    await render(<Home />);
    await fireEvent.press(await screen.findByText('Informar saldo inicial'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um valor válido.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Saldo inicial do mês selecionado'), '25,50');
    banco.falharNaOperacao(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Não foi possível salvar o saldo inicial. Tente novamente.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Saldo anterior · R$ 25,50')).toBeTruthy();
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
      .mockReturnValueOnce(leituraAntiga);
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

});
