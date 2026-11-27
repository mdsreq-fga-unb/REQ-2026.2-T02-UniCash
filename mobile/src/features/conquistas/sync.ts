import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { gerarId } from '@/features/receitas/service';
import { dataISOValida } from '@/features/metas/validation';
import { dataMaisAntiga, lerHistorico, registrarDesbloqueio, type Desbloqueio } from './historico';

type DesbloqueioRemoto = Desbloqueio & { origem: string | null };

const origensEmLeitura = new Map<string, Promise<string>>();

/** Identificador persistente desta instalação para o histórico da conta. */
async function origemLocal(uid: string): Promise<string> {
  const existente = origensEmLeitura.get(uid);
  if (existente) return existente;

  const chave = `unicash:conquistas:origem:${uid}`;
  const leitura = (async () => {
    const origem = await AsyncStorage.getItem(chave);
    if (origem) return origem;
    const nova = gerarId();
    await AsyncStorage.setItem(chave, nova);
    return nova;
  })();
  origensEmLeitura.set(uid, leitura);
  try {
    return await leitura;
  } finally {
    origensEmLeitura.delete(uid);
  }
}

function conferirConta(uid: string): void {
  if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) {
    throw new Error('Conta alterada durante a sincronização de conquistas');
  }
}

export async function lerHistoricoRemoto(uid: string): Promise<DesbloqueioRemoto[]> {
  conferirConta(uid);
  const snapshot = await getDocsFromServer(collection(firestore, 'usuarios', uid, 'conquistas_historico'));
  return snapshot.docs.flatMap((registro) => {
    if (!/^(primeira-meta|no-verde:[0-9]{4}-(0[1-9]|1[0-2]))$/.test(registro.id)) return [];
    const { data, origem } = registro.data();
    if (data !== null && (typeof data !== 'string' || !dataISOValida(data))) return [];
    return [{ chave: registro.id, data, origem: typeof origem === 'string' ? origem : null }];
  });
}

/** Um desbloqueio de outro aparelho encerra o aviso local, inclusive se estiver pendente. */
async function aplicarDesbloqueioRemoto(
  db: SQLiteDatabase,
  uid: string,
  origem: string,
  selo: DesbloqueioRemoto,
): Promise<boolean> {
  conferirConta(uid);
  let emissaoAlterada = false;
  // O histórico publicado neste aparelho também inclui desbloqueios cujo aviso
  // ainda precisa ser tentado. O retorno do próprio documento preserva o EX02.
  if (selo.origem !== origem) {
    const agora = new Date().toISOString();
    const emissao = await db.runAsync(
      `INSERT INTO conquistas_emitidas (chave, status, criado_em, atualizado_em)
       VALUES (?, 'emitida', ?, ?)
       ON CONFLICT (chave) DO UPDATE SET status = excluded.status, atualizado_em = excluded.atualizado_em
       WHERE conquistas_emitidas.status = 'pendente'`,
      [selo.chave, agora, agora],
    );
    emissaoAlterada = emissao.changes > 0;
  }

  conferirConta(uid);
  const historicoAlterado = await registrarDesbloqueio(db, selo);
  return historicoAlterado || emissaoAlterada;
}

export async function aplicarHistoricoRemoto(
  db: SQLiteDatabase,
  uid: string,
  historico: DesbloqueioRemoto[],
): Promise<boolean> {
  if (historico.length === 0) return false;
  const origem = await origemLocal(uid);
  let mudou = false;
  for (const selo of historico) {
    const alterou = await aplicarDesbloqueioRemoto(db, uid, origem, selo);
    mudou ||= alterou;
  }
  return mudou;
}

export async function sincronizarHistoricoConquistas(db: SQLiteDatabase, uid: string): Promise<boolean> {
  const remoto = await lerHistoricoRemoto(uid);
  const datasRemotas = new Map(remoto.map(({ chave, data }) => [chave, data]));
  let mudou = false;
  if (remoto.length > 0) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      mudou = await aplicarHistoricoRemoto(tx, uid, remoto);
    });
  }

  const local = await lerHistorico(db);
  if (local.length === 0) return mudou;
  const origem = await origemLocal(uid);
  for (const { chave, data } of local) {
    const dataConhecida = datasRemotas.get(chave);
    if (dataConhecida !== undefined && dataMaisAntiga(data, dataConhecida) === dataConhecida) continue;
    conferirConta(uid);
    const ref = doc(firestore, 'usuarios', uid, 'conquistas_historico', chave);
    const mesclado = await runTransaction(firestore, async (tx) => {
      const atual = await tx.get(ref);
      conferirConta(uid);
      const remotoAtual = atual.data();
      const dataRemota = remotoAtual?.data ?? null;
      const maisAntiga = dataMaisAntiga(data, dataRemota);
      if (!atual.exists()) {
        tx.set(ref, { data: maisAntiga, origem });
        return { chave, data: maisAntiga, origem };
      }
      if (maisAntiga !== dataRemota) tx.update(ref, { data: maisAntiga });
      return { chave, data: maisAntiga, origem: remotoAtual?.origem ?? null };
    });
    let alterou = false;
    await db.withExclusiveTransactionAsync(async (tx) => {
      alterou = await aplicarDesbloqueioRemoto(tx, uid, origem, mesclado);
    });
    mudou ||= alterou;
  }
  return mudou;
}
