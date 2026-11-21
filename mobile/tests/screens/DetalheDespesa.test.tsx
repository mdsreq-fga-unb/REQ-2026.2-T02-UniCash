
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import DetalheDespesa from '@/app/despesas/[id]';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import { buscarDespesa } from '@/features/despesas/service';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { despesaLinha } from '../helpers/dados';
import { categoriaLinha } from '../helpers/categorias';
import { router } from '../helpers/expoRouterMock';

const mockIniciarExclusao = jest.fn();
let mockFoco: (() => void) | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  const base = require('../helpers/expoRouterMock');

  return {
    ...base,
    useFocusEffect: (cb: () => void) => {
      mockFoco = cb;
      React.useEffect(cb, [cb]);
    },
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/components/despesas/useExclusaoDespesas', () => ({
  useExclusaoDespesas: () => ({
    iniciar: mockIniciarExclusao,
    dialogos: null,
  }),
}));

jest.mock('@/features/despesas/service', () => ({
  ...jest.requireActual('@/features/despesas/service'),
  buscarDespesa: jest.fn(),
}));

jest.mock('@/features/categorias/useCategoriasAtivas', () => ({
  useCategoriasAtivas: jest.fn(),
}));

const buscar = buscarDespesa as jest.Mock;
const mockCategorias = useCategoriasAtivas as jest.Mock;
const recarregarCategorias = jest.fn();

