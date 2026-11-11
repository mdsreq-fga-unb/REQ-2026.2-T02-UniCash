import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { gerarId } from '@/features/receitas/service';
import type { Categoria, CategoriaComContagem, CategoriaInput } from './types';
import { CATEGORIAS_PADRAO } from './types';

/** Falha ao gravar/recalcular (EX03): nada foi alterado, pois a transação foi revertida. */
export class FalhaPersistenciaCategoria extends Error {}
/** Categoria inexistente ou já excluída (EX06). */
export class CategoriaIndisponivel extends Error {}
/** Falha ao ler da base local (EX08). */
export class FalhaLeituraCategoria extends Error {}
/** Nome duplicado (EX07). */
export class NomeDuplicado extends Error {}
/** Ação proibida em categoria padrão (EX02). */
export class CategoriaPadraoProtegida extends Error {}

const agora = () => new Date().toISOString();

function normalizar(nome: string): string {
  return nome.trim().toLowerCase();
}

/** Operação composta numa única transação; só resolve após o commit (RN11, RNF05, RNF35). */
async function transacao<T>(fn: (tx: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    let resultado!: T;
    await db.withExclusiveTransactionAsync(async (tx) => {
      resultado = await fn(tx as unknown as SQLiteDatabase);
    });
    return resultado;
  } catch (e) {
    if (e instanceof CategoriaIndisponivel) throw e;
    if (e instanceof NomeDuplicado) throw e;
    if (e instanceof CategoriaPadraoProtegida) throw e;
    throw new FalhaPersistenciaCategoria(String(e));
  }
}

async function leitura<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaLeituraCategoria(String(e));
  }
}

// ---------------------------------------------------------------- semeadura

/** Semeia as categorias padrão no primeiro uso (RN13). Idempotente. */
export function semearCategoriasPadrao() {
  return transacao(async (tx) => {
    const existente = await tx.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categorias',
    );
    if (existente && existente.n > 0) return;

    const ts = agora();
    for (const nome of CATEGORIAS_PADRAO) {
      await tx.runAsync(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos, limite_percentual_centesimos,
           sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, 1, NULL, NULL, NULL, 'pendente', NULL, ?, ?)`,
        [gerarId(), nome, normalizar(nome), ts, ts],
      );
    }
  });
}

// ---------------------------------------------------------------- consultas

/** Lista todas as categorias ativas, com contagem de lançamentos (stub = 0 enquanto UC02 não existe). */
export function listarCategorias() {
  return leitura(async (db) => {
    // Quando a tabela de despesas existir, trocar por LEFT JOIN + COUNT.
    const itens = await db.getAllAsync<CategoriaComContagem>(
      `SELECT c.*, 0 AS total_lancamentos
       FROM categorias c
       WHERE c.excluido_em IS NULL
       ORDER BY c.padrao DESC, c.nome ASC`,
    );
    return itens;
  });
}

export function buscarCategoria(id: string) {
  return leitura(async (db) => {
    return db.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
  });
}

// ---------------------------------------------------------------- criar (B)

export function criarCategoria(input: CategoriaInput) {
  return transacao(async (tx) => {
    const nomeNorm = normalizar(input.nome);

    // Verificar unicidade (RN13) — case-insensitive via nome_normalizado
    const existente = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM categorias WHERE nome_normalizado = ? AND excluido_em IS NULL',
      [nomeNorm],
    );
    if (existente) throw new NomeDuplicado();

    const ts = agora();
    const id = gerarId();
    await tx.runAsync(
      `INSERT INTO categorias
        (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos, limite_percentual_centesimos,
         sync_status, excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, 0, ?, ?, ?, 'pendente', NULL, ?, ?)`,
      [
        id,
        input.nome.trim(),
        nomeNorm,
        input.limite?.tipo ?? null,
        input.limite?.tipo === 'valor' ? (input.limite?.valor ?? null) : null,
        input.limite?.tipo === 'percentual_renda' ? (input.limite?.valor ?? null) : null,
        ts,
        ts,
      ],
    );
    return id;
  });
}

// ---------------------------------------------------------------- editar (C)

/**
 * Edita uma categoria.
 * - Categoria padrão: só o limite pode ser alterado (RN13, RN14). O nome é ignorado.
 * - Categoria própria: nome e limite podem mudar.
 */
export function editarCategoria(id: string, input: CategoriaInput) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new CategoriaIndisponivel();

    const ts = agora();

    if (atual.padrao) {
      // Categoria padrão: só altera o limite
      await tx.runAsync(
        `UPDATE categorias SET
           limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
           sync_status = 'pendente', atualizado_em = ?
         WHERE id = ?`,
        [
          input.limite?.tipo ?? null,
          input.limite?.tipo === 'valor' ? (input.limite?.valor ?? null) : null,
          input.limite?.tipo === 'percentual_renda' ? (input.limite?.valor ?? null) : null,
          ts,
          id,
        ],
      );
      return;
    }

    // Categoria própria: verificar unicidade do novo nome
    const nomeNorm = normalizar(input.nome);
    if (nomeNorm !== atual.nome_normalizado) {
      const existente = await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM categorias WHERE nome_normalizado = ? AND excluido_em IS NULL AND id <> ?',
        [nomeNorm, id],
      );
      if (existente) throw new NomeDuplicado();
    }

    await tx.runAsync(
      `UPDATE categorias SET
         nome = ?, nome_normalizado = ?,
         limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
         sync_status = 'pendente', atualizado_em = ?
       WHERE id = ?`,
      [
        input.nome.trim(),
        nomeNorm,
        input.limite?.tipo ?? null,
        input.limite?.tipo === 'valor' ? (input.limite?.valor ?? null) : null,
        input.limite?.tipo === 'percentual_renda' ? (input.limite?.valor ?? null) : null,
        ts,
        id,
      ],
    );
  });
}

// ---------------------------------------------------------------- excluir (D)

/**
 * Exclui uma categoria (tombstone).
 * - Categoria padrão: proibido (EX02).
 * - Na mesma transação: marca a categoria como excluída (tombstone),
 *   define categoria_id = NULL nas despesas dela (quando a tabela existir),
 *   e remove limite (RN13).
 */
export function excluirCategoria(id: string) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new CategoriaIndisponivel();
    if (atual.padrao) throw new CategoriaPadraoProtegida();

    const ts = agora();

    // Tombstone: a exclusão precisa chegar à nuvem.
    await tx.runAsync(
      `UPDATE categorias SET
         excluido_em = ?, limite_tipo = NULL, limite_centavos = NULL,
         limite_percentual_centesimos = NULL,
         sync_status = 'pendente', atualizado_em = ?
       WHERE id = ?`,
      [ts, ts, id],
    );

    // TODO (UC02): quando a tabela de despesas existir, executar:
    // UPDATE despesas SET categoria_id = NULL, sync_status = 'pendente', atualizado_em = ?
    //   WHERE categoria_id = ? AND excluido_em IS NULL
  });
}

// ---------------------------------------------------------------- contadores

export function contarPendentesCategorias() {
  return leitura(async (db) => {
    const r = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM categorias WHERE sync_status = 'pendente'",
    );
    return r?.n ?? 0;
  });
}
