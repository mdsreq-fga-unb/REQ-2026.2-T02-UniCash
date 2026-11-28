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

async function consultarPedido(uid: string, estado: string | null) {
  const id = estado?.startsWith(ENVIO) ? estado.slice(ENVIO.length) : null;
  if (!id && estado !== 'enviando') return 'incerto';
  if (id) {
    const recibo = await comTimeout(getDocFromServer(comprovante(id)), 3000).catch(() => null);
    if (!recibo) return 'incerto';
    if (recibo.exists()) return 'recebido';
  }
  if (auth.currentUser?.uid !== uid) return 'incerto';
  const registro = await comTimeout(getDocFromServer(pedido(uid)), 3000).catch(() => null);
  if (!registro || auth.currentUser?.uid !== uid) return 'incerto';
  return registro.exists() ? 'recebido' : 'ausente';
}

/** Libera o acesso à base sem conta antes da abertura do app, sem consultar o Firestore. */
export async function encerrarSessaoComRemocaoConfirmada() {
  if (!firebaseConfigurado) return;
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const estado = await AsyncStorage.getItem(PREFIXO_REMOCAO_LOCAL + uid);
  if (estado === 'confirmado' && auth.currentUser?.uid === uid) await signOut(auth);
}

const operacoesDeRemocao = new Set<string>();

export async function retomarLimpezasDeConta(): Promise<boolean> {
  if (!firebaseConfigurado) return false;
  let baseAlterada = false;
  await auth.authStateReady();
  for (const chave of await AsyncStorage.getAllKeys()) {
    if (!chave.startsWith(PREFIXO_REMOCAO_LOCAL)) continue;
    const uid = chave.slice(PREFIXO_REMOCAO_LOCAL.length);
    if (operacoesDeRemocao.has(uid)) continue;
    operacoesDeRemocao.add(uid);
    try {
      const estado = await AsyncStorage.getItem(chave);
      const resultado = estado === 'confirmado' ? 'recebido' : await consultarPedido(uid, estado);
      if (resultado === 'recebido') {
        await concluirLimpeza(uid);
        baseAlterada = true;
      }
      if (resultado === 'ausente') await AsyncStorage.removeItem(chave);
    } catch {
      // Preserve o marcador para outra tentativa e continue com os demais UIDs.
      console.warn('A limpeza de uma conta será retomada na próxima tentativa.');
    } finally {
      operacoesDeRemocao.delete(uid);
    }
  }
  return baseAlterada;
}

export async function solicitarExclusaoConta(senha: string, aoConfirmarPedido: () => void) {
  const usuario = auth.currentUser;
  if (!usuario?.emailVerified || !usuario.email) throw new ErroConta('email-nao-confirmado');
  const { uid } = usuario;
  if (operacoesDeRemocao.has(uid)) throw new ErroConta('falha');
  operacoesDeRemocao.add(uid);
  try {
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
        if (existente.exists()) {
          const idRecebido = existente.get('comprovante_id');
          // A leitura veio do servidor. Persista a prova antes de sair deste ramo,
          // pois o processamento remoto pode invalidar a sessão a qualquer momento.
          await AsyncStorage.setItem(chave, typeof idRecebido === 'string' && idRecebido
            ? ENVIO + idRecebido : 'confirmado');
        } else {
          tx.set(ref, { status: 'pendente', solicitado_em: serverTimestamp(), comprovante_id: id });
          tx.set(comprovante(id), { recebido: true });
        }
      });
    } catch (erro) {
      throw traduzirErroFirebase(erro);
    }
    aoConfirmarPedido();
    await concluirLimpeza(uid);
  } finally {
    operacoesDeRemocao.delete(uid);
  }
}
