

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import ListaDespesas from '@/app/despesas/index';
import { useLocalSearchParams } from 'expo-router';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import {
  FalhaLeitura,
  listarDespesas,
} from '@/features/despesas/service';
import { setFeedback } from '@/lib/feedback';
import { contarPendentes } from '@/features/receitas/pendencias';
import {
  consumirAcessoNegado,
  FalhaLeituraCatalogoSincronizacao,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { router } from '../helpers/expoRouterMock';
import { despesaLinha } from '../helpers/dados';
import { categoriaLinha } from '../helpers/categorias';

let mockFoco: (() => void) | null = null;
let mockSairFoco: (() => void) | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  const base = require('../helpers/expoRouterMock');

  return {
    ...base,
    useFocusEffect: (cb: () => void | (() => void)) => {
      const executar = () => {
        const cleanup = cb();
        mockSairFoco = typeof cleanup === 'function' ? cleanup : null;
        return cleanup;
      };

      mockFoco = executar;
      React.useEffect(() => {
        const cleanup = executar();
        return () => {
          mockSairFoco = null;
          if (typeof cleanup === 'function') cleanup();
        };
      }, [cb]);
    },
  };
});

function adiar<T = unknown>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  return { promessa, resolver, rejeitar };
}

function sairDoFoco() {
  const cleanup = mockSairFoco;
  mockSairFoco = null;
  cleanup?.();
}

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/features/despesas/service', () => ({
  ...jest.requireActual('@/features/despesas/service'),
  listarDespesas: jest.fn(),
}));

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
  FalhaLeituraCatalogoSincronizacao: class FalhaLeituraCatalogoSincronizacao extends Error {},
}));
jest.mock('@/features/receitas/pendencias', () => ({
  contarPendentes: jest.fn().mockResolvedValue(0),
}));

jest.mock('@/features/categorias/useCategoriasAtivas', () => ({
  useCategoriasAtivas: jest.fn(),
}));

const listar = listarDespesas as jest.Mock;
const mockCategorias = useCategoriasAtivas as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;
const recarregarCategorias = jest.fn();

const CATEGORIAS_REAIS = [
  categoriaLinha({ id: 'uuid-casa', nome: 'Casa' }),
  categoriaLinha({ id: 'uuid-alimentacao', nome: 'Alimentação' }),
  categoriaLinha({ id: 'uuid-mobilidade', nome: 'Mobilidade' }),
  categoriaLinha({ id: 'uuid-estudos', nome: 'Estudos' }),
  categoriaLinha({ id: 'uuid-saude', nome: 'Saúde' }),
  categoriaLinha({ id: 'uuid-lazer', nome: 'Lazer' }),
  categoriaLinha({ id: 'uuid-reserva', nome: 'Reserva financeira' }),
  categoriaLinha({
    id: 'uuid-mercado',
    nome: 'Mercado',
    nome_normalizado: 'mercado',
    padrao: 0,
  }),
];

function retornoCategorias(
  overrides: Partial<{
    itens: typeof CATEGORIAS_REAIS;
    carregando: boolean;
    erro: boolean;
    recarregar: () => void;
  }> = {},
) {
  return {
    itens: CATEGORIAS_REAIS,
    carregando: false,
    erro: false,
    recarregar: recarregarCategorias,
    ...overrides,
  };
}

