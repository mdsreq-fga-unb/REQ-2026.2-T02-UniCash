import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@/lib/firebase';
import { PRAGMAS_SQL } from './schema';
import { migrarSeNecessario } from './migrations';

const ULTIMO_DONO = 'unicash:ultimo_dono_local';
const bancos = new Map<string, Promise<SQLite.SQLiteDatabase>>();

/** Nome injetivo e seguro para o sistema de arquivos; nunca reutiliza a base legada. */
export function nomeBancoDoDono(uid: string): string {
  return `unicash-conta-${Array.from(uid, c => c.codePointAt(0)!.toString(16)).join('-')}.db`;
}

function abrirBanco(nome: string): Promise<SQLite.SQLiteDatabase> {
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
  return abrirBanco('unicash.db');
}

/** Operações remotas sempre capturam explicitamente o proprietário. */
export function getDbDoDono(uid: string): Promise<SQLite.SQLiteDatabase> {
  if (!uid) throw new Error('UID ausente');
  return abrirBanco(nomeBancoDoDono(uid));
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
  return ultimo ? getDbDoDono(ultimo) : getDbLocal();
}
