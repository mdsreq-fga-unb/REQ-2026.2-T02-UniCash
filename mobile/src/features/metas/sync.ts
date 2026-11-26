import type { SQLiteDatabase } from 'expo-sqlite';
import { doc, runTransaction } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';
import type { Meta, MetaTipo } from './types';
import {
  CAMPOS_META,
  mergeMetaRemota,
  parseCamposRevisao,
  type CampoMeta,
  type ResultadoMergeMeta,
} from './merge';
import {
  contarCaracteres,
  dataISOValida,
  tipoMetaValido,
} from './validation';

/** Payload remoto de uma meta. Nunca inclui estado local/sync_status. */
export interface MetaRemota {
  objetivo: string;
  tipo: MetaTipo;
  valor_alvo_centavos: number;
  prazo: string;
  /** Campos opcionais para compatibilidade com documentos legados. */
  inicio: string | null;
  categoria_id: string | null;
  valor_acumulado_centavos: number | null;
  valor_acumulado_atualizado_em: string | null;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Relógio lógico global do documento; ausente em legado. */
  revisao?: number;
  /** Revisão lógica por campo; ausente em legado. */
  campos_revisao?: Record<string, number> | null;
  /**
   * Documento remoto sem todos os campos da issue #106. Nesse caso, valores
   * locais já conhecidos são preservados em vez de apagados por ausência.
   */
  legado?: boolean;
}

export interface ResultadoAplicacaoMeta {
  status: 'aplicada' | 'mantida';
  remotaVenceu: boolean;
}

export interface ResultadoRestauracaoMetas {
  aplicadas: number;
  ignoradas: number;
  remotasVenceram: number;
}

const VALOR_MAXIMO_CENTAVOS = 99_999_999_999;

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor : null;
}

/**
 * Valida e normaliza um documento da coleção `metas`.
 * Campos novos ausentes são aceitos como nulos para documentos legados; campos
 * presentes mas incoerentes invalidam o documento. Retorna null para documento
 * inválido; o chamador o ignora sem inventar dados.
 */
