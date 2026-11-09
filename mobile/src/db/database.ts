import * as SQLite from 'expo-sqlite';
import { ESQUEMA_SQL } from './schema';

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
  await db.execAsync(ESQUEMA_SQL);
  return db;
}
