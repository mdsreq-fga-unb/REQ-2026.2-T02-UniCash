jest.unmock('@/db/database');

import AsyncStorage from '@react-native-async-storage/async-storage';
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';
import { getDb, getDbDoDono } from '@/db/database';
import { VERSAO_ESQUEMA } from '@/db/migrations';
import {
  buscarMeta,
  criarMeta,
  editarMeta,
  excluirMeta,
} from '@/features/metas/service';

let mockUsuario: { uid: string; emailVerified: boolean } | null = null;
const bancos = new Map<string, Database.Database>();

jest.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockUsuario;
    },
    async authStateReady() {
      return undefined;
    },
  },
}));

function criarAdaptador(sqlite: Database.Database) {
  const api: any = {
    async execAsync(sql: string) {
      sqlite.exec(sql);
    },
    async runAsync(sql: string, params: unknown[] = []) {
      const r = sqlite.prepare(sql).run(...(params as any[]));
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).get(...(params as any[])) ?? null;
    },
    async getAllAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).all(...(params as any[]));
    },
    async withExclusiveTransactionAsync(fn: (tx: unknown) => Promise<void>) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        await fn(api);
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return api;
}

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

afterAll(() => {
  for (const sqlite of bancos.values()) sqlite.close();
  bancos.clear();
});

describe('metas com bancos separados por UID (UC10/UC12)', () => {
  beforeEach(async () => {
    mockUsuario = null;
    bancos.clear();
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (SQLite.openDatabaseAsync as jest.Mock).mockImplementation(async (nome: string) => {
      if (!bancos.has(nome)) bancos.set(nome, new Database(':memory:'));
      return criarAdaptador(bancos.get(nome)!);
    });
  });

  it('cria, edita e exclui metas sem conta no banco local', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    expect(await buscarMeta(id)).toMatchObject({ objetivo: 'Viagem', sync_status: 'pendente' });

    await editarMeta(id, {
      objetivo: 'Viagem longa',
      tipo: 'investimento',
      valorAlvoCentavos: 150_000,
      prazo: '2028-01-31',
    });
    expect(await buscarMeta(id)).toMatchObject({
      objetivo: 'Viagem longa',
      valor_alvo_centavos: 150_000,
    });

    await excluirMeta(id);
    expect(await buscarMeta(id)).toBeNull();
  });

  it('aplica a migração 008 e isola as metas de A e B', async () => {
    mockUsuario = { uid: 'A', emailVerified: true };
    const dbA = await getDb();
    expect(await getDbDoDono('A')).toBe(dbA);

    mockUsuario = { uid: 'B', emailVerified: true };
    const dbB = await getDb();
    expect(dbB).not.toBe(dbA);

    for (const db of [dbA, dbB]) {
      expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({
        user_version: VERSAO_ESQUEMA,
      });
      expect(
        await db.getFirstAsync(
          "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'metas'",
        ),
      ).toEqual({ n: 1 });
    }

    await dbA.runAsync(
      `INSERT INTO metas
        (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status, excluido_em, criado_em, atualizado_em)
       VALUES ('m1', 'Viagem', 'investimento', 100000, '2027-12-31', 'pendente', NULL, 't', 't')`,
    );

    expect(await dbA.getFirstAsync('SELECT COUNT(*) AS n FROM metas')).toEqual({ n: 1 });
    expect(await dbB.getFirstAsync('SELECT COUNT(*) AS n FROM metas')).toEqual({ n: 0 });
  });
});
