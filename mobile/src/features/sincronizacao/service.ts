import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { AppState } from 'react-native';
import { getDb, getDbDoDono } from '@/db/database';
import { contarPendentes as contarRestauracaoPendente } from '@/db/restauracaoPendente';
import { aoMudarSessao, obterSessao } from '@/features/conta/sessao';
import {
  definirPreferenciaAutomatica, envioPausado, restaurarDaNuvem, sincronizarPendentes,
} from '@/features/receitas/sync';
import { avisarBaseAtualizada, ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { auth } from '@/lib/firebase';
import type { CodigoSincronizacao, EstadoSincronizacao, SyncService } from './contrato';
import { listarFila, type ItemFila } from './fila';

const ciclos = new Map<string, { tarefa: Promise<void>; manual: boolean }>();
const falhas = new Map<string, CodigoSincronizacao>();
function chaveItem(item: Pick<ItemFila, 'tipo' | 'id' | 'revisao'>) {
  return JSON.stringify([item.tipo, item.id, item.revisao]);
}

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

function chaveRecusas(uid: string) {
  return `unicash:sincronizacao-recusas:${uid}`;
}

async function lerRecusas(uid: string): Promise<Set<string>> {
  const conteudo = await AsyncStorage.getItem(chaveRecusas(uid));
  if (conteudo === null) return new Set();
  try {
    const itens: unknown = JSON.parse(conteudo);
    return new Set(Array.isArray(itens) ? itens.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function semRede(rede: NetworkState) {
  // A rede local também atende o Emulator Suite.
  return rede.isConnected === false;
}

function classificar(erro: unknown, padrao: CodigoSincronizacao): CodigoSincronizacao {
  const falha = erro as { code?: string; cause?: { code?: string } } | null;
  const codigo = falha?.code ?? falha?.cause?.code;
  if (offline || codigo === 'unavailable' || codigo === 'deadline-exceeded') return 'EX01';
  if (codigo === 'permission-denied') return 'EX08';
  if (codigo === 'unauthenticated') return 'EX02';
  if (codigo === 'aborted' || codigo === 'cancelled') return 'EX05';
  return padrao;
}

async function executarCiclo(uid: string, manual: boolean) {
  let etapa: CodigoSincronizacao = 'EX03';
  try {
    offline = semRede(await getNetworkStateAsync());
    if (uidAtivo() !== uid) return;
    if (offline) {
      falhas.set(uid, 'EX01');
      return;
    }
    if (!manual && await envioPausado(uid)) return;
    if (uidAtivo() !== uid) return;

    etapa = 'EX07';
    const itensRecusados = await lerRecusas(uid);
    if (uidAtivo() !== uid) return;
    const quantidadeRecusadaAntes = itensRecusados.size;
    etapa = 'EX03';
    let falhaEnvio: CodigoSincronizacao | null = null;
    await sincronizarPendentes({
      manual,
      manterPausa: true,
      aguardar: true,
      aoFalhar: (erro, item) => {
        if (item) {
          itensRecusados.add(chaveItem(item));
        } else {
          falhaEnvio ??= classificar(erro, 'EX03');
        }
      },
    });
    if (uidAtivo() !== uid) return;
    if (itensRecusados.size !== quantidadeRecusadaAntes) {
      await AsyncStorage.setItem(chaveRecusas(uid), JSON.stringify([...itensRecusados]));
    }
    if (uidAtivo() !== uid) return;
    if (falhaEnvio) {
      falhas.set(uid, falhaEnvio);
      return;
    }

    if (!manual && await envioPausado(uid)) return;
    await restaurarDaNuvem({ servidor: true, uidEsperado: uid, automatica: !manual });
    if (uidAtivo() !== uid) return;

    etapa = 'EX07';
    const banco = await getDbDoDono(uid);
    const [pendencias, restauracaoPendente] = await Promise.all([
      listarFila(banco), contarRestauracaoPendente(banco),
    ]);
    if (uidAtivo() !== uid) return;
    const aindaRecusados = new Set(pendencias.map(chaveItem).filter((item) => itensRecusados.has(item)));
    if (aindaRecusados.size !== itensRecusados.size) {
      if (aindaRecusados.size) {
        await AsyncStorage.setItem(chaveRecusas(uid), JSON.stringify([...aindaRecusados]));
      } else {
        await AsyncStorage.removeItem(chaveRecusas(uid));
      }
    }

    if (restauracaoPendente > 0) {
      falhas.set(uid, 'EX03');
      return;
    }

    falhas.delete(uid);
    if (pendencias.length) return;

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
    await atual.tarefa;
    if (manual && !atual.manual && uidAtivo() === uid && await envioPausado(uid).catch(() => false)) {
      return sincronizar(true);
    }
    return;
  }

  const ciclo = executarCiclo(uid, manual);
  ciclos.set(uid, { tarefa: ciclo, manual });
  avisar();
  try {
    await ciclo;
  } finally {
    ciclos.delete(uid);
    avisarBaseAtualizada();
    avisar();
  }
}

export async function alterarSincronizacaoAutomatica(uid: string, ligada: boolean): Promise<void> {
  if (uidAtivo() !== uid) throw new Error('EX08');
  await definirPreferenciaAutomatica(uid, ligada);
  avisar();
  if (ligada) {
    void Promise.resolve(ciclos.get(uid)?.tarefa).then(() => {
      if (uidAtivo() === uid) return sincronizar(false);
    });
  }
}

export const syncService: SyncService = {
  async consultar() {
    const uid = uidAtivo();
    const [fila, ultimaSincronizacao, rejeitados, pausada] = await Promise.all([
      (uid ? getDbDoDono(uid) : getDb()).then(listarFila),
      uid ? AsyncStorage.getItem(chaveUltimoCiclo(uid)) : Promise.resolve(null),
      uid ? lerRecusas(uid) : Promise.resolve(null),
      uid ? envioPausado(uid) : Promise.resolve(undefined),
    ]);
    if (uidAtivo() !== uid) throw new Error('EX08');

    const pendencias = fila.map((item) => ({
      tipo: item.tipo, id: item.id, titulo: item.titulo, alteracao: item.alteracao,
      estado: rejeitados?.has(chaveItem(item)) ? 'erro' as const : 'pendente' as const,
    }));
    const codigo = offline ? 'EX01' : uid
      ? falhas.get(uid) ?? (pendencias.some((item) => item.estado === 'erro') ? 'EX04' : null)
      : obterSessao().status === 'ativa' ? 'EX02' : null;
    const quantidadePendencias = pendencias.length;
    const estado: EstadoSincronizacao = {
      codigo,
      ultimaSincronizacao,
      quantidadePendencias,
      sincronizando: uid !== null && ciclos.has(uid),
      sincronizacaoAutomatica: pausada === undefined ? undefined : !pausada,
      status: codigo === 'EX01' ? 'sem-conexao'
        : codigo && codigo !== 'EX02' ? 'erro'
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
