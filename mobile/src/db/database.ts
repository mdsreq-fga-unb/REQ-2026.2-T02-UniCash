import * as SQLite from 'expo-sqlite';
import { PRAGMAS_SQL } from './schema';
import { migrarSeNecessario } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Base local principal (RN06, RNF34). Abre uma única vez e aplica migrações versionadas. */
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
  // PRAGMAs fora de transação: journal_mode não pode ser alterado dentro dela.
  await db.execAsync(PRAGMAS_SQL);
  // Migrações versionadas: instalação nova e bancos legados terminam consistentes
  // em VERSAO_ESQUEMA, ou a abertura falha de forma controlada (rollback total,
  // sem perda de dados). Em caso de falha, getDb() limpa o cache e a próxima
  // chamada tenta novamente — o erro deve ser tratado pela camada de interface.
  await migrarSeNecessario(db);
  return db;
}
