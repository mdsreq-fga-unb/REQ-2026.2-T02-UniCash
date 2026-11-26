import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { signOut } from 'firebase/auth';
import {
  chaveRemocao,
  clearLocalDatabase,
  desvincularBaseRemovida,
  listarContasComRemocaoPendente,
  obterRemocaoConfirmada,
} from '@/db/database';
import { auth, firebaseConfigurado } from '@/lib/firebase';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import { salvarContinuidadeSemConta } from './onboarding';
import { serializarImportacao } from './operacoes-locais';
import { definirSessao, obterSessao } from './sessao';

export interface AccountRemovalService {
  excluir(uid: string): Promise<void>;
}

const autorizacoes = new Map<string, Promise<string>>();
const exclusoes = new Set<string>();
const formatoToken = /^[a-f0-9]{64}$/;
const chaveAutorizacao = (uid: string) => `unicash:autoriza-remocao:${uid}`;
let envio: Promise<void> | undefined;

export class AutorizacaoDeRemocaoIndisponivel extends Error {}

async function chamar(funcao: string, token: string): Promise<Response> {
  const projeto = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const emulador = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';
  const base = emulador
    ? `http://${host}:5001/${projeto}/us-central1`
    : `https://us-central1-${projeto}.cloudfunctions.net`;
  const controlador = new AbortController();
  const prazo = setTimeout(() => controlador.abort(), 12000);
  try {
    const resposta = await fetch(`${base}/${funcao}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controlador.signal,
    });
    if (!resposta.ok) throw new Error('servico-remocao-indisponivel');
    return resposta;
  } finally {
    clearTimeout(prazo);
  }
}

export async function prepararRemocao(uid: string): Promise<string> {
  let atual = autorizacoes.get(uid);
  if (!atual) {
    atual = (async () => {
      const usuario = auth.currentUser;
      if (usuario?.uid !== uid || !usuario.emailVerified) throw new Error('sessao-invalida');
      const chave = chaveAutorizacao(uid);
      const salvo = await AsyncStorage.getItem(chave);
      if (salvo && formatoToken.test(salvo)) return salvo;
      const resposta = await chamar('autorizarRemocaoConta', await usuario.getIdToken());
      const { token } = await resposta.json();
      if (typeof token !== 'string' || !formatoToken.test(token)) throw new Error('autorizacao-invalida');
      await AsyncStorage.setItem(chave, token);
      return token;
    })().finally(() => autorizacoes.delete(uid));
    autorizacoes.set(uid, atual);
  }
  return atual;
}

async function encerrarContaRemovida(uid: string): Promise<void> {
  if (auth.currentUser?.uid === uid) {
    await salvarContinuidadeSemConta();
    definirSessao({ status: 'sem-sessao' });
    await signOut(auth);
  }
  await desvincularBaseRemovida(uid);
}

async function enviarPendentes(): Promise<void> {
  await auth.authStateReady();
  for (const uid of await listarContasComRemocaoPendente()) {
    if (exclusoes.has(uid)) continue;
    try {
      if (!(await obterRemocaoConfirmada(uid))) continue;
      await encerrarContaRemovida(uid);
      const token = await AsyncStorage.getItem(chaveRemocao(uid));
      if (!token || !formatoToken.test(token)) continue;
      await chamar('solicitarRemocaoConta', token);
      await AsyncStorage.multiRemove([chaveAutorizacao(uid), `@unicash/email-pendente:${uid}`]);
      await AsyncStorage.removeItem(chaveRemocao(uid));
    } catch {
      // O pedido e a auditoria continuam disponíveis para a próxima tentativa.
    }
  }
}

function tentarEnviar(): void {
  if (envio) return;
  envio = enviarPendentes().catch(() => {}).finally(() => { envio = undefined; });
}

export function iniciarReenvioDeRemocoes(): () => void {
  if (!firebaseConfigurado) return () => {};
  function aoConectar() {
    tentarEnviar();
    const usuario = auth.currentUser;
    if (usuario?.emailVerified) void prepararRemocao(usuario.uid).catch(() => {});
  }

  const conexao = addNetworkStateListener((rede) => {
    if (rede.isConnected && rede.isInternetReachable !== false) aoConectar();
  });
  void getNetworkStateAsync().then((rede) => {
    if (rede.isConnected && rede.isInternetReachable !== false) aoConectar();
  }).catch(() => {});
  tentarEnviar();
  const repeticao = setInterval(tentarEnviar, 60000);
  return () => {
    conexao.remove();
    clearInterval(repeticao);
  };
}

export const remocaoConta: AccountRemovalService = {
  async excluir(uid) {
    const sessao = obterSessao();
    if (sessao.status !== 'ativa' || sessao.uid !== uid || exclusoes.has(uid)) {
      throw new Error('sessao-invalida');
    }

    exclusoes.add(uid);
    try {
      const token = await prepararRemocao(uid).catch(() => {
        throw new AutorizacaoDeRemocaoIndisponivel();
      });
      if (auth.currentUser?.uid !== uid) throw new Error('sessao-invalida');
      await AsyncStorage.setItem(chaveRemocao(uid), token);
      await serializarImportacao(uid, () => clearLocalDatabase(uid, new Date().toISOString()));
      await encerrarContaRemovida(uid).catch(() => {});
      avisarBaseAtualizada();
    } finally {
      exclusoes.delete(uid);
      tentarEnviar();
    }
  },
};
