import type { SQLiteDatabase } from 'expo-sqlite';
import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { dataISOValida } from '@/features/metas/validation';
import { dataMaisAntiga, lerHistorico, registrarDesbloqueio, type Desbloqueio } from './historico';

function conferirConta(uid: string): void {
  if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) {
    throw new Error('Conta alterada durante a sincronização de conquistas');
  }
}

export async function lerHistoricoRemoto(uid: string): Promise<Desbloqueio[]> {
  conferirConta(uid);
  const snapshot = await getDocsFromServer(collection(firestore, 'usuarios', uid, 'conquistas_historico'));
  return snapshot.docs.flatMap((registro) => {
    if (!/^(primeira-meta|no-verde:[0-9]{4}-(0[1-9]|1[0-2]))$/.test(registro.id)) return [];
    const data = registro.data().data;
    if (data !== null && (typeof data !== 'string' || !dataISOValida(data))) return [];
    return [{ chave: registro.id, data }];
  });
}

/** Um desbloqueio importado suprime o alerta e não torna um selo válido sozinho. */
export async function aplicarHistoricoRemoto(
  db: SQLiteDatabase,
  uid: string,
  historico: Desbloqueio[],
): Promise<boolean> {
  let mudou = false;
  for (const selo of historico) {
    conferirConta(uid);
    const agora = new Date().toISOString();
    const emissao = await db.runAsync(
      `INSERT OR IGNORE INTO conquistas_emitidas (chave, status, criado_em, atualizado_em)
       VALUES (?, 'emitida', ?, ?)`,
      [selo.chave, agora, agora],
    );
    conferirConta(uid);
    const historicoAlterado = await registrarDesbloqueio(db, selo);
    mudou ||= historicoAlterado || emissao.changes > 0;
  }
  return mudou;
}

export async function sincronizarHistoricoConquistas(db: SQLiteDatabase, uid: string): Promise<boolean> {
  const remoto = await lerHistoricoRemoto(uid);
  const datasRemotas = new Map(remoto.map(({ chave, data }) => [chave, data]));
  let mudou = false;
  if (remoto.length > 0) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      mudou = await aplicarHistoricoRemoto(tx, uid, remoto);
    });
  }

  const local = await lerHistorico(db);
  for (const { chave, data } of local) {
    const dataConhecida = datasRemotas.get(chave);
    if (dataConhecida !== undefined && dataMaisAntiga(data, dataConhecida) === dataConhecida) continue;
    conferirConta(uid);
    const ref = doc(firestore, 'usuarios', uid, 'conquistas_historico', chave);
    const dataMesclada = await runTransaction(firestore, async (tx) => {
      const atual = await tx.get(ref);
      conferirConta(uid);
      const dataRemota = atual.data()?.data ?? null;
      const maisAntiga = dataMaisAntiga(data, dataRemota);
      if (!atual.exists() || maisAntiga !== dataRemota) tx.set(ref, { data: maisAntiga });
      return maisAntiga;
    });
    conferirConta(uid);
    const alterou = await registrarDesbloqueio(db, { chave, data: dataMesclada });
    mudou ||= alterou;
  }
  return mudou;
}
