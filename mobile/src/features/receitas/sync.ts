import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDb } from '@/db/database';
import type { Receita, Recorrencia } from './types';

let emAndamento = false;

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
  } catch {
    // Permanece pendente e é reenviado depois (EX04).
  } finally {
    emAndamento = false;
  }
  return mudouLocal;
}

export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes();
}
