
import * as SQLite from 'expo-sqlite';
import { ESQUEMA_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Base local principal (RN06, RNF34). Abre uma única vez. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = abrir().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }

  return dbPromise;
}

/** Cria o esquema e atualiza bancos de versões anteriores. */
async function abrir() {
  const db = await SQLite.openDatabaseAsync('unicash.db');

  await db.execAsync(ESQUEMA_SQL);
  await migrarRecorrencias(db);

  return db;
}

/** Atualiza a estrutura da tabela de recorrências sem perder dados. */
async function migrarRecorrencias(db: SQLite.SQLiteDatabase) {
  const colunas = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(recorrencias)',
  );

  const existentes = new Set(colunas.map((coluna) => coluna.name));

  if (!existentes.has('tipo')) {
    await db.execAsync(`
      ALTER TABLE recorrencias
      ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita'
      CHECK (tipo IN ('receita', 'despesa'))
    `);
  }

  if (!existentes.has('categoria_id')) {
    await db.execAsync(
      'ALTER TABLE recorrencias ADD COLUMN categoria_id TEXT',
    );
  }

  if (!existentes.has('fixa_ou_variavel')) {
    await db.execAsync(`
      ALTER TABLE recorrencias
      ADD COLUMN fixa_ou_variavel TEXT CHECK (
        fixa_ou_variavel IS NULL OR
        fixa_ou_variavel IN ('fixa', 'variavel')
      )
    `);
  }

  if (!existentes.has('essencial')) {
    await db.execAsync(`
      ALTER TABLE recorrencias
      ADD COLUMN essencial INTEGER CHECK (
        essencial IS NULL OR essencial IN (0, 1)
      )
    `);
  }
}
