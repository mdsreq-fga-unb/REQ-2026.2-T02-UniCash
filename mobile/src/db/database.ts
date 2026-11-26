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
export async function getDbDoDono(uid: string): Promise<SQLite.SQLiteDatabase> {
  if (!uid) throw new Error('UID ausente');
  if (await obterRemocaoConfirmada(uid)) throw new Error('Conta em remoção');
  return abrirBanco(nomeBancoDoDono(uid));
}

/** Sem sessão, mantém a última base local disponível. A base legada não sobe automaticamente. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  await auth.authStateReady();
  const usuario = auth.currentUser;
  if (usuario?.emailVerified) {
    if (await obterRemocaoConfirmada(usuario.uid)) return getDbLocal();
    await AsyncStorage.setItem(ULTIMO_DONO, usuario.uid);
    return abrirBanco(nomeBancoDoDono(usuario.uid));
  }
  const ultimo = await AsyncStorage.getItem(ULTIMO_DONO);
  return ultimo && !(await obterRemocaoConfirmada(ultimo)) ? abrirBanco(nomeBancoDoDono(ultimo)) : getDbLocal();
}

const PREFIXO_REMOCAO = 'unicash:remocao-pendente:';

export function chaveRemocao(uid: string): string {
  return PREFIXO_REMOCAO + uid;
}

export async function listarContasComRemocaoPendente(): Promise<string[]> {
  const chaves = await AsyncStorage.getAllKeys();
  return chaves.filter((chave) => chave.startsWith(PREFIXO_REMOCAO))
    .map((chave) => chave.slice(PREFIXO_REMOCAO.length));
}

export async function obterRemocaoConfirmada(uid: string): Promise<boolean> {
  if (!(await AsyncStorage.getItem(chaveRemocao(uid)))) return false;
  const banco = await abrirBanco(nomeBancoDoDono(uid));
  const tabela = await banco.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'auditoria_remocao'",
  );
  return !!tabela && !!(await banco.getFirstAsync('SELECT 1 FROM auditoria_remocao WHERE uid = ?', uid));
}

type ConexaoRemocao = Pick<SQLite.SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

export interface AuditLog {
  uid: string;
  operacao: 'excluir-conta';
  data: string;
}

async function apagarRegistros(tx: ConexaoRemocao, base: 'main' | 'legado') {
  const tabelas = await tx.getAllAsync<{ name: string }>(
    `SELECT name FROM ${base}.sqlite_master
       WHERE type = 'table' AND name NOT GLOB 'sqlite_*' AND name <> 'auditoria_remocao'`,
  );
  for (const { name } of tabelas) {
    const identificador = name.replaceAll('"', '""');
    await tx.execAsync(`DELETE FROM ${base}."${identificador}"`);
  }
}

/** A auditoria e as exclusões fazem parte da mesma transação SQLite. */
export async function clearLocalDatabase(uid: string, quando: string): Promise<void> {
  await abrirBanco(nomeBancoDoDono(uid));
  const legado = await getDbLocal();
  const urlLegado = legado.databasePath;
  const auditoria: AuditLog = { uid, operacao: 'excluir-conta', data: quando };
  const conexao = await SQLite.openDatabaseAsync(nomeBancoDoDono(uid), { useNewConnection: true });

  try {
    await conexao.runAsync('ATTACH DATABASE ? AS legado', urlLegado);
    await conexao.execAsync('PRAGMA foreign_keys = ON');
    await conexao.withTransactionAsync(async () => {
      await conexao.execAsync(
        'CREATE TABLE IF NOT EXISTS auditoria_remocao (uid TEXT PRIMARY KEY, operacao TEXT NOT NULL, data TEXT NOT NULL)',
      );
      await conexao.runAsync(
        'INSERT OR IGNORE INTO auditoria_remocao (uid, operacao, data) VALUES (?, ?, ?)',
        auditoria.uid, auditoria.operacao, auditoria.data,
      );
      await conexao.execAsync('PRAGMA defer_foreign_keys = ON');
      await apagarRegistros(conexao, 'main');

      // O UC10 mantém uma cópia na origem. Apagá-la somente se ela foi adotada por esta conta.
      const adocao = await conexao.getFirstAsync(
        "SELECT 1 FROM legado.sqlite_master WHERE type = 'table' AND name = 'uc10_adocao'",
      );
      if (adocao && await conexao.getFirstAsync('SELECT 1 FROM legado.uc10_adocao WHERE uid = ?', uid)) {
        await apagarRegistros(conexao, 'legado');
      }
    });
  } finally {
    // O fechamento acontece depois do commit ou rollback e não muda o resultado da transação.
    await conexao.closeAsync().catch(() => {});
  }
}

export async function desvincularBaseRemovida(uid: string): Promise<void> {
  if (await AsyncStorage.getItem(ULTIMO_DONO) === uid) await AsyncStorage.removeItem(ULTIMO_DONO);
}
