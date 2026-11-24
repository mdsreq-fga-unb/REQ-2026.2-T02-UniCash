import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { gerarId } from '@/features/receitas/service';
import type { Categoria, CategoriaInput } from './types';
import { CATEGORIAS_PADRAO } from './types';
import { MSG_CAT, EntradaCategoriaInvalida, normalizarNome, validarDadosCategoria } from './validation';
import { definirEstadoCategoria } from './estado';

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

/** Resultado explícito da semeadura: o que foi criado e o que permaneceu em conflito. */
export interface ResultadoSemeadura {
  criadas: string[];
  conflitos: string[];
}

const agora = () => new Date().toISOString();

/** Slugs provisórios da UC02 e os nomes das categorias padrão correspondentes. */
const SLUGS_UC02 = [
  { slug: 'casa', nome: 'Casa' },
  { slug: 'alimentacao', nome: 'Alimentação' },
  { slug: 'mobilidade', nome: 'Mobilidade' },
  { slug: 'estudos', nome: 'Estudos' },
  { slug: 'saude', nome: 'Saúde' },
  { slug: 'lazer', nome: 'Lazer' },
  { slug: 'reserva_financeira', nome: 'Reserva financeira' },
] as const;

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
 * Semeia as categorias padrão ausentes (RN13). Idempotente e transacional.
 *
 * Um nome reservado que já pertence a uma categoria própria ativa gera conflito
 * explícito, mas NÃO impede a criação das demais padrão. A categoria própria é
 * preservada (nome, limite, padrão e tombstone) e o conflito é devolvido para a
 * interface. A transação só é revertida se houver falha de persistência.
 */
