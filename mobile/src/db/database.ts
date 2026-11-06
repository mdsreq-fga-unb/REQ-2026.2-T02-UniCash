import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Base local principal (RN06, RNF34). Abre uma única vez e cria o esquema. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = abrir().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function abrir() {
  const db = await SQLite.openDatabaseAsync('unicash.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recorrencias (
      id TEXT PRIMARY KEY NOT NULL,
      intervalo INTEGER NOT NULL CHECK (intervalo > 0),
      unidade TEXT NOT NULL CHECK (unidade IN ('dia','mes','ano')),
      inicio TEXT NOT NULL,
      termino TEXT,
      ativa INTEGER NOT NULL DEFAULT 1,
      valor_centavos INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receitas (
      id TEXT PRIMARY KEY NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      recorrencia_id TEXT REFERENCES recorrencias(id),
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      excluido_em TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
    CREATE INDEX IF NOT EXISTS idx_receitas_recorrencia ON receitas(recorrencia_id);
    CREATE INDEX IF NOT EXISTS idx_receitas_sync ON receitas(sync_status);
  `);
  return db;
}
