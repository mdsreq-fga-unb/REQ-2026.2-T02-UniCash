import { act, renderHook } from '@testing-library/react-native';
import { useCategorias } from '@/features/categorias/useCategorias';
import { listarCategorias, semearCategoriasPadrao } from '@/features/categorias/service';
import type { Categoria } from '@/features/categorias/types';

jest.mock('@/features/categorias/service', () => ({
  semearCategoriasPadrao: jest.fn(),
  listarCategorias: jest.fn(),
}));

// A classe vem do módulo real (o mock acima só substitui as funções usadas pelo hook).
const { NomeReservadoCategoriasPadrao } =
  jest.requireActual<typeof import('@/features/categorias/service')>('@/features/categorias/service');

const semear = semearCategoriasPadrao as jest.Mock;
const listar = listarCategorias as jest.Mock;

const cat = (extra: Partial<Categoria> = {}): Categoria =>
  ({
    id: 'x',
    nome: 'Casa',
    nome_normalizado: 'casa',
    padrao: 1,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'sincronizado',
    excluido_em: null,
    criado_em: 't',
    atualizado_em: 't',
    ...extra,
  }) as Categoria;

describe('useCategorias (base da interface UC06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    semear.mockResolvedValue(undefined);
  });

  it('semeia antes da primeira listagem e expõe os itens', async () => {
    const esperadas = [cat(), cat({ id: '2', nome: 'Lazer', nome_normalizado: 'lazer' })];
    listar.mockResolvedValue(esperadas);

    const { result } = await renderHook(() => useCategorias());
    expect(result.current.carregando).toBe(true);

    await act(async () => {
      await result.current.recarregar();
    });

    expect(semear).toHaveBeenCalledTimes(1);
    expect(listar).toHaveBeenCalledTimes(1);
    // Semeadura antes da listagem (RN13)
    expect(semear.mock.invocationCallOrder[0]).toBeLessThan(listar.mock.invocationCallOrder[0]);
    expect(result.current.itens).toEqual(esperadas);
    expect(result.current.carregando).toBe(false);
    expect(result.current.erroLeitura).toBe(false);
    expect(result.current.erroSemeadura).toBeNull();
  });

  it('não repete a semeadura nas cargas seguintes (idempotente por instância)', async () => {
    listar.mockResolvedValue([]);
    const { result } = await renderHook(() => useCategorias());

    await act(async () => {
      await result.current.recarregar();
    });
    await act(async () => {
      await result.current.recarregar();
    });

    expect(semear).toHaveBeenCalledTimes(1);
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('falha de leitura vira erroLeitura e preserva os itens anteriores', async () => {
    const primeiras = [cat({ id: '1' })];
    listar.mockResolvedValueOnce(primeiras).mockRejectedValueOnce(new Error('db fechado'));

    const { result } = await renderHook(() => useCategorias());
    await act(async () => {
      await result.current.recarregar();
    });
    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.erroLeitura).toBe(true);
    expect(result.current.itens).toEqual(primeiras);
    expect(result.current.carregando).toBe(false);
  });

  it('erro semântico da semeadura é preservado (NomeReservadoCategoriasPadrao) e a listagem continua', async () => {
    const conflito = new NomeReservadoCategoriasPadrao(['casa']);
    semear.mockRejectedValue(conflito);
    listar.mockResolvedValue([cat({ id: '1', padrao: 0 })]);

    const { result } = await renderHook(() => useCategorias());
    await act(async () => {
      await result.current.recarregar();
    });

    expect(result.current.erroSemeadura).toBe(conflito);
    expect(result.current.erroSemeadura).toBeInstanceOf(NomeReservadoCategoriasPadrao);
    expect(result.current.erroLeitura).toBe(false);
    expect(result.current.itens).toHaveLength(1); // listagem segue apesar do conflito
    expect(result.current.carregando).toBe(false);
  });

  it('após erro de semeadura, nova carga tenta semear novamente', async () => {
    semear.mockRejectedValueOnce(new NomeReservadoCategoriasPadrao(['casa'])).mockResolvedValueOnce(undefined);
    listar.mockResolvedValue([]);

    const { result } = await renderHook(() => useCategorias());
    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.erroSemeadura).toBeInstanceOf(NomeReservadoCategoriasPadrao);

    await act(async () => {
      await result.current.recarregar();
    });
    expect(semear).toHaveBeenCalledTimes(2);
    expect(result.current.erroSemeadura).toBeNull();
  });

  it('chamadas concorrentes de recarregar são deduplicadas', async () => {
    let resolver!: (v: Categoria[]) => void;
    listar.mockImplementation(() => new Promise<Categoria[]>((res) => (resolver = res)));
    const esperadas = [cat({ id: '1' })];

    const { result } = await renderHook(() => useCategorias());
    await act(async () => {
      const p1 = result.current.recarregar();
      const p2 = result.current.recarregar(); // reaproveita a carga em andamento
      await Promise.resolve(); // deixa a carga chegar até listarCategorias
      resolver(esperadas);
      await Promise.all([p1, p2]);
    });

    expect(semear).toHaveBeenCalledTimes(1);
    expect(listar).toHaveBeenCalledTimes(1);
    expect(result.current.itens).toEqual(esperadas);
  });

  it('não atualiza estado após a desmontagem', async () => {
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    let resolver!: (v: Categoria[]) => void;
    listar.mockImplementation(() => new Promise<Categoria[]>((res) => (resolver = res)));

    const { result, unmount } = await renderHook(() => useCategorias());
    let p!: Promise<void>;
    await act(async () => {
      p = result.current.recarregar();
      await Promise.resolve(); // carga em andamento, aguardando listarCategorias
    });

    await unmount(); // a carga só se resolve depois do fim da tela
    resolver([cat({ id: '1' })]);
    await p; // fora de act: qualquer setState pós-desmontagem dispararia aviso no console

    expect(erroConsole).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });

  it('não atualiza estado após desmontagem durante a semeadura (resolução)', async () => {
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    let resolverSemeadura!: () => void;
    semear.mockImplementationOnce(() => new Promise<void>((res) => (resolverSemeadura = res)));
    listar.mockResolvedValue([cat({ id: '1' })]);

    const { result, unmount } = await renderHook(() => useCategorias());
    let p!: Promise<void>;
    await act(async () => {
      p = result.current.recarregar();
      await Promise.resolve();
    });

    await unmount();
    resolverSemeadura();
    await p;

    expect(erroConsole).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });

  it('não atualiza estado após desmontagem durante a semeadura (rejeição)', async () => {
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    let rejeitarSemeadura!: (e: unknown) => void;
    semear.mockImplementationOnce(() => new Promise<void>((_, rej) => (rejeitarSemeadura = rej)));
    listar.mockResolvedValue([]);

    const { result, unmount } = await renderHook(() => useCategorias());
    let p!: Promise<void>;
    await act(async () => {
      p = result.current.recarregar();
      await Promise.resolve();
    });

    await unmount();
    rejeitarSemeadura(new Error('falha na semeadura'));
    await p;

    expect(erroConsole).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });

  it('não atualiza estado após desmontagem durante a consulta (rejeição)', async () => {
    const erroConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    let rejeitarLista!: (e: unknown) => void;
    listar.mockImplementationOnce(() => new Promise<Categoria[]>((_, rej) => (rejeitarLista = rej)));

    const { result, unmount } = await renderHook(() => useCategorias());
    let p!: Promise<void>;
    await act(async () => {
      p = result.current.recarregar();
      await Promise.resolve();
    });

    await unmount();
    rejeitarLista(new Error('db fechado'));
    await p;

    expect(erroConsole).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });
});
