import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { AppState } from 'react-native';
import { getDb, getDbDoDono } from '@/db/database';
import { contarPendentes as contarRestauracaoPendente } from '@/db/restauracaoPendente';
import { aoMudarSessao, obterSessao } from '@/features/conta/sessao';
import { envioPausado, restaurarDaNuvem, sincronizarPendentes } from '@/features/receitas/sync';
import { avisarBaseAtualizada, ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { auth } from '@/lib/firebase';
import type { CodigoSincronizacao, EstadoSincronizacao, SyncService } from './contrato';
import { listarFila } from './fila';

const ciclos = new Map<string, Promise<void>>();
const falhas = new Map<string, CodigoSincronizacao>();
const ouvintes = new Set<() => void>();
let offline = false;

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function uidAtivo() {
  const sessao = obterSessao();
  const usuario = auth.currentUser;
  return sessao.status === 'ativa' && usuario?.emailVerified && usuario.uid === sessao.uid
    ? usuario.uid : null;
}

function chaveUltimoCiclo(uid: string) {
  return `unicash:ultima-sincronizacao:${uid}`;
}

function semRede(rede: NetworkState) {
  // A rede local também atende o Emulator Suite.
  return rede.isConnected === false;
}

function classificar(erro: unknown, padrao: CodigoSincronizacao): CodigoSincronizacao {
  const falha = erro as { code?: string; cause?: { code?: string } } | null;
  const codigo = falha?.code ?? falha?.cause?.code;
  if (offline || codigo === 'unavailable' || codigo === 'deadline-exceeded') return 'EX02';
  if (codigo === 'permission-denied') return 'EX03';
  if (codigo === 'unauthenticated') return 'EX01';
  return padrao;
}

async function executarCiclo(uid: string, manual: boolean) {
  let etapa: CodigoSincronizacao = 'EX06';
  try {
    offline = semRede(await getNetworkStateAsync());
    if (uidAtivo() !== uid) return;
    if (offline) {
      falhas.set(uid, 'EX02');
      return;
    }
    if (!manual && await envioPausado(uid)) return;
    if (uidAtivo() !== uid) return;

    let falhaEnvio: CodigoSincronizacao | null = null;
    await sincronizarPendentes({
      manual,
      aguardar: true,
      aoFalhar: (erro) => { falhaEnvio ??= classificar(erro, 'EX06'); },
    });
    if (uidAtivo() !== uid) return;
    if (falhaEnvio) {
      falhas.set(uid, falhaEnvio);
      return;
    }

    etapa = 'EX07';
    await restaurarDaNuvem({ servidor: true, uidEsperado: uid });
    if (uidAtivo() !== uid) return;

    etapa = 'EX05';
    const banco = await getDbDoDono(uid);
    const [pendencias, restauracaoPendente] = await Promise.all([
      listarFila(banco), contarRestauracaoPendente(banco),
    ]);
    if (uidAtivo() !== uid) return;
    if (pendencias.length) {
      falhas.set(uid, 'EX04');
      return;
    }

    if (restauracaoPendente > 0) {
      falhas.set(uid, 'EX07');
      return;
    }

    await AsyncStorage.setItem(chaveUltimoCiclo(uid), new Date().toISOString());
    falhas.delete(uid);
  } catch (erro) {
    if (uidAtivo() === uid) falhas.set(uid, classificar(erro, etapa));
  }
}

async function sincronizar(manual: boolean): Promise<void> {
  const uid = uidAtivo();
  if (!uid) {
    avisar();
    return;
  }
  const atual = ciclos.get(uid);
  if (atual) {
    await atual;
    if (manual && uidAtivo() === uid && await envioPausado(uid).catch(() => false)) {
      return sincronizar(true);
    }
    return;
  }

  const ciclo = executarCiclo(uid, manual);
  ciclos.set(uid, ciclo);
  avisar();
  try {
    await ciclo;
  } finally {
    ciclos.delete(uid);
    avisarBaseAtualizada();
    avisar();
  }
}

export const syncService: SyncService = {
  async consultar() {
    const uid = uidAtivo();
    const [pendencias, ultimaSincronizacao] = await Promise.all([
      (uid ? getDbDoDono(uid) : getDb()).then(listarFila),
      uid ? AsyncStorage.getItem(chaveUltimoCiclo(uid)) : Promise.resolve(null),
    ]);
    if (uidAtivo() !== uid) throw new Error('EX08');

    const codigo = offline ? 'EX02' : uid ? falhas.get(uid) ?? null : 'EX01';
    const quantidadePendencias = pendencias.length;
    const estado: EstadoSincronizacao = {
      codigo,
      ultimaSincronizacao,
      quantidadePendencias,
      sincronizando: uid !== null && ciclos.has(uid),
      status: codigo === 'EX02' ? 'sem-conexao'
        : codigo && codigo !== 'EX01' ? 'erro'
        : !uid || quantidadePendencias > 0 || !ultimaSincronizacao ? 'pendente'
        : 'sincronizado',
    };
    return { estado, pendencias };
  },
  sincronizarAgora: () => sincronizar(true),
  assinar(ouvinte) {
    ouvintes.add(ouvinte);
    return () => { ouvintes.delete(ouvinte); };
  },
};

/** Retoma no login, no retorno ao primeiro plano e ao reconectar com o app aberto. */
export function iniciarSincronizacaoAutomatica() {
  const tentar = () => { void sincronizar(false); };
  let ativo = true;
  const aoMudarRede = (rede: NetworkState) => {
    if (!ativo) return;
    offline = semRede(rede);
    avisar();
    if (!offline && AppState.currentState !== 'background') tentar();
  };
  const conexao = addNetworkStateListener(aoMudarRede);
  void getNetworkStateAsync().then(aoMudarRede).catch(() => tentar());
  const aplicativo = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') tentar();
  });
  const cancelarSessao = aoMudarSessao(() => {
    avisar();
    tentar();
  });
  const cancelarBase = ouvirBaseAtualizada(avisar);
  // Também retoma em redes cuja conectividade real voltou sem mudança da interface.
  const retentativa = setInterval(() => {
    const uid = uidAtivo();
    if (AppState.currentState === 'active' && uid && falhas.has(uid)) tentar();
  }, 30_000);
  return () => {
    ativo = false;
    conexao.remove();
    aplicativo.remove();
    cancelarSessao();
    cancelarBase();
    clearInterval(retentativa);
  };
}
