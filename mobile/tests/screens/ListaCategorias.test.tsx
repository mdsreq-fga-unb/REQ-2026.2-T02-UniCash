import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ListaCategorias from '@/app/categorias/index';
import { listarCategorias, semearCategoriasPadrao } from '@/features/categorias/service';
import type { NomeReservadoCategoriasPadrao } from '@/features/categorias/service';
import * as useCategoriasModulo from '@/features/categorias/useCategorias';
import type { useCategorias } from '@/features/categorias/useCategorias';
import { CATEGORIA_CRIADA, setFeedback } from '@/features/categorias/feedback';
import { MSG_CAT } from '@/features/categorias/validation';
import { router } from '../helpers/expoRouterMock';
import { categoriaLinha } from '../helpers/categorias';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/categorias/service', () => ({
  listarCategorias: jest.fn(),
  semearCategoriasPadrao: jest.fn(),
}));

// Classe real, para construir o erro semântico do conflito de nomes reservados.
const NomeReservadoCategoriasPadraoReal =
  jest.requireActual<typeof import('@/features/categorias/service')>('@/features/categorias/service')
    .NomeReservadoCategoriasPadrao as typeof NomeReservadoCategoriasPadrao;

const listar = listarCategorias as jest.Mock;
const semear = semearCategoriasPadrao as jest.Mock;

describe('Lista de categorias (fluxo A do UC06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    semear.mockResolvedValue(undefined);
  });

  it('lista padrões com etiqueta e próprias, na ordem do serviço', async () => {
    listar.mockResolvedValue([
      categoriaLinha({ id: '1', nome: 'Casa', padrao: 1 }),
      categoriaLinha({ id: '2', nome: 'Mercado Livre', padrao: 0, nome_normalizado: 'mercado livre' }),
    ]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('Casa')).toBeTruthy();
    expect(screen.getByText('Padrão')).toBeTruthy();
    expect(screen.getByText('Mercado Livre')).toBeTruthy();
    expect(screen.queryAllByText('Padrão')).toHaveLength(1); // etiqueta só na padrão
  });

  it('exibe os três estados de limite corretamente', async () => {
    listar.mockResolvedValue([
      categoriaLinha({ id: '1', nome: 'Casa' }), // sem limite
      categoriaLinha({
        id: '2',
        nome: 'Mercado',
        padrao: 0,
        nome_normalizado: 'mercado',
        limite_tipo: 'valor',
        limite_centavos: 150_000,
      }),
      categoriaLinha({
        id: '3',
        nome: 'Lazer',
        padrao: 0,
        nome_normalizado: 'lazer',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 1250,
      }),
    ]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('Sem limite de gastos')).toBeTruthy();
    expect(screen.getByText('Limite: R$ 1.500,00')).toBeTruthy();
    expect(screen.getByText('Limite: 12,5% da renda')).toBeTruthy();
  });

  it('não exibe contagem de lançamentos nem indicador de sincronização', async () => {
    listar.mockResolvedValue([categoriaLinha({ id: '1', sync_status: 'pendente' })]);
    await render(<ListaCategorias />);

    await screen.findByText('Casa');
    expect(screen.queryByText(/lançamento/i)).toBeNull();
    expect(screen.queryByText('Sincronização pendente')).toBeNull();
  });

  it('estado de carregamento não mostra o vazio', async () => {
    let resolver!: (v: never[]) => void;
    listar.mockImplementation(() => new Promise((res) => (resolver = res)));
    await render(<ListaCategorias />);

    expect(screen.queryByText('Nenhuma categoria')).toBeNull();
    resolver([]);
    await screen.findByText('Nenhuma categoria');
  });

  it('estado vazio', async () => {
    listar.mockResolvedValue([]);
    await render(<ListaCategorias />);
    expect(await screen.findByText('Nenhuma categoria')).toBeTruthy();
  });

  it('falha de leitura: mensagem, tentar novamente e recuperação', async () => {
    listar.mockRejectedValueOnce(new Error('db fechado')).mockResolvedValueOnce([
      categoriaLinha({ id: '1', nome: 'Casa' }),
    ]);
    await render(<ListaCategorias />);

    expect(await screen.findByText(MSG_CAT.falhaLeitura)).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(await screen.findByText('Casa')).toBeTruthy();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('falha de semeadura é exibida separadamente, sem ocultar as categorias', async () => {
    semear.mockRejectedValue(new NomeReservadoCategoriasPadraoReal(['casa', 'lazer']));
    listar.mockResolvedValue([categoriaLinha({ id: '1', nome: 'Zebra', padrao: 0, nome_normalizado: 'zebra' })]);
    await render(<ListaCategorias />);

    const banner = await screen.findByText(/Semeadura abortada/);
    expect(banner.props.children.join('')).toContain('casa');
    expect(banner.props.children.join('')).toContain('Nada foi alterado');
    expect(await screen.findByText('Zebra')).toBeTruthy(); // categorias seguem visíveis
  });

  it('consome o feedback de outra tela uma única vez', async () => {
    setFeedback(CATEGORIA_CRIADA);
    listar.mockResolvedValue([]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('✓  Categoria criada no dispositivo.')).toBeTruthy();
  });

  it('navegação: FAB → nova, toque na categoria → editar', async () => {
    listar.mockResolvedValue([categoriaLinha({ id: 'xyz', nome: 'Casa' })]);
    await render(<ListaCategorias />);

    await fireEvent.press(await screen.findByLabelText('Nova categoria'));
    expect(router.push).toHaveBeenCalledWith('/categorias/nova');

    await fireEvent.press(screen.getByLabelText('Categoria Casa'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/categorias/[id]/editar',
      params: { id: 'xyz' },
    });
  });

  it('semeia os padrões ao ganhar foco, antes da listagem', async () => {
    listar.mockResolvedValue([]);
    await render(<ListaCategorias />);

    await waitFor(() => expect(listar).toHaveBeenCalled());
    expect(semear).toHaveBeenCalledTimes(1);
    expect(semear.mock.invocationCallOrder[0]).toBeLessThan(listar.mock.invocationCallOrder[0]);
  });

  it('falha de atualização com itens carregados: banner, tentar novamente e recuperação', async () => {
    type Retorno = ReturnType<typeof useCategorias>;
    const casa = categoriaLinha({ id: 'xyz', nome: 'Casa' });
    const recarregar = jest.fn().mockResolvedValue(undefined);
    const usarHook = jest.spyOn(useCategoriasModulo, 'useCategorias');

    // Listagem inicial bem-sucedida:
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: false, erroSemeadura: null, recarregar });
    const tela = await render(<ListaCategorias />);
    expect(await screen.findByText('Casa')).toBeTruthy();

    // Falha de atualização: o hook mantém os itens e reporta o erro.
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: true, erroSemeadura: null, recarregar });
    await tela.rerender(<ListaCategorias />);

    expect(screen.getByText('Casa')).toBeTruthy(); // itens continuam visíveis
    expect(screen.getByText(/Não foi possível atualizar a lista/)).toBeTruthy();

    // "Tentar novamente" chama recarregar:
    await fireEvent.press(screen.getByLabelText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();

    // Recuperação: sem erro, banner some e os itens permanecem:
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: false, erroSemeadura: null, recarregar });
    await tela.rerender(<ListaCategorias />);
    expect(screen.queryByText(/Não foi possível atualizar a lista/)).toBeNull();

    usarHook.mockRestore();
  });
});
