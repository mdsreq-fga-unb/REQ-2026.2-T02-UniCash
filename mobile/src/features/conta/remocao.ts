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

async function pedidoRecebidoOuSessaoPerdida(uid: string): Promise<boolean> {
  const usuario = auth.currentUser;
  // O estado "enviando" só é gravado após a pessoa confirmar com a senha válida.
  // A perda da sessão encerra a verificação remota, mas a autorização local permanece.
  if (usuario?.uid !== uid) return true;

  try {
    return (await comTimeout(getDocFromServer(pedido(uid)), 3000)).exists();
  } catch {
    try {
      await comTimeout(usuario.getIdToken(true), 3000);
    } catch (erro) {
      const codigo = (erro as { code?: string } | null)?.code;
      if (codigo === 'auth/user-not-found' || codigo === 'auth/user-token-expired' ||
          codigo === 'auth/invalid-user-token' || codigo === 'auth/user-disabled') return true;
    }
    return auth.currentUser?.uid !== uid;
  }
}

export async function retomarLimpezasDeConta() {
  if (!firebaseConfigurado) return;
  await auth.authStateReady();
  for (const chave of await AsyncStorage.getAllKeys()) {
    if (!chave.startsWith(PREFIXO_REMOCAO_LOCAL)) continue;
    const uid = chave.slice(PREFIXO_REMOCAO_LOCAL.length);
    const estado = await AsyncStorage.getItem(chave);
    if (estado === 'confirmado' || (estado === 'enviando' && await pedidoRecebidoOuSessaoPerdida(uid))) {
      await concluirLimpeza(uid);
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
