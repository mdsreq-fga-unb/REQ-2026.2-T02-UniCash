import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from '@/db/database';
import { auth } from '@/lib/firebase';
import { LIMIARES_ALERTA } from './config';

export type TipoAlerta = 'aproximacao' | 'ultrapassagem';

export interface Alerta {
  tipo: TipoAlerta;
  ref_id: string;
  periodo: string;
  categoria_nome: string;
  gasto_centavos: number;
  limite_centavos: number;
  emitido_em: string | null;
  proprietario_uid: string | null;
}

interface Consumo {
  ref_id: string;
  periodo: string;
  categoria_nome: string;
  gasto_centavos: number;
  limite_centavos: number | null;
  limite_percentual_centesimos: number | null;
  renda_centavos: number;
}

type Escopo = 'despesas' | 'receitas' | 'categorias';

export async function alertasAtivos(db: SQLiteDatabase) {
  const preferencia = await db.getFirstAsync<{ ativo: number }>(
    'SELECT ativo FROM preferencias_alertas WHERE id = 1',
  );
  return preferencia?.ativo !== 0;
}

export async function definirAlertasAtivos(ativo: boolean) {
  const db = await getDb();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO preferencias_alertas (id, ativo) VALUES (1, ?)
       ON CONFLICT (id) DO UPDATE SET ativo = excluded.ativo`,
      [Number(ativo)],
    );
    if (!ativo) await tx.runAsync('DELETE FROM alertas WHERE emitido_em IS NULL');
  });
}

async function consumos(tx: SQLiteDatabase, escopo: Escopo) {
  return tx.getAllAsync<Consumo>(
    `WITH gastos AS (
       SELECT d.categoria_id, substr(d.data, 1, 7) AS periodo, SUM(d.valor_centavos) AS total
         FROM despesas d
         JOIN categorias c ON c.id = d.categoria_id
        WHERE d.excluido_em IS NULL AND c.excluido_em IS NULL AND c.limite_tipo IS NOT NULL
          AND (? <> 'receitas' OR c.limite_tipo = 'percentual_renda')
        GROUP BY d.categoria_id, substr(d.data, 1, 7)
     ), rendas AS (
       SELECT substr(data, 1, 7) AS periodo, SUM(valor_centavos) AS total
         FROM receitas WHERE excluido_em IS NULL GROUP BY substr(data, 1, 7)
     )
     SELECT c.id AS ref_id, g.periodo, c.nome AS categoria_nome, g.total AS gasto_centavos,
            c.limite_centavos, c.limite_percentual_centesimos, COALESCE(r.total, 0) AS renda_centavos
       FROM gastos g
       JOIN categorias c ON c.id = g.categoria_id
       LEFT JOIN rendas r ON r.periodo = g.periodo AND c.limite_tipo = 'percentual_renda'`,
    [escopo],
  );
}

function classificar(consumo: Consumo): { tipo: TipoAlerta; limite: number } | null {
  const escala = 10_000n;
  const limite = consumo.limite_centavos === null
    ? BigInt(consumo.renda_centavos) * BigInt(consumo.limite_percentual_centesimos ?? 0)
    : BigInt(consumo.limite_centavos) * escala;
  if (limite <= 0n) return null;

  const gasto = BigInt(consumo.gasto_centavos) * escala * escala;
  const limiteExibido = Math.max(1, Number((limite + escala / 2n) / escala));
  if (gasto > limite * LIMIARES_ALERTA.ultrapassagem) {
    return { tipo: 'ultrapassagem', limite: limiteExibido };
  }
  if (gasto >= limite * LIMIARES_ALERTA.aproximacao) {
    return { tipo: 'aproximacao', limite: limiteExibido };
  }
  return null;
}

const chaveConsumo = (consumo: Consumo) => JSON.stringify([consumo.ref_id, consumo.periodo]);

/** Reavalia apenas as combinações categoria/mês que mudaram na operação. */
export async function comRecalculoDeAlertas<T>(
  tx: SQLiteDatabase,
  escopo: Escopo,
  alterar: (tx: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  if (!(await alertasAtivos(tx))) return alterar(tx);

  const antes = new Map((await consumos(tx, escopo)).map((linha) => [chaveConsumo(linha), linha]));
  const resultado = await alterar(tx);
  const alterados = (await consumos(tx, escopo)).flatMap((consumo) => {
    const chave = chaveConsumo(consumo);
    const anterior = antes.get(chave);
    antes.delete(chave);
    return anterior && JSON.stringify(anterior) === JSON.stringify(consumo) ? [] : [{ consumo, anterior }];
  });
  if (!alterados.length && !antes.size) return resultado;

  const uid = auth.currentUser?.uid ?? null;

  for (const { consumo, anterior } of alterados) {
    const faixa = classificar(consumo);
    const anteriorFaixa = anterior && classificar(anterior);
    await tx.runAsync(
      `DELETE FROM alertas WHERE ref_id = ? AND periodo = ? AND emitido_em IS NULL
        AND tipo IS NOT ? AND (proprietario_uid IS NULL OR proprietario_uid = ?)`,
      [consumo.ref_id, consumo.periodo, faixa?.tipo ?? null, uid],
    );
    if (!faixa) continue;

    const dados = [consumo.categoria_nome, consumo.gasto_centavos, faixa.limite];
    if (anteriorFaixa?.tipo === faixa.tipo || anteriorFaixa?.tipo === 'ultrapassagem') {
      await tx.runAsync(
        `UPDATE alertas SET categoria_nome = ?, gasto_centavos = ?, limite_centavos = ?
          WHERE tipo = ? AND ref_id = ? AND periodo = ? AND emitido_em IS NULL
            AND (proprietario_uid IS NULL OR proprietario_uid = ?)`,
        [...dados, faixa.tipo, consumo.ref_id, consumo.periodo, uid],
      );
    } else {
      await tx.runAsync(
        `INSERT INTO alertas
           (tipo, ref_id, periodo, categoria_nome, gasto_centavos, limite_centavos, proprietario_uid)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (tipo, ref_id, periodo) DO NOTHING`,
        [faixa.tipo, consumo.ref_id, consumo.periodo, ...dados, uid],
      );
    }
  }

  for (const removido of antes.values()) {
    await tx.runAsync(
      `DELETE FROM alertas WHERE ref_id = ? AND periodo = ? AND emitido_em IS NULL
        AND (proprietario_uid IS NULL OR proprietario_uid = ?)`,
      [removido.ref_id, removido.periodo, uid],
    );
  }
  return resultado;
}
