import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { gerarId } from '@/features/receitas/service';
import type { Categoria, CategoriaInput } from './types';
import { CATEGORIAS_PADRAO } from './types';
import { MSG_CAT, EntradaCategoriaInvalida, normalizarNome, validarDadosCategoria } from './validation';

/** Falha ao gravar/recalcular (EX03): nada foi alterado, pois a transação foi revertida. */
export class FalhaPersistenciaCategoria extends Error {}
/** Categoria inexistente ou já excluída (EX06). */
export class CategoriaIndisponivel extends Error {
  constructor() {
    super(MSG_CAT.indisponivel);
    this.name = 'CategoriaIndisponivel';
  }
}
/** Falha ao ler da base local (EX08). */
export class FalhaLeituraCategoria extends Error {}
/** Nome duplicado (EX07). */
export class NomeDuplicado extends Error {
  constructor() {
    super(MSG_CAT.nomeDuplicado);
    this.name = 'NomeDuplicado';
  }
}
/** Ação proibida em categoria padrão (EX02). */
export class CategoriaPadraoProtegida extends Error {
  constructor() {
    super(MSG_CAT.categoriaPadrao);
    this.name = 'CategoriaPadraoProtegida';
  }
}

/**
 * Nome reservado aos sete padrões já pertence a categoria própria ativa (RN13).
 * A semeadura não converte o registro nem cria duplicata — aborta e reverte.
 */
export class NomeReservadoCategoriasPadrao extends Error {
  constructor(nomes: string[]) {
    super(
      `Semeadura abortada: nomes reservados às categorias padrão já pertencem a categorias ` +
        `próprias ativas (${nomes.join(', ')}). Nada foi alterado.`,
    );
    this.name = 'NomeReservadoCategoriasPadrao';
  }
}

const agora = () => new Date().toISOString();

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
    if (e instanceof NomeReservadoCategoriasPadrao) throw e;
    if (e instanceof EntradaCategoriaInvalida) throw e;
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

/**
 * Semeia as categorias padrão (RN13). Idempotente e transacional.
 * Insere apenas os padrões ausentes — funciona mesmo quando já existem
 * categorias próprias. Tombstones de padrões são preservados; uma nova
 * categoria ativa só é criada quando não existe linha ativa com o nome.
 */
export function semearCategoriasPadrao() {
  return transacao(async (tx) => {
    const normais = CATEGORIAS_PADRAO.map(normalizarNome);
    const placeholders = normais.map(() => '?').join(', ');
    const linhas = await tx.getAllAsync<{ nome_normalizado: string; padrao: number }>(
      `SELECT nome_normalizado, padrao FROM categorias
        WHERE nome_normalizado IN (${placeholders}) AND excluido_em IS NULL`,
      normais,
    );

    // Nome reservado aos padrões pertencendo a categoria própria ativa (padrao = 0)
    // não é convertido nem duplicado: aborta e reverte a transação inteira.
    const proprias = linhas.filter((l) => l.padrao === 0).map((l) => l.nome_normalizado);
    if (proprias.length > 0) throw new NomeReservadoCategoriasPadrao(proprias);

    const ativos = new Set(linhas.map((l) => l.nome_normalizado));

    const ts = agora();
    for (let i = 0; i < CATEGORIAS_PADRAO.length; i++) {
      if (ativos.has(normais[i])) continue;
      await tx.runAsync(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos, limite_percentual_centesimos,
           sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, 1, NULL, NULL, NULL, 'pendente', NULL, ?, ?)`,
        [gerarId(), CATEGORIAS_PADRAO[i], normais[i], ts, ts],
      );
    }
  });
}

// ---------------------------------------------------------------- consultas

/**
 * Lista todas as categorias ativas. A contagem de lançamentos vinculados
 * entra com a integração UC02 (tabela de despesas) — sem valores fictícios.
 */
export function listarCategorias() {
  return leitura(async (db) => {
    const itens = await db.getAllAsync<Categoria>(
      `SELECT c.*
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
    // Revalidação de domínio no serviço: o formulário pode não ser a única porta de entrada.
    const dados = validarDadosCategoria(input.nome, input.limite);

    // Unicidade (RN13) — case-insensitive via nome_normalizado
    const existente = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM categorias WHERE nome_normalizado = ? AND excluido_em IS NULL',
      [dados.nomeNormalizado],
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
        dados.nome,
        dados.nomeNormalizado,
        dados.limite?.tipo ?? null,
        dados.limite?.tipo === 'valor' ? dados.limite.valor : null,
        dados.limite?.tipo === 'percentual_renda' ? dados.limite.valor : null,
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
 * - Categoria padrão (RN13, RN14): nome e identificação são imutáveis — um nome
 *   divergente NÃO é ignorado silenciosamente, é rejeitado; só o limite muda.
 * - Categoria própria: nome e limite podem mudar.
 */
export function editarCategoria(id: string, input: CategoriaInput) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new CategoriaIndisponivel();

    const dados = validarDadosCategoria(input.nome, input.limite);
    const ts = agora();

    if (atual.padrao) {
      if (dados.nomeNormalizado !== atual.nome_normalizado) throw new CategoriaPadraoProtegida();
      // Categoria padrão: somente o limite é alterado.
      await tx.runAsync(
        `UPDATE categorias SET
           limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
           sync_status = 'pendente', atualizado_em = ?
         WHERE id = ?`,
        [
          dados.limite?.tipo ?? null,
          dados.limite?.tipo === 'valor' ? dados.limite.valor : null,
          dados.limite?.tipo === 'percentual_renda' ? dados.limite.valor : null,
          ts,
          id,
        ],
      );
      return;
    }

    // Categoria própria: verificar unicidade do novo nome
    if (dados.nomeNormalizado !== atual.nome_normalizado) {
      const existente = await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM categorias WHERE nome_normalizado = ? AND excluido_em IS NULL AND id <> ?',
        [dados.nomeNormalizado, id],
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
        dados.nome,
        dados.nomeNormalizado,
        dados.limite?.tipo ?? null,
        dados.limite?.tipo === 'valor' ? dados.limite.valor : null,
        dados.limite?.tipo === 'percentual_renda' ? dados.limite.valor : null,
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
