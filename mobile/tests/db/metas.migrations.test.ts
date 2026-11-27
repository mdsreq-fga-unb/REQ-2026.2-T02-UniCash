import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  VERSAO_ESQUEMA,
  BancoUc12SemUc04,
  EstruturaLegadaInesperada,
  FalhaMigracao,
  ResiduoDeMigracao,
  migrarSeNecessario,
} from '@/db/migrations';
import {
  DDL_ESQUEMA_V6,
  DDL_ESQUEMA_V9,
  DDL_INDICES_METAS,
  DDL_INDICES_METAS_V9,
  DDL_NUMERAR_ALERTAS,
  DDL_SALDO_MENSAL,
  DDL_TABELA_METAS,
  DDL_TABELA_METAS_V9,
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

const colunasMetas = (sqlite: Database.Database): string[] =>
  (sqlite.prepare('PRAGMA table_info(metas)').all() as { name: string }[]).map((c) => c.name);

const criarBaseUc06 = (): Database.Database => {
  const sqlite = new Database(':memory:');
  sqlite.exec(PRAGMAS_SQL);
  sqlite.exec(DDL_ESQUEMA_V6);
  sqlite.exec(DDL_TRIGGER_PERCENTUAL);
  return sqlite;
};

/** Banco v8 legítimo da UC04, sem metas. */
const bancoUc04V8 = (): Database.Database => {
  const sqlite = criarBaseUc06();
  sqlite.exec(DDL_SALDO_MENSAL);
  sqlite.exec(DDL_NUMERAR_ALERTAS);
  sqlite.exec('PRAGMA user_version = 8');
  return sqlite;
};

/**
 * Banco v12 da develop (UC04, UC08, UC05 e UC14), ainda sem metas: a cadeia
 * real é aplicada a partir da v8 e a tabela de metas criada pela 013–015 é
 * removida, como um aparelho que nunca recebeu a UC12.
 */
const bancoDevelopV12 = async (): Promise<Database.Database> => {
  const sqlite = bancoUc04V8();
  await migrarSeNecessario(criarAdaptador(sqlite));
  sqlite.exec('DROP TABLE metas; PRAGMA user_version = 12');
  return sqlite;
};

/** Banco v13 após a criação inicial da tabela de metas da UC12. */
const bancoMetasBaseV13 = async (): Promise<Database.Database> => {
  const sqlite = await bancoDevelopV12();
  sqlite.exec(DDL_TABELA_METAS);
  for (const ddl of DDL_INDICES_METAS) sqlite.exec(ddl);
  sqlite.exec('PRAGMA user_version = 13');
  return sqlite;
};

/** Banco v14 com a extensão UC12 já aplicada, antes dos metadados de merge. */
const bancoMetasV14 = async (): Promise<Database.Database> => {
  const sqlite = await bancoDevelopV12();
  sqlite.exec(DDL_TABELA_METAS_V9);
  for (const ddl of DDL_INDICES_METAS_V9) sqlite.exec(ddl);
  sqlite.exec('PRAGMA user_version = 14');
  return sqlite;
};

/** Banco de desenvolvimento criado pela antiga UC12 008, sem a 008 da UC04. */
const bancoUc12AntigoV8 = (): Database.Database => {
  const sqlite = criarBaseUc06();
  sqlite.exec(DDL_TABELA_METAS);
  for (const ddl of DDL_INDICES_METAS) sqlite.exec(ddl);
  sqlite.exec('PRAGMA user_version = 8');
  return sqlite;
};

/** Banco de desenvolvimento com a antiga extensão UC12 009, mas sem UC04. */
const bancoUc12AntigoV9 = (): Database.Database => {
  const sqlite = criarBaseUc06();
  sqlite.exec(DDL_ESQUEMA_V9);
  sqlite.exec('PRAGMA user_version = 9');
  return sqlite;
};

const inserirMetaBase = (
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

describe('migrações da develop até a 012 + 013/014/015 UC12', () => {
  it('instalação nova chega à versão 15 com UC04 e metadados de merge', async () => {
    const sqlite = new Database(':memory:');
    sqlite.exec(PRAGMAS_SQL);
    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(existeTabela(sqlite, 'metas')).toBe(true);
    expect(colunasMetas(sqlite)).toEqual(
      expect.arrayContaining([
        'inicio',
        'categoria_id',
        'valor_acumulado_centavos',
        'valor_acumulado_atualizado_em',
        'revisao',
        'campos_revisao',
        'base_sincronizacao',
      ]),
    );
    const indices = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'metas'").all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(indices).toEqual(
      expect.arrayContaining(['idx_metas_prazo', 'idx_metas_sync', 'idx_metas_categoria']),
    );
  });

  it('v7 → 008 a 012 da develop → 013 metas → 014 extensão → 015 metadados preserva lançamentos', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('PRAGMA user_version = 7');
    sqlite
      .prepare(
        "INSERT INTO despesas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('d1', 1000, '2026-01-10', 'Mercado', 'pendente', 't', 't')",
      )
      .run();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(existeTabela(sqlite, 'metas')).toBe(true);
    expect(colunasMetas(sqlite)).toEqual(
      expect.arrayContaining(['revisao', 'campos_revisao', 'base_sincronizacao']),
    );
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM despesas WHERE id = 'd1'").get()).toEqual({
      n: 1,
    });
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('banco v8 da UC04 preserva saldo/alerta e recebe metas na 013/014/015', async () => {
    const sqlite = bancoUc04V8();
    sqlite
      .prepare(
        "INSERT INTO saldo_inicial (id, mes, valor_centavos) VALUES (1, '2026-10', 5000)",
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO alertas_emitidos
          (id, mes, anterior_centavos, saldo_centavos, criado_em, transicao)
         VALUES ('a1', '2026-10', 1, -1, '2026-10-01T00:00:00Z', 1)`,
      )
      .run();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(sqlite.prepare('SELECT * FROM saldo_inicial').get()).toMatchObject({
      mes_referencia: '2026-10',
      valor_centavos: 5000,
    });
    expect(sqlite.prepare('SELECT * FROM alertas_emitidos').get()).toMatchObject({
      id: 'a1',
      transicao: 1,
    });
    expect(existeTabela(sqlite, 'metas')).toBe(true);
    expect(colunasMetas(sqlite)).toEqual(
      expect.arrayContaining(['revisao', 'campos_revisao', 'base_sincronizacao']),
    );
  });

  it('v13 com metas iniciais → v15 preserva metas e deriva início só de criado_em válido', async () => {
    const sqlite = await bancoMetasBaseV13();
    inserirMetaBase(sqlite, 'm1', { criadoEm: '2026-02-03T10:00:00.000Z' });
    inserirMetaBase(sqlite, 'm2', {
      tipo: 'gasto',
      criadoEm: 'data-invalida',
      prazo: '2027-06-30',
    });
    inserirMetaBase(sqlite, 'm3', {
      criadoEm: '2028-01-01T00:00:00.000Z',
      prazo: '2027-12-31',
    });

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      inicio: '2026-02-03',
      categoria_id: null,
      valor_acumulado_centavos: null,
      valor_acumulado_atualizado_em: null,
      objetivo: 'Meta m1',
      valor_alvo_centavos: 100000,
      revisao: 0,
      campos_revisao: '{}',
      base_sincronizacao: null,
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
    const sqlite = await bancoMetasBaseV13();
    inserirMetaBase(sqlite, 'm1');
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

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m2')).toMatchObject({
      inicio: '2027-01-01',
      valor_acumulado_centavos: 0,
      valor_acumulado_atualizado_em: '2027-01-02T00:00:00.000Z',
    });
  });

  it('conflito de índice na 013 mantém a versão 12 da develop e remove a tabela metas', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('CREATE INDEX idx_metas_sync ON despesas(sync_status)');
    sqlite.exec('PRAGMA user_version = 7');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      FalhaMigracao,
    );
    expect(versao(sqlite)).toBe(12);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(existeTabela(sqlite, 'metas')).toBe(false);
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('tabela metas incompatível na 013 aborta após a 012, sem apagar dados', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('CREATE TABLE metas (id TEXT PRIMARY KEY)');
    sqlite.exec('PRAGMA user_version = 7');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      EstruturaLegadaInesperada,
    );
    expect(versao(sqlite)).toBe(12);
    expect(colunasMetas(sqlite)).toEqual(['id']);
  });

  it('falha após copiar/renomear na 014 faz rollback e mantém a versão 13', async () => {
    const sqlite = await bancoMetasBaseV13();
    inserirMetaBase(sqlite, 'm1');
    const db = criarAdaptador(sqlite);
    const execOriginal = db.execAsync.bind(db);
    (db as any).execAsync = async (sql: string) => {
      if (sql.includes('ALTER TABLE metas_nova_010 RENAME TO metas')) {
        throw new Error('falha simulada na renomeação');
      }
      return execOriginal(sql);
    };

    await expect(migrarSeNecessario(db)).rejects.toThrow('falha simulada na renomeação');

    expect(versao(sqlite)).toBe(13);
    expect(colunasMetas(sqlite)).toHaveLength(9);
    expect(colunasMetas(sqlite)).not.toContain('inicio');
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: 'Meta m1',
      valor_alvo_centavos: 100000,
    });
    expect(
      (
        sqlite
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'metas_nova_010'")
          .get() as any
      ).n,
    ).toBe(0);
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('resíduo da reconstrução aborta e mantém versão e dados intactos', async () => {
    const sqlite = await bancoMetasBaseV13();
    inserirMetaBase(sqlite, 'm1');
    sqlite.exec('CREATE TABLE metas_nova_010 (id TEXT PRIMARY KEY)');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      ResiduoDeMigracao,
    );

    expect(versao(sqlite)).toBe(13);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM metas').get()).toEqual({ n: 1 });
    expect(colunasMetas(sqlite)).not.toContain('inicio');
  });

  it('v14 → 015 preserva metas e inicializa os metadados de merge', async () => {
    const sqlite = await bancoMetasV14();
    sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
           valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES ('m1', 'Reserva', 'investimento', 100000, '2027-12-31', '2026-01-01',
                 NULL, 50000, '2026-02-01T00:00:00Z', 'sincronizado', NULL,
                 '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')`,
      )
      .run();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(15);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: 'Reserva',
      valor_alvo_centavos: 100000,
      inicio: '2026-01-01',
      valor_acumulado_centavos: 50000,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
      revisao: 0,
      campos_revisao: '{}',
      base_sincronizacao: null,
    });
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('falha na 015 antes da versão faz rollback e mantém v14 intacta', async () => {
    const sqlite = await bancoMetasV14();
    inserirMetaBase(sqlite, 'm1');
    const db = criarAdaptador(sqlite);
    const execOriginal = db.execAsync.bind(db);
    (db as any).execAsync = async (sql: string) => {
      if (sql.includes('PRAGMA user_version = 15')) {
        throw new Error('falha simulada antes da versão 15');
      }
      return execOriginal(sql);
    };

    await expect(migrarSeNecessario(db)).rejects.toThrow('falha simulada antes da versão 15');

    expect(versao(sqlite)).toBe(14);
    expect(colunasMetas(sqlite)).not.toContain('revisao');
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: 'Meta m1',
      valor_alvo_centavos: 100000,
    });
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('015 é idempotente em banco que já possui os metadados', async () => {
    const sqlite = await bancoMetasV14();
    inserirMetaBase(sqlite, 'm1');
    await migrarSeNecessario(criarAdaptador(sqlite));

    sqlite.exec('PRAGMA user_version = 14');
    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(15);
    expect(colunasMetas(sqlite)).toHaveLength(16);
    expect(colunasMetas(sqlite).filter((nome) => nome === 'revisao')).toHaveLength(1);
  });
});

