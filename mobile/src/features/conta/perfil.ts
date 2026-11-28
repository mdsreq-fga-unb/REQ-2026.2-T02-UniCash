import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigurado } from '@/lib/firebase';
import { comTimeout } from './firebase-erros';

export async function consultarNomeDoPerfil(uid: string): Promise<string | undefined> {
  if (!firebaseConfigurado || auth.currentUser?.uid !== uid) return undefined;
  const perfil = await comTimeout(getDoc(doc(db, 'usuarios', uid)));
  const nome: unknown = perfil.data()?.nome;
  return typeof nome === 'string' ? nome.trim() || undefined : undefined;
}

/**
 * UC11 (RF03): reconciliação do e-mail do perfil no Firestore.
 *
 * Quando o Firebase Auth já confirmou o novo e-mail, o app publica o e-mail confirmado na sessão mesmo
 * que a gravação em usuarios/{uid} falhe. O Firebase Auth guarda o usuário no aparelho e a sessão é
 * reconstruída a partir dele, inclusive offline. A gravação pendente fica marcada aqui, por UID, e é
 * feita depois.
 */
const chave = (uid: string) => `@unicash/email-reconciliar:${uid}`;

export async function marcarEmailParaReconciliar(uid: string, email: string): Promise<void> {
  await AsyncStorage.setItem(chave(uid), email);
}

export function limparEmailParaReconciliar(uid: string): Promise<void> {
  return AsyncStorage.removeItem(chave(uid));
}

export function emailParaReconciliar(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(chave(uid));
}

/**
 * Grava no Firestore o e-mail confirmado que ficou pendente. Devolve true se gravou.
 *
 * A regra de usuarios/{uid} exige que o e-mail gravado seja o do token, então o token é renovado antes.
 * Uma marca que não bate mais com o e-mail do Auth (houve outra troca depois) é descartada.
 */
export async function reconciliarEmailDoPerfil(uid: string): Promise<boolean> {
  const email = await AsyncStorage.getItem(chave(uid));
  if (!email) return false;
  const u = auth.currentUser;
  if (!u || u.uid !== uid) return false;
  await u.reload();
  if (u.email?.toLowerCase() !== email.toLowerCase()) {
    await limparEmailParaReconciliar(uid);
    return false;
  }
  await u.getIdToken(true);
  await comTimeout(updateDoc(doc(db, 'usuarios', uid), { email: u.email, atualizado_em: serverTimestamp() }));
  await limparEmailParaReconciliar(uid);
  return true;
}
