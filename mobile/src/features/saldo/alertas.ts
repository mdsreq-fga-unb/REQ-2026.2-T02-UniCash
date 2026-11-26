import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';

export type AlertaSaldo = {
  id: string;
  mes: string;
  anterior_centavos: number;
  saldo_centavos: number;
  criado_em: string;
};

function saldosPorMes(db: SQLiteDatabase) {
  return db.getAllAsync<{ mes: string; saldo: number }>(`
    WITH referencia AS (
      SELECT COALESCE((SELECT mes_referencia || '-01' FROM saldo_inicial WHERE id = 1), '') AS inicio
    ), lancamentos AS (
      SELECT data, valor_centavos AS valor FROM receitas
      WHERE excluido_em IS NULL AND data >= (SELECT inicio FROM referencia)
      UNION ALL
      SELECT data, -valor_centavos AS valor FROM despesas
      WHERE excluido_em IS NULL AND data >= (SELECT inicio FROM referencia)
    )
    SELECT substr(data, 1, 7) AS mes, SUM(valor) AS saldo
    FROM lancamentos
    GROUP BY substr(data, 1, 7)
  `);
}

/** Compara os meses com lançamentos antes e depois da operação, incluindo alterações em séries. */
export async function registrarTransicoes<T>(tx: SQLiteDatabase, alterar: () => Promise<T>) {
  const antes = new Map((await saldosPorMes(tx)).map(({ mes, saldo }) => [mes, saldo]));
  const resultado = await alterar();
  for (const { mes, saldo } of await saldosPorMes(tx)) {
    const anterior = antes.get(mes) ?? 0;
    if (anterior >= 0 && saldo < 0) {
      await tx.runAsync(
        `INSERT INTO alertas_emitidos (id, mes, anterior_centavos, saldo_centavos, criado_em, transicao)
         SELECT lower(hex(randomblob(16))), ?, ?, ?, ?, COALESCE(MAX(transicao), 0) + 1
         FROM alertas_emitidos WHERE mes = ?`,
        [mes, anterior, saldo, new Date().toISOString(), mes],
      );
    }
  }
  return resultado;
}

export async function consultarAlertas() {
  const db = await getDb();
  return db.getAllAsync<AlertaSaldo>(
    'SELECT * FROM alertas_emitidos WHERE lido = 0 ORDER BY criado_em, rowid',
  );
}

export async function dispensarAlerta(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE alertas_emitidos SET lido = 1 WHERE id = ?', [id]);
}
