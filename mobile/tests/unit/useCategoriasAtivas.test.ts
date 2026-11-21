import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  criarCategoria,
  editarCategoria,
  excluirCategoria,
  listarCategorias,
  semearCategoriasPadrao,
} from '@/features/categorias/service';
import type { Categoria } from '@/features/categorias/types';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';

jest.mock('@/features/categorias/service', () => ({
  listarCategorias: jest.fn(),
  semearCategoriasPadrao: jest.fn(),
  criarCategoria: jest.fn(),
  editarCategoria: jest.fn(),
  excluirCategoria: jest.fn(),
}));

const listar = listarCategorias as jest.Mock;
const semear = semearCategoriasPadrao as jest.Mock;
const criar = criarCategoria as jest.Mock;
const editar = editarCategoria as jest.Mock;
const excluir = excluirCategoria as jest.Mock;

function categoria(extra: Partial<Categoria> = {}): Categoria {
  return {
    id: 'id-1',
    nome: 'Casa',
    nome_normalizado: 'casa',
    padrao: 1,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'sincronizado',
    excluido_em: null,
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

function adiar<T>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  return { promessa, resolver, rejeitar };
}

describe('useCategoriasAtivas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listar.mockReset();
    semear.mockReset();
    criar.mockReset();
    editar.mockReset();
    excluir.mockReset();

    listar.mockResolvedValue([]);
  });

  it('chama listarCategorias ao montar', async () => {
    const { result } = await renderHook(() => useCategoriasAtivas());

    await waitFor(() => expect(listar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.carregando).toBe(false));
  });

  it('retorna padrão e próprias na ordem recebida do serviço', async () => {
    const esperadas = [
      categoria({ id: 'padrao-1', nome: 'Casa', padrao: 1 }),
      categoria({
        id: 'propria-1',
        nome: 'Mercado',
        nome_normalizado: 'mercado',
        padrao: 0,
      }),
      categoria({ id: 'padrao-2', nome: 'Lazer', nome_normalizado: 'lazer', padrao: 1 }),
    ];
    listar.mockResolvedValue(esperadas);

    const { result } = await renderHook(() => useCategoriasAtivas());

    await waitFor(() => expect(result.current.itens).toEqual(esperadas));
    expect(result.current.itens.map((c) => c.id)).toEqual([
      'padrao-1',
      'propria-1',
      'padrao-2',
    ]);
  });

  it('começa carregando e termina após o sucesso', async () => {
    const consulta = adiar<Categoria[]>();
    listar.mockReturnValue(consulta.promessa);

    const { result } = await renderHook(() => useCategoriasAtivas());
    expect(result.current.carregando).toBe(true);

    await act(async () => {
      consulta.resolver([categoria()]);
    });

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro).toBe(false);
    expect(result.current.itens).toHaveLength(1);
  });

  it('falha inicial define erro e termina o carregamento', async () => {
    listar.mockRejectedValue(new Error('falha de leitura'));

    const { result } = await renderHook(() => useCategoriasAtivas());

    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.carregando).toBe(false);
    expect(result.current.itens).toEqual([]);
  });

  it('falha em recarregar preserva os itens anteriores', async () => {
    const primeiras = [categoria({ id: '1' }), categoria({ id: '2' })];
    listar
      .mockResolvedValueOnce(primeiras)
      .mockRejectedValueOnce(new Error('falha de leitura'));

    const { result } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(result.current.itens).toEqual(primeiras));

    await act(async () => {
      result.current.recarregar();
    });

    await waitFor(() => expect(result.current.erro).toBe(true));
    expect(result.current.itens).toEqual(primeiras);
    expect(result.current.carregando).toBe(false);
  });

  it('recarregar após falha recupera os dados e limpa o erro', async () => {
    const recuperadas = [categoria({ id: '3', nome: 'Estudos' })];
    listar
      .mockRejectedValueOnce(new Error('falha de leitura'))
      .mockResolvedValueOnce(recuperadas);

    const { result } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(result.current.erro).toBe(true));

    await act(async () => {
      result.current.recarregar();
    });

    await waitFor(() => expect(result.current.erro).toBe(false));
    expect(result.current.itens).toEqual(recuperadas);
    expect(result.current.carregando).toBe(false);
  });

  it('resposta antiga não sobrescreve o resultado de uma consulta mais recente', async () => {
    const antiga = adiar<Categoria[]>();
    const nova = adiar<Categoria[]>();
    listar.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    const { result } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.recarregar();
    });
    expect(listar).toHaveBeenCalledTimes(2);

    const itensNovos = [categoria({ id: 'nova', nome: 'Nova' })];
    await act(async () => {
      nova.resolver(itensNovos);
    });
    await waitFor(() => expect(result.current.itens).toEqual(itensNovos));

    await act(async () => {
      antiga.resolver([categoria({ id: 'antiga', nome: 'Antiga' })]);
    });

    expect(result.current.itens).toEqual(itensNovos);
    expect(result.current.erro).toBe(false);
    expect(result.current.carregando).toBe(false);
  });

  it('falha antiga não sobrescreve o resultado de uma consulta mais recente', async () => {
    const antiga = adiar<Categoria[]>();
    const nova = adiar<Categoria[]>();
    listar.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    const { result } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.recarregar();
    });

    const itensNovos = [categoria({ id: 'nova' })];
    await act(async () => {
      nova.resolver(itensNovos);
    });
    await waitFor(() => expect(result.current.itens).toEqual(itensNovos));

    await act(async () => {
      antiga.rejeitar(new Error('falha antiga'));
      await Promise.resolve();
    });

    expect(result.current.erro).toBe(false);
    expect(result.current.itens).toEqual(itensNovos);
    expect(result.current.carregando).toBe(false);
  });

  it('não atualiza estado após desmontagem com consulta pendente', async () => {
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consulta = adiar<Categoria[]>();
    listar.mockReturnValue(consulta.promessa);

    const { unmount } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(1));

    await unmount();

    await act(async () => {
      consulta.resolver([categoria()]);
      await Promise.resolve();
    });

    expect(erroConsole).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });

  it('rerender comum não dispara nova consulta', async () => {
    const { result, rerender } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await rerender(undefined);

    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('não semeia nem executa operações de escrita', async () => {
    const { result } = await renderHook(() => useCategoriasAtivas());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    await act(async () => {
      result.current.recarregar();
    });
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));

    expect(semear).not.toHaveBeenCalled();
    expect(criar).not.toHaveBeenCalled();
    expect(editar).not.toHaveBeenCalled();
    expect(excluir).not.toHaveBeenCalled();
  });
});
