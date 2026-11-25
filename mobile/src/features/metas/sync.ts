import type { SQLiteDatabase } from 'expo-sqlite';
import { doc, runTransaction } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';
import type { Meta, MetaTipo } from './types';
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
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
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

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor : null;
}

/**
 * Valida e normaliza um documento da coleção `metas`.
 * Retorna null para documento inválido; o chamador o ignora sem inventar dados.
 */
export function normalizarMetaRemota(docId: string, dados: unknown): MetaRemota | null {
  if (!docId || !dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;

  const objetivo = texto(d.objetivo)?.trim() ?? '';
  if (!objetivo || contarCaracteres(objetivo) > 80) return null;
  if (!tipoMetaValido(d.tipo)) return null;

  const valor = d.valor_alvo_centavos;
  if (!Number.isSafeInteger(valor) || (valor as number) <= 0 || (valor as number) > 99_999_999_999) {
    return null;
  }

  const prazo = texto(d.prazo);
  if (!prazo || !dataISOValida(prazo)) return null;

  const criadoEm = texto(d.criado_em);
  const atualizadoEm = texto(d.atualizado_em);
  if (!criadoEm || !atualizadoEm) return null;

  const excluidoEm = d.excluido_em == null ? null : texto(d.excluido_em);
  if (d.excluido_em != null && !excluidoEm) return null;

  return {
    objetivo,
    tipo: d.tipo,
    valor_alvo_centavos: valor as number,
    prazo,
    excluido_em: excluidoEm,
    criado_em: criadoEm,
    atualizado_em: atualizadoEm,
  };
}

export function payloadMetaRemota(meta: Meta): MetaRemota {
  return {
    objetivo: meta.objetivo,
    tipo: meta.tipo,
    valor_alvo_centavos: meta.valor_alvo_centavos,
    prazo: meta.prazo,
    excluido_em: meta.excluido_em ?? null,
    criado_em: meta.criado_em,
    atualizado_em: meta.atualizado_em,
  };
}

function assinaturaMeta(meta: Pick<Meta, 'objetivo' | 'tipo' | 'valor_alvo_centavos' | 'prazo' | 'excluido_em' | 'criado_em'>): string {
  return JSON.stringify([
    meta.objetivo,
    meta.tipo,
    meta.valor_alvo_centavos,
    meta.prazo,
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

  const comparacao = local.atualizado_em.localeCompare(remota.atualizado_em);
  if (comparacao !== 0) return comparacao > 0 ? 'local' : 'remota';

  return assinaturaMeta(local) >= assinaturaMeta(remota) ? 'local' : 'remota';
}

async function lerMetaPorId(tx: SQLiteDatabase, id: string): Promise<Meta | null> {
  return tx.getFirstAsync<Meta>('SELECT * FROM metas WHERE id = ?', [id]);
}

async function inserirMetaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: MetaRemota,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO metas
      (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status,
       excluido_em, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, 'sincronizado', ?, ?, ?)`,
    [
      docId,
      remota.objetivo,
      remota.tipo,
      remota.valor_alvo_centavos,
      remota.prazo,
      remota.excluido_em,
      remota.criado_em,
      remota.atualizado_em,
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
            sync_status = 'sincronizado', excluido_em = ?, atualizado_em = ?
      WHERE id = ?`,
    [
      remota.objetivo,
      remota.tipo,
      remota.valor_alvo_centavos,
      remota.prazo,
      remota.excluido_em,
      remota.atualizado_em,
      id,
    ],
  );
}

/**
 * Aplica um documento remoto na base local, sem rede.
 * A exclusão local nunca é ressuscitada por uma edição remota.
 */
export async function aplicarMetaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: MetaRemota,
  opcoes: { forcarRemota?: boolean } = {},
): Promise<ResultadoAplicacaoMeta> {
  const local = await lerMetaPorId(tx, docId);

  if (!local) {
    await inserirMetaRemota(tx, docId, remota);
    return { status: 'aplicada', remotaVenceu: true };
  }

  if (remota.excluido_em) {
    await atualizarMetaRemota(tx, docId, remota);
    return { status: 'aplicada', remotaVenceu: true };
  }

  if (local.excluido_em) {
    return { status: 'mantida', remotaVenceu: false };
  }

  const venceu = opcoes.forcarRemota === true || decidirMetaRemota(local, remota) === 'remota';
  if (!venceu) return { status: 'mantida', remotaVenceu: false };

  await atualizarMetaRemota(tx, docId, remota);
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
    const payload = payloadMetaRemota(meta);

    const decisao = await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, payload);
        return { tipo: 'enviado' as const };
      }

      const remota = normalizarMetaRemota(meta.id, snap.data());
      if (!remota) return { tipo: 'ignorada' as const };

      // Tombstone remoto é terminal: nunca pode ser sobrescrito.
      if (remota.excluido_em) {
        return { tipo: 'remota' as const, remota };
      }

      if (meta.excluido_em) {
        tx.set(ref, payload);
        return { tipo: 'enviado' as const };
      }

      if (remota.atualizado_em > meta.atualizado_em) {
        return { tipo: 'remota' as const, remota };
      }
      if (
        remota.atualizado_em === meta.atualizado_em &&
        decidirMetaRemota(meta, remota) === 'remota'
      ) {
        return { tipo: 'remota' as const, remota };
      }

      tx.set(ref, payload);
      return { tipo: 'enviado' as const };
    });

    if (decisao.tipo === 'ignorada') continue;

    if (decisao.tipo === 'remota') {
      const atual = await db.getFirstAsync<Meta>('SELECT * FROM metas WHERE id = ?', [meta.id]);
      if (
        !atual ||
        atual.sync_status !== 'pendente' ||
        atual.atualizado_em !== meta.atualizado_em
      ) {
        continue;
      }
      await db.withExclusiveTransactionAsync(async (tx) => {
        const r = await aplicarMetaRemota(
          tx as unknown as SQLiteDatabase,
          meta.id,
          decisao.remota,
          { forcarRemota: true },
        );
        if (r.status === 'aplicada') mudouLocal = true;
      });
      continue;
    }

    const r = await db.runAsync(
      `UPDATE metas SET sync_status = 'sincronizado'
        WHERE id = ? AND atualizado_em = ? AND sync_status = 'pendente'`,
      [meta.id, meta.atualizado_em],
    );
    if (r.changes > 0) mudouLocal = true;
  }

  return { mudouLocal };
}
