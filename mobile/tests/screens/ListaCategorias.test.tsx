import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import type { TotaisMensaisPorCategoria } from '@/features/consumo/consulta';

let mockEmFoco = true;
jest.mock('expo-router', () => ({
  ...require('../helpers/expoRouterMock'),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const emFoco = mockEmFoco;
    require('react').useEffect(() => emFoco ? callback() : undefined, [callback, emFoco]);
  },
}));
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

  it('exibe a contagem real e o atalho para as despesas filtradas', async () => {
    listar.mockResolvedValue([
      categoriaLinha({ id: 'xyz', nome: 'Casa', total_lancamentos: 2 }),
    ]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('2 lançamentos')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Ver despesas da categoria Casa'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/despesas',
      params: { categoriaId: 'xyz' },
    });
  });

  it('exibe zero lançamentos e mantém o atalho para o estado vazio', async () => {
    listar.mockResolvedValue([
      categoriaLinha({ id: 'xyz', nome: 'Casa', total_lancamentos: 0 }),
    ]);
    await render(<ListaCategorias />);

    expect(await screen.findByText('Nenhum lançamento')).toBeTruthy();
    expect(screen.getByLabelText('Ver despesas da categoria Casa')).toBeTruthy();
  });

  it('não exibe indicador de sincronização', async () => {
    listar.mockResolvedValue([categoriaLinha({ id: '1', sync_status: 'pendente' })]);
    await render(<ListaCategorias />);

    await screen.findByText('Casa');
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

describe('Consumo na lista de categorias (UC09)', () => {
  const ler = jest.mocked(lerTotaisLocais);
  const dados: TotaisMensaisPorCategoria = {
    rendaCentavos: 0,
    categorias: [{ categoriaId: '1', nome: 'Casa', gastoCentavos: 8000,
      limite: { tipo: 'reais', centavos: 10000 } }],
  };

  function comGasto(gastoCentavos: number): TotaisMensaisPorCategoria {
    return { ...dados, categorias: [{ ...dados.categorias[0], gastoCentavos }] };
  }

  beforeEach(() => {
    fixarHoje('2026-11-24');
    ler.mockReset().mockResolvedValue(dados);
    listar.mockResolvedValue([categoriaLinha({ id: '1', nome: 'Casa', limite_tipo: 'valor', limite_centavos: 10000 })]);
    semear.mockResolvedValue({ criadas: [], conflitos: [] });
  });

  afterEach(() => {
    mockEmFoco = true;
    restaurarTempo();
  });

  it('atualiza o indicador e consulta o intervalo do mês selecionado', async () => {
    await render(<ListaCategorias />);
    expect(await screen.findByText('80% · Próximo do limite')).toBeTruthy();
    expect(ler).toHaveBeenLastCalledWith('2026-11-01', '2026-12-01');
    ler.mockResolvedValue(comGasto(0));
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
    expect(ler).toHaveBeenLastCalledWith('2026-10-01', '2026-11-01');
  });

  it('repete a consulta do mesmo mês após falha no cálculo', async () => {
    ler.mockResolvedValueOnce(comGasto(-1));
    await render(<ListaCategorias />);
    expect(await screen.findByText('Não foi possível atualizar o indicador de consumo.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('80% · Próximo do limite')).toBeTruthy();
    expect(ler.mock.calls).toEqual([
      ['2026-11-01', '2026-12-01'], ['2026-11-01', '2026-12-01'],
    ]);
  });

  it('exibe limite percentual indisponível em mês sem renda', async () => {
    ler.mockResolvedValue({ ...dados, categorias: [{ ...dados.categorias[0],
      limite: { tipo: 'percentual', centesimosDePercentual: 1000 } }] });
    await render(<ListaCategorias />);
    expect(await screen.findByText('Limite indisponível')).toBeTruthy();
    expect(screen.queryByText('80% · Próximo do limite')).toBeNull();
  });

  it('descarta resposta antiga que chega depois de uma troca rápida de mês', async () => {
    let responderOutubro!: (totais: TotaisMensaisPorCategoria) => void;
    const outubro = new Promise<TotaisMensaisPorCategoria>((resolve) => { responderOutubro = resolve; });
    ler.mockImplementation((inicio) => {
      if (inicio === '2026-10-01') return outubro;
      return Promise.resolve(inicio === '2026-09-01' ? comGasto(0) : dados);
    });
    await render(<ListaCategorias />);
    await screen.findByText('80% · Próximo do limite');
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(ler).toHaveBeenLastCalledWith('2026-10-01', '2026-11-01');
    await fireEvent.press(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
    await act(async () => { responderOutubro(comGasto(5000)); await outubro; });
    expect(screen.getByText('0% · Consumo baixo')).toBeTruthy();
    expect(screen.queryByText('50% · Atenção')).toBeNull();
  });

  it('aplica só a atualização mais recente da base no mesmo mês', async () => {
    await render(<ListaCategorias />);
    await screen.findByText('80% · Próximo do limite');
    let responder!: (totais: TotaisMensaisPorCategoria) => void;
    const anterior = new Promise<TotaisMensaisPorCategoria>((resolve) => { responder = resolve; });
    ler.mockReturnValueOnce(anterior).mockResolvedValueOnce(comGasto(0));
    await act(async () => { avisarBaseAtualizada(); avisarBaseAtualizada(); });
    expect(await screen.findByText('0% · Consumo baixo')).toBeTruthy();
    await act(async () => { responder(comGasto(5000)); await anterior; });
    expect(screen.getByText('0% · Consumo baixo')).toBeTruthy();
    expect(screen.queryByText('50% · Atenção')).toBeNull();
  });

  it('consulta novamente ao recuperar o foco após alteração dos dados', async () => {
    const tela = await render(<ListaCategorias />);
    await screen.findByText('80% · Próximo do limite');
    const consultasIniciais = ler.mock.calls.length;
    mockEmFoco = false;
    await tela.rerender(<ListaCategorias />);
    ler.mockResolvedValue(comGasto(5000));
    expect(ler).toHaveBeenCalledTimes(consultasIniciais);
    mockEmFoco = true;
    await tela.rerender(<ListaCategorias />);
    expect(await screen.findByText('50% · Atenção')).toBeTruthy();
    expect(ler).toHaveBeenLastCalledWith('2026-11-01', '2026-12-01');
    expect(ler.mock.calls.length).toBeGreaterThan(consultasIniciais);
  });
});
