import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDb } from '@/db/database';
import type { Receita, Recorrencia } from './types';

let emAndamento = false;
let acessoNegado = false;

/** Falha ao restaurar os dados da nuvem; a base local não é alterada (transação revertida). */
export class FalhaRestauracao extends Error {}

function negadoPelaNuvem(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'permission-denied';
}

/**
 * Informa (uma única vez) se a nuvem negou acesso na última sincronização/restauração (EX07).
 * Os dados locais não são afetados: continuam pendentes e salvos no aparelho.
 */
export function consumirAcessoNegado(): boolean {
  const v = acessoNegado;
  acessoNegado = false;
  return v;
}

/**
 * Envia a fila de pendências ao Firestore (usuarios/{uid}/receitas/{id}).
 * Sem conta, sem conexão, sessão expirada ou servidor fora do ar: só suspende (EX04).
 * Retorna true se algum registro local foi atualizado a partir da nuvem (EX05).
 */
export async function sincronizarPendentes(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || emAndamento) return false;
  emAndamento = true;
  let mudouLocal = false;
  try {
    const sqlite = await getDb();
    const uid = user.uid;

    const series = await sqlite.getAllAsync<Recorrencia>(
      "SELECT * FROM recorrencias WHERE sync_status = 'pendente'",
    );
    for (const s of series) {
      const payload: Record<string, unknown> = {
        intervalo: s.intervalo,
        unidade: s.unidade,
        inicio: s.inicio,
        ativa: s.ativa === 1,
        valor_centavos: s.valor_centavos,
        titulo: s.titulo,
        atualizado_em: s.atualizado_em,
      };
      if (s.termino) payload.termino = s.termino;
      if (s.descricao) payload.descricao = s.descricao;
      await setDoc(doc(firestore, 'usuarios', uid, 'recorrencias', s.id), payload);
      await sqlite.runAsync("UPDATE recorrencias SET sync_status = 'sincronizado' WHERE id = ? AND atualizado_em = ?", [
        s.id, s.atualizado_em,
      ]);
    }

    const pendentes = await sqlite.getAllAsync<Receita>(
      "SELECT * FROM receitas WHERE sync_status = 'pendente'",
    );
    for (const r of pendentes) {
      const ref = doc(firestore, 'usuarios', uid, 'receitas', r.id);

      if (r.excluido_em) {
        // A exclusão prevalece (RN07).
        await deleteDoc(ref);
        if (r.recorrencia_id) {
          // Mantém a linha para o INSERT OR IGNORE não recriar a ocorrência.
          await sqlite.runAsync("UPDATE receitas SET sync_status = 'sincronizado' WHERE id = ?", [r.id]);
        } else {
          await sqlite.runAsync('DELETE FROM receitas WHERE id = ? AND excluido_em IS NOT NULL', [r.id]);
        }
        continue;
      }

      // Desatualizado: vence o atualizado_em mais recente.
      const remoto = await getDoc(ref);
      if (remoto.exists()) {
        const d = remoto.data();
        if (typeof d.atualizado_em === 'string' && d.atualizado_em > r.atualizado_em) {
          await sqlite.runAsync(
            `UPDATE receitas SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
               sync_status = 'sincronizado', atualizado_em = ? WHERE id = ?`,
            [d.valor_centavos, d.data, d.titulo, d.descricao ?? null, d.atualizado_em, r.id],
          );
          mudouLocal = true;
          continue;
        }
      }

      const payload: Record<string, unknown> = {
        valor_centavos: r.valor_centavos,
        data: r.data,
        titulo: r.titulo,
        criado_em: r.criado_em,
        atualizado_em: r.atualizado_em,
      };
      if (r.descricao) payload.descricao = r.descricao;
      if (r.recorrencia_id) payload.recorrencia_id = r.recorrencia_id;
      await setDoc(ref, payload);
      // Só marca se o registro não mudou durante o envio.
      await sqlite.runAsync("UPDATE receitas SET sync_status = 'sincronizado' WHERE id = ? AND atualizado_em = ?", [
        r.id, r.atualizado_em,
      ]);
    }
  } catch (e) {
    // Permanece pendente e é reenviado depois (EX04). Acesso negado (EX07) é sinalizado para a tela.
    if (negadoPelaNuvem(e)) acessoNegado = true;
  } finally {
    emAndamento = false;
  }
  return mudouLocal;
}

export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes();
}

export interface ResultadoRestauracao {
  receitas: number;
  recorrencias: number;
}

/**
 * Restaura da nuvem (usuarios/{uid}/...) para a base local, ao entrar numa conta.
 * Aditiva e idempotente: nunca sobrescreve linhas locais (inclusive lápides e edições pendentes),
 * então uma receita excluída não reaparece e as ocorrências de séries (ID derivado da série + data)
 * não são duplicadas. Tudo numa única transação (tudo ou nada).
 */
export async function restaurarDaNuvem(): Promise<ResultadoRestauracao> {
  const user = auth.currentUser;
  if (!user) throw new FalhaRestauracao('sem conta');
  try {
    const [snapSeries, snapReceitas] = await Promise.all([
      getDocs(collection(firestore, 'usuarios', user.uid, 'recorrencias')),
      getDocs(collection(firestore, 'usuarios', user.uid, 'receitas')),
    ]);
    const sqlite = await getDb();
    const resultado: ResultadoRestauracao = { receitas: 0, recorrencias: 0 };

    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      const conhecidas = new Set(
        (await tx.getAllAsync<{ id: string }>('SELECT id FROM recorrencias')).map((r) => r.id),
      );

      for (const d of snapSeries.docs) {
        const x = d.data();
        if (conhecidas.has(d.id)) continue;
        if (typeof x.intervalo !== 'number' || typeof x.unidade !== 'string' || typeof x.inicio !== 'string') continue;
        if (typeof x.valor_centavos !== 'number' || typeof x.titulo !== 'string') continue;
        await tx.runAsync(
          `INSERT OR IGNORE INTO recorrencias
            (id, intervalo, unidade, inicio, termino, ativa, valor_centavos, titulo, descricao, sync_status, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?)`,
          [
            d.id, x.intervalo, x.unidade, x.inicio, x.termino ?? null, x.ativa === false ? 0 : 1,
            x.valor_centavos, x.titulo, x.descricao ?? null, x.atualizado_em ?? new Date().toISOString(),
          ],
        );
        conhecidas.add(d.id);
        resultado.recorrencias++;
      }

      for (const d of snapReceitas.docs) {
        const x = d.data();
        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : new Date().toISOString();
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const r = await tx.runAsync(
          `INSERT OR IGNORE INTO receitas
            (id, valor_centavos, data, titulo, descricao, recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
          [d.id, x.valor_centavos, x.data, x.titulo, x.descricao ?? null, serie, x.criado_em ?? ts, ts],
        );
        if (r.changes > 0) resultado.receitas++;
      }
    });
    return resultado;
  } catch (e) {
    if (negadoPelaNuvem(e)) acessoNegado = true;
    throw new FalhaRestauracao(String(e));
  }
}