import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  VERSAO_ESQUEMA,
  EstruturaLegadaInesperada,
  FalhaMigracao,
  ResiduoDeMigracao,
  migrarSeNecessario,
} from '@/db/migrations';
import {
  DDL_ESQUEMA_V6,
  DDL_ESQUEMA_V8,
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

describe('migração 009 — extensão das metas', () => {
  function bancoV8(): Database.Database {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    sqlite.exec(DDL_ESQUEMA_V8);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite.exec('PRAGMA user_version = 8');
    return sqlite;
  }

  const inserirMeta = (
    sqlite: Database.Database,
    id: string,
    extra: { tipo?: string; criadoEm?: string; prazo?: string } = {},
  ) => {
    sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, 100000, ?, 'pendente', NULL, ?, ?)`,
      )
      .run(
        id,
        `Meta ${id}`,
        extra.tipo ?? 'investimento',
        extra.prazo ?? '2027-12-31',
        extra.criadoEm ?? '2026-01-10T12:00:00.000Z',
        '2026-01-10T12:00:00.000Z',
      );
  };

  it('instalação nova já nasce na versão 9 com as colunas novas', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    const colunas = (sqlite.prepare('PRAGMA table_info(metas)').all() as { name: string }[]).map(
      (c) => c.name,
    );
    expect(colunas).toEqual(
      expect.arrayContaining([
        'inicio',
        'categoria_id',
        'valor_acumulado_centavos',
        'valor_acumulado_atualizado_em',
      ]),
    );
    expect(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'idx_metas_categoria'")
          .get() as any
      ).n,
    ).toBe(1);
  });

  it('v8 → v9 preserva metas e deriva início somente de criado_em válido', async () => {
    const sqlite = bancoV8();
    inserirMeta(sqlite, 'm1', { criadoEm: '2026-02-03T10:00:00.000Z' });
    inserirMeta(sqlite, 'm2', {
      tipo: 'gasto',
      criadoEm: 'data-invalida',
      prazo: '2027-06-30',
    });
    inserirMeta(sqlite, 'm3', {
      criadoEm: '2028-01-01T00:00:00.000Z',
      prazo: '2027-12-31',
    });

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      inicio: '2026-02-03',
      categoria_id: null,
      valor_acumulado_centavos: null,
      valor_acumulado_atualizado_em: null,
      objetivo: 'Meta m1',
      valor_alvo_centavos: 100000,
    });
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m2')).toMatchObject({
      inicio: null,
      categoria_id: null,
      valor_acumulado_centavos: null,
    });
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m3')).toMatchObject({
      inicio: null,
    });
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('é idempotente e preserva metas já completas', async () => {
    const sqlite = bancoV8();
    inserirMeta(sqlite, 'm1');
    const db = criarAdaptador(sqlite);
    await migrarSeNecessario(db);

    sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
           valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES ('m2', 'Reserva', 'investimento', 200000, '2028-12-31', '2027-01-01',
                 NULL, 0, '2027-01-02T00:00:00.000Z', 'sincronizado', NULL,
                 '2027-01-01T00:00:00.000Z', '2027-01-02T00:00:00.000Z')`,
      )
      .run();

    await migrarSeNecessario(db);

    expect(versao(sqlite)).toBe(9);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m2')).toMatchObject({
      inicio: '2027-01-01',
      valor_acumulado_centavos: 0,
      valor_acumulado_atualizado_em: '2027-01-02T00:00:00.000Z',
    });
  });

  it('recria índice ausente sem alterar dados', async () => {
    const sqlite = bancoV8();
    inserirMeta(sqlite, 'm1');
    const db = criarAdaptador(sqlite);
    await migrarSeNecessario(db);

    sqlite.exec('DROP INDEX idx_metas_categoria');
    sqlite.exec('PRAGMA user_version = 8');
    await migrarSeNecessario(db);

    expect(versao(sqlite)).toBe(9);
    expect(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'idx_metas_categoria'")
          .get() as any
      ).n,
    ).toBe(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM metas').get()).toEqual({ n: 1 });
  });

  it('falha após copiar/renomear faz rollback completo da reconstrução', async () => {
    const sqlite = bancoV8();
    inserirMeta(sqlite, 'm1');
    const db = criarAdaptador(sqlite);
    const execOriginal = db.execAsync.bind(db);
    (db as any).execAsync = async (sql: string) => {
      if (sql.includes('ALTER TABLE metas_nova_009 RENAME TO metas')) {
        throw new Error('falha simulada na renomeação');
      }
      return execOriginal(sql);
    };

    await expect(migrarSeNecessario(db)).rejects.toThrow('falha simulada na renomeação');

    expect(versao(sqlite)).toBe(8);
    const colunas = (sqlite.prepare('PRAGMA table_info(metas)').all() as { name: string }[]).map(
      (c) => c.name,
    );
    expect(colunas).toHaveLength(9);
    expect(colunas).not.toContain('inicio');
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: 'Meta m1',
      valor_alvo_centavos: 100000,
    });
    expect(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'metas_nova_009'")
          .get() as any
      ).n,
    ).toBe(0);
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('resíduo de migração aborta e mantém versão e dados intactos', async () => {
    const sqlite = bancoV8();
    inserirMeta(sqlite, 'm1');
    sqlite.exec('CREATE TABLE metas_nova_009 (id TEXT PRIMARY KEY)');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      ResiduoDeMigracao,
    );

    expect(versao(sqlite)).toBe(8);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM metas').get()).toEqual({ n: 1 });
    expect(
      (sqlite.prepare('PRAGMA table_info(metas)').all() as { name: string }[]).some(
        (c) => c.name === 'inicio',
      ),
    ).toBe(false);
  });
});
