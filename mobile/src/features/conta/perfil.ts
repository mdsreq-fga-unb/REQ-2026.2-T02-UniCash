import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { comTimeout } from './firebase-erros';

/**
 * UC11 (RF03): reconciliação do e-mail do perfil no Firestore.
 *
 * Quando o Firebase Auth já confirmou o novo e-mail, o app publica o e-mail confirmado na sessão
 * (que fica guardada no aparelho e é a leitura offline do perfil) mesmo que a gravação em
 * usuarios/{uid} falhe. Nesse caso o e-mail fica marcado aqui, por UID, e é gravado depois.
 */
const chave = (uid: string) => `@unicash/email-reconciliar:${uid}`;

export async function marcarEmailParaReconciliar(uid: string, email: string): Promise<void> {
  await AsyncStorage.setItem(chave(uid), email);
}

export function emailParaReconciliar(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(chave(uid));
}

/** Grava no Firestore o e-mail confirmado que ficou pendente. Devolve true se havia algo a gravar. */
export async function reconciliarEmailDoPerfil(uid: string): Promise<boolean> {
  const email = await AsyncStorage.getItem(chave(uid));
  if (!email) return false;
  await comTimeout(updateDoc(doc(db, 'usuarios', uid), { email, atualizado_em: serverTimestamp() }));
  await AsyncStorage.removeItem(chave(uid));
  return true;
}
