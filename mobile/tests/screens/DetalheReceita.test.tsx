import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Detalhe from '@/app/receitas/[id]/index';
import {
  buscarReceita,
  excluirReceita,
  FalhaPersistencia,
  ReceitaIndisponivel,
} from '@/features/receitas/service';
import { consumirFeedback } from '@/features/receitas/feedback';
import { MSG } from '@/features/receitas/validation';
import { router } from '../helpers/expoRouterMock';
import { receitaLinha, serieLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  buscarReceita: jest.fn(),
  excluirReceita: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const buscar = buscarReceita as jest.Mock;
const excluir = excluirReceita as jest.Mock;

const unica = () => ({ receita: receitaLinha({ sync_status: 'pendente' }), recorrencia: null });
const emSerie = () => ({
  receita: receitaLinha({ recorrencia_id: 'serie1', titulo: 'Mesada' }),
  recorrencia: serieLinha({ termino: '2027-01-16' }),
});

describe('Detalhe da receita (fluxo B3, protótipo M4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
  });

  it('exibe todos os dados da receita', async () => {
    buscar.mockResolvedValue(unica());
    render(<Detalhe />);
    expect(await screen.findByText('Detalhe do lançamento')).toBeTruthy();
    expect(screen.getByText('Freela de design')).toBeTruthy();
    expect(screen.getByText('+ R$ 150,00')).toBeTruthy();
    expect(screen.getByText('Receita')).toBeTruthy();
    expect(screen.getByText('16/10/2026')).toBeTruthy();
    expect(screen.getByText('Logo para a empresa júnior')).toBeTruthy();
    expect(screen.getByText('Registro manual')).toBeTruthy();
    expect(screen.getByText('Não se repete')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Registrada em')).toBeTruthy();
    expect(screen.getByText('Última alteração')).toBeTruthy();
  });

  it('receita recorrente mostra a repetição', async () => {
    buscar.mockResolvedValue(emSerie());
    render(<Detalhe />);
    expect(await screen.findByText('A cada 1 mês · até 16/01/2027')).toBeTruthy();
  });

  it('"Editar lançamento" abre a edição', async () => {
    buscar.mockResolvedValue(unica());
    render(<Detalhe />);
    fireEvent.press(await screen.findByText(/Editar lançamento/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/receitas/[id]/editar', params: { id: 'abc' } });
  });

  describe('EX06: receita inexistente ou já excluída', () => {
    it('informa e volta à lista', async () => {
      buscar.mockResolvedValue(null);
      render(<Detalhe />);
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: 'Esta receita não está mais disponível.' });
    });
  });

  describe('EX08: falha na leitura local', () => {
    it('mostra a mensagem e "Tentar novamente", que recarrega', async () => {
      buscar.mockRejectedValueOnce(new Error('disco'));
      buscar.mockResolvedValue(unica());
      render(<Detalhe />);
      expect(await screen.findByText(MSG.falhaLeitura)).toBeTruthy();
      fireEvent.press(screen.getByText('Tentar novamente'));
      expect(await screen.findByText('Freela de design')).toBeTruthy();
      expect(buscar).toHaveBeenCalledTimes(2);
    });
  });

  describe('Excluir receita (fluxo D)', () => {
    it('pede confirmação explícita e cancelar não exclui', async () => {
      buscar.mockResolvedValue(unica());
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));

      expect(screen.getByText('Excluir lançamento?')).toBeTruthy();
      expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeTruthy();
      fireEvent.press(screen.getByText('Cancelar'));

      expect(excluir).not.toHaveBeenCalled();
      expect(screen.queryByText('Excluir lançamento?')).toBeNull();
    });

    it('confirmar exclui, informa e volta à lista', async () => {
      buscar.mockResolvedValue(unica());
      excluir.mockResolvedValue(undefined);
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));
      fireEvent.press(screen.getByText('Excluir'));

      await waitFor(() => expect(excluir).toHaveBeenCalledWith('abc', 'esta'));
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'sucesso', texto: 'Receita excluída.' });
    });

    it('série: pergunta o alcance e a confirmação informa o alcance escolhido', async () => {
      buscar.mockResolvedValue(emSerie());
      excluir.mockResolvedValue(undefined);
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));

      expect(screen.getByText('Excluir quais receitas?')).toBeTruthy();
      expect(screen.getByText('Só esta')).toBeTruthy();
      expect(screen.getByText('Esta e as próximas')).toBeTruthy();
      fireEvent.press(screen.getByText('Todas'));

      expect(screen.getByText(/Serão excluídas todas as receitas da série\./)).toBeTruthy();
      fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledWith('abc', 'todas'));
    });

    it.each([
      ['Só esta', 'esta', /Será excluída apenas esta receita\./],
      ['Esta e as próximas', 'proximas', /Serão excluídas esta receita e as próximas da série\./],
    ] as const)('alcance "%s"', async (rotulo, escopo, mensagem) => {
      buscar.mockResolvedValue(emSerie());
      excluir.mockResolvedValue(undefined);
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));
      fireEvent.press(screen.getByText(rotulo));
      expect(screen.getByText(mensagem)).toBeTruthy();
      fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledWith('abc', escopo));
    });

    it('cancelar na pergunta de alcance não exclui', async () => {
      buscar.mockResolvedValue(emSerie());
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));
      fireEvent.press(screen.getByText('Cancelar'));
      expect(excluir).not.toHaveBeenCalled();
    });

    it('EX03: falha ao excluir informa e volta à lista', async () => {
      buscar.mockResolvedValue(unica());
      excluir.mockRejectedValue(new FalhaPersistencia('x'));
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));
      fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG.falhaSalvar });
    });

    it('EX06: receita já excluída ao confirmar informa e volta à lista', async () => {
      buscar.mockResolvedValue(unica());
      excluir.mockRejectedValue(new ReceitaIndisponivel());
      render(<Detalhe />);
      fireEvent.press(await screen.findByText(/Excluir lançamento/));
      fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG.indisponivel });
    });
  });
});
