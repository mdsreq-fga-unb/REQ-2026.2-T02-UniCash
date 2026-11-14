import { getDb } from '@/db/database';

/** Quantidade de registros (inclusive exclusões) aguardando sincronização. */
export async function contarPendentes(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM receitas WHERE sync_status = 'pendente'");
  return r?.n ?? 0;
}
