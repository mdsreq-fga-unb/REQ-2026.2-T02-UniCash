import type { SQLiteDatabase } from 'expo-sqlite';
import { onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { getDbDoDono } from '@/db/database';
import { auth, db as firestore, firebaseConfigurado } from '@/lib/firebase';
import { lerSaldoInicial } from './service';
import { dadosSaldoValidos } from './validacao';

function documentoSaldo(uid: string) {
  return doc(firestore, 'usuarios', uid, 'saldo_inicial', 'atual');
}

/** A mudança de cache para servidor permite tentar o envio novamente sem reabrir o app. */
export function observarConexaoSaldoInicial(reenviar: () => void): () => void {
  if (!firebaseConfigurado) return () => {};
  let pararDocumento: (() => void) | undefined;
  const pararSessao = onIdTokenChanged(auth, (usuario) => {
    pararDocumento?.();
    pararDocumento = undefined;
    if (!usuario?.emailVerified) return;
    const { uid } = usuario;
    let usaCache = true;
    pararDocumento = onSnapshot(documentoSaldo(uid), { includeMetadataChanges: true }, (snapshot) => {
      const voltouDoCache = usaCache && !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
      usaCache = snapshot.metadata.fromCache;
      if (!voltouDoCache) return;
      void getDbDoDono(uid).then(lerSaldoInicial).then((saldo) => {
        if (saldo?.sync_status === 'pendente' && auth.currentUser?.uid === uid && auth.currentUser.emailVerified) {
          reenviar();
        }
      }).catch((erro: unknown) => {
        console.warn('Não foi possível consultar a pendência do saldo inicial.', erro);
      });
    }, (erro) => {
      console.warn('Não foi possível observar a conexão para o saldo inicial.', erro);
    });
  });
  return () => { pararSessao(); pararDocumento?.(); };
}

export async function enviarSaldoInicial(banco: SQLiteDatabase, uid: string): Promise<boolean> {
  const saldo = await lerSaldoInicial(banco);
  if (saldo?.sync_status !== 'pendente' || auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) {
    return false;
  }
  const { valor_centavos, mes_referencia, revisao } = saldo;
  const ref = documentoSaldo(uid);
  await runTransaction(firestore, async (tx) => {
    if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) {
      throw new Error('Sessão alterada durante o envio do saldo inicial.');
    }
    tx.set(ref, { valor_centavos, mes_referencia });
  });
  const resultado = await banco.runAsync(
    "UPDATE saldo_inicial SET sync_status = 'sincronizado' WHERE id = 1 AND revisao = ? AND sync_status = 'pendente'",
    [revisao],
  );
  return resultado.changes > 0;
}

export async function restaurarSaldoInicial(
  tx: SQLiteDatabase,
  dados: Record<string, unknown> | undefined,
): Promise<void> {
  if (!dados) return;
  if (!dadosSaldoValidos(dados)) throw new Error('Saldo inicial remoto inválido.');
  await tx.runAsync(
    `INSERT INTO saldo_inicial (id, valor_centavos, mes_referencia, sync_status) VALUES (1, ?, ?, 'sincronizado')
     ON CONFLICT(id) DO NOTHING`,
    [dados.valor_centavos, dados.mes_referencia],
  );
}
