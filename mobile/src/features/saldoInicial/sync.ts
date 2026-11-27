import type { SQLiteDatabase } from 'expo-sqlite';
import { onIdTokenChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { getDbDoDono } from '@/db/database';
import { serializarImportacao } from '@/features/conta/operacoes-locais';
import { auth, db as firestore, firebaseConfigurado } from '@/lib/firebase';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import { lerSaldoInicial } from './service';
import { dadosSaldoValidos } from './validacao';

function documentoSaldo(uid: string) {
  return doc(firestore, 'usuarios', uid, 'saldo_inicial', 'atual');
}

export async function lerSaldoInicialRemoto(uid: string): Promise<Record<string, unknown> | undefined> {
  return (await getDoc(documentoSaldo(uid))).data();
}

/** Um snapshot do servidor retoma o envio ou preenche a referência local ausente. */
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
      const dados = snapshot.data();
      void (async () => {
        const banco = await getDbDoDono(uid);
        const saldo = await lerSaldoInicial(banco);
        const sessaoValida = () => auth.currentUser?.uid === uid && auth.currentUser.emailVerified;
        if (!sessaoValida()) return;
        if (saldo?.sync_status === 'pendente') {
          reenviar();
        } else if (!saldo && dados) {
          let restaurado = false;
          await serializarImportacao(uid, () => banco.withExclusiveTransactionAsync(async (tx) => {
            if (sessaoValida()) restaurado = await restaurarSaldoInicial(tx, dados);
          }));
          if (restaurado && sessaoValida()) avisarBaseAtualizada();
        }
      })().catch((erro: unknown) => {
        console.warn('Não foi possível retomar a sincronização do saldo inicial.', erro);
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
): Promise<boolean> {
  if (!dados) return false;
  if (!dadosSaldoValidos(dados)) throw new Error('Saldo inicial remoto inválido.');
  const resultado = await tx.runAsync(
    `INSERT INTO saldo_inicial (id, valor_centavos, mes_referencia, sync_status) VALUES (1, ?, ?, 'sincronizado')
     ON CONFLICT(id) DO NOTHING`,
    [dados.valor_centavos, dados.mes_referencia],
  );
  return resultado.changes > 0;
}
