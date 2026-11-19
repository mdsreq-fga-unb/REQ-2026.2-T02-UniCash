
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDb } from '@/db/database';
import type { Receita } from './types';
import type { Despesa } from '@/features/despesas/types';

type RecorrenciaSync = {
  id: string;
  tipo: 'receita' | 'despesa';
  intervalo: number;
  unidade: 'dia' | 'mes' | 'ano';
  inicio: string;
  termino: string | null;
  ativa: number;
  valor_centavos: number;
  titulo: string;
  descricao: string | null;
  categoria_id: string | null;
  fixa_ou_variavel: 'fixa' | 'variavel' | null;
  essencial: 0 | 1 | null;
  sync_status: 'pendente' | 'sincronizado';
  atualizado_em: string;
};

let emAndamento = false;

/**
 * Sincroniza receitas, despesas e recorrências pendentes com o Firestore.
 * Sem conta ou conexão, mantém os registros pendentes para nova tentativa.
 * Retorna true quando algum registro local é atualizado pela nuvem.
 */
export async function sincronizarPendentes(): Promise<boolean> {
  const user = auth.currentUser;

  if (!user || emAndamento) return false;

  emAndamento = true;
  let mudouLocal = false;

  try {
    const sqlite = await getDb();
    const uid = user.uid;

    // Sincroniza as recorrências, identificando seu tipo.
    const series = await sqlite.getAllAsync<RecorrenciaSync>(
      "SELECT * FROM recorrencias WHERE sync_status = 'pendente'",
    );

    for (const s of series) {
      const payload: Record<string, unknown> = {
        tipo: s.tipo,
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

      if (s.tipo === 'despesa') {
        payload.categoria_id = s.categoria_id;
        payload.fixa_ou_variavel = s.fixa_ou_variavel;
        payload.essencial = s.essencial;
      }

      await setDoc(
        doc(firestore, 'usuarios', uid, 'recorrencias', s.id),
        payload,
      );

      await sqlite.runAsync(
        `UPDATE recorrencias
         SET sync_status = 'sincronizado'
         WHERE id = ? AND atualizado_em = ?`,
        [s.id, s.atualizado_em],
      );
    }

    // Sincroniza receitas.
    const receitas = await sqlite.getAllAsync<Receita>(
      "SELECT * FROM receitas WHERE sync_status = 'pendente'",
    );

    for (const r of receitas) {
      const ref = doc(firestore, 'usuarios', uid, 'receitas', r.id);

      if (r.excluido_em) {
        await deleteDoc(ref);

        if (r.recorrencia_id) {
          await sqlite.runAsync(
            "UPDATE receitas SET sync_status = 'sincronizado' WHERE id = ?",
            [r.id],
          );
        } else {
          await sqlite.runAsync(
            'DELETE FROM receitas WHERE id = ? AND excluido_em IS NOT NULL',
            [r.id],
          );
        }

        continue;
      }

      const remoto = await getDoc(ref);

      if (remoto.exists()) {
        const d = remoto.data();

        if (
          typeof d.atualizado_em === 'string' &&
          d.atualizado_em > r.atualizado_em
        ) {
          await sqlite.runAsync(
            `UPDATE receitas
             SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
                 sync_status = 'sincronizado', atualizado_em = ?
             WHERE id = ?`,
            [
              d.valor_centavos,
              d.data,
              d.titulo,
              d.descricao ?? null,
              d.atualizado_em,
              r.id,
            ],
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

      await sqlite.runAsync(
        `UPDATE receitas
         SET sync_status = 'sincronizado'
         WHERE id = ? AND atualizado_em = ?`,
        [r.id, r.atualizado_em],
      );
    }

    // Sincroniza despesas.
    const despesas = await sqlite.getAllAsync<Despesa>(
      "SELECT * FROM despesas WHERE sync_status = 'pendente'",
    );

    for (const d of despesas) {
      const ref = doc(firestore, 'usuarios', uid, 'despesas', d.id);

      if (d.excluido_em) {
        await deleteDoc(ref);

        if (d.recorrencia_id) {
          await sqlite.runAsync(
            "UPDATE despesas SET sync_status = 'sincronizado' WHERE id = ?",
            [d.id],
          );
        } else {
          await sqlite.runAsync(
            'DELETE FROM despesas WHERE id = ? AND excluido_em IS NOT NULL',
            [d.id],
          );
        }

        continue;
      }

      const remoto = await getDoc(ref);

      if (remoto.exists()) {
        const dados = remoto.data();

        if (
          typeof dados.atualizado_em === 'string' &&
          dados.atualizado_em > d.atualizado_em
        ) {
          await sqlite.runAsync(
            `UPDATE despesas
             SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
                 categoria_id = ?, fixa_ou_variavel = ?, essencial = ?,
                 recorrencia_id = ?, sync_status = 'sincronizado',
                 atualizado_em = ?
             WHERE id = ?`,
            [
              dados.valor_centavos,
              dados.data,
              dados.titulo,
              dados.descricao ?? null,
              dados.categoria_id ?? null,
              dados.fixa_ou_variavel ?? null,
              dados.essencial ?? null,
              dados.recorrencia_id ?? null,
              dados.atualizado_em,
              d.id,
            ],
          );

          mudouLocal = true;
          continue;
        }
      }

      const payload: Record<string, unknown> = {
        valor_centavos: d.valor_centavos,
        data: d.data,
        titulo: d.titulo,
        criado_em: d.criado_em,
        atualizado_em: d.atualizado_em,
        categoria_id: d.categoria_id,
        fixa_ou_variavel: d.fixa_ou_variavel,
        essencial: d.essencial,
      };

      if (d.descricao) payload.descricao = d.descricao;
      if (d.recorrencia_id) payload.recorrencia_id = d.recorrencia_id;

      await setDoc(ref, payload);

      await sqlite.runAsync(
        `UPDATE despesas
         SET sync_status = 'sincronizado'
         WHERE id = ? AND atualizado_em = ?`,
        [d.id, d.atualizado_em],
      );
    }
  } catch {
    // Mantém os registros pendentes para uma nova tentativa (EX04).
  } finally {
    emAndamento = false;
  }

  return mudouLocal;
}

export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes();
}
