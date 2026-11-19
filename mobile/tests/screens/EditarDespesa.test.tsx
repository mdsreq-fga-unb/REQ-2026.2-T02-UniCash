
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EditarDespesa from '@/app/despesas/[id]/editar';
import {
  buscarDespesa,
  editarDespesa,
  DespesaIndisponivel,
} from '@/features/despesas/service';
import { consumirFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { router } from '../helpers/expoRouterMock';
import { despesaLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/features/despesas/service', () => ({
  ...jest.requireActual('@/features/despesas/service'),
  buscarDespesa: jest.fn(),
  editarDespesa: jest.fn(),
}));

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
}));


const buscar = buscarDespesa as jest.Mock;
const editar = editarDespesa as jest.Mock;

const unica = () => ({
  despesa: despesaLinha(),
  recorrencia: null,
});

const emSerie = () => ({
  despesa: despesaLinha({
    recorrencia_id: 'serie1',
    titulo: 'Aluguel',
    valor_centavos: 150000,
  }),
  recorrencia: {
    id: 'serie1',
    intervalo: 1,
    unidade: 'mes' as const,
    inicio: '2026-10-16',
    termino: null,
    ativa: 1,
    valor_centavos: 150000,
    titulo: 'Aluguel',
    descricao: 'Aluguel do apartamento',
    sync_status: 'sincronizado' as const,
    atualizado_em: '2026-10-16T12:00:00.000Z',
  },
});

describe('Editar despesa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
  });

  it('apresenta o formulário preenchido com os dados atuais', async () => {
    buscar.mockResolvedValue(unica());

    await render(<EditarDespesa />);

    expect(await screen.findByText('Editar despesa')).toBeTruthy();
    expect(screen.getByLabelText('Título').props.value).toBe('Aluguel');
    expect(screen.getByLabelText('Valor').props.value).toBe('1500,00');
    expect(screen.getByLabelText('Data').props.value).toBe('16/10/2026');
    expect(screen.getByLabelText('Descrição (opcional)').props.value).toBe(
      'Aluguel do apartamento',
    );
  });

  it('despesa recorrente apresenta os dados da repetição', async () => {
    buscar.mockResolvedValue(emSerie());

    await render(<EditarDespesa />);

    expect(await screen.findByText('A cada 1 mês')).toBeTruthy();
  });

  it('despesa única salva sem perguntar alcance, confirma e volta à lista', async () => {
    buscar.mockResolvedValue(unica());
    editar.mockResolvedValue(undefined);

    await render(<EditarDespesa />);
    await screen.findByText('Editar despesa');

    await fireEvent.changeText(screen.getByLabelText('Valor'), '2.000,00');
    await fireEvent.press(screen.getByText('Salvar alterações'));

    await waitFor(() =>
      expect(editar).toHaveBeenCalledWith(
        'abc',
        expect.objectContaining({
          valorCentavos: 200000,
          data: '2026-10-16',
        }),
        'esta',
      ),
    );

    await waitFor(() =>
      expect(router.dismissTo).toHaveBeenCalledWith('/despesas'),
    );

    expect(consumirFeedback()?.tipo).toBe('sucesso');
    expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
  });

  it('dados inválidos não são gravados', async () => {
    buscar.mockResolvedValue(unica());

    await render(<EditarDespesa />);
    await screen.findByText('Editar despesa');

    await fireEvent.changeText(screen.getByLabelText('Título'), '   ');
    await fireEvent.press(screen.getByText('Salvar alterações'));

    expect(screen.getByText('Informe o título da despesa.')).toBeTruthy();
    expect(editar).not.toHaveBeenCalled();
  });

  describe('série recorrente', () => {
    it.each([
      ['Só esta', 'esta'],
      ['Esta e as próximas', 'proximas'],
      ['Todas', 'todas'],
    ] as const)(
      'pergunta o alcance e grava com "%s"',
      async (rotulo, escopo) => {
        buscar.mockResolvedValue(emSerie());
        editar.mockResolvedValue(undefined);

        await render(<EditarDespesa />);
        await screen.findByText('Editar despesa');

        await fireEvent.press(screen.getByText('Salvar alterações'));

        expect(
          screen.getByText('Aplicar alterações a quais despesas?'),
        ).toBeTruthy();
        expect(editar).not.toHaveBeenCalled();

        await fireEvent.press(screen.getByText(rotulo));

        await waitFor(() =>
          expect(editar).toHaveBeenCalledWith(
            'abc',
            expect.objectContaining({ titulo: 'Aluguel' }),
            escopo,
          ),
        );
      },
    );

    it('cancelar a pergunta de alcance não grava', async () => {
      buscar.mockResolvedValue(emSerie());

      await render(<EditarDespesa />);
      await screen.findByText('Editar despesa');

      await fireEvent.press(screen.getByText('Salvar alterações'));
      await fireEvent.press(
  screen.getAllByText('Cancelar')[1],
);

      expect(editar).not.toHaveBeenCalled();
    });
  });

  describe('falha na persistência', () => {
    it('informa o erro, não confirma e mantém os dados digitados', async () => {
      buscar.mockResolvedValue(unica());
      editar.mockRejectedValue(new Error('falha'));

      await render(<EditarDespesa />);
      await screen.findByText('Editar despesa');

      await fireEvent.changeText(
        screen.getByLabelText('Título'),
        'Meu novo título',
      );
      await fireEvent.press(screen.getByText('Salvar alterações'));

      expect(
        await screen.findByText(MSG_DESPESA.falhaSalvar),
      ).toBeTruthy();
      expect(screen.getByLabelText('Título').props.value).toBe(
        'Meu novo título',
      );
      expect(router.dismissTo).not.toHaveBeenCalled();
    });
  });

  describe('despesa indisponível', () => {
    it('ao abrir uma despesa inexistente, avisa (EX05) e volta à lista', async () => {
      buscar.mockResolvedValue(null);

      await render(<EditarDespesa />);

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/despesas'),
      );
      expect(consumirFeedback()).toEqual({
        tipo: 'erro',
        texto: 'Esta despesa não está mais disponível.',
      });
    });

    it('despesa excluída entre abrir e salvar avisa (EX05) e volta à lista', async () => {
      buscar.mockResolvedValue(unica());
      editar.mockRejectedValue(new DespesaIndisponivel());

      await render(<EditarDespesa />);
      await screen.findByText('Editar despesa');

      await fireEvent.press(screen.getByText('Salvar alterações'));

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/despesas'),
      );
      expect(consumirFeedback()).toEqual({
        tipo: 'erro',
        texto: MSG_DESPESA.indisponivel,
      });
      expect(sincronizarEmSegundoPlano).not.toHaveBeenCalled();
    });
  });

  describe('falha na leitura local', () => {
    it('mostra a mensagem e permite tentar novamente', async () => {
      buscar.mockRejectedValueOnce(new Error('disco'));
      buscar.mockResolvedValue(unica());

      await render(<EditarDespesa />);

      expect(
        await screen.findByText(MSG_DESPESA.falhaLeitura),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));

      expect(await screen.findByText('Editar despesa')).toBeTruthy();
    });
  });
});
