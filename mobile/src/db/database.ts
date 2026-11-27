import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/lib/firebase';
import { PRAGMAS_SQL } from './schema';
import { migrarSeNecessario } from './migrations';

const BANCO_SEM_CONTA = 'unicash.db';
const ULTIMO_DONO = 'unicash:ultimo_dono_local';
export const PREFIXO_REMOCAO_LOCAL = 'unicash:remocao-conta:';
const removendo = new Set<string>();
const bancos = new Map<string, Promise<SQLite.SQLiteDatabase>>();

/** Nome injetivo e seguro para o sistema de arquivos; nunca reutiliza a base legada. */
export function nomeBancoDoDono(uid: string): string {
  return `unicash-conta-${Array.from(uid, c => c.codePointAt(0)!.toString(16)).join('-')}.db`;
}

function abrirBanco(nome: string): Promise<SQLite.SQLiteDatabase> {
  if (removendo.has(nome)) return Promise.reject(new Error('Base em remoção'));
  let promessa = bancos.get(nome);
  if (!promessa) {
    promessa = (async () => {
      const db = await SQLite.openDatabaseAsync(nome);
      await db.execAsync(PRAGMAS_SQL);
      await migrarSeNecessario(db);
      return db;
    })().catch(e => { bancos.delete(nome); throw e; });
    bancos.set(nome, promessa);
  }
  return promessa;
}

export function getDbLocal(): Promise<SQLite.SQLiteDatabase> {
  return abrirBanco(BANCO_SEM_CONTA);
}

/** Operações remotas sempre capturam explicitamente o proprietário. */
export async function getDbDoDono(uid: string): Promise<SQLite.SQLiteDatabase> {
  if (await AsyncStorage.getItem(PREFIXO_REMOCAO_LOCAL + uid) === 'confirmado') {
    throw new Error('Base em remoção');
  }
  if (!uid) throw new Error('UID ausente');
  return abrirBanco(nomeBancoDoDono(uid));
}

async function apagarBanco(nome: string, desvincular: () => Promise<void>): Promise<void> {
  if (removendo.has(nome)) throw new Error('Base em remoção');
  removendo.add(nome);
  try {
    // Abrir sem migrar também torna a repetição segura se o arquivo já foi apagado.
    const aberto = await bancos.get(nome)?.catch(() => undefined) ?? await SQLite.openDatabaseAsync(nome);
    await aberto.closeAsync();
    bancos.delete(nome);
    await SQLite.deleteDatabaseAsync(nome);
    await desvincular();
  } finally {
    removendo.delete(nome);
  }
}

export async function apagarBancoDaConta(uid: string): Promise<void> {
  if (!uid) throw new Error('UID ausente');
  await apagarBanco(nomeBancoDoDono(uid), async () => {
    if (await AsyncStorage.getItem(ULTIMO_DONO) === uid) {
      await AsyncStorage.removeItem(ULTIMO_DONO);
    }
  });
}

export async function apagarBancoSemConta(): Promise<void> {
  await auth.authStateReady();
  if (auth.currentUser?.emailVerified) throw new Error('Existe uma sessão ativa');
  await apagarBanco(BANCO_SEM_CONTA, async () => {
    // Para de exibir a última base de conta através do modo local, sem apagá-la.
    if (!auth.currentUser?.emailVerified) await AsyncStorage.removeItem(ULTIMO_DONO);
  });
}

/** Sem sessão, mantém a última base local disponível. A base legada não sobe automaticamente. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  await auth.authStateReady();
  const usuario = auth.currentUser;
  if (usuario?.emailVerified) {
    await AsyncStorage.setItem(ULTIMO_DONO, usuario.uid);
    return getDbDoDono(usuario.uid);
  }
  const ultimo = await AsyncStorage.getItem(ULTIMO_DONO);
  const removido = ultimo && await AsyncStorage.getItem(PREFIXO_REMOCAO_LOCAL + ultimo) === 'confirmado';
  return ultimo && !removido ? getDbDoDono(ultimo) : getDbLocal();
}
