import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { hojeISO } from '@/features/receitas/dates';
import { gerarId } from '@/features/receitas/service';
import { notificarAlteracaoMeta } from './integracoes';
import type { Meta, MetaInput } from './types';
import {
  derivarInicioDeCriadoEm,
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

/** Categoria escolhida para a meta não está ativa. */
export class CategoriaMetaIndisponivel extends Error {
  constructor() {
    super(MSG_META.categoriaIndisponivel);
    this.name = 'CategoriaMetaIndisponivel';
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
    if (e instanceof CategoriaMetaIndisponivel) throw e;
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

async function exigirCategoriaAtiva(tx: SQLiteDatabase, categoriaId: string): Promise<void> {
  const categoria = await tx.getFirstAsync<{ id: string }>(
    'SELECT id FROM categorias WHERE id = ? AND excluido_em IS NULL',
    [categoriaId],
  );
  if (!categoria) throw new CategoriaMetaIndisponivel();
}

/** Cria uma meta local; só resolve após o commit. */
export async function criarMeta(input: MetaInput): Promise<string> {
  const id = await transacao(async (tx) => {
    const dados = validarDadosMeta(input);
    if (dados.tipo === 'gasto') await exigirCategoriaAtiva(tx, dados.categoriaId!);

    const inicio = hojeISO();
    if (inicio > dados.prazo) throw new EntradaMetaInvalida(MSG_META.prazoAntesInicio);

    const id = gerarId();
    const ts = agora();
    const valorAcumulado = dados.tipo === 'investimento' ? dados.valorAcumuladoCentavos : null;
    const acumuladoAtualizadoEm = valorAcumulado === null ? null : ts;

    await tx.runAsync(
      `INSERT INTO metas
        (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
         valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
         excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NULL, ?, ?)`,
      [
        id,
        dados.objetivo,
        dados.tipo,
        dados.valorAlvoCentavos,
        dados.prazo,
        inicio,
        dados.categoriaId,
        valorAcumulado,
        acumuladoAtualizadoEm,
        ts,
        ts,
      ],
    );
    return id;
  });

  await notificarAlteracaoMeta({ tipo: 'criada', metaId: id });
  return id;
}

/** Lista metas ativas por prazo, com o nome da categoria quando houver. */
export function listarMetas(): Promise<Meta[]> {
  return leitura(async (db) =>
    db.getAllAsync<Meta>(
      `SELECT m.*, c.nome AS categoria_nome,
              c.excluido_em AS categoria_excluida_em
         FROM metas m
         LEFT JOIN categorias c ON c.id = m.categoria_id
        WHERE m.excluido_em IS NULL
        ORDER BY m.prazo ASC, m.criado_em ASC, m.id ASC`,
    ),
  );
}

/** Busca uma meta ativa; retorna null se não existir ou estiver excluída. */
export function buscarMeta(id: string): Promise<Meta | null> {
  return leitura(async (db) =>
    db.getFirstAsync<Meta>(
      `SELECT m.*, c.nome AS categoria_nome,
              c.excluido_em AS categoria_excluida_em
         FROM metas m
         LEFT JOIN categorias c ON c.id = m.categoria_id
        WHERE m.id = ? AND m.excluido_em IS NULL`,
      [id],
    ),
  );
}

/**
 * Edita uma meta ativa e marca como pendente de sincronização.
 * O tipo é imutável. A categoria de gasto precisa estar ativa; o valor
 * acumulado de investimento pode ser nulo, zero, reduzido ou ampliado.
 */
export async function editarMeta(id: string, input: MetaInput): Promise<void> {
  await transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Meta>(
      'SELECT * FROM metas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new MetaIndisponivel();

    const dados = validarDadosMeta(input, { tipoAtual: atual.tipo });
    if (dados.tipo === 'gasto') await exigirCategoriaAtiva(tx, dados.categoriaId!);

    // Legado sem início: usa a data de criação quando válida; se nem ela
    // existir, a edição estabelece o início atual para permitir o cálculo.
    const inicio = atual.inicio ?? derivarInicioDeCriadoEm(atual.criado_em) ?? hojeISO();
    if (inicio > dados.prazo) throw new EntradaMetaInvalida(MSG_META.prazoAntesInicio);

    const ts = agora();
    const valorAcumulado = dados.tipo === 'investimento' ? dados.valorAcumuladoCentavos : null;
    const acumuladoMudou = valorAcumulado !== atual.valor_acumulado_centavos;
    const acumuladoAtualizadoEm =
      valorAcumulado === null
        ? null
        : acumuladoMudou || !atual.valor_acumulado_atualizado_em
          ? ts
          : atual.valor_acumulado_atualizado_em;

    await tx.runAsync(
      `UPDATE metas
          SET objetivo = ?, tipo = ?, valor_alvo_centavos = ?, prazo = ?,
              inicio = ?, categoria_id = ?, valor_acumulado_centavos = ?,
              valor_acumulado_atualizado_em = ?, sync_status = 'pendente',
              atualizado_em = ?
        WHERE id = ? AND excluido_em IS NULL`,
      [
        dados.objetivo,
        dados.tipo,
        dados.valorAlvoCentavos,
        dados.prazo,
        inicio,
        dados.categoriaId,
        valorAcumulado,
        acumuladoAtualizadoEm,
        ts,
        id,
      ],
    );
  });

  await notificarAlteracaoMeta({ tipo: 'editada', metaId: id });
}

/**
 * Exclusão lógica (tombstone). Nenhuma tabela de lançamentos é tocada; a
 * associação entre metas e lançamentos é derivada da categoria e do período.
 */
export async function excluirMeta(id: string): Promise<void> {
  await transacao(async (tx) => {
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

  await notificarAlteracaoMeta({ tipo: 'excluida', metaId: id });
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
