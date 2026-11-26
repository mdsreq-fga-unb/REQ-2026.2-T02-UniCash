import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

jest.unmock('@/db/database');
jest.mock('@/db/migrations', () => ({ migrarSeNecessario: async () => {} }));
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (nome: string) => mockAbrir(nome),
}));

const sqlite = process.getBuiltinModule('node:sqlite')!;
const pasta = mkdtempSync(join(tmpdir(), 'unicash-remocao-'));
const conexoes = new Set<DatabaseSync>();

function mockAbrir(nome: string) {
  const databasePath = join(pasta, nome);
  const db = new sqlite.DatabaseSync(databasePath);
  conexoes.add(db);
  return {
    databasePath,
    execAsync: async (sql: string) => db.exec(sql),
    runAsync: async (sql: string, ...params: SQLInputValue[]) => db.prepare(sql).run(...params),
    getAllAsync: async (sql: string, ...params: SQLInputValue[]) => db.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, ...params: SQLInputValue[]) => db.prepare(sql).get(...params),
    withTransactionAsync: async (executar: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await executar();
        db.exec('COMMIT');
      } catch (erro) {
        db.exec('ROLLBACK');
        throw erro;
      }
    },
    closeAsync: async () => {
      db.close();
      conexoes.delete(db);
    },
  };
}

import { clearLocalDatabase, getDbDoDono, getDbLocal } from '@/db/database';

afterAll(() => {
  for (const db of conexoes) db.close();
  rmSync(pasta, { recursive: true, force: true });
});

async function preparar() {
  const conta = await getDbDoDono('u1');
  const legado = await getDbLocal();
  for (const banco of [conta, legado]) {
    await banco.execAsync(`
      DROP TABLE IF EXISTS movimentacoes;
      DROP TABLE IF EXISTS uc10_adocao;
      DROP TABLE IF EXISTS auditoria_remocao;
      CREATE TABLE movimentacoes (id INTEGER);
      INSERT INTO movimentacoes VALUES (1);
    `);
  }
  await legado.execAsync('CREATE TABLE uc10_adocao (uid TEXT); INSERT INTO uc10_adocao VALUES (\'u1\');');
  return { conta, legado };
}

it('apaga a base da conta e a cópia adotada e registra a auditoria', async () => {
  const { conta, legado } = await preparar();
  const data = '2026-11-26T20:00:00.000Z';
  await clearLocalDatabase('u1', data);
  expect(await conta.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(0);
  expect(await legado.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(0);
  expect(await conta.getFirstAsync('SELECT * FROM auditoria_remocao')).toEqual({
    uid: 'u1', operacao: 'excluir-conta', data,
  });
});

it('reverte a auditoria e as duas bases se a limpeza do legado falhar', async () => {
  const { conta, legado } = await preparar();
  await legado.execAsync(`
    CREATE TRIGGER falha BEFORE DELETE ON movimentacoes BEGIN
      SELECT RAISE(ABORT, 'falha induzida');
    END;
  `);
  await expect(clearLocalDatabase('u1', new Date().toISOString())).rejects.toThrow('falha induzida');
  expect(await conta.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(1);
  expect(await legado.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(1);
  expect(await conta.getAllAsync("SELECT name FROM sqlite_master WHERE name = 'auditoria_remocao'")).toHaveLength(0);
});

it('preserva a base legada se ela pertence a outra conta', async () => {
  const { conta, legado } = await preparar();
  await legado.execAsync("UPDATE uc10_adocao SET uid = 'u2'");
  await clearLocalDatabase('u1', new Date().toISOString());
  expect(await conta.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(0);
  expect(await legado.getAllAsync('SELECT * FROM movimentacoes')).toHaveLength(1);
});
