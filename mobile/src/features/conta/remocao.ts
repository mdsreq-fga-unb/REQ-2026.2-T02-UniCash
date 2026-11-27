import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
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

const ENVIO = 'enviando:';

function comprovante(id: string) {
  return doc(db, 'comprovantes_remocao', id);
}

async function pedidoRecebido(uid: string, estado: string | null): Promise<boolean> {
  const id = estado?.startsWith(ENVIO) ? estado.slice(ENVIO.length) : null;
  const ref = id ? comprovante(id)
    : estado === 'enviando' && auth.currentUser?.uid === uid ? pedido(uid) : null;
  if (!ref) return false;
  const remoto = await comTimeout(getDocFromServer(ref), 3000).catch(() => null);
  if (remoto?.exists()) return true;
  if (!id || auth.currentUser?.uid !== uid) return false;
  // Um pedido realizado por outro aparelho pode ter um comprovante diferente.
  const existente = await comTimeout(getDocFromServer(pedido(uid)), 3000).catch(() => null);
  return existente?.exists() ?? false;
}

export async function retomarLimpezasDeConta() {
  if (!firebaseConfigurado) return;
  await auth.authStateReady();
  for (const chave of await AsyncStorage.getAllKeys()) {
    if (!chave.startsWith(PREFIXO_REMOCAO_LOCAL)) continue;
    const uid = chave.slice(PREFIXO_REMOCAO_LOCAL.length);
    const estado = await AsyncStorage.getItem(chave);
    if (estado === 'confirmado' || await pedidoRecebido(uid, estado)) {
      await concluirLimpeza(uid);
    }
  }
}

export async function solicitarExclusaoConta(senha: string, aoConfirmarPedido: () => void) {
  const usuario = auth.currentUser;
  if (!usuario?.emailVerified || !usuario.email) throw new ErroConta('email-nao-confirmado');
  const { uid } = usuario;
  const rede = await getNetworkStateAsync().catch(() => null);
  if (rede?.isConnected === false) throw new ErroConta('sem-conexao');
  try {
    await comTimeout(reautenticar(usuario, senha));
    await comTimeout(usuario.getIdToken(true));
    if (auth.currentUser?.uid !== uid) throw new ErroConta('falha');
    const chave = PREFIXO_REMOCAO_LOCAL + uid;
    const estado = await AsyncStorage.getItem(chave);
    const id = estado?.startsWith(ENVIO) ? estado.slice(ENVIO.length) : randomUUID();
    await AsyncStorage.setItem(chave, ENVIO + id);
    const ref = pedido(uid);
    // Transações exigem servidor. A leitura torna reenvios do mesmo pedido idempotentes.
    await runTransaction(db, async (tx) => {
      if (auth.currentUser?.uid !== uid) throw new ErroConta('falha');
      const existente = await tx.get(ref);
      if (!existente.exists()) {
        tx.set(ref, { status: 'pendente', solicitado_em: serverTimestamp(), comprovante_id: id });
        tx.set(comprovante(id), { recebido: true });
      }
    });
  } catch (erro) {
    throw traduzirErroFirebase(erro);
  }
  aoConfirmarPedido();
  await concluirLimpeza(uid);
}
