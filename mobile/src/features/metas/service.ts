import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { gerarId } from '@/features/receitas/service';
import type { Meta, MetaInput } from './types';
import {
  EntradaMetaInvalida,
  MSG_META,
  validarDadosMeta,
} from './validation';

/** Meta inexistente ou já excluída. */
export class MetaIndisponivel extends Error {
  constructor() {
    super(MSG_META.indisponivel);
    this.name = 'MetaIndisponivel';
  }
}

/** Falha ao ler da base local. */
export class FalhaLeituraMeta extends Error {}

/** Falha ao gravar/recalcular; a transação reverteu e nada foi alterado. */
export class FalhaPersistenciaMeta extends Error {}

const agora = () => new Date().toISOString();

async function transacao<T>(fn: (tx: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    let resultado!: T;
    await db.withExclusiveTransactionAsync(async (tx) => {
      resultado = await fn(tx as unknown as SQLiteDatabase);
    });
    return resultado;
  } catch (e) {
    if (e instanceof MetaIndisponivel) throw e;
    if (e instanceof EntradaMetaInvalida) throw e;
    throw new FalhaPersistenciaMeta(String(e));
  }
}

async function leitura<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaLeituraMeta(String(e));
  }
}

/** Cria uma meta local; só resolve após o commit (RN11, RNF05). */
export function criarMeta(input: MetaInput): Promise<string> {
  return transacao(async (tx) => {
    const dados = validarDadosMeta(input);
    const id = gerarId();
    const ts = agora();
    await tx.runAsync(
      `INSERT INTO metas
        (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status,
         excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, 'pendente', NULL, ?, ?)`,
      [id, dados.objetivo, dados.tipo, dados.valorAlvoCentavos, dados.prazo, ts, ts],
    );
    return id;
  });
}

/** Lista metas ativas por prazo (as mais próximas primeiro). */
export function listarMetas(): Promise<Meta[]> {
  return leitura(async (db) =>
    db.getAllAsync<Meta>(
      `SELECT * FROM metas
        WHERE excluido_em IS NULL
        ORDER BY prazo ASC, criado_em ASC, id ASC`,
    ),
  );
}

/** Busca uma meta ativa; retorna null se não existir ou estiver excluída. */
export function buscarMeta(id: string): Promise<Meta | null> {
  return leitura(async (db) =>
    db.getFirstAsync<Meta>(
      'SELECT * FROM metas WHERE id = ? AND excluido_em IS NULL',
      [id],
    ),
  );
}

/** Edita uma meta ativa e marca como pendente de sincronização. */
export function editarMeta(id: string, input: MetaInput): Promise<void> {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Meta>(
      'SELECT * FROM metas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new MetaIndisponivel();

    const dados = validarDadosMeta(input);
    await tx.runAsync(
      `UPDATE metas
          SET objetivo = ?, tipo = ?, valor_alvo_centavos = ?, prazo = ?,
              sync_status = 'pendente', atualizado_em = ?
        WHERE id = ? AND excluido_em IS NULL`,
      [
        dados.objetivo,
        dados.tipo,
        dados.valorAlvoCentavos,
        dados.prazo,
        agora(),
        id,
      ],
    );
  });
}

/**
 * Exclusão lógica (tombstone). Nenhuma tabela de lançamentos é tocada: a
 * associação entre metas e lançamentos ainda depende da issue #106.
 */
export function excluirMeta(id: string): Promise<void> {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Meta>(
      'SELECT * FROM metas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new MetaIndisponivel();

    const ts = agora();
    await tx.runAsync(
      `UPDATE metas
          SET excluido_em = ?, sync_status = 'pendente', atualizado_em = ?
        WHERE id = ? AND excluido_em IS NULL`,
      [ts, ts, id],
    );
  });
}

/** Quantidade de metas (inclusive tombstones) aguardando sincronização. */
export function contarPendentesMetas(): Promise<number> {
  return leitura(async (db) => {
    const r = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM metas WHERE sync_status = 'pendente'",
    );
    return r?.n ?? 0;
  });
}