export function normalizarMetaRemota(docId: string, dados: unknown): MetaRemota | null {
  if (!docId || !dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;

  const objetivo = texto(d.objetivo)?.trim() ?? '';
  if (!objetivo || contarCaracteres(objetivo) > 80) return null;
  if (!tipoMetaValido(d.tipo)) return null;

  const valor = d.valor_alvo_centavos;
  if (!Number.isSafeInteger(valor) || (valor as number) <= 0 || (valor as number) > VALOR_MAXIMO_CENTAVOS) {
    return null;
  }

  const prazo = texto(d.prazo);
  if (!prazo || !dataISOValida(prazo)) return null;

  let inicio: string | null = null;
  if (d.inicio != null) {
    inicio = texto(d.inicio);
    if (!inicio || !dataISOValida(inicio) || inicio > prazo) return null;
  }

  let categoriaId: string | null = null;
  if (d.categoria_id != null) {
    categoriaId = texto(d.categoria_id);
    if (!categoriaId) return null;
  }

  let valorAcumulado: number | null = null;
  if (d.valor_acumulado_centavos != null) {
    const v = d.valor_acumulado_centavos;
    if (
      !Number.isSafeInteger(v)
      || (v as number) < 0
      || (v as number) > VALOR_MAXIMO_CENTAVOS
    ) {
      return null;
    }
    valorAcumulado = v as number;
  }

  let acumuladoAtualizadoEm: string | null = null;
  if (d.valor_acumulado_atualizado_em != null) {
    acumuladoAtualizadoEm = texto(d.valor_acumulado_atualizado_em);
    if (!acumuladoAtualizadoEm) return null;
  }

  if (d.tipo === 'gasto') {
    if (valorAcumulado !== null || acumuladoAtualizadoEm !== null) return null;
  } else {
    if (categoriaId !== null) return null;
    if ((valorAcumulado === null) !== (acumuladoAtualizadoEm === null)) return null;
  }

  const criadoEm = texto(d.criado_em);
  const atualizadoEm = texto(d.atualizado_em);
  if (!criadoEm || !atualizadoEm) return null;

  const excluidoEm = d.excluido_em == null ? null : texto(d.excluido_em);
  if (d.excluido_em != null && !excluidoEm) return null;

  let revisao = 0;
  if (d.revisao != null) {
    if (!Number.isSafeInteger(d.revisao) || (d.revisao as number) < 0) return null;
    revisao = d.revisao as number;
  }

  let camposRevisao: Record<string, number> | null = null;
  if (d.campos_revisao != null) {
    if (typeof d.campos_revisao !== 'object' || Array.isArray(d.campos_revisao)) return null;
    camposRevisao = {};
    for (const [campo, valorCampo] of Object.entries(
      d.campos_revisao as Record<string, unknown>,
    )) {
      if (
        !CAMPOS_META.includes(campo as CampoMeta)
        || !Number.isSafeInteger(valorCampo)
        || (valorCampo as number) < 0
      ) {
        return null;
      }
      camposRevisao[campo] = valorCampo as number;
    }
  }

  const camposNovos = [
    'inicio',
    'categoria_id',
    'valor_acumulado_centavos',
    'valor_acumulado_atualizado_em',
  ];
  const legado = !camposNovos.every((campo) => campo in d);

  return {
    objetivo,
    tipo: d.tipo,
    valor_alvo_centavos: valor as number,
    prazo,
    inicio,
    categoria_id: categoriaId,
    valor_acumulado_centavos: valorAcumulado,
    valor_acumulado_atualizado_em: acumuladoAtualizadoEm,
    excluido_em: excluidoEm,
    criado_em: criadoEm,
    atualizado_em: atualizadoEm,
    revisao,
    campos_revisao: camposRevisao,
    legado,
  };
}

export function payloadMetaRemota(meta: Meta): MetaRemota {
  return {
    objetivo: meta.objetivo,
    tipo: meta.tipo,
    valor_alvo_centavos: meta.valor_alvo_centavos,
    prazo: meta.prazo,
    inicio: meta.inicio,
    categoria_id: meta.categoria_id,
    valor_acumulado_centavos: meta.valor_acumulado_centavos,
    valor_acumulado_atualizado_em: meta.valor_acumulado_atualizado_em,
    excluido_em: meta.excluido_em ?? null,
    criado_em: meta.criado_em,
    atualizado_em: meta.atualizado_em,
    revisao: meta.revisao ?? 0,
    campos_revisao: parseCamposRevisao(meta.campos_revisao),
  };
}

function assinaturaMeta(
  meta: Pick<
    Meta,
    | 'objetivo'
    | 'tipo'
    | 'valor_alvo_centavos'
    | 'prazo'
    | 'inicio'
    | 'categoria_id'
    | 'valor_acumulado_centavos'
    | 'valor_acumulado_atualizado_em'
    | 'excluido_em'
    | 'criado_em'
  >,
): string {
  return JSON.stringify([
    meta.objetivo,
    meta.tipo,
    meta.valor_alvo_centavos,
    meta.prazo,
    meta.inicio ?? '',
    meta.categoria_id ?? '',
    meta.valor_acumulado_centavos ?? '',
    meta.valor_acumulado_atualizado_em ?? '',
    meta.excluido_em ?? '',
    meta.criado_em,
  ]);
}

/**
 * Decide deterministicamente entre a versão local e a remota.
 * - exclusão prevalece sobre edição;
 * - maior `atualizado_em` vence;
 * - empate usa assinatura canônica simétrica.
 */
export function decidirMetaRemota(local: Meta, remota: MetaRemota): 'local' | 'remota' {
  const localExcluida = local.excluido_em != null;
  const remotaExcluida = remota.excluido_em != null;
  if (localExcluida && !remotaExcluida) return 'local';
  if (!localExcluida && remotaExcluida) return 'remota';

  // O tipo é imutável após a criação: uma versão remota que tente trocá-lo
  // não pode sobrescrever o registro local.
  if (local.tipo !== remota.tipo) return 'local';

  const comparacao = local.atualizado_em.localeCompare(remota.atualizado_em);
  if (comparacao !== 0) return comparacao > 0 ? 'local' : 'remota';

  return assinaturaMeta(local) >= assinaturaMeta(remota) ? 'local' : 'remota';
}

async function lerMetaPorId(tx: SQLiteDatabase, id: string): Promise<Meta | null> {
  return tx.getFirstAsync<Meta>('SELECT * FROM metas WHERE id = ?', [id]);
}

/** Base de sincronização local; JSON inválido/legado extremo vira null. */
export function baseDeMeta(meta: Meta): MetaRemota | null {
  if (!meta.base_sincronizacao) return null;
  try {
    return normalizarMetaRemota(meta.id, JSON.parse(meta.base_sincronizacao));
  } catch {
    return null;
  }
}

/** Snapshot remoto serializado para a base local, sem a flag transitória `legado`. */
export function serializarBaseRemota(remota: MetaRemota): string {
  const copia: Partial<MetaRemota> = { ...remota };
  delete copia.legado;
  return JSON.stringify(copia);
}

function metaComMerge(local: Meta, merge: ResultadoMergeMeta): Meta {
  return {
    ...local,
    ...merge.valores,
    sync_status: merge.sincronizado ? 'sincronizado' : 'pendente',
  };
}

/**
 * Uma meta de gasto que aponta para categoria inexistente/excluída é mantida,
 * mas sem vínculo — nunca com uma referência inválida. O progresso fica
 * indisponível até a correção pela interface.
 */
async function resolverCategoriaRemota(
  tx: SQLiteDatabase,
  remota: MetaRemota,
): Promise<MetaRemota> {
  if (remota.tipo !== 'gasto' || !remota.categoria_id) return remota;
  const ativa = await tx.getFirstAsync<{ id: string }>(
    'SELECT id FROM categorias WHERE id = ? AND excluido_em IS NULL',
    [remota.categoria_id],
  );
  return ativa ? remota : { ...remota, categoria_id: null };
}

async function inserirMetaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: MetaRemota,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO metas
      (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
       valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
       excluido_em, criado_em, atualizado_em, revisao, campos_revisao,
       base_sincronizacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?, ?, ?, ?, ?, ?)`,
    [
      docId,
      remota.objetivo,
      remota.tipo,
      remota.valor_alvo_centavos,
      remota.prazo,
      remota.inicio,
      remota.categoria_id,
      remota.valor_acumulado_centavos,
      remota.valor_acumulado_atualizado_em,
      remota.excluido_em,
      remota.criado_em,
      remota.atualizado_em,
      remota.revisao ?? 0,
      JSON.stringify(remota.campos_revisao ?? {}),
      serializarBaseRemota(remota),
    ],
  );
}

async function atualizarMetaRemota(
  tx: SQLiteDatabase,
  id: string,
  remota: MetaRemota,
): Promise<void> {
  await tx.runAsync(
    `UPDATE metas
        SET objetivo = ?, tipo = ?, valor_alvo_centavos = ?, prazo = ?,
            inicio = ?, categoria_id = ?, valor_acumulado_centavos = ?,
            valor_acumulado_atualizado_em = ?, sync_status = 'sincronizado',
            excluido_em = ?, atualizado_em = ?, revisao = ?,
            campos_revisao = ?, base_sincronizacao = ?
      WHERE id = ?`,
    [
      remota.objetivo,
      remota.tipo,
      remota.valor_alvo_centavos,
      remota.prazo,
      remota.inicio,
      remota.categoria_id,
      remota.valor_acumulado_centavos,
      remota.valor_acumulado_atualizado_em,
      remota.excluido_em,
      remota.atualizado_em,
      remota.revisao ?? 0,
      JSON.stringify(remota.campos_revisao ?? {}),
      serializarBaseRemota(remota),
      id,
    ],
  );
}

async function atualizarBaseRemota(
  tx: SQLiteDatabase,
  id: string,
  remota: MetaRemota,
): Promise<void> {
  await tx.runAsync(
    'UPDATE metas SET base_sincronizacao = ? WHERE id = ?',
    [serializarBaseRemota(remota), id],
  );
}

async function atualizarMetaComMerge(
  tx: SQLiteDatabase,
  local: Meta,
  merge: ResultadoMergeMeta,
  base: MetaRemota,
): Promise<void> {
  const meta = metaComMerge(local, merge);
  await tx.runAsync(
    `UPDATE metas
        SET objetivo = ?, valor_alvo_centavos = ?, prazo = ?, inicio = ?,
            categoria_id = ?, valor_acumulado_centavos = ?,
            valor_acumulado_atualizado_em = ?, sync_status = ?,
            excluido_em = ?, atualizado_em = ?, revisao = ?,
            campos_revisao = ?, base_sincronizacao = ?
      WHERE id = ?`,
    [
      meta.objetivo,
      meta.valor_alvo_centavos,
      meta.prazo,
      meta.inicio,
      meta.categoria_id,
      meta.valor_acumulado_centavos,
      meta.valor_acumulado_atualizado_em,
      meta.sync_status,
      meta.excluido_em,
      meta.atualizado_em,
      meta.revisao,
      meta.campos_revisao,
      serializarBaseRemota(base),
      meta.id,
    ],
  );
}

/**
 * Aplica um documento remoto na base local, sem rede.
 * A exclusão local nunca é ressuscitada por uma edição remota.
 *
 * Quando existe base sincronizada, o merge é campo a campo. Sem base
 * (registro legado/nunca sincronizado), mantém-se o fallback por registro
 * para não inventar um ancestral que não existe.
 */
export async function aplicarMetaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: MetaRemota,
  opcoes: { forcarRemota?: boolean } = {},
): Promise<ResultadoAplicacaoMeta> {
  const local = await lerMetaPorId(tx, docId);
  const base = await resolverCategoriaRemota(tx, remota);

  let categoriaLocalAtiva: string | null = null;
  if (local?.categoria_id) {
    const categoria = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM categorias WHERE id = ? AND excluido_em IS NULL',
      [local.categoria_id],
    );
    categoriaLocalAtiva = categoria ? local.categoria_id : null;
  }

  const normalizada =
    local &&
    local.tipo === base.tipo &&
    !local.excluido_em &&
    base.legado &&
    !base.excluido_em
      ? {
          ...base,
          inicio: base.inicio ?? local.inicio,
          categoria_id: base.categoria_id ?? categoriaLocalAtiva,
          valor_acumulado_centavos:
            base.valor_acumulado_centavos ?? local.valor_acumulado_centavos,
          valor_acumulado_atualizado_em:
            base.valor_acumulado_atualizado_em ?? local.valor_acumulado_atualizado_em,
        }
      : base;

  if (!local) {
    await inserirMetaRemota(tx, docId, normalizada);
    return { status: 'aplicada', remotaVenceu: true };
  }

  if (normalizada.excluido_em) {
    await atualizarMetaRemota(tx, docId, normalizada);
    return { status: 'aplicada', remotaVenceu: true };
  }

  if (local.excluido_em) {
    // Tombstone local continua vencendo edição remota; a base é atualizada
    // para que a próxima rodada não perca a referência da nuvem.
    const baseLocal = baseDeMeta(local);
    if (!baseLocal || serializarBaseRemota(baseLocal) !== serializarBaseRemota(normalizada)) {
      await atualizarBaseRemota(tx, docId, normalizada);
    }
    return { status: 'mantida', remotaVenceu: false };
  }

  const baseLocal = baseDeMeta(local);
  if (baseLocal) {
    const merge = mergeMetaRemota(local, normalizada, baseLocal);
    const baseMudou = serializarBaseRemota(baseLocal) !== serializarBaseRemota(normalizada);
    const statusDesejado = merge.sincronizado ? 'sincronizado' : 'pendente';
    if (merge.mudouLocal || baseMudou || local.sync_status !== statusDesejado) {
      await atualizarMetaComMerge(tx, local, merge, normalizada);
      return { status: 'aplicada', remotaVenceu: merge.remotaVenceu };
    }
    return { status: 'mantida', remotaVenceu: merge.remotaVenceu };
  }

  const venceu =
    opcoes.forcarRemota === true || decidirMetaRemota(local, normalizada) === 'remota';
  if (!venceu) {
    // Sem base, preserva o local, mas registra a versão remota para permitir
    // merge por campo na próxima sincronização.
    await atualizarBaseRemota(tx, docId, normalizada);
    return { status: 'mantida', remotaVenceu: false };
  }

  await atualizarMetaRemota(tx, docId, normalizada);
  return { status: 'aplicada', remotaVenceu: true };
}

export interface DocumentoMetaRemota {
  id: string;
  data: () => unknown;
}

/** Restaura metas da nuvem; documentos inválidos são ignorados, não inventados. */
export async function restaurarMetasDaNuvem(
  tx: SQLiteDatabase,
  docs: readonly DocumentoMetaRemota[],
): Promise<ResultadoRestauracaoMetas> {
  let aplicadas = 0;
  let ignoradas = 0;
  let remotasVenceram = 0;

  for (const documento of docs) {
    const remota = normalizarMetaRemota(documento.id, documento.data());
    if (!remota) {
      ignoradas++;
      continue;
    }
    const r = await aplicarMetaRemota(tx, documento.id, remota);
    if (r.status === 'aplicada') aplicadas++;
    if (r.remotaVenceu) remotasVenceram++;
  }

  // Categorias excluídas em qualquer ordem não podem deixar referências
  // inválidas. Metas afetadas ficam pendentes de correção e serão reenviadas
  // sem o vínculo removido.
  const ts = new Date().toISOString();
  await tx.runAsync(
    `UPDATE metas
        SET categoria_id = NULL,
            sync_status = 'pendente',
            atualizado_em = CASE WHEN atualizado_em > ? THEN atualizado_em ELSE ? END
      WHERE excluido_em IS NULL
        AND categoria_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM categorias c
           WHERE c.id = metas.categoria_id AND c.excluido_em IS NULL
        )`,
    [ts, ts],
  );

  return { aplicadas, ignoradas, remotasVenceram };
}

/**
 * Envia metas pendentes. A exclusão remota prevalece; a exclusão local é
 * reenviada. A confirmação local só ocorre se a linha ainda for a versão que
 * originou o payload (controle otimista contra edição concorrente).
 */
export async function sincronizarMetasPendentes(
  db: SQLiteDatabase,
  uid: string,
): Promise<{ mudouLocal: boolean }> {
  const pendentes = await db.getAllAsync<Meta>(
    "SELECT * FROM metas WHERE sync_status = 'pendente' ORDER BY id",
  );

  let mudouLocal = false;

  for (const meta of pendentes) {
    const ref = doc(firestore, 'usuarios', uid, 'metas', meta.id);
    const payloadLocal = payloadMetaRemota(meta);
    const baseLocal = baseDeMeta(meta);

    const decisao = await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, payloadLocal);
        return { tipo: 'enviado' as const, payload: payloadLocal };
      }

      const remota = normalizarMetaRemota(meta.id, snap.data());
      if (!remota) return { tipo: 'ignorada' as const };

      // Tombstone remoto é terminal: nunca pode ser sobrescrito.
      if (remota.excluido_em) {
        return { tipo: 'remota' as const, remota };
      }

      if (meta.excluido_em) {
        tx.set(ref, payloadLocal);
        return { tipo: 'enviado' as const, payload: payloadLocal };
      }

      if (baseLocal) {
        const merge = mergeMetaRemota(meta, remota, baseLocal);
        if (merge.sincronizado) {
          return { tipo: 'remota' as const, remota };
        }
        const mergedPayload = payloadMetaRemota(metaComMerge(meta, merge));
        tx.set(ref, mergedPayload);
        return { tipo: 'enviado' as const, payload: mergedPayload };
      }

      // Sem base confiável (legado/nunca sincronizado): preserva o fallback
      // por registro para não inventar um ancestral.
      if (remota.atualizado_em > meta.atualizado_em) {
        return { tipo: 'remota' as const, remota };
      }
      if (
        remota.atualizado_em === meta.atualizado_em &&
        decidirMetaRemota(meta, remota) === 'remota'
      ) {
        return { tipo: 'remota' as const, remota };
      }

      tx.set(ref, payloadLocal);
      return { tipo: 'enviado' as const, payload: payloadLocal };
    });

    if (decisao.tipo === 'ignorada') continue;

    if (decisao.tipo === 'remota') {
      await db.withExclusiveTransactionAsync(async (tx) => {
        const conexao = tx as unknown as SQLiteDatabase;
        const atual = await lerMetaPorId(conexao, meta.id);
        if (!atual || atual.sync_status !== 'pendente') return;

        // A decisão remota foi tomada com o snapshot lido antes da rede. Se o
        // usuário editou nesse intervalo, a decisão está obsoleta. Exclusão
        // remota continua prevalecendo; edição remota espera a próxima rodada
        // para ser reavaliada com a versão local atual.
        const localMudou = assinaturaMeta(atual) !== assinaturaMeta(meta);
        if (localMudou && !decisao.remota.excluido_em) return;

        const r = await aplicarMetaRemota(conexao, meta.id, decisao.remota);
        if (r.status === 'aplicada') mudouLocal = true;
      });
      continue;
    }

    // O ACK também é protegido por snapshot. O payload confirmado pode conter
    // campos remotos combinados; a linha local só é atualizada/confirmada se
    // ainda for exatamente a versão que originou o envio.
    await db.withExclusiveTransactionAsync(async (tx) => {
      const conexao = tx as unknown as SQLiteDatabase;
      const atual = await lerMetaPorId(conexao, meta.id);
      if (
        !atual ||
        atual.sync_status !== 'pendente' ||
        assinaturaMeta(atual) !== assinaturaMeta(meta)
      ) {
        return;
      }
      await atualizarMetaRemota(conexao, meta.id, decisao.payload);
      mudouLocal = true;
    });
  }

  return { mudouLocal };
}