const CATEGORIAS_REAIS = [
  categoriaLinha({ id: 'uuid-casa', nome: 'Casa' }),
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

function unica() {
  return {
    despesa: despesaLinha({
      id: 'abc',
      titulo: 'Aluguel',
      valor_centavos: 150000,
      data: '2026-10-16',
      descricao: 'Aluguel do apartamento',
      categoria_id: 'uuid-casa',
      fixa_ou_variavel: 'fixa',
      essencial: 1,
      recorrencia_id: null,
      sync_status: 'pendente',
    }),
    recorrencia: null,
  };
}

function comCategoria(categoria_id: string | null) {
  return {
    despesa: despesaLinha({
      id: 'abc',
      titulo: 'Aluguel',
      valor_centavos: 150000,
      data: '2026-10-16',
      descricao: 'Aluguel do apartamento',
      categoria_id,
      fixa_ou_variavel: 'fixa',
      essencial: 1,
      recorrencia_id: null,
      sync_status: 'pendente',
    }),
    recorrencia: null,
  };
}

function emSerie(termino: string | null = null) {
  return {
    despesa: despesaLinha({
      id: 'abc',
      titulo: 'Aluguel',
      valor_centavos: 150000,
      data: '2026-10-16',
      recorrencia_id: 'serie-1',
      sync_status: 'pendente',
    }),
    recorrencia: {
      intervalo: 1,
      unidade: 'mes',
      termino,
    },
  };
}

describe('DetalheDespesa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFoco = null;
    mockCategorias.mockReturnValue(retornoCategorias());
    buscar.mockResolvedValue(unica());
  });

  it('mostra os detalhes da despesa', async () => {
    await render(<DetalheDespesa />);

    expect(await screen.findByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Detalhe da despesa')).toBeTruthy();
    expect(screen.getByText('Aluguel do apartamento')).toBeTruthy();
    expect(screen.getByText('Casa')).toBeTruthy();
    expect(screen.getByText('Fixa')).toBeTruthy();
    expect(screen.getByText('Essencial')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  describe('categoria (UC06)', () => {
    it('resolver ID real de categoria própria', async () => {
      buscar.mockResolvedValue(comCategoria('uuid-mercado'));

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Mercado')).toBeTruthy();
    });

    it.each([null, 'casa', 'id-desconhecido'])(
      'categoria %p aparece como "Sem categoria"',
      async (categoria_id) => {
        buscar.mockResolvedValue(comCategoria(categoria_id));

        await render(<DetalheDespesa />);

        expect(await screen.findByText('Aluguel')).toBeTruthy();
        expect(screen.getByText('Sem categoria')).toBeTruthy();
      },
    );

    it('categoria excluída aparece como "Sem categoria"', async () => {
      mockCategorias.mockReturnValue(
        retornoCategorias({
          itens: [
            ...CATEGORIAS_REAIS,
            categoriaLinha({
              id: 'uuid-antiga',
              nome: 'Antiga',
              excluido_em: '2026-02-01T00:00:00Z',
            }),
          ],
        }),
      );
      buscar.mockResolvedValue(comCategoria('uuid-antiga'));

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Sem categoria')).toBeTruthy();
    });

    it('mostra "Carregando..." enquanto as categorias são lidas', async () => {
      mockCategorias.mockReturnValue(
        retornoCategorias({ itens: [], carregando: true }),
      );

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Carregando...')).toBeTruthy();
    });

    it('em falha com categoria preservada, mantém o nome e oferece retry', async () => {
      mockCategorias.mockReturnValue(retornoCategorias({ erro: true }));

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Casa')).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(recarregarCategorias).toHaveBeenCalledTimes(1);
    });

    it('em falha sem correspondência, exibe "Categoria indisponível" e retry', async () => {
      mockCategorias.mockReturnValue(
        retornoCategorias({
          itens: [categoriaLinha({ id: 'uuid-casa', nome: 'Casa' })],
          erro: true,
        }),
      );
      buscar.mockResolvedValue(comCategoria('uuid-mercado'));

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Categoria indisponível')).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(recarregarCategorias).toHaveBeenCalledTimes(1);
    });

    it('em falha com categoria nula, mantém "Sem categoria"', async () => {
      mockCategorias.mockReturnValue(retornoCategorias({ erro: true }));
      buscar.mockResolvedValue(comCategoria(null));

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText('Sem categoria')).toBeTruthy();
    });

    it('falha de categorias não oculta dados financeiros nem recorrência', async () => {
      mockCategorias.mockReturnValue(retornoCategorias({ erro: true }));
      buscar.mockResolvedValue(emSerie());

      await render(<DetalheDespesa />);

      expect(await screen.findByText('Aluguel')).toBeTruthy();
      expect(screen.getByText(/1\.500,00/)).toBeTruthy();
      expect(screen.getByText('16/10/2026')).toBeTruthy();
      expect(screen.getByText(/A cada 1 mês/)).toBeTruthy();
    });

    it('primeira entrada não duplica a leitura de categorias; foco posterior recarrega', async () => {
      await render(<DetalheDespesa />);
      await screen.findByText('Aluguel');

      expect(recarregarCategorias).not.toHaveBeenCalled();

      await act(async () => {
        mockFoco?.();
        await Promise.resolve();
      });

      await waitFor(() =>
        expect(recarregarCategorias).toHaveBeenCalledTimes(1),
      );
    });
  });

  it('mostra quando a despesa não tem recorrência', async () => {
    await render(<DetalheDespesa />);

    expect(await screen.findByText('Não se repete')).toBeTruthy();
  });

  it('mostra a recorrência sem data de término', async () => {
    buscar.mockResolvedValue(emSerie());

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(/A cada 1 mês/),
    ).toBeTruthy();

    expect(screen.getByText(/sem término/)).toBeTruthy();
  });

  it('mostra a recorrência com data de término', async () => {
    buscar.mockResolvedValue(emSerie('2027-01-16'));

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(/A cada 1 mês/),
    ).toBeTruthy();

    expect(screen.getByText(/16\/01\/2027/)).toBeTruthy();
  });

  it('navega para a edição da despesa', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    await fireEvent.press(screen.getByText(/Editar despesa/));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/despesas/[id]/editar',
      params: { id: 'abc' },
    });
  });

  it('volta para a tela anterior', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(router.back).toHaveBeenCalled();
  });

  it('mostra mensagem quando a despesa não está disponível', async () => {
    buscar.mockResolvedValue(null);

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(MSG_DESPESA.indisponivel),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Voltar para despesas'));

    expect(router.replace).toHaveBeenCalledWith('/despesas');
  });

  it('mostra erro de leitura e permite tentar novamente', async () => {
    buscar
      .mockRejectedValueOnce(new Error('Falha'))
      .mockResolvedValueOnce(unica());

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(MSG_DESPESA.falhaLeitura),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(await screen.findByText('Aluguel')).toBeTruthy();

    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('aciona o início da exclusão pelo botão', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Excluir despesa' }),
    );

    expect(mockIniciarExclusao).toHaveBeenCalledTimes(1);
  });
});
