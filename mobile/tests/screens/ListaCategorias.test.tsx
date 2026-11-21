import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lerTotaisLocais } from '@/features/consumo/sqlite';
import ListaCategorias from '@/app/categorias/index';
import { listarCategorias, semearCategoriasPadrao } from '@/features/categorias/service';
import * as useCategoriasModulo from '@/features/categorias/useCategorias';
import type { useCategorias } from '@/features/categorias/useCategorias';
import { CATEGORIA_CRIADA, setFeedback } from '@/features/categorias/feedback';
import { MSG_CAT } from '@/features/categorias/validation';
import { cores } from '@/lib/theme';
import { router } from '../helpers/expoRouterMock';
import { categoriaLinha } from '../helpers/categorias';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/categorias/service', () => ({
  listarCategorias: jest.fn(),
  semearCategoriasPadrao: jest.fn(),
}));

jest.mock('@/features/consumo/sqlite', () => ({
  lerTotaisLocais: jest.fn(async () => ({ categorias: [], rendaCentavos: 0 })),
}));

const listar = listarCategorias as jest.Mock;
const semear = semearCategoriasPadrao as jest.Mock;

describe('Lista de categorias (fluxo A do UC06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    semear.mockResolvedValue({ criadas: [], conflitos: [] });
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

  it('conflito de semeadura é exibido sem ocultar as categorias', async () => {
    semear.mockResolvedValue({ criadas: ['Casa'], conflitos: ['Lazer'] });
    listar.mockResolvedValue([categoriaLinha({ id: '1', nome: 'Zebra', padrao: 0, nome_normalizado: 'zebra' })]);
    await render(<ListaCategorias />);

    const banner = await screen.findByText(/Categorias padrão não criadas: Lazer/);
    expect(banner.props.children.join('')).toContain('Já existem categorias próprias com esses nomes');
    expect(screen.queryByText(/Semeadura abortada/)).toBeNull();
    expect(await screen.findByText('Zebra')).toBeTruthy(); // categorias seguem visíveis
  });

  it('falha de persistência da semeadura exibe mensagem amigável e mantém as categorias', async () => {
    semear.mockRejectedValueOnce(new Error('db fechado'));
    listar.mockResolvedValue([categoriaLinha({ id: '1', nome: 'Zebra', padrao: 0, nome_normalizado: 'zebra' })]);
    await render(<ListaCategorias />);

    expect(await screen.findByText(/Não foi possível preparar as categorias padrão/)).toBeTruthy();
    expect(screen.queryByText(/db fechado/)).toBeNull();
    expect(await screen.findByText('Zebra')).toBeTruthy();
  });

  it('consome o feedback de outra tela uma única vez', async () => {
    setFeedback(CATEGORIA_CRIADA);
    listar.mockResolvedValue([]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('✓  Categoria criada no dispositivo.')).toBeTruthy();
  });

  it('exibe feedback de erro com prefixo e cor de erro', async () => {
    setFeedback({ tipo: 'erro', texto: 'Não foi possível salvar.' });
    listar.mockResolvedValue([]);
    await render(<ListaCategorias />);

    const texto = await screen.findByText('!  Não foi possível salvar.');
    expect(texto).toBeTruthy();
    expect(texto.parent).toHaveStyle({ backgroundColor: cores.erro });
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
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: false, erroSemeadura: false, conflitosSemeadura: [], recarregar });
    const tela = await render(<ListaCategorias />);
    expect(await screen.findByText('Casa')).toBeTruthy();

    // Falha de atualização: o hook mantém os itens e reporta o erro.
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: true, erroSemeadura: false, conflitosSemeadura: [], recarregar });
    await tela.rerender(<ListaCategorias />);

    expect(screen.getByText('Casa')).toBeTruthy(); // itens continuam visíveis
    expect(screen.getByText(/Não foi possível atualizar a lista/)).toBeTruthy();

    // "Tentar novamente" chama recarregar:
    await fireEvent.press(screen.getByLabelText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();

    // Recuperação: sem erro, banner some e os itens permanecem:
    usarHook.mockReturnValue({ itens: [casa], carregando: false, erroLeitura: false, erroSemeadura: false, conflitosSemeadura: [], recarregar });
    await tela.rerender(<ListaCategorias />);
    expect(screen.queryByText(/Não foi possível atualizar a lista/)).toBeNull();

    usarHook.mockRestore();
  });
});

it('atualiza o indicador da categoria quando o mês muda', async () => {
  listar.mockResolvedValue([categoriaLinha({ id: '1', nome: 'Casa', limite_tipo: 'valor', limite_centavos: 10000 })]);
  semear.mockResolvedValue({ criadas: [], conflitos: [] });
  const dados = {
    rendaCentavos: 0,
    categorias: [{ categoriaId: '1', nome: 'Casa', gastoCentavos: 8000,
      limite: { tipo: 'reais' as const, centavos: 10000 } }],
  };
  const ler = jest.mocked(lerTotaisLocais);
  ler.mockResolvedValue(dados);
  await render(<ListaCategorias />);
  expect(await screen.findByText('80% · Próximo do limite')).toBeTruthy();
  ler.mockResolvedValue({ ...dados, categorias: [{ ...dados.categorias[0], gastoCentavos: 0 }] });
  await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
  expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
  ler.mockResolvedValue({ categorias: [], rendaCentavos: 0 });
});
