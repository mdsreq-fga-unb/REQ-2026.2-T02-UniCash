import { getDb } from '@/db/database';
import {
  consumirAcessoNegado,
  FalhaLeituraCatalogoSincronizacao,
  sincronizarEmSegundoPlano,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { registrarDespesa } from '@/features/despesas/service';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { categoriaLinha } from '../helpers/categorias';

let mockUsuario: { uid: string } | null = null;
let mockFalhaAuth = false;
const mockNuvem = new Map<string, any>();

jest.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      if (mockFalhaAuth) {
        throw new Error('falha inesperada de autenticação');
      }
      return mockUsuario;
    },
  },
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  getDoc: async (ref: any) => ({
    exists: () => mockNuvem.has(ref.path),
    data: () => mockNuvem.get(ref.path),
  }),
  getDocs: jest.fn(),
  runTransaction: async (_db: unknown, fn: (tx: any) => Promise<any>) => {
    const tx = {
      get: async (ref: any) => ({
        exists: () => mockNuvem.has(ref.path),
        data: () => mockNuvem.get(ref.path),
      }),
      set: (ref: any, dados: any) => {
        mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
      },
    };
    return fn(tx);
  },
  setDoc: jest.fn(async (ref: any, dados: any) => {
    mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
  }),
}));

describe('sincronizarEmSegundoPlano', () => {
  let banco: BancoFalso;

  function inserirCategoria() {
    const categoria = categoriaLinha({
      id: 'uuid-casa',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
    });

    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em,
           atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        categoria.id,
        categoria.nome,
        categoria.nome_normalizado,
        categoria.padrao,
        categoria.limite_tipo,
        categoria.limite_centavos,
        categoria.limite_percentual_centesimos,
        categoria.sync_status,
        categoria.excluido_em,
        categoria.criado_em,
        categoria.atualizado_em,
      );
  }

  async function criarDespesaPendente() {
    banco = instalarBanco();
    inserirCategoria();

    await registrarDespesa({
      data: '2026-10-16',
      titulo: 'Aluguel',
      valorCentavos: 150000,
      descricao: 'Aluguel do apartamento',
      categoriaId: 'uuid-casa',
      fixaOuVariavel: 'fixa',
      essencial: 1,
      recorrencia: null,
    });

    return banco.despesas()[0];
  }

  function falharLeituraCatalogo() {
    const prepareOriginal = banco.sqlite.prepare.bind(banco.sqlite);

    return jest
      .spyOn(banco.sqlite, 'prepare')
      .mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM categorias')) {
          throw new Error('falha simulada na leitura do catálogo');
        }
        return prepareOriginal(sql);
      });
  }

  async function aguardarSegundoPlano() {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockReset();
    mockUsuario = null;
    mockFalhaAuth = false;
    mockNuvem.clear();
    consumirAcessoNegado();
  });

  it('sem conta, não faz nada e não lança', () => {
    expect(() => sincronizarEmSegundoPlano()).not.toThrow();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('com conta, dispara a sincronização sem esperar por ela', async () => {
    mockUsuario = { uid: 'u1' };
    (getDb as jest.Mock).mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue([]) });

    sincronizarEmSegundoPlano();

    await new Promise((r) => setTimeout(r, 0));
    expect(getDb).toHaveBeenCalled();
  });

  it('rejeita com FalhaLeituraCatalogoSincronizacao, preserva a despesa e permite nova tentativa', async () => {
    const antes = await criarDespesaPendente();
    mockUsuario = { uid: 'u1' };

    const spy = falharLeituraCatalogo();

    try {
      await expect(sincronizarPendentes()).rejects.toBeInstanceOf(
        FalhaLeituraCatalogoSincronizacao,
      );

      const depois = banco.despesas()[0];
      expect(depois).toMatchObject({
        valor_centavos: antes.valor_centavos,
        data: antes.data,
        titulo: antes.titulo,
        categoria_id: antes.categoria_id,
        atualizado_em: antes.atualizado_em,
        sync_status: 'pendente',
      });
      expect(mockNuvem.size).toBe(0);
    } finally {
      spy.mockRestore();
    }

    await sincronizarPendentes();

    const sincronizada = banco.despesas()[0];
    expect(sincronizada.sync_status).toBe('sincronizado');
    expect(
      mockNuvem.get(`usuarios/u1/despesas/${antes.id}`),
    ).toMatchObject({ categoria_id: 'casa' });
  });

  it('captura a rejeição de catálogo em segundo plano sem retry nem acessoNegado', async () => {
    const despesa = await criarDespesaPendente();
    mockUsuario = { uid: 'u1' };

    const spy = falharLeituraCatalogo();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    let rejeicaoNaoTratada = false;
    const aoRejeitar = () => {
      rejeicaoNaoTratada = true;
    };
    process.on('unhandledRejection', aoRejeitar);
    (getDb as jest.Mock).mockClear();

    try {
      expect(() => sincronizarEmSegundoPlano()).not.toThrow();
      await aguardarSegundoPlano();

      expect(warn).toHaveBeenCalledTimes(1);
      const [mensagem, erroRegistrado] = warn.mock.calls[0];
      expect(mensagem).toMatch(/catálogo/i);
      expect(erroRegistrado).toBeInstanceOf(
        FalhaLeituraCatalogoSincronizacao,
      );
      expect(error).not.toHaveBeenCalled();
      expect(rejeicaoNaoTratada).toBe(false);
      expect(getDb).toHaveBeenCalledTimes(1);
      expect(consumirAcessoNegado()).toBe(false);
      expect(banco.despesas()[0].sync_status).toBe('pendente');
      expect(mockNuvem.size).toBe(0);
      expect(despesa.sync_status).toBe('pendente');
    } finally {
      process.off('unhandledRejection', aoRejeitar);
      warn.mockRestore();
      error.mockRestore();
      spy.mockRestore();
    }
  });

  it('registra rejeição inesperada em segundo plano sem nova rejeição', async () => {
    mockFalhaAuth = true;

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    let rejeicaoNaoTratada = false;
    const aoRejeitar = () => {
      rejeicaoNaoTratada = true;
    };
    process.on('unhandledRejection', aoRejeitar);

    try {
      expect(() => sincronizarEmSegundoPlano()).not.toThrow();
      await aguardarSegundoPlano();

      expect(error).toHaveBeenCalledTimes(1);
      const [mensagem, erroRegistrado] = error.mock.calls[0];
      expect(mensagem).toMatch(/inesperada/i);
      expect(erroRegistrado).toBeInstanceOf(Error);
      expect((erroRegistrado as Error).message).toMatch(/autenticação/);
      expect(warn).not.toHaveBeenCalled();
      expect(rejeicaoNaoTratada).toBe(false);
      expect(consumirAcessoNegado()).toBe(false);
    } finally {
      process.off('unhandledRejection', aoRejeitar);
      warn.mockRestore();
      error.mockRestore();
    }
  });
});
