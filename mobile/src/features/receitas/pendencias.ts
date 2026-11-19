import { getDb } from '@/db/database';

/** Quantidade de registros (inclusive exclusões) aguardando sincronização. */
export async function contarPendentes(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>(
    `SELECT
       (SELECT COUNT(*) FROM receitas WHERE sync_status = 'pendente') +
       (SELECT COUNT(*) FROM despesas WHERE sync_status = 'pendente') AS n`,
  );
  return r?.n ?? 0;
}