describe('bancos de desenvolvimento com UC12 antiga e sem UC04', () => {
  it('v8 antiga UC12 é reparada com a 008 da UC04 e segue até a versão 11', async () => {
    const sqlite = bancoUc12AntigoV8();
    inserirMetaBase(sqlite, 'm1', { criadoEm: '2026-03-04T10:00:00.000Z' });
    const antes = sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1') as any;

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: antes.objetivo,
      valor_alvo_centavos: antes.valor_alvo_centavos,
      inicio: '2026-03-04',
    });
    expect(sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('v9 antiga UC12 com extensão também é reparada e preserva valor acumulado', async () => {
    const sqlite = bancoUc12AntigoV9();
    sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
           valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES ('m1', 'Reserva', 'investimento', 100000, '2027-12-31', '2026-01-01',
                 NULL, 50000, '2026-02-01T00:00:00Z', 'sincronizado', NULL,
                 '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')`,
      )
      .run();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(sqlite.prepare('SELECT * FROM metas WHERE id = ?').get('m1')).toMatchObject({
      valor_acumulado_centavos: 50000,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
    });
  });

  it('v8 antiga UC12 com metas incompatíveis aborta antes da 008 da UC04', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('CREATE TABLE metas (id TEXT PRIMARY KEY)');
    sqlite.exec('PRAGMA user_version = 8');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      EstruturaLegadaInesperada,
    );

    expect(versao(sqlite)).toBe(8);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(false);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(false);
    expect(colunasMetas(sqlite)).toEqual(['id']);
  });

  it('v8 sem metas e sem UC04 aborta com erro explícito, sem alterar o banco', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('PRAGMA user_version = 8');

    await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toBeInstanceOf(
      BancoUc12SemUc04,
    );

    expect(versao(sqlite)).toBe(8);
    expect(existeTabela(sqlite, 'metas')).toBe(false);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(false);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(false);
  });

  it('v8 antiga UC12 com saldo parcial é reparada sem perder metas', async () => {
    const sqlite = bancoUc12AntigoV8();
    inserirMetaBase(sqlite, 'm1');
    sqlite.exec(
      'CREATE TABLE saldo_inicial (id INTEGER PRIMARY KEY CHECK (id = 1), mes TEXT NOT NULL, valor_centavos INTEGER NOT NULL)',
    );

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(sqlite.prepare('SELECT objetivo FROM metas WHERE id = ?').get('m1')).toMatchObject({
      objetivo: 'Meta m1',
    });
  });

  it('v8 com apenas uma tabela UC04 é completado com segurança', async () => {
    const sqlite = criarBaseUc06();
    sqlite.exec('CREATE TABLE saldo_inicial (id INTEGER PRIMARY KEY CHECK (id = 1), mes TEXT NOT NULL, valor_centavos INTEGER NOT NULL)');
    sqlite.exec('PRAGMA user_version = 8');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(VERSAO_ESQUEMA);
    expect(existeTabela(sqlite, 'saldo_inicial')).toBe(true);
    expect(existeTabela(sqlite, 'alertas_emitidos')).toBe(true);
    expect(existeTabela(sqlite, 'metas')).toBe(true);
  });
});
