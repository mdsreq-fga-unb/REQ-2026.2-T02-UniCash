import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  VERSAO_ESQUEMA,
  EstruturaLegadaInesperada,
  FalhaMigracao,
  migrarSeNecessario,
} from '@/db/migrations';
import {
  DDL_ESQUEMA_V6,
  DDL_TRIGGER_PERCENTUAL,
  PRAGMAS_SQL,
} from '@/db/schema';

function criarAdaptador(sqlite: Database.Database): SQLiteDatabase {
  const api: any = {
    async execAsync(sql: string) {
      sqlite.exec(sql);
    },
    async runAsync(sql: string, ...args: unknown[]) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      sqlite.prepare(sql).run(...(params as any[]));
    },
    async getFirstAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).get(...(params as any[])) ?? null;
    },
    async getAllAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).all(...(params as any[]));
    },
    async withExclusiveTransactionAsync(fn: (tx: unknown) => Promise<void>) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        await fn(api);
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return api as SQLiteDatabase;
}

const versao = (sqlite: Database.Database) =>
  (sqlite.prepare('PRAGMA user_version').get() as any).user_version;

const existeTabela = (sqlite: Database.Database, nome: string) =>
  (
    sqlite
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(nome) as any
  ).n > 0;

describe('migração 008 — metas', () => {
  it('instalação nova cria metas e grava a versão atual', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'metas')).toBe(true);
    const indices = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'metas'").all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(indices).toEqual(expect.arrayContaining(['idx_metas_prazo', 'idx_metas_sync']));
  });

  it('é idempotente e preserva metas existentes', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    const db = criarAdaptador(sqlite);
    await migrarSeNecessario(db);
    sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES ('m1', 'Viagem', 'investimento', 100000, '2027-12-31', 'pendente', NULL, 't', 't')`,
      )
      .run();

    await migrarSeNecessario(db);
    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect((sqlite.prepare('SELECT COUNT(*) AS n FROM metas').get() as any).n).toBe(1);
  });

  it('banco v7 recebe a tabela metas sem perder dados existentes', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    sqlite.exec(DDL_ESQUEMA_V6);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite.exec('PRAGMA user_version = 7');
    sqlite
      .prepare(
        "INSERT INTO despesas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('d1', 1000, '2026-01-10', 'Mercado', 'pendente', 't', 't')",
      )
      .run();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'metas')).toBe(true);
    expect((sqlite.prepare("SELECT COUNT(*) AS n FROM despesas WHERE id = 'd1'").get() as any).n).toBe(1);
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('falha ao validar índice faz rollback da tabela e mantém a versão 7', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    sqlite.exec(DDL_ESQUEMA_V6);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite.exec('CREATE INDEX idx_metas_sync ON despesas(sync_status)');
    sqlite.exec('PRAGMA user_version = 7');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      FalhaMigracao,
    );
    expect(versao(sqlite)).toBe(7);
    expect(existeTabela(sqlite, 'metas')).toBe(false);
    expect(
      (sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'idx_metas_prazo'").get() as any).n,
    ).toBe(0);
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('tabela metas incompatível aborta sem avançar a versão', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    sqlite.exec(DDL_ESQUEMA_V6);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite.exec('CREATE TABLE metas (id TEXT PRIMARY KEY)');
    sqlite.exec('PRAGMA user_version = 7');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      EstruturaLegadaInesperada,
    );
    expect(versao(sqlite)).toBe(7);
  });
});