describe('Lista de despesas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFoco = null;
    mockSairFoco = null;
    mockParams.mockReturnValue({ id: 'abc' });
    mockCategorias.mockReturnValue(retornoCategorias());
    (contarPendentes as jest.Mock).mockResolvedValue(0);
    (sincronizarPendentes as jest.Mock).mockResolvedValue(false);
    (consumirAcessoNegado as jest.Mock).mockReturnValue(false);
  });

  it('lista as despesas com data, título, valor e total', async () => {
    listar.mockResolvedValue({
      itens: [
        despesaLinha({
          id: '1',
          titulo: 'Aluguel',
          data: '2026-11-10',
          valor_centavos: 150000,
        }),
        despesaLinha({
          id: '2',
          titulo: 'Conta de luz',
          data: '2026-11-05',
          valor_centavos: 25000,
        }),
      ],
      total: 175000,
    });

    await render(<ListaDespesas />);

    expect(await screen.findByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Conta de luz')).toBeTruthy();
    expect(screen.getByText('Despesa · 10/11/2026')).toBeTruthy();
    expect(screen.getByText('Despesa · 05/11/2026')).toBeTruthy();

    expect(screen.getByText(/1\.750,00/)).toBeTruthy();
  });

  it('mostra o estado vazio quando não existem despesas', async () => {
    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Nenhuma despesa neste período'),
    ).toBeTruthy();

    expect(
      screen.getByText('Toque em + para registrar uma despesa.'),
    ).toBeTruthy();
  });

  it('abre o detalhe ao tocar em uma despesa', async () => {
    listar.mockResolvedValue({
      itens: [
        despesaLinha({
          id: 'despesa-teste',
          titulo: 'Aluguel',
        }),
      ],
      total: 150000,
    });

    await render(<ListaDespesas />);

    await fireEvent.press(await screen.findByText('Aluguel'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/despesas/[id]',
      params: { id: 'despesa-teste' },
    });
  });

  it('o botão + abre o cadastro de nova despesa', async () => {
    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    await screen.findByText('Nenhuma despesa neste período');

    await fireEvent.press(screen.getByLabelText('Nova despesa'));

    expect(router.push).toHaveBeenCalledWith('/despesas/nova');
  });

  it('mostra a mensagem de sucesso ao voltar do cadastro', async () => {
    setFeedback({
      tipo: 'sucesso',
      texto: 'Despesa salva com sucesso.',
    });

    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Despesa salva com sucesso.'),
    ).toBeTruthy();
  });

  it('mostra a mensagem de erro recebida de outra tela', async () => {
    setFeedback({
      tipo: 'erro',
      texto: 'Não foi possível salvar a despesa.',
    });

    listar.mockResolvedValue({
      itens: [],
      total: 0,
    });

    await render(<ListaDespesas />);

    expect(
      await screen.findByText('Não foi possível salvar a despesa.'),
    ).toBeTruthy();
  });

  describe('filtro por categoria (B, FA04)', () => {
    it('abre já filtrada quando recebe categoriaId por parâmetro (atalho do UC06)', async () => {
      mockParams.mockReturnValue({ categoriaId: 'uuid-saude' });
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);

      await waitFor(() => {
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        );
      });
      expect(
        screen.getByRole('button', { name: 'Saúde', selected: true }),
      ).toBeTruthy();
    });

    it('mostra Todas, padrão e própria com IDs reais, sem duplicatas', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);

      for (const nome of [
        'Todas',
        'Casa',
        'Alimentação',
        'Mobilidade',
        'Estudos',
        'Saúde',
        'Lazer',
        'Reserva financeira',
        'Mercado',
      ]) {
        expect(await screen.findByText(nome)).toBeTruthy();
      }

      expect(screen.getAllByText('Casa')).toHaveLength(1);
      expect(screen.getAllByText('Todas')).toHaveLength(1);
    });

    it('escolher categoria padrão envia o ID real e "Todas" volta ao normal', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await fireEvent.press(screen.getByText('Saúde'));

      await waitFor(() => {
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        );
      });

      await fireEvent.press(screen.getByText('Todas'));

      await waitFor(() => {
        const ultima = listar.mock.calls[listar.mock.calls.length - 1];
        expect(ultima).toHaveLength(2);
      });
    });

    it('escolher categoria própria envia o ID real', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await fireEvent.press(screen.getByText('Mercado'));

      await waitFor(() => {
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-mercado',
        );
      });
    });

    it('FA04: categoria sem resultados mostra "Nenhum registro" e sugere alterar o filtro', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await fireEvent.press(screen.getByText('Lazer'));

      expect(await screen.findByText('Nenhum registro')).toBeTruthy();
      expect(
        screen.getByText(
          'Altere o filtro de categoria ou o período para ver outras despesas.',
        ),
      ).toBeTruthy();
    });

    it('a lista exibe o nome correspondente ao categoria_id real', async () => {
      listar.mockResolvedValue({
        itens: [
          despesaLinha({ id: '1', titulo: 'Aluguel', categoria_id: 'uuid-casa' }),
        ],
        total: 150000,
      });

      await render(<ListaDespesas />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByTestId('categoria-despesa').props.children).toBe('Casa');
    });

    it.each([null, 'casa', 'id-desconhecido'])(
      'categoria %p aparece como "Sem categoria"',
      async (categoria_id) => {
        listar.mockResolvedValue({
          itens: [
            despesaLinha({
              id: '1',
              titulo: 'Aluguel',
              categoria_id,
            }),
          ],
          total: 150000,
        });

        await render(<ListaDespesas />);

        expect(await screen.findByText('Aluguel')).toBeTruthy();
        expect(screen.getByTestId('categoria-despesa').props.children).toBe(
          'Sem categoria',
        );
      },
    );

    it('recarrega categorias no retorno ao foco, sem duplicar na primeira montagem', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      expect(recarregarCategorias).not.toHaveBeenCalled();

      await act(async () => {
        mockFoco?.();
      });

      await waitFor(() =>
        expect(recarregarCategorias).toHaveBeenCalledTimes(1),
      );
    });

    it('mantém o filtro durante o carregamento das categorias', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      const { rerender } = await render(<ListaDespesas />);
      await fireEvent.press(await screen.findByText('Saúde'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        ),
      );

      mockCategorias.mockReturnValue(retornoCategorias({ carregando: true }));
      await rerender(<ListaDespesas />);

      expect(
        screen.getByRole('button', { name: 'Saúde', selected: true }),
      ).toBeTruthy();
    });

    it('mantém o filtro e exibe erro/retry quando a leitura de categorias falha', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      const { rerender } = await render(<ListaDespesas />);
      await fireEvent.press(await screen.findByText('Saúde'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        ),
      );

      mockCategorias.mockReturnValue(retornoCategorias({ erro: true }));
      await rerender(<ListaDespesas />);

      expect(
        await screen.findByText('Não foi possível carregar as categorias.'),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Saúde', selected: true }),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(recarregarCategorias).toHaveBeenCalledTimes(1);
    });

    it('volta para "Todas" após leitura bem-sucedida que remove a categoria selecionada', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      const { rerender } = await render(<ListaDespesas />);
      await fireEvent.press(await screen.findByText('Saúde'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        ),
      );

      const semSaude = CATEGORIAS_REAIS.filter((c) => c.id !== 'uuid-saude');
      mockCategorias.mockReturnValue(retornoCategorias({ itens: semSaude }));
      await rerender(<ListaDespesas />);

      await waitFor(() => {
        const ultima = listar.mock.calls[listar.mock.calls.length - 1];
        expect(ultima).toHaveLength(2);
      });
      expect(
        screen.getByRole('button', { name: 'Todas', selected: true }),
      ).toBeTruthy();
    });

    it('não reseta o filtro quando a referência de categorias não mudou', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      const { rerender } = await render(<ListaDespesas />);
      await fireEvent.press(await screen.findByText('Saúde'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        ),
      );

      mockCategorias.mockReturnValue(retornoCategorias());
      await rerender(<ListaDespesas />);

      expect(
        screen.getByRole('button', { name: 'Saúde', selected: true }),
      ).toBeTruthy();
      expect(listar).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        'uuid-saude',
      );
    });

    it('mantém seleção feita durante a recarga quando a nova lista contém a categoria', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      const { rerender } = await render(<ListaDespesas />);
      await fireEvent.press(await screen.findByText('Saúde'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-saude',
        ),
      );

      mockCategorias.mockReturnValue(retornoCategorias({ carregando: true }));
      await rerender(<ListaDespesas />);

      await fireEvent.press(screen.getByText('Mercado'));
      await waitFor(() =>
        expect(listar).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'uuid-mercado',
        ),
      );

      const semSaude = CATEGORIAS_REAIS.filter((c) => c.id !== 'uuid-saude');
      mockCategorias.mockReturnValue(retornoCategorias({ itens: semSaude }));
      await rerender(<ListaDespesas />);

      expect(
        screen.getByRole('button', { name: 'Mercado', selected: true }),
      ).toBeTruthy();
      expect(listar).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        'uuid-mercado',
      );
    });
  });

  describe('sincronização', () => {
    it('tenta sincronizar ao focar a lista (A7, C4, D4)', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      await waitFor(() => {
        expect(sincronizarPendentes).toHaveBeenCalled();
      });
    });

    it('recarrega a lista quando a nuvem atualizou algum registro local', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (sincronizarPendentes as jest.Mock).mockResolvedValue(true);

      await render(<ListaDespesas />);

      await waitFor(() => {
        expect(listar.mock.calls.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('mostra o indicador de pendências no singular', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (contarPendentes as jest.Mock).mockResolvedValue(1);

      await render(<ListaDespesas />);

      expect(await screen.findByText('↻ 1 pendente')).toBeTruthy();
    });

    it('mostra o indicador de pendências no plural', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });
      (contarPendentes as jest.Mock).mockResolvedValue(3);

      await render(<ListaDespesas />);

      expect(await screen.findByText('↻ 3 pendentes')).toBeTruthy();
    });

    it('não mostra o indicador sem pendências', async () => {
      listar.mockResolvedValue({ itens: [], total: 0 });

      await render(<ListaDespesas />);
      await screen.findByText('Nenhuma despesa neste período');

      expect(screen.queryByText(/pendente/)).toBeNull();
    });

    it('mantém a lista quando o contador de pendências falha', async () => {
      listar.mockResolvedValue({
        itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
        total: 150000,
      });
      (contarPendentes as jest.Mock).mockRejectedValue(new Error('disco'));

      await render(<ListaDespesas />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
    });

    it('EX06: nuvem negou o acesso → mensagem e dados locais intactos', async () => {
      listar.mockResolvedValue({
        itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
        total: 150000,
      });
      (consumirAcessoNegado as jest.Mock).mockReturnValue(true);

      await render(<ListaDespesas />);

      expect(await screen.findByText(MSG_DESPESA.semAcesso)).toBeTruthy();
      expect(screen.getByText('Aluguel')).toBeTruthy();
    });

    describe('rejeições e perda de foco', () => {
      it('FalhaLeituraCatalogoSincronizacao: warning, lista preservada e pendências atualizadas', async () => {
        const erroCatalogo = new FalhaLeituraCatalogoSincronizacao(
          'falha simulada no catálogo',
        );
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(erroCatalogo);
        (contarPendentes as jest.Mock).mockClear();

        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
          await render(<ListaDespesas />);

          expect(await screen.findByText('Aluguel')).toBeTruthy();
          await waitFor(() =>
            expect(warn).toHaveBeenCalledWith(
              expect.stringMatching(/catálogo/i),
              erroCatalogo,
            ),
          );
          expect(error).not.toHaveBeenCalled();
          expect(screen.queryByText(MSG_DESPESA.semAcesso)).toBeNull();
          await waitFor(() =>
            expect(contarPendentes).toHaveBeenCalledTimes(2),
          );
        } finally {
          warn.mockRestore();
          error.mockRestore();
        }
      });

      it('rejeição inesperada: registra console.error e mantém a lista', async () => {
        const erro = new Error('falha inesperada de sincronização');
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(erro);
        (contarPendentes as jest.Mock).mockClear();

        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
          await render(<ListaDespesas />);

          expect(await screen.findByText('Aluguel')).toBeTruthy();
          await waitFor(() =>
            expect(error).toHaveBeenCalledWith(
              expect.stringMatching(/inesperada/i),
              erro,
            ),
          );
          expect(warn).not.toHaveBeenCalled();
          expect(screen.queryByText(MSG_DESPESA.semAcesso)).toBeNull();
          await waitFor(() =>
            expect(contarPendentes).toHaveBeenCalledTimes(2),
          );
        } finally {
          warn.mockRestore();
          error.mockRestore();
        }
      });

      it('acesso negado real anterior à rejeição mantém a mensagem e os dados', async () => {
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (consumirAcessoNegado as jest.Mock).mockReturnValue(true);
        (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(
          new Error('falha inesperada'),
        );

        const error = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
          await render(<ListaDespesas />);

          expect(await screen.findByText(MSG_DESPESA.semAcesso)).toBeTruthy();
          expect(screen.getByText('Aluguel')).toBeTruthy();
          expect(error).toHaveBeenCalled();
          expect(contarPendentes).toHaveBeenCalled();
        } finally {
          error.mockRestore();
        }
      });

      it('resultado tardio após blur não recarrega, não mostra feedback nem consome acesso', async () => {
        setFeedback({ tipo: 'sucesso', texto: 'Feedback inicial' });
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (consumirAcessoNegado as jest.Mock).mockReturnValue(true);
        (contarPendentes as jest.Mock).mockClear();

        const adiado = adiar<boolean>();
        (sincronizarPendentes as jest.Mock).mockReturnValue(adiado.promessa);

        await render(<ListaDespesas />);
        expect(await screen.findByText('Aluguel')).toBeTruthy();
        expect(await screen.findByText('Feedback inicial')).toBeTruthy();
        expect(listar).toHaveBeenCalledTimes(1);
        expect(contarPendentes).toHaveBeenCalledTimes(1);

        sairDoFoco();

        await act(async () => {
          adiado.resolver(true);
        });

        expect(listar).toHaveBeenCalledTimes(1);
        expect(contarPendentes).toHaveBeenCalledTimes(1);
        expect(consumirAcessoNegado).not.toHaveBeenCalled();
        expect(screen.getByText('Feedback inicial')).toBeTruthy();
        expect(screen.queryByText(MSG_DESPESA.semAcesso)).toBeNull();
      });

      it('sucesso com mudou=false não recarrega a lista', async () => {
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (sincronizarPendentes as jest.Mock).mockResolvedValue(false);

        await render(<ListaDespesas />);

        expect(await screen.findByText('Aluguel')).toBeTruthy();
        await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
        expect(listar).toHaveBeenCalledTimes(1);
      });

      it('sucesso com mudou=true recarrega a lista exatamente uma vez', async () => {
        listar.mockResolvedValue({
          itens: [despesaLinha({ id: '1', titulo: 'Aluguel' })],
          total: 150000,
        });
        (sincronizarPendentes as jest.Mock).mockResolvedValue(true);

        await render(<ListaDespesas />);

        await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
        expect(listar).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('falha na leitura local', () => {
    it('mostra a mensagem de erro e a opção de tentar novamente', async () => {
      listar.mockRejectedValue(new FalhaLeitura('disco'));

      await render(<ListaDespesas />);

      expect(
        await screen.findByText(
          'Não foi possível carregar as despesas. Tente novamente.',
        ),
      ).toBeTruthy();

      expect(screen.getByText('Tentar novamente')).toBeTruthy();
    });

    it('recupera a listagem ao tentar novamente', async () => {
      listar.mockRejectedValueOnce(new FalhaLeitura('disco'));

      listar.mockResolvedValue({
        itens: [
          despesaLinha({
            id: 'recuperada',
            titulo: 'Despesa recuperada',
          }),
        ],
        total: 150000,
      });

      await render(<ListaDespesas />);

      await fireEvent.press(
        await screen.findByText('Tentar novamente'),
      );

      expect(
        await screen.findByText('Despesa recuperada'),
      ).toBeTruthy();

      await waitFor(() => {
        expect(listar).toHaveBeenCalledTimes(2);
      });
    });
  });
});
