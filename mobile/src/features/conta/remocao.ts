import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { apagarBancoDaConta, PREFIXO_REMOCAO_LOCAL } from '@/db/database';
import { auth, db, firebaseConfigurado } from '@/lib/firebase';
import { reautenticar } from './auth.firebase';
import { comTimeout, traduzirErroFirebase } from './firebase-erros';
import { limparEmailParaReconciliar } from './perfil';
import { ErroConta } from './types';

function pedido(uid: string) {
  return doc(db, 'pedidos_remocao', uid);
}

async function concluirLimpeza(uid: string) {
  const chave = PREFIXO_REMOCAO_LOCAL + uid;
  await AsyncStorage.setItem(chave, 'confirmado');
  // Encerra a sessão antes de fechar o banco, para evitar novos ciclos remotos.
  if (auth.currentUser?.uid === uid) await signOut(auth);
  await apagarBancoDaConta(uid);
  await limparEmailParaReconciliar(uid);
  await Promise.all([
    AsyncStorage.removeItem(`unicash:envio_automatico_pausado:${uid}`),
    AsyncStorage.removeItem(`unicash:ultima-sincronizacao:${uid}`),
    AsyncStorage.removeItem(`unicash:sincronizacao-recusas:${uid}`),
  ]);
  await AsyncStorage.removeItem(chave);
}

export async function retomarLimpezasDeConta() {
  if (!firebaseConfigurado) return;
  await auth.authStateReady();
  for (const chave of await AsyncStorage.getAllKeys()) {
    if (!chave.startsWith(PREFIXO_REMOCAO_LOCAL)) continue;
    const uid = chave.slice(PREFIXO_REMOCAO_LOCAL.length);
    const estado = await AsyncStorage.getItem(chave);
    if (estado === 'confirmado') {
      await concluirLimpeza(uid);
    } else if (estado === 'enviando' && auth.currentUser?.uid === uid) {
      const remoto = await comTimeout(getDocFromServer(pedido(uid)), 3000).catch(() => null);
      if (remoto?.exists()) await concluirLimpeza(uid);
    }
  }
}

export async function solicitarExclusaoConta(senha: string, aoConfirmarPedido: () => void) {
  const usuario = auth.currentUser;
  if (!usuario?.emailVerified || !usuario.email) throw new ErroConta('email-nao-confirmado');
  const { uid } = usuario;
  try {
    await comTimeout(reautenticar(usuario, senha));
    await comTimeout(usuario.getIdToken(true));
    if (auth.currentUser?.uid !== uid) throw new ErroConta('falha');
    await AsyncStorage.setItem(PREFIXO_REMOCAO_LOCAL + uid, 'enviando');
    const ref = pedido(uid);
    // Transações exigem servidor. A leitura torna reenvios do mesmo pedido idempotentes.
    await runTransaction(db, async (tx) => {
      if (auth.currentUser?.uid !== uid) throw new ErroConta('falha');
      const existente = await tx.get(ref);
      if (!existente.exists()) tx.set(ref, { status: 'pendente', solicitado_em: serverTimestamp() });
    });
  } catch (erro) {
    throw traduzirErroFirebase(erro);
  }
  aoConfirmarPedido();
  await concluirLimpeza(uid);
}
