import type { SQLiteDatabase } from 'expo-sqlite';

export type TipoRegistroPendente = 'categoria' | 'despesa' | 'recorrencia';

export interface PendenteRestauracao {
  tipo: TipoRegistroPendente;
  id: string;
  categoriaId: string | null;
  motivo: string;
  payload: string;
  atualizadoEm: string;
  registradoEm: string;
}

export interface EntradaPendente {
  tipo: TipoRegistroPendente;
  id: string;
  categoriaId?: string | null;
  motivo: string;
  payload: unknown;
  atualizadoEm: string;
  registradoEm?: string;
}

const ORDEM_TIPO = `CASE tipo
  WHEN 'categoria' THEN 0
  WHEN 'recorrencia' THEN 1
  ELSE 2
END`;

/**
 * Registra (ou atualiza) um documento remoto na fila de restauração adiada.
 * Só substitui o payload existente quando a versão remota é igual ou mais nova;
 * um documento antigo nunca sobrescreve um snapshot mais recente.
 */
export async function registrarPendente(
  db: SQLiteDatabase,
  entrada: EntradaPendente,
): Promise<void> {
  const registradoEm = entrada.registradoEm ?? new Date().toISOString();
  await db.runAsync(
    `INSERT INTO restauracao_pendente
       (tipo, id, categoria_id, motivo, payload, atualizado_em, registrado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tipo, id) DO UPDATE SET
       categoria_id = excluded.categoria_id,
       motivo = excluded.motivo,
       payload = excluded.payload,
       atualizado_em = excluded.atualizado_em,
       registrado_em = excluded.registrado_em
     WHERE excluded.atualizado_em >= restauracao_pendente.atualizado_em`,
    [
      entrada.tipo,
      entrada.id,
      entrada.categoriaId ?? null,
      entrada.motivo,
      JSON.stringify(entrada.payload),
      entrada.atualizadoEm,
      registradoEm,
    ],
  );
}

export async function removerPendente(
  db: SQLiteDatabase,
  tipo: TipoRegistroPendente,
  id: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM restauracao_pendente WHERE tipo = ? AND id = ?',
    [tipo, id],
  );
}

export async function listarPendentes(
  db: SQLiteDatabase,
  tipos?: TipoRegistroPendente[],
): Promise<PendenteRestauracao[]> {
  const filtro =
    tipos && tipos.length > 0
      ? `WHERE tipo IN (${tipos.map(() => '?').join(', ')})`
      : '';
  const linhas = await db.getAllAsync<{
    tipo: TipoRegistroPendente;
    id: string;
    categoria_id: string | null;
    motivo: string;
    payload: string;
    atualizado_em: string;
    registrado_em: string;
  }>(
    `SELECT tipo, id, categoria_id, motivo, payload, atualizado_em, registrado_em
       FROM restauracao_pendente
       ${filtro}
       ORDER BY ${ORDEM_TIPO}, atualizado_em, id`,
    tipos ?? [],
  );

  return linhas.map((l) => ({
    tipo: l.tipo,
    id: l.id,
    categoriaId: l.categoria_id,
    motivo: l.motivo,
    payload: l.payload,
    atualizadoEm: l.atualizado_em,
    registradoEm: l.registrado_em,
  }));
}

export async function contarPendentes(db: SQLiteDatabase): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM restauracao_pendente',
  );
  return r?.n ?? 0;
}
