import type { SQLiteDatabase } from 'expo-sqlite';
import type { Selo } from './types';

export type Desbloqueio = Pick<Selo, 'chave' | 'data'>;

export function dataMaisAntiga(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  return a < b ? a : b;
}

export function lerHistorico(db: SQLiteDatabase): Promise<Desbloqueio[]> {
  return db.getAllAsync<Desbloqueio>('SELECT chave, data FROM conquistas_historico');
}

/** Guarda o primeiro desbloqueio e melhora a data somente quando houver evidência anterior. */
export async function registrarDesbloqueio(db: SQLiteDatabase, { chave, data }: Desbloqueio): Promise<boolean> {
  const resultado = await db.runAsync(
    `INSERT INTO conquistas_historico (chave, data) VALUES (?, ?)
     ON CONFLICT (chave) DO UPDATE SET data = excluded.data
     WHERE excluded.data IS NOT NULL
       AND (conquistas_historico.data IS NULL OR excluded.data < conquistas_historico.data)`,
    [chave, data],
  );
  return resultado.changes > 0;
}
