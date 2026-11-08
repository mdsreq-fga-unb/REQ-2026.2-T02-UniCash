import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Editar from '@/app/receitas/[id]/editar';
import {
  buscarReceita,
  editarReceita,
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
  editarReceita: jest.fn(),
  excluirReceita: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const buscar = buscarReceita as jest.Mock;
const editar = editarReceita as jest.Mock;

const unica = () => ({ receita: receitaLinha(), recorrencia: null });
const emSerie = () => ({
  receita: receitaLinha({ recorrencia_id: 'serie1', titulo: 'Mesada', valor_centavos: 10000, descricao: null }),
  recorrencia: serieLinha(),
});

describe('Editar receita (fluxo C, protótipo F5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
  });

  it('apresenta o formulário preenchido com os dados atuais', async async () => {
    buscar.mockResolvedValue(unica());
    await render(<Editar />);
    expect(await screen.findByText('Editar lançamento')).toBeTruthy();
    expect(screen.getByLabelText('Título').props.value).toBe('Freela de design');
    expect(screen.getByLabelText('Valor').props.value).toBe('150,00');
    expect(screen.getByLabelText('Data').props.value).toBe('16/10/2026');
    expect(screen.getByLabelText('Descrição (opcional)').props.value).toBe('Logo para a empresa júnior');
    expect(screen.getByText('Não se repete')).toBeTruthy();
  });

  it('receita de série vem com a repetição atual', async async () => {
    buscar.mockResolvedValue(emSerie());
    await render(<Editar />);
    expect(await screen.findByText('A cada 1 mês')).toBeTruthy();
  });

  it('receita única: salva sem perguntar alcance, confirma e volta à lista', async async () => {
    buscar.mockResolvedValue(unica());
    editar.mockResolvedValue(undefined);
    await render(<Editar />);
    await screen.findByText('Editar lançamento');
    await fireEvent.changeText(screen.getByLabelText('Valor'), '200,00');
    await fireEvent.press(screen.getByText('Salvar alterações'));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith('abc', expect.objectContaining({ valorCentavos: 20000, data: '2026-10-16' }), 'esta'),
    );
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/receitas'));
    expect(consumirFeedback()?.tipo).toBe('sucesso');
  });

  it('EX01 na edição: dados inválidos não gravam', async async () => {
    buscar.mockResolvedValue(unica());
    await render(<Editar />);
    await screen.findByText('Editar lançamento');
    await fireEvent.changeText(screen.getByLabelText('Título'), '   ');
    await fireEvent.press(screen.getByText('Salvar alterações'));
    expect(screen.getByText('Informe o título da receita.')).toBeTruthy();
    expect(editar).not.toHaveBeenCalled();
  });

  describe('série recorrente (FA08)', () => {
    it.each([
      ['Só esta', 'esta'],
      ['Esta e as próximas', 'proximas'],
      ['Todas', 'todas'],
    ] as const)('pergunta o alcance e grava com "%s"', async (rotulo, escopo) => {
      buscar.mockResolvedValue(emSerie());
      editar.mockResolvedValue(undefined);
      await render(<Editar />);
      await screen.findByText('Editar lançamento');
      await fireEvent.press(screen.getByText('Salvar alterações'));

      expect(screen.getByText('Aplicar alterações a quais receitas?')).toBeTruthy();
      expect(editar).not.toHaveBeenCalled(); // só depois da escolha
      await fireEvent.press(screen.getByText(rotulo));

      await waitFor(() => expect(editar).toHaveBeenCalledWith('abc', expect.objectContaining({ titulo: 'Mesada' }), escopo));
    });

    it('cancelar na pergunta de alcance não grava', async async () => {
      buscar.mockResolvedValue(emSerie());
      await render(<Editar />);
      await screen.findByText('Editar lançamento');
      await fireEvent.press(screen.getByText('Salvar alterações'));
      await fireEvent.press(screen.getByText('Cancelar'));
      expect(editar).not.toHaveBeenCalled();
    });
  });

  describe('EX03: falha na persistência', () => {
    it('informa, não confirma e mantém os dados digitados', async async () => {
      buscar.mockResolvedValue(unica());
      editar.mockRejectedValue(new FalhaPersistencia('x'));
      await render(<Editar />);
      await screen.findByText('Editar lançamento');
      await fireEvent.changeText(screen.getByLabelText('Título'), 'Meu novo título');
      await fireEvent.press(screen.getByText('Salvar alterações'));

      expect(await screen.findByText('Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.')).toBeTruthy();
      expect(screen.getByLabelText('Título').props.value).toBe('Meu novo título');
      expect(router.dismissTo).not.toHaveBeenCalled();
    });
  });

  describe('EX06: receita excluída', () => {
    it('ao abrir a edição de receita inexistente, informa e volta à lista', async async () => {
      buscar.mockResolvedValue(null);
      await render(<Editar />);
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG.indisponivel });
    });

    it('receita excluída entre abrir e salvar: informa e volta à lista', async async () => {
      buscar.mockResolvedValue(unica());
      editar.mockRejectedValue(new ReceitaIndisponivel());
      await render(<Editar />);
      await screen.findByText('Editar lançamento');
      await fireEvent.press(screen.getByText('Salvar alterações'));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/receitas'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG.indisponivel });
    });
  });

  describe('EX08: falha na leitura local', () => {
    it('mostra a mensagem e "Tentar novamente" recarrega o formulário', async async () => {
      buscar.mockRejectedValueOnce(new Error('disco'));
      buscar.mockResolvedValue(unica());
      await render(<Editar />);
      expect(await screen.findByText(MSG.falhaLeitura)).toBeTruthy();
      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(await screen.findByText('Editar lançamento')).toBeTruthy();
    });
  });
});