export function semearCategoriasPadrao(): Promise<ResultadoSemeadura> {
  return transacao(async (tx) => {
    const normais = CATEGORIAS_PADRAO.map(normalizarNome);
    const placeholders = normais.map(() => '?').join(', ');
    const linhas = await tx.getAllAsync<{ nome_normalizado: string; padrao: number }>(
      `SELECT nome_normalizado, padrao FROM categorias
        WHERE nome_normalizado IN (${placeholders}) AND excluido_em IS NULL`,
      normais,
    );

    const proprias = new Set(
      linhas.filter((l) => l.padrao === 0).map((l) => l.nome_normalizado),
    );
    const ativos = new Set(linhas.map((l) => l.nome_normalizado));

    const criadas: string[] = [];
    const conflitos: string[] = [];
    const ts = agora();

    for (let i = 0; i < CATEGORIAS_PADRAO.length; i++) {
      const normalizado = normais[i];
      if (proprias.has(normalizado)) {
        // Categoria própria ativa com nome reservado: preservar e reportar.
        conflitos.push(CATEGORIAS_PADRAO[i]);
        continue;
      }
      if (ativos.has(normalizado)) continue; // padrão já existe

      const id = gerarId();
      await tx.runAsync(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos, limite_percentual_centesimos,
           sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, 1, NULL, NULL, NULL, 'pendente', NULL, ?, ?)`,
        [id, CATEGORIAS_PADRAO[i], normalizado, ts, ts],
      );
      await definirEstadoCategoria(tx, id, 'semeadura');
      criadas.push(CATEGORIAS_PADRAO[i]);
    }

    // Mapeia os slugs provisórios da UC02 somente quando a padrão ativa existe.
    const normaisSlugs = SLUGS_UC02.map(({ nome }) => normalizarNome(nome));
    const placeholdersSlugs = normaisSlugs.map(() => '?').join(', ');
    const padroes = await tx.getAllAsync<{ id: string; nome_normalizado: string }>(
      `SELECT id, nome_normalizado FROM categorias
        WHERE padrao = 1 AND excluido_em IS NULL
          AND nome_normalizado IN (${placeholdersSlugs})`,
      normaisSlugs,
    );
    const idPorNome = new Map(padroes.map((p) => [p.nome_normalizado, p.id]));

    for (const { slug, nome } of SLUGS_UC02) {
      const id = idPorNome.get(normalizarNome(nome));
      if (!id) continue;

      await tx.runAsync(
        `UPDATE despesas
            SET categoria_id = ?, sync_status = 'pendente', atualizado_em = ?
          WHERE categoria_id = ? AND excluido_em IS NULL`,
        [id, ts, slug],
      );
      await tx.runAsync(
        `UPDATE recorrencias
            SET categoria_id = ?, sync_status = 'pendente', atualizado_em = ?
          WHERE categoria_id = ?`,
        [id, ts, slug],
      );
    }

    return { criadas, conflitos };
  });
}

// ---------------------------------------------------------------- consultas

/**
 * Lista todas as categorias ativas com a contagem real de despesas vinculadas.
 * A contagem considera apenas despesas não excluídas (RF65).
 */
export function listarCategorias() {
  return leitura(async (db) => {
    const itens = await db.getAllAsync<Categoria>(
      `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local,
              (SELECT COUNT(*) FROM despesas d
                WHERE d.categoria_id = c.id AND d.excluido_em IS NULL) AS total_lancamentos
        FROM categorias c
        LEFT JOIN categorias_estado e ON e.categoria_id = c.id
        WHERE c.excluido_em IS NULL
        ORDER BY c.padrao DESC, c.nome ASC`,
    );
    return itens;
  });
}

export function buscarCategoria(id: string) {
  return leitura(async (db) => {
    return db.getFirstAsync<Categoria>(
      `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local,
              (SELECT COUNT(*) FROM despesas d
                WHERE d.categoria_id = c.id AND d.excluido_em IS NULL) AS total_lancamentos
         FROM categorias c
         LEFT JOIN categorias_estado e ON e.categoria_id = c.id
        WHERE c.id = ? AND c.excluido_em IS NULL`,
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
    await definirEstadoCategoria(tx, id, 'editado');
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
      await definirEstadoCategoria(tx, id, 'editado');
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
    await definirEstadoCategoria(tx, id, 'editado');
  });
}

// ---------------------------------------------------------------- excluir (D)

/**
 * Exclui uma categoria (tombstone).
 * - Categoria padrão: proibido (EX02).
 * - Na mesma transação: desvincula despesas não excluídas e séries de
 *   despesa, marca a categoria como excluída (tombstone) e remove o limite.
 */
/**
 * Aplica a exclusão lógica de uma categoria dentro de uma transação já aberta.
 * Usado tanto pela exclusão local quanto pela exclusão vinda da nuvem.
 * Preserva valores/histórico dos lançamentos; apenas remove o vínculo.
 */
export async function marcarCategoriaExcluidaNaTransacao(
  tx: SQLiteDatabase,
  id: string,
  excluidoEm: string,
  atualizadoEm: string,
  syncStatus: 'pendente' | 'sincronizado' = 'pendente',
): Promise<void> {
  await tx.runAsync(
    `UPDATE despesas SET
       categoria_id = NULL, sync_status = 'pendente', atualizado_em = ?
     WHERE categoria_id = ? AND excluido_em IS NULL`,
    [atualizadoEm, id],
  );

  await tx.runAsync(
    `UPDATE recorrencias SET
       categoria_id = NULL, sync_status = 'pendente', atualizado_em = ?
     WHERE categoria_id = ? AND tipo = 'despesa'`,
    [atualizadoEm, id],
  );

  await tx.runAsync(
    `UPDATE categorias SET
       excluido_em = ?, limite_tipo = NULL, limite_centavos = NULL,
       limite_percentual_centesimos = NULL,
       sync_status = ?, atualizado_em = ?
     WHERE id = ?`,
    [excluidoEm, syncStatus, atualizadoEm, id],
  );
  await definirEstadoCategoria(
    tx,
    id,
    syncStatus === 'sincronizado' ? 'sincronizado' : 'editado',
  );
}

export function excluirCategoria(id: string) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Categoria>(
      'SELECT * FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new CategoriaIndisponivel();
    if (atual.padrao) throw new CategoriaPadraoProtegida();

    const ts = agora();
    await marcarCategoriaExcluidaNaTransacao(tx, id, ts, ts, 'pendente');
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
