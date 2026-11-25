import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DependenciaInesperada,
  DadosLegadosInvalidos,
  EstruturaLegadaInesperada,
  ESTRUTURAS_ESPERADAS,
  FalhaMigracao,
  VersaoBancoDesconhecida,
  garantirColunasRecorrencias,
  garantirTabelaDespesas,
  migrarSeNecessario,
} from '@/db/migrations';
import {
  DDL_ESQUEMA,
  DDL_ESQUEMA_V5,
  DDL_TRIGGER_PERCENTUAL,
  PRAGMAS_SQL,
} from '@/db/schema';

/**
 * Testes das migrações versionadas (E2.2, issue #43 / UC06) em SQLite em memória.
 *
 * LIMITAÇÃO DOCUMENTADA: o adaptador abaixo replica a superfície do expo-sqlite
 * (execAsync/runAsync/getFirstAsync/getAllAsync/withExclusiveTransactionAsync)
 * sobre o better-sqlite3, que é síncrono e single-connection. Ele NÃO replica a
 * conexão separada usada pelo withExclusiveTransactionAsync nativo nem o
 * comportamento async do expo — os testes validam a sequência SQL, a política de
 * abortar sem corrigir dados e o rollback, e NÃO substituem a validação em
 * dispositivo com a API nativa.
 */

const COLUNAS =
  'id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos, limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em';

/** DDL legado (commits 1bc4f74/fe6e5c1): categorias SEM as constraints da E2.1. */
const DDL_LEGADO_CATEGORIAS = `
  CREATE TABLE categorias (
    id TEXT PRIMARY KEY NOT NULL,
    nome TEXT NOT NULL,
    nome_normalizado TEXT NOT NULL,
    padrao INTEGER NOT NULL DEFAULT 0,
    limite_tipo TEXT CHECK (limite_tipo IN ('valor','percentual_renda')),
    limite_centavos INTEGER,
    limite_percentual_centesimos INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'pendente',
    excluido_em TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
  CREATE UNIQUE INDEX idx_categorias_nome_unico ON categorias(nome_normalizado) WHERE excluido_em IS NULL;
  CREATE INDEX idx_categorias_sync ON categorias(sync_status);
`;

/** Definição v6 (faixa provisória): apenas máximo de 100%, sem mínimo de 1%. */
const DDL_TRIGGER_PERCENTUAL_V6 = `
  CREATE TRIGGER trg_categorias_percentual_insert
  BEFORE INSERT ON categorias
  WHEN NEW.limite_tipo = 'percentual_renda'
    AND typeof(NEW.limite_percentual_centesimos) = 'integer'
    AND NEW.limite_percentual_centesimos > 10000
  BEGIN
    SELECT RAISE(ABORT, 'limite_percentual_faixa');
  END;

  CREATE TRIGGER trg_categorias_percentual_update
  BEFORE UPDATE OF limite_tipo, limite_percentual_centesimos ON categorias
  WHEN NEW.limite_tipo = 'percentual_renda'
    AND typeof(NEW.limite_percentual_centesimos) = 'integer'
    AND NEW.limite_percentual_centesimos > 10000
  BEGIN
    SELECT RAISE(ABORT, 'limite_percentual_faixa');
  END;
`;

type Linha = Record<string, unknown>;

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

function novoSqlite(): Database.Database {
  const sqlite = new Database(':memory:');
  sqlite.exec(PRAGMAS_SQL);
  return sqlite;
}

/** Banco legado completo: receitas/recorrencias com dados + categorias sem constraints. */
function bancoLegado(sqlite: Database.Database) {
  sqlite.exec(DDL_ESQUEMA); // cria tabelas/índices no formato atual...
  // ...e substitui categorias pelo formato legado (simula banco anterior à E2.1).
  sqlite.exec('DROP INDEX idx_categorias_nome_unico; DROP INDEX idx_categorias_sync; DROP TABLE categorias;');
  sqlite.exec(DDL_LEGADO_CATEGORIAS);

  sqlite
    .prepare(
      "INSERT INTO recorrencias (id, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('rec-1', 1, 'mes', '2026-01-10', 1, 50000, 'Aluguel', 'pendente', '2026-01-10T08:00:00Z')",
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO receitas (id, valor_centavos, data, titulo, recorrencia_id, sync_status, criado_em, atualizado_em) VALUES ('rec-ex-1', 50000, '2026-01-10', 'Aluguel jan', 'rec-1', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
    )
    .run();
}

function inserirCategoria(
  sqlite: Database.Database,
  dados: { id: string; nome: string; nome_normalizado?: string } & Partial<Linha>,
) {
  const linha = {
    padrao: 0,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'pendente',
    excluido_em: null,
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
    ...dados,
    nome_normalizado: dados.nome_normalizado ?? dados.nome.toLowerCase(),
  };
  sqlite
    .prepare(
      `INSERT INTO categorias (${COLUNAS}) VALUES (@id, @nome, @nome_normalizado, @padrao, @limite_tipo, @limite_centavos, @limite_percentual_centesimos, @sync_status, @excluido_em, @criado_em, @atualizado_em)`,
    )
    .run(linha);
}

const linhasCategorias = (sqlite: Database.Database) =>
  sqlite.prepare(`SELECT ${COLUNAS} FROM categorias ORDER BY id`).all() as any[];

function inserirReceitaValida(sqlite: Database.Database): void {
  sqlite
    .prepare(
      "INSERT INTO receitas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('rx', 1000, '2026-01-10', 'Freela', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
    )
    .run();
}

const versao = (sqlite: Database.Database) =>
  (sqlite.prepare('PRAGMA user_version').get() as any).user_version;

const bancoIntegro = (sqlite: Database.Database) =>
  (sqlite.prepare('PRAGMA integrity_check').get() as any).integrity_check === 'ok';

const sqlCategorias = (sqlite: Database.Database) =>
  (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'categorias'").get() as any)?.sql ??
  '';

const nomesTriggers = (sqlite: Database.Database): string[] =>
  (
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'categorias' ORDER BY name")
      .all() as any[]
  ).map((t) => t.name);

describe('Migrações versionadas (migrarSeNecessario)', () => {
  describe('instalação nova', () => {
    it('cria o esquema completo com constraints e grava a versão', async () => {
      const sqlite = novoSqlite();
      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente');
      expect(nomesTriggers(sqlite)).toEqual([
        'trg_categorias_percentual_insert',
        'trg_categorias_percentual_update',
      ]);
      const objetos = (sqlite.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'idx_%'").all() as any[]).map(
        (o) => o.name,
      );
      expect(objetos).toEqual(
        expect.arrayContaining([
          'idx_receitas_data',
          'idx_receitas_recorrencia',
          'idx_receitas_sync',
          'idx_categorias_nome_unico',
          'idx_categorias_sync',
        ]),
      );
    });

    it('constraints ativas: rejeita registro inválido na base recém-criada', async () => {
      const sqlite = novoSqlite();
      await migrarSeNecessario(criarAdaptador(sqlite));
      expect(() => inserirCategoria(sqlite, { id: 'x', nome: 'X', padrao: 2 })).toThrow(/padrao_valido/);
    });

    it('é idempotente: segunda execução não altera nada', async () => {
      const sqlite = novoSqlite();
      await migrarSeNecessario(criarAdaptador(sqlite));
      await migrarSeNecessario(criarAdaptador(sqlite));
      expect(versao(sqlite)).toBe(9);
    });
  });

  describe('migração de banco legado', () => {
    it('preserva registros, tombstones e padrão, sem sobras temporárias', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa', padrao: 1 });
      inserirCategoria(sqlite, { id: 'a2', nome: 'Transporte', nome_normalizado: 'transporte' });
      inserirCategoria(sqlite, { id: 'a3', nome: 'Velha', excluido_em: '2026-02-01T00:00:00Z' });
      const antes = linhasCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(linhasCategorias(sqlite)).toEqual(antes); // cópia idêntica, inclusive tombstone
      expect(linhasCategorias(sqlite).find((l: any) => l.id === 'a3').excluido_em).toBe('2026-02-01T00:00:00Z');
      const nomes = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as any[]).map(
        (t) => t.name,
      );
      expect(nomes).not.toContain('categorias_nova_001');
      expect(nomes).not.toContain('categorias_legado_001');
    });

    it('recria os índices de categorias vinculados à tabela reconstruída', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      await migrarSeNecessario(criarAdaptador(sqlite));

      const indices = (sqlite
        .prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'categorias'")
        .all() as any[]).map((i) => i.name);
      expect(indices).toEqual(expect.arrayContaining(['idx_categorias_nome_unico', 'idx_categorias_sync']));

      // unicidade ativa: nome ativo duplicado é rejeitado, tombstone libera reuso
      expect(() => inserirCategoria(sqlite, { id: 'dup', nome: 'casa' })).toThrow(/UNIQUE constraint failed/);
      inserirCategoria(sqlite, { id: 'a1-tomb', nome: 'Casa', excluido_em: '2026-03-01T00:00:00Z' });
    });

    it('constraints novas valem para os registros pós-migração', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(() => inserirCategoria(sqlite, { id: 'inv', nome: 'X', limite_tipo: 'valor', limite_centavos: -5 })).toThrow(
        /limite_centavos_valido/,
      );
      expect(() =>
        inserirCategoria(sqlite, { id: 'inv2', nome: 'Y', limite_tipo: 'percentual_renda', limite_centavos: 100 }),
      ).toThrow(/limite_coerente/);
    });

    it('preserva receitas e recorrências, linhas e índices', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      const receitasAntes = sqlite.prepare('SELECT * FROM receitas ORDER BY id').all();
      const recorrenciasAntes = sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all();

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(sqlite.prepare('SELECT * FROM receitas ORDER BY id').all()).toEqual(receitasAntes);
      // A migration 005 apenas acrescenta excluido_em (NULL); todo o resto é preservado.
      expect(sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all()).toEqual(
        (recorrenciasAntes as any[]).map((r) => ({ ...r, excluido_em: null })),
      );
      expect(sqlite.prepare("SELECT recorrencia_id FROM receitas WHERE id = 'rec-ex-1'").get()).toEqual({
        recorrencia_id: 'rec-1',
      });
      const idx = (sqlite.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'idx_receitas_%'").all() as any[]).map(
        (i) => i.name,
      );
      expect(idx).toEqual(expect.arrayContaining(['idx_receitas_data', 'idx_receitas_recorrencia', 'idx_receitas_sync']));
    });

    it('banco já em forma nova com versão 0 (crash entre DDL e versão) apenas grava a versão', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA); // forma nova, sem user_version
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      const sqlAntes = sqlCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toBe(sqlAntes); // sem reconstrução
      expect(linhasCategorias(sqlite)).toHaveLength(1);
    });

    it('migra banco v1 válido até v7, preserva tombstones e normaliza percentual legado', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, {
        id: 'a1',
        nome: 'Casa',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 10_001,
      });
      inserirCategoria(sqlite, {
        id: 'a2',
        nome: 'Velha',
        excluido_em: '2026-02-01T00:00:00Z',
      });
      sqlite.exec('PRAGMA user_version = 1');

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(
        sqlite
          .prepare(
            "SELECT limite_percentual_centesimos AS p, sync_status AS s FROM categorias WHERE id = 'a1'",
          )
          .get(),
      ).toEqual({ p: 10_000, s: 'pendente' });
      expect(
        sqlite
          .prepare("SELECT nome, excluido_em FROM categorias WHERE id = 'a2'")
          .get(),
      ).toEqual({ nome: 'Velha', excluido_em: '2026-02-01T00:00:00Z' });
      expect(sqlCategorias(sqlite)).toContain('9007199254740991');
      expect(bancoIntegro(sqlite)).toBe(true);
      expect(() =>
        inserirCategoria(sqlite, {
          id: 'unsafe',
          nome: 'Unsafe',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 9007199254740992n as any,
        }),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('aborta banco v1 com percentual acima do limite técnico sem perder dados', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, {
        id: 'ruim',
        nome: 'Acima',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 9007199254740992n as any,
      });
      sqlite.exec('PRAGMA user_version = 1');
      const antes = linhasCategorias(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DadosLegadosInvalidos);

      expect(versao(sqlite)).toBe(1);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(sqlCategorias(sqlite)).not.toContain('9007199254740991');
      expect(bancoIntegro(sqlite)).toBe(true);
    });

    it('banco v1 já com DDL novo (crash após reconstrução) apenas grava a versão 3', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      sqlite.exec('PRAGMA user_version = 1');
      const antes = linhasCategorias(sqlite);
      const sqlAntes = sqlCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toBe(sqlAntes);
      expect(linhasCategorias(sqlite)).toEqual(antes);
    });
  });

  describe('migração 003: faixa percentual definitiva por triggers', () => {
    it('banco v2 válido migra para v3 criando os triggers e preservando dados', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, {
        id: 'cem',
        nome: 'Cem',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 10_000,
      });
      inserirCategoria(sqlite, {
        id: 'quase',
        nome: 'Quase',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 9_999,
      });
      inserirCategoria(sqlite, { id: 'sem', nome: 'Sem limite' });
      sqlite.exec('PRAGMA user_version = 2');
      const antes = linhasCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(nomesTriggers(sqlite)).toEqual([
        'trg_categorias_percentual_insert',
        'trg_categorias_percentual_update',
      ]);
      expect(bancoIntegro(sqlite)).toBe(true);
    });

    it('banco v2 com percentual legado fora da faixa é normalizado e rejeita novas escritas fora da faixa', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, {
        id: 'legado',
        nome: 'Legado',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 20_000_000, // 200000%
      });
      sqlite.exec('PRAGMA user_version = 2');

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(
        sqlite
          .prepare("SELECT limite_percentual_centesimos AS p, sync_status AS s FROM categorias WHERE id = 'legado'")
          .get(),
      ).toEqual({ p: 10_000, s: 'pendente' });

      expect(() =>
        inserirCategoria(sqlite, {
          id: 'novo',
          nome: 'Novo',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 10_001,
        }),
      ).toThrow(/limite_percentual_faixa/);

      expect(() =>
        inserirCategoria(sqlite, {
          id: 'abaixo',
          nome: 'Abaixo',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 99,
        }),
      ).toThrow(/limite_percentual_faixa/);

      expect(() =>
        sqlite
          .prepare("UPDATE categorias SET limite_percentual_centesimos = 10001 WHERE id = 'legado'")
          .run(),
      ).toThrow(/limite_percentual_faixa/);

      // tombstone/sync não tocam o limite e continuam permitidos no registro normalizado.
      expect(() =>
        sqlite
          .prepare(
            "UPDATE categorias SET sync_status = 'sincronizado', excluido_em = '2026-11-18T10:00:00Z' WHERE id = 'legado'",
          )
          .run(),
      ).not.toThrow();
    });

    it('a normalização é idempotente: segunda abertura não altera o registro já normalizado', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, {
        id: 'legado',
        nome: 'Legado',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 20_000_000,
      });
      sqlite.exec('PRAGMA user_version = 2');

      await migrarSeNecessario(criarAdaptador(sqlite));
      const depois = sqlite
        .prepare("SELECT limite_percentual_centesimos AS p, atualizado_em AS t FROM categorias WHERE id = 'legado'")
        .get();

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(
        sqlite
          .prepare("SELECT limite_percentual_centesimos AS p, atualizado_em AS t FROM categorias WHERE id = 'legado'")
          .get(),
      ).toEqual(depois);
    });

    it('trigger divergente com o mesmo nome aborta sem alterar dados, trigger ou versão', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      sqlite.exec(
        'CREATE TRIGGER trg_categorias_percentual_insert AFTER INSERT ON categorias BEGIN SELECT 1; END;',
      );
      sqlite.exec('PRAGMA user_version = 2');
      const antes = linhasCategorias(sqlite);
      const sqlTriggerAntes = (
        sqlite
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_categorias_percentual_insert'")
          .get() as any
      ).sql;

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DependenciaInesperada);

      expect(versao(sqlite)).toBe(2);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(nomesTriggers(sqlite)).toEqual(['trg_categorias_percentual_insert']); // update não criado
      expect(
        (
          sqlite
            .prepare("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_categorias_percentual_insert'")
            .get() as any
        ).sql,
      ).toBe(sqlTriggerAntes); // trigger do colega intacto
    });

    it('falha ao criar os triggers reverte tudo e mantém a versão 2', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      sqlite.exec('PRAGMA user_version = 2');
      const antes = linhasCategorias(sqlite);

      const api = criarAdaptador(sqlite);
      const original = (api as any).execAsync.bind(api);
      jest.spyOn(api as any, 'execAsync').mockImplementation(async (...args: unknown[]) => {
        const sql = String(args[0]);
        if (sql.includes('trg_categorias_percentual_insert')) {
          throw new Error('falha simulada ao criar trigger');
        }
        return original(sql);
      });

      await expect(migrarSeNecessario(api)).rejects.toThrow('falha simulada ao criar trigger');

      expect(versao(sqlite)).toBe(2);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(nomesTriggers(sqlite)).toEqual([]);
    });
  });

  describe('migração 007: normalização percentual definitiva', () => {
    it('v6 fora da faixa vira 1%/100%, marca pendente e preserva os dados financeiros', async () => {
      const sqlite = novoSqlite();
      await migrarSeNecessario(criarAdaptador(sqlite));

      // Recria o estado v6: remove os triggers novos e restaura a definição antiga.
      sqlite.exec(
        'DROP TRIGGER IF EXISTS trg_categorias_percentual_insert; DROP TRIGGER IF EXISTS trg_categorias_percentual_update;',
      );
      inserirCategoria(sqlite, {
        id: 'abaixo',
        nome: 'Abaixo',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 50, // 0,50%
      });
      inserirCategoria(sqlite, {
        id: 'acima',
        nome: 'Acima',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 20_000, // 200%
      });
      inserirCategoria(sqlite, {
        id: 'valido',
        nome: 'Valido',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 5_000, // 50%
      });
      sqlite.exec(DDL_TRIGGER_PERCENTUAL_V6);
      sqlite.exec('PRAGMA user_version = 6');

      inserirReceitaValida(sqlite);
      sqlite
        .prepare(
          "INSERT INTO recorrencias (id, tipo, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('serie', 'despesa', 1, 'mes', '2026-01-10', 1, 5000, 'Aluguel', 'pendente', '2026-01-10T08:00:00Z')",
        )
        .run();
      sqlite
        .prepare(
          "INSERT INTO despesas (id, valor_centavos, data, titulo, categoria_id, sync_status, criado_em, atualizado_em) VALUES ('despesa', 5000, '2026-01-10', 'Aluguel', 'abaixo', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
        )
        .run();
      const receitasAntes = sqlite.prepare('SELECT * FROM receitas ORDER BY id').all();
      const seriesAntes = sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all();
      const despesasAntes = sqlite.prepare('SELECT * FROM despesas ORDER BY id').all();

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(
        sqlite
          .prepare(
            "SELECT limite_percentual_centesimos AS p, sync_status AS s FROM categorias WHERE id = 'abaixo'",
          )
          .get(),
      ).toEqual({ p: 100, s: 'pendente' });
      expect(
        sqlite
          .prepare(
            "SELECT limite_percentual_centesimos AS p, sync_status AS s FROM categorias WHERE id = 'acima'",
          )
          .get(),
      ).toEqual({ p: 10_000, s: 'pendente' });
      expect(
        sqlite
          .prepare(
            "SELECT limite_percentual_centesimos AS p, sync_status AS s FROM categorias WHERE id = 'valido'",
          )
          .get(),
      ).toEqual({ p: 5_000, s: 'pendente' });
      expect(
        sqlite
          .prepare('SELECT categoria_id, estado_local FROM categorias_estado ORDER BY categoria_id')
          .all(),
      ).toEqual([
        { categoria_id: 'abaixo', estado_local: 'editado' },
        { categoria_id: 'acima', estado_local: 'editado' },
      ]);

      expect(sqlite.prepare('SELECT * FROM receitas ORDER BY id').all()).toEqual(receitasAntes);
      expect(sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all()).toEqual(seriesAntes);
      expect(sqlite.prepare('SELECT * FROM despesas ORDER BY id').all()).toEqual(despesasAntes);
      expect(nomesTriggers(sqlite)).toEqual([
        'trg_categorias_percentual_insert',
        'trg_categorias_percentual_update',
      ]);
    });
  });

  describe('dados legados inválidos: aborta sem apagar nem corrigir', () => {
    const casos: Array<[string, Record<string, unknown> & { nome?: string }, string]> = [
      [
        'limite percentual incoerente (limite_centavos preenchido)',
        { limite_tipo: 'percentual_renda', limite_centavos: 100 },
        'limite percentual incoerente',
      ],
      ['padrao fora de (0, 1)', { padrao: 2 }, 'padrao fora de (0, 1)'],
      ['nome com 31 caracteres', { nome: 'a'.repeat(31), nome_normalizado: 'a'.repeat(31) }, 'nome fora da faixa'],
      ['sync_status inválido', { sync_status: 'enviado' }, 'sync_status inválido'],
      ['limite sem tipo', { limite_centavos: 100 }, 'limite preenchido sem limite_tipo'],
    ];

    it.each(casos)('%s', async (_titulo, invalido, trechoMotivo) => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'ok-1', nome: 'Casa' });
      inserirCategoria(sqlite, { id: 'ruim', ...invalido, nome: invalido.nome ?? 'Ruim' });
      const antes = linhasCategorias(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DadosLegadosInvalidos);

      expect(versao(sqlite)).toBe(0); // versão não avançou
      expect(linhasCategorias(sqlite)).toEqual(antes); // nenhum dado alterado
      expect(sqlCategorias(sqlite)).not.toContain('limite_coerente'); // tabela legada intacta
      expect(() => {
        const erro = new DadosLegadosInvalidos([{ id: 'ruim', nome: 'Ruim', motivo: trechoMotivo }]);
        expect(erro.message).toContain('ruim');
        expect(erro.message).toContain(trechoMotivo);
      }).not.toThrow();
    });

    it('erro descritivo lista todas as linhas inválidas', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'ruim-1', nome: 'A', padrao: 5 });
      inserirCategoria(sqlite, { id: 'ruim-2', nome: 'B', limite_tipo: 'valor', limite_centavos: -1 });

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('ruim-1');
      expect(mensagem).toContain('ruim-2');
      expect(mensagem).toContain('2 categoria(s) inválida(s)');
    });
  });

  describe('dependências e estrutura inesperadas: aborta de forma controlada', () => {
    it('trigger em categorias aborta a migração', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      sqlite.exec("CREATE TRIGGER trg_cat AFTER INSERT ON categorias BEGIN SELECT 1; END;");

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DependenciaInesperada);
      expect(versao(sqlite)).toBe(0);
    });

    it('FK com nome de tabela entre aspas é detectada via foreign_key_list', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      // Formato que a busca textual em sqlite_master NÃO reconhece (aspas em "categorias").
      sqlite.exec(
        'CREATE TABLE despesas_teste (id TEXT PRIMARY KEY, categoria_id TEXT, ' +
          'FOREIGN KEY (categoria_id) REFERENCES "categorias" (id))',
      );
      const antes = linhasCategorias(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DependenciaInesperada);

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      // tabela de outra funcionalidade intocada
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'despesas_teste'").get()).toBeTruthy();
    });

    it('FK de outra tabela para categorias aborta a migração', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      sqlite.exec(
        "CREATE TABLE despesas_teste (id TEXT PRIMARY KEY, categoria_id TEXT REFERENCES categorias(id))",
      );

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(DependenciaInesperada);
      expect(versao(sqlite)).toBe(0);
    });

    it('índice inesperado em categorias NÃO é eliminado: migração aborta e preserva tudo', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      sqlite.exec('CREATE INDEX idx_categorias_extra ON categorias(criado_em)');
      const antes = linhasCategorias(sqlite);

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('idx_categorias_extra');

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      const indices = (sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'categorias'")
        .all() as any[]).map((i) => i.name);
      expect(indices).toContain('idx_categorias_extra'); // desconhecido preservado
      expect(indices).toContain('idx_categorias_nome_unico'); // originais intactos
      expect(indices).toContain('idx_categorias_sync');
      expect(sqlCategorias(sqlite)).not.toContain('limite_coerente');
    });

    it('coluna extra criada por colega aborta a migração', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      sqlite.exec('ALTER TABLE categorias ADD COLUMN cor TEXT');

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(EstruturaLegadaInesperada);
      expect(versao(sqlite)).toBe(0);
      expect((sqlite.prepare('PRAGMA table_info(categorias)').all() as any[]).map((c) => c.name)).toContain('cor');
    });
  });

  describe('forma nova inconsistente com versão 0: valida antes de avançar', () => {
    /** DDL com o texto limite_coerente, porém sem as constraints nomeadas da E2.1. */
    const DDL_IMPOSTOR = `
      CREATE TABLE categorias (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        nome_normalizado TEXT NOT NULL,
        padrao INTEGER NOT NULL DEFAULT 0,
        limite_tipo TEXT,
        limite_centavos INTEGER,
        limite_percentual_centesimos INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'pendente',
        excluido_em TEXT,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        CONSTRAINT limite_coerente CHECK (limite_tipo IS NULL OR limite_tipo IN ('valor'))
      );
      CREATE UNIQUE INDEX idx_categorias_nome_unico ON categorias(nome_normalizado) WHERE excluido_em IS NULL;
      CREATE INDEX idx_categorias_sync ON categorias(sync_status);
    `;

    /** Mesma forma, mas sem a coluna limite_percentual_centesimos e sem constraints nomeadas. */
    const DDL_SEM_COLUNA = `
      CREATE TABLE categorias (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        nome_normalizado TEXT NOT NULL,
        padrao INTEGER NOT NULL DEFAULT 0,
        limite_tipo TEXT,
        limite_centavos INTEGER,
        sync_status TEXT NOT NULL DEFAULT 'pendente',
        excluido_em TEXT,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL,
        CONSTRAINT limite_coerente CHECK (limite_tipo IS NULL OR limite_tipo IN ('valor'))
      );
      CREATE UNIQUE INDEX idx_categorias_nome_unico ON categorias(nome_normalizado) WHERE excluido_em IS NULL;
      CREATE INDEX idx_categorias_sync ON categorias(sync_status);
    `;

    it('índice ausente aborta sem avançar a versão e preserva dados', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      sqlite.exec('DROP INDEX idx_categorias_sync');
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      const antes = linhasCategorias(sqlite);

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('ausentes: [idx_categorias_sync]');

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
    });

    it('constraints nomeadas ausentes no DDL abortam sem avançar a versão', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_IMPOSTOR);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      const antes = linhasCategorias(sqlite);

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('constraints ausentes');

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
    });

    it('coluna ausente aborta sem avançar a versão', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_SEM_COLUNA);
      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(/colunas .*ausentes/);
      expect(versao(sqlite)).toBe(0);
      expect(
        (sqlite.prepare('PRAGMA table_info(categorias)').all() as any[]).map((c) => c.name),
      ).not.toContain('limite_percentual_centesimos');
    });
  });

  describe('rollback', () => {
    it('falha no meio da reconstrução reverte tabela, dados, índices e versão', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      const antes = linhasCategorias(sqlite);

      const api = criarAdaptador(sqlite);
      const original = (api as any).runAsync.bind(api);
      jest.spyOn(api as any, 'runAsync').mockImplementation(async (...args: unknown[]) => {
        if (String(args[0]).includes('INSERT INTO categorias_nova_001')) {
          throw new Error('falha simulada no meio da migração');
        }
        return original(...args);
      });

      await expect(migrarSeNecessario(api)).rejects.toThrow('falha simulada no meio da migração');

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(sqlCategorias(sqlite)).not.toContain('limite_coerente'); // tabela legada restaurada
      const nomes = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','index')").all() as any[]).map(
        (o) => o.name,
      );
      expect(nomes).not.toContain('categorias_nova_001'); // temporária desfeita pelo rollback
      expect(nomes).toContain('idx_categorias_nome_unico'); // índices restaurados pelo rollback
    });
  });

  describe('versões', () => {
    it('versão futura/desconhecida é rejeitada, sem tocar o banco', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      sqlite.exec('PRAGMA user_version = 99');
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      const antes = linhasCategorias(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(VersaoBancoDesconhecida);
      expect(versao(sqlite)).toBe(99);
      expect(linhasCategorias(sqlite)).toEqual(antes);
    });

    it('FalhaMigracao na pós-verificação não é confundida com dados legados', () => {
      expect(new FalhaMigracao('teste').name).toBe('FalhaMigracao');
      expect(new DadosLegadosInvalidos([]).message).toContain('Nada foi alterado');
    });
  });

  describe('resíduo de migração anterior (categorias_nova_001)', () => {
    it('objeto temporário preexistente aborta sem reutilizar, excluir ou sobrescrever', async () => {
      const sqlite = novoSqlite();
      bancoLegado(sqlite);
      inserirCategoria(sqlite, { id: 'a1', nome: 'Casa' });
      // Resíduo com estrutura arbitrária: NÃO deve ser tocado pela migração.
      sqlite.exec('CREATE TABLE categorias_nova_001 (id TEXT PRIMARY KEY, lixo TEXT NOT NULL)');
      const antes = linhasCategorias(sqlite);

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('categorias_nova_001');
      expect(mensagem).toContain('Nada foi reutilizado');

      expect(versao(sqlite)).toBe(0);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(sqlCategorias(sqlite)).not.toContain('limite_coerente'); // tabela legada intacta
      const colunasResiduo = (sqlite.prepare('PRAGMA table_info(categorias_nova_001)').all() as any[]).map(
        (c) => c.name,
      );
      expect(colunasResiduo).toEqual(['id', 'lixo']); // resíduo preservado, não sobrescrito
    });
  });

  describe('instalação nova: banco vazio × banco parcialmente inicializado', () => {
    /** Banco parcial compatível: receitas/recorrencias canônicas, sem categorias (ex.: app 1bc4f74). */
    function bancoParcialCompativel(): Database.Database {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      sqlite.exec(
        'DROP INDEX idx_categorias_nome_unico; DROP INDEX idx_categorias_sync; DROP TABLE categorias;',
      );
      return sqlite;
    }

    /** Banco parcial com apenas uma das tabelas canônicas (a outra será criada pelo DDL). */
    function bancoParcialSomente(tabelaExistente: 'receitas' | 'recorrencias'): Database.Database {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      sqlite.exec('DROP INDEX idx_categorias_nome_unico; DROP INDEX idx_categorias_sync; DROP TABLE categorias;');
      // Insere antes de dropar a tabela pai: a FK de receitas exige recorrencias para o INSERT.
      if (tabelaExistente === 'receitas') inserirReceitaValida(sqlite);
      sqlite.exec(tabelaExistente === 'receitas' ? 'DROP TABLE recorrencias' : 'DROP TABLE receitas');
      return sqlite;
    }

    /** Tabela receitas com uma divergência real (tipo, NOT NULL ou PK) e os índices canônicos. */
    function bancoReceitasDivergente(sqlId: string, sqlDescricao = 'descricao TEXT'): Database.Database {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      sqlite.exec(
        'DROP INDEX idx_categorias_nome_unico; DROP INDEX idx_categorias_sync; DROP TABLE categorias; DROP TABLE receitas;',
      );
      sqlite.exec(`
        CREATE TABLE receitas (
          ${sqlId},
          valor_centavos INTEGER NOT NULL,
          data TEXT NOT NULL,
          titulo TEXT NOT NULL,
          ${sqlDescricao},
          recorrencia_id TEXT REFERENCES recorrencias(id),
          sync_status TEXT NOT NULL DEFAULT 'pendente',
          excluido_em TEXT,
          criado_em TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );
        CREATE INDEX idx_receitas_data ON receitas(data);
        CREATE INDEX idx_receitas_recorrencia ON receitas(recorrencia_id);
        CREATE INDEX idx_receitas_sync ON receitas(sync_status);
      `);
      inserirReceitaValida(sqlite);
      return sqlite;
    }

    it('banco realmente vazio instala normalmente', async () => {
      const sqlite = novoSqlite();
      await migrarSeNecessario(criarAdaptador(sqlite));
      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente');
    });

    it('banco parcial COM tabelas canônicas completa a instalação preservando dados', async () => {
      const sqlite = bancoParcialCompativel();
      sqlite
        .prepare(
          "INSERT INTO receitas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('r1', 1000, '2026-01-10', 'Freela', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
        )
        .run();

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente'); // categorias criada
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1); // dado preservado
    });

    it('banco parcial somente com receitas completa a instalação e preserva os dados', async () => {
      const sqlite = bancoParcialSomente('receitas');

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente');
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1); // dado preservado
      expect(
        sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'").get(),
      ).toBeTruthy(); // tabela ausente criada pelo DDL
    });

    it('banco parcial somente com recorrencias completa a instalação e preserva os dados', async () => {
      const sqlite = bancoParcialSomente('recorrencias');
      sqlite
        .prepare(
          "INSERT INTO recorrencias (id, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('rec-1', 1, 'mes', '2026-01-10', 1, 50000, 'Aluguel', 'pendente', '2026-01-10T08:00:00Z')",
        )
        .run();

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(9);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente');
      expect(sqlite.prepare('SELECT * FROM recorrencias').all()).toHaveLength(1); // dado preservado
      expect(
        sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'receitas'").get(),
      ).toBeTruthy(); // tabela ausente criada pelo DDL
    });

    it('banco parcial com tabela divergente aborta, preservando objetos e versão', async () => {
      const sqlite = bancoParcialCompativel();
      sqlite.exec('ALTER TABLE receitas ADD COLUMN obs TEXT');
      inserirReceitaValida(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(
        /"receitas" tem 11 colunas; o esquema canônico tem 10/,
      );

      expect(versao(sqlite)).toBe(0); // versão NÃO marcada
      expect(sqlCategorias(sqlite)).toBe(''); // categorias NÃO foi criada
      expect(
        (sqlite.prepare('PRAGMA table_info(receitas)').all() as any[]).map((c) => c.name),
      ).toContain('obs'); // alteração do colega preservada
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1); // dado preservado
    });

    it('banco parcial com tipo divergente em receitas aborta, preservando dados', async () => {
      const sqlite = bancoReceitasDivergente('id TEXT PRIMARY KEY NOT NULL', 'descricao INTEGER');

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(/diverge do esquema canônico/);

      expect(versao(sqlite)).toBe(0);
      expect(sqlCategorias(sqlite)).toBe('');
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1);
      expect((sqlite.prepare('PRAGMA table_info(receitas)').all() as any[])[4].type).toBe('INTEGER');
    });

    it('banco parcial com NOT NULL divergente em receitas aborta, preservando dados', async () => {
      const sqlite = bancoReceitasDivergente(
        'id TEXT PRIMARY KEY NOT NULL',
        "descricao TEXT NOT NULL DEFAULT ''",
      );

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(/diverge do esquema canônico/);

      expect(versao(sqlite)).toBe(0);
      expect(sqlCategorias(sqlite)).toBe('');
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1);
      expect((sqlite.prepare('PRAGMA table_info(receitas)').all() as any[])[4].notnull).toBe(1);
    });

    it('banco parcial com chave primária divergente em receitas aborta, preservando dados', async () => {
      const sqlite = bancoReceitasDivergente('id TEXT NOT NULL');

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(/diverge do esquema canônico/);

      expect(versao(sqlite)).toBe(0);
      expect(sqlCategorias(sqlite)).toBe('');
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1);
      expect((sqlite.prepare('PRAGMA table_info(receitas)').all() as any[])[0].pk).toBe(0);
    });

    it('banco parcial com objeto inesperado aborta, preservando objetos e versão', async () => {
      const sqlite = bancoParcialCompativel();
      sqlite.exec('CREATE TABLE despesas_teste (id TEXT PRIMARY KEY)');
      inserirReceitaValida(sqlite);

      let mensagem = '';
      await migrarSeNecessario(criarAdaptador(sqlite)).catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('despesas_teste');

      expect(versao(sqlite)).toBe(0);
      expect(sqlCategorias(sqlite)).toBe('');
      expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'despesas_teste'").get()).toBeTruthy();
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1);
    });

    it('banco parcial com índice inesperado em receitas aborta', async () => {
      const sqlite = bancoParcialCompativel();
      sqlite.exec('CREATE INDEX idx_receitas_extra ON receitas(data)');
      inserirReceitaValida(sqlite);

      await expect(migrarSeNecessario(criarAdaptador(sqlite))).rejects.toThrow(/idx_receitas_extra/);
      expect(versao(sqlite)).toBe(0);
      expect(sqlCategorias(sqlite)).toBe('');
    });

    it('guarda contra desvio: assinaturas canônicas batem com um banco recém-criado', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      const recorrencias = (sqlite.prepare('PRAGMA table_info(recorrencias)').all() as any[]).map((c) => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull,
        pk: c.pk,
      }));
      expect(recorrencias).toEqual([
        { name: 'id', type: 'TEXT', notnull: 1, pk: 1 },
        { name: 'tipo', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'intervalo', type: 'INTEGER', notnull: 1, pk: 0 },
        { name: 'unidade', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'inicio', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'termino', type: 'TEXT', notnull: 0, pk: 0 },
        { name: 'ativa', type: 'INTEGER', notnull: 1, pk: 0 },
        { name: 'valor_centavos', type: 'INTEGER', notnull: 1, pk: 0 },
        { name: 'titulo', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'descricao', type: 'TEXT', notnull: 0, pk: 0 },
        { name: 'categoria_id', type: 'TEXT', notnull: 0, pk: 0 },
        { name: 'fixa_ou_variavel', type: 'TEXT', notnull: 0, pk: 0 },
        { name: 'essencial', type: 'INTEGER', notnull: 0, pk: 0 },
        { name: 'sync_status', type: 'TEXT', notnull: 1, pk: 0 },
        { name: 'atualizado_em', type: 'TEXT', notnull: 1, pk: 0 },
      ]);
      const receitas = (sqlite.prepare('PRAGMA table_info(receitas)').all() as any[]).map((c) => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull,
        pk: c.pk,
      }));
      expect(receitas).toEqual(ESTRUTURAS_ESPERADAS.receitas);
    });
  });
});

/** Fixtures históricas independentes do DDL_ESQUEMA atual. */
const DDL_RECORRENCIAS_UC01 = `
  CREATE TABLE IF NOT EXISTS recorrencias (
    id TEXT PRIMARY KEY NOT NULL,
    intervalo INTEGER NOT NULL CHECK (intervalo > 0),
    unidade TEXT NOT NULL CHECK (unidade IN ('dia','mes','ano')),
    inicio TEXT NOT NULL,
    termino TEXT,
    ativa INTEGER NOT NULL DEFAULT 1,
    valor_centavos INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pendente',
    atualizado_em TEXT NOT NULL
  );
`;

const DDL_RECORRENCIAS_UC02 = `
  CREATE TABLE IF NOT EXISTS recorrencias (
    id TEXT PRIMARY KEY NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'receita'
      CHECK (tipo IN ('receita', 'despesa')),
    intervalo INTEGER NOT NULL CHECK (intervalo > 0),
    unidade TEXT NOT NULL CHECK (unidade IN ('dia','mes','ano')),
    inicio TEXT NOT NULL,
    termino TEXT,
    ativa INTEGER NOT NULL DEFAULT 1,
    valor_centavos INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria_id TEXT,
    fixa_ou_variavel TEXT CHECK (
      fixa_ou_variavel IS NULL OR
      fixa_ou_variavel IN ('fixa', 'variavel')
    ),
    essencial INTEGER CHECK (
      essencial IS NULL OR essencial IN (0, 1)
    ),
    sync_status TEXT NOT NULL DEFAULT 'pendente',
    atualizado_em TEXT NOT NULL
  );
`;

const ALTERS_UC02 = [
  `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita' CHECK (tipo IN ('receita', 'despesa'))`,
  'ALTER TABLE recorrencias ADD COLUMN categoria_id TEXT',
  `ALTER TABLE recorrencias ADD COLUMN fixa_ou_variavel TEXT CHECK (fixa_ou_variavel IS NULL OR fixa_ou_variavel IN ('fixa', 'variavel'))`,
  `ALTER TABLE recorrencias ADD COLUMN essencial INTEGER CHECK (essencial IS NULL OR essencial IN (0, 1))`,
];

const COLUNAS_NOVAS = ['tipo', 'categoria_id', 'fixa_ou_variavel', 'essencial'] as const;

function bancoRecorrenciasBase(): Database.Database {
  const sqlite = novoSqlite();
  sqlite.exec(DDL_RECORRENCIAS_UC01);
  return sqlite;
}

function inserirRecorrenciaBase(sqlite: Database.Database): void {
  sqlite
    .prepare(
      "INSERT INTO recorrencias (id, intervalo, unidade, inicio, ativa, valor_centavos, titulo, descricao, sync_status, atualizado_em) VALUES ('rec-1', 1, 'mes', '2026-01-10', 1, 50000, 'Aluguel', 'Contrato', 'pendente', '2026-01-10T08:00:00Z')",
    )
    .run();
}

const colunasRecorrencias = (sqlite: Database.Database): string[] =>
  (sqlite.prepare('PRAGMA table_info(recorrencias)').all() as any[]).map((c) => c.name);

async function executarGarantia(sqlite: Database.Database): Promise<void> {
  await garantirColunasRecorrencias(criarAdaptador(sqlite));
}

describe('garantirColunasRecorrencias', () => {
  it('UC01 antiga: adiciona as quatro colunas, preserva dados e usa tipo=receita', async () => {
    const sqlite = bancoRecorrenciasBase();
    inserirRecorrenciaBase(sqlite);
    sqlite.exec('PRAGMA user_version = 0');

    await executarGarantia(sqlite);

    expect(colunasRecorrencias(sqlite)).toEqual([
      'id',
      'intervalo',
      'unidade',
      'inicio',
      'termino',
      'ativa',
      'valor_centavos',
      'titulo',
      'descricao',
      'sync_status',
      'atualizado_em',
      ...COLUNAS_NOVAS,
    ]);

    const linha = sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get() as any;
    expect(linha).toMatchObject({
      id: 'rec-1',
      intervalo: 1,
      unidade: 'mes',
      inicio: '2026-01-10',
      termino: null,
      ativa: 1,
      valor_centavos: 50000,
      titulo: 'Aluguel',
      descricao: 'Contrato',
      sync_status: 'pendente',
      atualizado_em: '2026-01-10T08:00:00Z',
      tipo: 'receita',
      categoria_id: null,
      fixa_ou_variavel: null,
      essencial: null,
    });
    expect(versao(sqlite)).toBe(0);
  });

  it('UC02 nova: não altera estrutura nem dados', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_RECORRENCIAS_UC02);
    sqlite
      .prepare(
        "INSERT INTO recorrencias (id, tipo, intervalo, unidade, inicio, ativa, valor_centavos, titulo, categoria_id, sync_status, atualizado_em) VALUES ('rec-2', 'despesa', 1, 'mes', '2026-02-10', 1, 25000, 'Internet', 'casa', 'pendente', '2026-02-10T08:00:00Z')",
      )
      .run();
    sqlite.exec('PRAGMA user_version = 3');

    const sqlAntes = (
      sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'").get() as any
    ).sql;
    const linhaAntes = sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-2'").get();

    await executarGarantia(sqlite);

    const sqlDepois = (
      sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'").get() as any
    ).sql;
    expect(sqlDepois).toBe(sqlAntes);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-2'").get()).toEqual(linhaAntes);
    expect(versao(sqlite)).toBe(3);
  });

  it('não altera user_version', async () => {
    const sqlite = bancoRecorrenciasBase();
    sqlite.exec('PRAGMA user_version = 3');

    await executarGarantia(sqlite);

    expect(versao(sqlite)).toBe(3);
  });

  it.each([1, 2, 3])(
    'base histórica com %i coluna(s) nova(s): acrescenta as restantes',
    async (quantidade) => {
      const sqlite = bancoRecorrenciasBase();
      inserirRecorrenciaBase(sqlite);
      for (let i = 0; i < quantidade; i++) sqlite.exec(ALTERS_UC02[i]);
      sqlite.exec('PRAGMA user_version = 3');

      await executarGarantia(sqlite);

      expect(colunasRecorrencias(sqlite)).toEqual([
        'id',
        'intervalo',
        'unidade',
        'inicio',
        'termino',
        'ativa',
        'valor_centavos',
        'titulo',
        'descricao',
        'sync_status',
        'atualizado_em',
        ...COLUNAS_NOVAS,
      ]);

      const linha = sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get() as any;
      expect(linha.tipo).toBe('receita');
      expect(linha.categoria_id).toBeNull();
      expect(linha.fixa_ou_variavel).toBeNull();
      expect(linha.essencial).toBeNull();
      expect(versao(sqlite)).toBe(3);
    },
  );

  function bancoComAlters(alters: string[]): Database.Database {
    const sqlite = bancoRecorrenciasBase();
    inserirRecorrenciaBase(sqlite);
    for (const alter of alters) sqlite.exec(alter);
    sqlite.exec('PRAGMA user_version = 3');
    return sqlite;
  }

  async function esperarEstruturaInvalida(alters: string[], totalColunas = 15): Promise<void> {
    const sqlite = bancoComAlters(alters);

    await expect(executarGarantia(sqlite)).rejects.toThrow(FalhaMigracao);

    expect(colunasRecorrencias(sqlite)).toHaveLength(totalColunas);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toBeTruthy();
    expect(versao(sqlite)).toBe(3);
  }

  const ALTER_TIPO_SEM_CHECK =
    `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita'`;
  const ALTER_TIPO_CHECK_DIVERGENTE =
    `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita' CHECK (tipo IN ('receita'))`;
  const ALTER_TIPO_CHECK_ENFRAQUECIDO =
    `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita' CHECK (tipo IN ('receita', 'despesa') OR 1)`;
  const ALTER_CATEGORIA_COM_CHECK =
    `ALTER TABLE recorrencias ADD COLUMN categoria_id TEXT CHECK (tipo IN ('receita', 'despesa'))`;
  const ALTER_FIXA_SEM_CHECK = 'ALTER TABLE recorrencias ADD COLUMN fixa_ou_variavel TEXT';
  const ALTER_ESSENCIAL_SEM_NULL =
    'ALTER TABLE recorrencias ADD COLUMN essencial INTEGER CHECK (essencial IN (0, 1))';
  const ALTER_TIPO_INTEGER =
    `ALTER TABLE recorrencias ADD COLUMN tipo INTEGER NOT NULL DEFAULT 'receita' CHECK (tipo IN ('receita', 'despesa'))`;
  const ALTER_TIPO_NULLABLE =
    `ALTER TABLE recorrencias ADD COLUMN tipo TEXT DEFAULT 'receita' CHECK (tipo IN ('receita', 'despesa'))`;
  const ALTER_TIPO_DEFAULT_DIVERGENTE =
    `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('receita', 'despesa'))`;

  it('rejeita CHECK ausente em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_SEM_CHECK,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita CHECK divergente em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_CHECK_DIVERGENTE,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita CHECK enfraquecido em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_CHECK_ENFRAQUECIDO,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita CHECK de tipo associado a categoria_id', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_SEM_CHECK,
      ALTER_CATEGORIA_COM_CHECK,
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita CHECK ausente em fixa_ou_variavel', async () => {
    await esperarEstruturaInvalida([
      ALTERS_UC02[0],
      ALTERS_UC02[1],
      ALTER_FIXA_SEM_CHECK,
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita CHECK enfraquecido em essencial', async () => {
    await esperarEstruturaInvalida([
      ALTERS_UC02[0],
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTER_ESSENCIAL_SEM_NULL,
    ]);
  });

  it('rejeita estrutura desconhecida com coluna extra', async () => {
    await esperarEstruturaInvalida([
      ...ALTERS_UC02,
      'ALTER TABLE recorrencias ADD COLUMN obs TEXT',
    ], 16);
  });

  it('rejeita ordem de colunas incompatível com as assinaturas', async () => {
    await esperarEstruturaInvalida([
      ALTERS_UC02[1],
      ALTERS_UC02[0],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita tipo incompatível em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_INTEGER,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita NOT NULL incompatível em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_NULLABLE,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it('rejeita default incompatível em tipo', async () => {
    await esperarEstruturaInvalida([
      ALTER_TIPO_DEFAULT_DIVERGENTE,
      ALTERS_UC02[1],
      ALTERS_UC02[2],
      ALTERS_UC02[3],
    ]);
  });

  it.each([
    ['terceiro', 'fixa_ou_variavel'],
    ['quarto', 'essencial'],
  ])('faz rollback integral quando o %s ALTER falha', async (_nome, coluna) => {
    const sqlite = bancoRecorrenciasBase();
    inserirRecorrenciaBase(sqlite);
    sqlite.exec('PRAGMA user_version = 3');
    const api = criarAdaptador(sqlite);

    await expect(
      api.withExclusiveTransactionAsync(async (tx: any) => {
        const original = tx.execAsync.bind(tx);
        jest.spyOn(tx, 'execAsync').mockImplementation(async (...args: unknown[]) => {
          if (String(args[0]).includes(`ADD COLUMN ${coluna}`)) {
            throw new Error('falha simulada no ALTER');
          }
          return original(...args);
        });

        await garantirColunasRecorrencias(tx);
      }),
    ).rejects.toThrow('falha simulada no ALTER');

    expect(colunasRecorrencias(sqlite)).toHaveLength(11);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toMatchObject({
      id: 'rec-1',
      valor_centavos: 50000,
      titulo: 'Aluguel',
    });
    expect(versao(sqlite)).toBe(3);
    expect(bancoIntegro(sqlite)).toBe(true);
  });
});

const DDL_RECEITAS_UC01 = `
  CREATE TABLE IF NOT EXISTS receitas (
    id TEXT PRIMARY KEY NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    data TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    recorrencia_id TEXT REFERENCES recorrencias(id),
    sync_status TEXT NOT NULL DEFAULT 'pendente',
    excluido_em TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
`;

const DDL_DESPESAS_UC02 = `
  CREATE TABLE IF NOT EXISTS despesas (
    id TEXT PRIMARY KEY NOT NULL,
    valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
    data TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria_id TEXT,
    fixa_ou_variavel TEXT CHECK (
      fixa_ou_variavel IS NULL OR
      fixa_ou_variavel IN ('fixa', 'variavel')
    ),
    essencial INTEGER CHECK (
      essencial IS NULL OR essencial IN (0, 1)
    ),
    recorrencia_id TEXT REFERENCES recorrencias(id),
    sync_status TEXT NOT NULL DEFAULT 'pendente',
    excluido_em TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
`;

const DDL_INDICES_DESPESAS_UC02 = [
  'CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data);',
  'CREATE INDEX IF NOT EXISTS idx_despesas_categoria_data ON despesas(categoria_id, data);',
  'CREATE INDEX IF NOT EXISTS idx_despesas_recorrencia ON despesas(recorrencia_id);',
  'CREATE INDEX IF NOT EXISTS idx_despesas_sync ON despesas(sync_status);',
];

function bancoUc01SemDespesas(): Database.Database {
  const sqlite = novoSqlite();
  sqlite.exec(DDL_RECORRENCIAS_UC01);
  sqlite.exec(DDL_RECEITAS_UC01);
  inserirRecorrenciaBase(sqlite);
  sqlite.exec('PRAGMA user_version = 3');
  return sqlite;
}

function bancoUc02ComDespesas(): Database.Database {
  const sqlite = bancoUc01SemDespesas();
  sqlite.exec(DDL_DESPESAS_UC02);
  for (const ddl of DDL_INDICES_DESPESAS_UC02) sqlite.exec(ddl);
  return sqlite;
}

function inserirDespesasUc02(sqlite: Database.Database): void {
  sqlite
    .prepare(
      "INSERT INTO despesas (id, valor_centavos, data, titulo, categoria_id, recorrencia_id, sync_status, criado_em, atualizado_em) VALUES ('desp-1', 1000, '2026-01-10', 'Mercado', 'casa', 'rec-1', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO despesas (id, valor_centavos, data, titulo, categoria_id, recorrencia_id, sync_status, criado_em, atualizado_em) VALUES ('desp-2', 2000, '2026-01-11', 'Farmacia', null, null, 'pendente', '2026-01-11T08:00:00Z', '2026-01-11T08:00:00Z')",
    )
    .run();
}

const colunasDespesas = (sqlite: Database.Database): string[] =>
  (sqlite.prepare('PRAGMA table_info(despesas)').all() as any[]).map((c) => c.name);

const indicesDespesas = (sqlite: Database.Database) =>
  sqlite
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'despesas' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
    )
    .all() as { name: string; sql: string }[];

async function executarGarantiaDespesas(sqlite: Database.Database): Promise<void> {
  await garantirTabelaDespesas(criarAdaptador(sqlite));
}

describe('garantirTabelaDespesas', () => {
  it('UC01 sem despesas: cria a tabela, a FK e os quatro índices', async () => {
    const sqlite = bancoUc01SemDespesas();

    await executarGarantiaDespesas(sqlite);

    expect(colunasDespesas(sqlite)).toEqual([
      'id',
      'valor_centavos',
      'data',
      'titulo',
      'descricao',
      'categoria_id',
      'fixa_ou_variavel',
      'essencial',
      'recorrencia_id',
      'sync_status',
      'excluido_em',
      'criado_em',
      'atualizado_em',
    ]);
    expect(indicesDespesas(sqlite).map((i) => i.name)).toEqual([
      'idx_despesas_categoria_data',
      'idx_despesas_data',
      'idx_despesas_recorrencia',
      'idx_despesas_sync',
    ]);

    const fks = sqlite.prepare('PRAGMA foreign_key_list(despesas)').all() as any[];
    expect(fks).toHaveLength(1);
    expect(fks[0]).toMatchObject({
      table: 'recorrencias',
      from: 'recorrencia_id',
      to: 'id',
    });
    expect(versao(sqlite)).toBe(3);
  });

  it('UC01: FK impede recorrencia_id inexistente', async () => {
    const sqlite = bancoUc01SemDespesas();
    await executarGarantiaDespesas(sqlite);
    sqlite.exec('PRAGMA foreign_keys = ON');

    expect(() =>
      sqlite
        .prepare(
          "INSERT INTO despesas (id, valor_centavos, data, titulo, recorrencia_id, criado_em, atualizado_em) VALUES ('invalida', 100, '2026-01-10', 'X', 'nao-existe', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
        )
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM despesas").get()).toEqual({ n: 0 });
  });

  it('UC02 com despesas existentes: preserva registros e estrutura', async () => {
    const sqlite = bancoUc02ComDespesas();
    inserirDespesasUc02(sqlite);
    const tabelaAntes = (
      sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get() as any
    ).sql;
    const indicesAntes = indicesDespesas(sqlite);
    const linhasAntes = sqlite.prepare('SELECT * FROM despesas ORDER BY id').all();

    await executarGarantiaDespesas(sqlite);

    expect(
      (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get() as any).sql,
    ).toBe(tabelaAntes);
    expect(indicesDespesas(sqlite)).toEqual(indicesAntes);
    expect(sqlite.prepare('SELECT * FROM despesas ORDER BY id').all()).toEqual(linhasAntes);
    expect(versao(sqlite)).toBe(3);
  });

  it('tabela canônica com um índice ausente: cria somente o faltante', async () => {
    const sqlite = bancoUc01SemDespesas();
    sqlite.exec(DDL_DESPESAS_UC02);
    for (const ddl of DDL_INDICES_DESPESAS_UC02.slice(0, 3)) sqlite.exec(ddl);
    inserirDespesasUc02(sqlite);
    const indicesAntes = indicesDespesas(sqlite);
    const linhasAntes = sqlite.prepare('SELECT * FROM despesas ORDER BY id').all();

    await executarGarantiaDespesas(sqlite);

    const indicesDepois = indicesDespesas(sqlite);
    expect(indicesDepois.map((i) => i.name)).toEqual([
      'idx_despesas_categoria_data',
      'idx_despesas_data',
      'idx_despesas_recorrencia',
      'idx_despesas_sync',
    ]);
    for (const antes of indicesAntes) {
      expect(indicesDepois.find((i) => i.name === antes.name)?.sql).toBe(antes.sql);
    }
    expect(sqlite.prepare('SELECT * FROM despesas ORDER BY id').all()).toEqual(linhasAntes);
    expect(versao(sqlite)).toBe(3);
  });

  it('execução repetida é idempotente', async () => {
    const sqlite = bancoUc02ComDespesas();
    inserirDespesasUc02(sqlite);
    const tabelaAntes = (
      sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get() as any
    ).sql;
    const indicesAntes = indicesDespesas(sqlite);
    const linhasAntes = sqlite.prepare('SELECT * FROM despesas ORDER BY id').all();

    await executarGarantiaDespesas(sqlite);
    await executarGarantiaDespesas(sqlite);

    expect(
      (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get() as any).sql,
    ).toBe(tabelaAntes);
    expect(indicesDespesas(sqlite)).toEqual(indicesAntes);
    expect(sqlite.prepare('SELECT * FROM despesas ORDER BY id').all()).toEqual(linhasAntes);
    expect(versao(sqlite)).toBe(3);
  });

  it('não altera user_version', async () => {
    const sqlite = bancoUc01SemDespesas();
    sqlite.exec('PRAGMA user_version = 0');

    await executarGarantiaDespesas(sqlite);

    expect(versao(sqlite)).toBe(0);
  });

  const COLUNAS_DESPESAS_BASE: Record<string, string> = {
    id: 'id TEXT PRIMARY KEY NOT NULL',
    valor_centavos: 'valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0)',
    data: 'data TEXT NOT NULL',
    titulo: 'titulo TEXT NOT NULL',
    descricao: 'descricao TEXT',
    categoria_id: 'categoria_id TEXT',
    fixa_ou_variavel:
      "fixa_ou_variavel TEXT CHECK (fixa_ou_variavel IS NULL OR fixa_ou_variavel IN ('fixa', 'variavel'))",
    essencial: 'essencial INTEGER CHECK (essencial IS NULL OR essencial IN (0, 1))',
    recorrencia_id: 'recorrencia_id TEXT REFERENCES recorrencias(id)',
    sync_status: "sync_status TEXT NOT NULL DEFAULT 'pendente'",
    excluido_em: 'excluido_em TEXT',
    criado_em: 'criado_em TEXT NOT NULL',
    atualizado_em: 'atualizado_em TEXT NOT NULL',
  };

  function criarDespesasCustom(
    sqlite: Database.Database,
    opcoes: { omitir?: string[]; extras?: string; alterar?: Record<string, string> } = {},
  ): void {
    const omitir = new Set(opcoes.omitir ?? []);
    const colunas = Object.entries(COLUNAS_DESPESAS_BASE)
      .filter(([nome]) => !omitir.has(nome))
      .map(([nome, ddl]) => opcoes.alterar?.[nome] ?? ddl);
    if (opcoes.extras) colunas.push(opcoes.extras);
    sqlite.exec(`CREATE TABLE IF NOT EXISTS despesas (${colunas.join(',')})`);
    sqlite.exec('PRAGMA user_version = 3');
  }

  const tabelaDespesasSql = (sqlite: Database.Database): string =>
    (sqlite.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get() as any)?.sql ?? '';

  async function esperarRejeicaoDespesas(sqlite: Database.Database): Promise<void> {
    const tabelaAntes = tabelaDespesasSql(sqlite);
    const indicesAntes = indicesDespesas(sqlite);
    const linhasAntes = sqlite.prepare('SELECT * FROM despesas ORDER BY id').all();

    await expect(executarGarantiaDespesas(sqlite)).rejects.toThrow(FalhaMigracao);

    expect(tabelaDespesasSql(sqlite)).toBe(tabelaAntes);
    expect(indicesDespesas(sqlite)).toEqual(indicesAntes);
    expect(sqlite.prepare('SELECT * FROM despesas ORDER BY id').all()).toEqual(linhasAntes);
    expect(versao(sqlite)).toBe(3);
  }

  it('rejeita coluna ausente em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { omitir: ['excluido_em'] });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita coluna extra em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { extras: 'obs TEXT' });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita tipo incompatível em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, {
      alterar: { valor_centavos: 'valor_centavos TEXT NOT NULL CHECK (valor_centavos > 0)' },
    });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita NOT NULL incompatível em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { alterar: { titulo: 'titulo TEXT' } });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita default incompatível em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { alterar: { sync_status: "sync_status TEXT NOT NULL DEFAULT 'errado'" } });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita CHECK incompatível em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { alterar: { valor_centavos: 'valor_centavos INTEGER NOT NULL' } });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita FK ausente em despesas', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, { alterar: { recorrencia_id: 'recorrencia_id TEXT' } });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita FK apontando para tabela/coluna incorreta', async () => {
    const sqlite = bancoUc01SemDespesas();
    criarDespesasCustom(sqlite, {
      alterar: { recorrencia_id: 'recorrencia_id TEXT REFERENCES outra_tabela(id)' },
    });
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita índice preexistente com colunas divergentes', async () => {
    const sqlite = bancoUc02ComDespesas();
    inserirDespesasUc02(sqlite);
    sqlite.exec('DROP INDEX idx_despesas_data');
    sqlite.exec('CREATE INDEX idx_despesas_data ON despesas(titulo)');
    await esperarRejeicaoDespesas(sqlite);
  });

  it('rejeita índice extra inesperado', async () => {
    const sqlite = bancoUc02ComDespesas();
    inserirDespesasUc02(sqlite);
    sqlite.exec('CREATE INDEX idx_despesas_extra ON despesas(data)');
    await esperarRejeicaoDespesas(sqlite);
  });

  it('faz rollback integral quando a criação de um índice falha', async () => {
    const sqlite = bancoUc01SemDespesas();
    sqlite.exec('PRAGMA user_version = 3');
    const api = criarAdaptador(sqlite);

    await expect(
      api.withExclusiveTransactionAsync(async (tx: any) => {
        const original = tx.execAsync.bind(tx);
        jest.spyOn(tx, 'execAsync').mockImplementation(async (...args: unknown[]) => {
          if (String(args[0]).includes('idx_despesas_sync')) {
            throw new Error('falha simulada no índice');
          }
          return original(...args);
        });

        await garantirTabelaDespesas(tx);
      }),
    ).rejects.toThrow('falha simulada no índice');

    expect(
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get(),
    ).toBeUndefined();
    expect(indicesDespesas(sqlite)).toHaveLength(0);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toMatchObject({
      id: 'rec-1',
      valor_centavos: 50000,
    });
    expect(versao(sqlite)).toBe(3);
    expect(bancoIntegro(sqlite)).toBe(true);
  });
});

describe('migração 005: tombstone de recorrências', () => {
  function expectEstruturaV6(sqlite: Database.Database): void {
    const colunas = colunasRecorrencias(sqlite);
    expect(colunas).toHaveLength(16);
    expect(new Set(colunas)).toEqual(
      new Set([
        'id',
        'tipo',
        'intervalo',
        'unidade',
        'inicio',
        'termino',
        'ativa',
        'valor_centavos',
        'titulo',
        'descricao',
        'categoria_id',
        'fixa_ou_variavel',
        'essencial',
        'sync_status',
        'atualizado_em',
        'excluido_em',
      ]),
    );
    expect(
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get(),
    ).toBeTruthy();
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'despesas' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
        )
        .all()
        .map((i: any) => i.name),
    ).toEqual([
      'idx_despesas_categoria_data',
      'idx_despesas_data',
      'idx_despesas_recorrencia',
      'idx_despesas_sync',
    ]);
    const fks = sqlite.prepare('PRAGMA foreign_key_list(despesas)').all() as any[];
    expect(fks).toHaveLength(1);
    expect(fks[0]).toMatchObject({
      table: 'recorrencias',
      from: 'recorrencia_id',
      to: 'id',
    });
    expect(nomesTriggers(sqlite)).toEqual([
      'trg_categorias_percentual_insert',
      'trg_categorias_percentual_update',
    ]);
    for (const tabela of ['categorias_estado', 'restauracao_pendente']) {
      expect(
        sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(tabela),
      ).toBeTruthy();
    }
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'restauracao_pendente' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
        )
        .all()
        .map((i: any) => i.name),
    ).toEqual([
      'idx_restauracao_pendente_categoria',
      'idx_restauracao_pendente_tipo',
    ]);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(bancoIntegro(sqlite)).toBe(true);
  }

  it('banco vazio termina em v6 com a estrutura completa', async () => {
    const sqlite = novoSqlite();
    await migrarSeNecessario(criarAdaptador(sqlite));
    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
  });

  it('v5 migra para v6 inferindo estado local sem alterar categorias', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_ESQUEMA_V5);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    inserirCategoria(sqlite, { id: 'padrao-intocada', nome: 'Casa', padrao: 1 });
    inserirCategoria(sqlite, {
      id: 'padrao-editada',
      nome: 'Lazer',
      padrao: 1,
      limite_tipo: 'valor',
      limite_centavos: 5000,
      atualizado_em: '2026-01-02T00:00:00Z',
    });
    inserirCategoria(sqlite, { id: 'propria', nome: 'Mercado' });
    inserirCategoria(sqlite, {
      id: 'tombstone',
      nome: 'Antiga',
      excluido_em: '2026-01-03T00:00:00Z',
      atualizado_em: '2026-01-03T00:00:00Z',
    });
    const antes = linhasCategorias(sqlite);
    sqlite.exec('PRAGMA user_version = 5');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expect(linhasCategorias(sqlite)).toEqual(antes);
    expect(
      sqlite
        .prepare('SELECT categoria_id, estado_local FROM categorias_estado ORDER BY categoria_id')
        .all(),
    ).toEqual([
      { categoria_id: 'padrao-editada', estado_local: 'editado' },
      { categoria_id: 'padrao-intocada', estado_local: 'semeadura' },
      { categoria_id: 'propria', estado_local: 'editado' },
      { categoria_id: 'tombstone', estado_local: 'editado' },
    ]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM restauracao_pendente').get()).toEqual({ n: 0 });
    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('rollback: falha na 006 desfaz as tabelas novas e preserva a v5', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_ESQUEMA_V5);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    inserirCategoria(sqlite, { id: 'casa', nome: 'Casa', padrao: 1 });
    sqlite.exec('PRAGMA user_version = 5');

    const base = criarAdaptador(sqlite) as any;
    const adaptador = {
      ...base,
      async withExclusiveTransactionAsync(fn: (tx: any) => Promise<void>) {
        await base.withExclusiveTransactionAsync(async (tx: any) => {
          const txFalha = {
            ...tx,
            async execAsync(sql: string) {
              if (/user_version\s*=\s*6/.test(sql)) {
                throw new Error('falha simulada na 006');
              }
              return tx.execAsync(sql);
            },
          };
          await fn(txFalha);
        });
      },
    };

    await expect(migrarSeNecessario(adaptador)).rejects.toThrow('falha simulada na 006');

    expect(versao(sqlite)).toBe(5);
    for (const tabela of ['categorias_estado', 'restauracao_pendente']) {
      expect(
        sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(tabela),
      ).toBeUndefined();
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get()).toEqual({ n: 1 });
    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('banco v4 com série migra para v5 preservando os dados financeiros', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_ESQUEMA);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite
      .prepare(
        "INSERT INTO recorrencias (id, tipo, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('rec-v4', 'despesa', 1, 'mes', '2026-01-10', 1, 50000, 'Aluguel', 'sincronizado', '2026-01-10T08:00:00Z')",
      )
      .run();
    sqlite.exec('PRAGMA user_version = 4');

    await migrarSeNecessario(criarAdaptador(sqlite));
    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-v4'").get()).toMatchObject({
      id: 'rec-v4',
      tipo: 'despesa',
      valor_centavos: 50000,
      titulo: 'Aluguel',
      excluido_em: null,
    });

    const antes = sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-v4'").get();
    await migrarSeNecessario(criarAdaptador(sqlite));
    expect(versao(sqlite)).toBe(9);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-v4'").get()).toEqual(antes);
    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('rollback: falha ao gravar a versão desfaz o ALTER e preserva a v4', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_ESQUEMA);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    sqlite.exec('PRAGMA user_version = 4');

    const base = criarAdaptador(sqlite) as any;
    const adaptador = {
      ...base,
      async withExclusiveTransactionAsync(fn: (tx: any) => Promise<void>) {
        await base.withExclusiveTransactionAsync(async (tx: any) => {
          const txFalha = {
            ...tx,
            async execAsync(sql: string) {
              if (/user_version\s*=\s*5/.test(sql)) {
                throw new Error('falha simulada ao gravar a versão');
              }
              return tx.execAsync(sql);
            },
          };
          await fn(txFalha);
        });
      },
    };

    await expect(migrarSeNecessario(adaptador)).rejects.toThrow(
      /falha simulada ao gravar a versão/,
    );

    expect(versao(sqlite)).toBe(4);
    expect(colunasRecorrencias(sqlite)).not.toContain('excluido_em');
    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('v0 UC01 antiga migra para v5 preservando dados', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_RECORRENCIAS_UC01);
    sqlite.exec(DDL_RECEITAS_UC01);
    inserirRecorrenciaBase(sqlite);
    sqlite.exec('PRAGMA user_version = 0');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toMatchObject({
      id: 'rec-1',
      titulo: 'Aluguel',
      valor_centavos: 50000,
      tipo: 'receita',
      categoria_id: null,
      fixa_ou_variavel: null,
      essencial: null,
    });
  });

  it('v0 UC02 migra para v5 preservando despesas e recorrências', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_RECORRENCIAS_UC02);
    sqlite.exec(DDL_RECEITAS_UC01);
    sqlite.exec(DDL_DESPESAS_UC02);
    for (const ddl of DDL_INDICES_DESPESAS_UC02) sqlite.exec(ddl);
    sqlite
      .prepare(
        "INSERT INTO recorrencias (id, tipo, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('rec-1', 'receita', 1, 'mes', '2026-01-10', 1, 50000, 'Aluguel', 'pendente', '2026-01-10T08:00:00Z')",
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO despesas (id, valor_centavos, data, titulo, categoria_id, recorrencia_id, sync_status, criado_em, atualizado_em) VALUES ('desp-1', 1000, '2026-01-10', 'Mercado', 'casa', 'rec-1', 'pendente', '2026-01-10T08:00:00Z', '2026-01-10T08:00:00Z')",
      )
      .run();
    sqlite.exec('PRAGMA user_version = 0');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toMatchObject({
      id: 'rec-1',
      tipo: 'receita',
      titulo: 'Aluguel',
      valor_centavos: 50000,
    });
    expect(sqlite.prepare("SELECT * FROM despesas WHERE id = 'desp-1'").get()).toMatchObject({
      id: 'desp-1',
      titulo: 'Mercado',
      categoria_id: 'casa',
      recorrencia_id: 'rec-1',
    });
  });

  it('v1 migra para v5', async () => {
    const sqlite = novoSqlite();
    bancoLegado(sqlite);
    sqlite.exec('PRAGMA user_version = 1');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT id, titulo FROM recorrencias WHERE id = 'rec-1'").get()).toEqual({
      id: 'rec-1',
      titulo: 'Aluguel',
    });
  });

  it('v2 migra para v5', async () => {
    const sqlite = novoSqlite();
    bancoLegado(sqlite);
    sqlite.exec('PRAGMA user_version = 2');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT id, titulo FROM recorrencias WHERE id = 'rec-1'").get()).toEqual({
      id: 'rec-1',
      titulo: 'Aluguel',
    });
  });

  it('v3 antigo migra para v5', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_RECORRENCIAS_UC01);
    sqlite.exec(DDL_RECEITAS_UC01);
    sqlite.exec(DDL_LEGADO_CATEGORIAS);
    sqlite.exec(DDL_TRIGGER_PERCENTUAL);
    inserirRecorrenciaBase(sqlite);
    sqlite.exec('PRAGMA user_version = 3');

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expectEstruturaV6(sqlite);
    expect(sqlite.prepare("SELECT id, titulo, tipo FROM recorrencias WHERE id = 'rec-1'").get()).toEqual({
      id: 'rec-1',
      titulo: 'Aluguel',
      tipo: 'receita',
    });
  });

  it('falha na 004 faz rollback e preserva a versão anterior', async () => {
    const sqlite = novoSqlite();
    sqlite.exec(DDL_RECORRENCIAS_UC01);
    sqlite.exec(DDL_RECEITAS_UC01);
    inserirRecorrenciaBase(sqlite);
    sqlite.exec('PRAGMA user_version = 3');
    const api = criarAdaptador(sqlite);
    const original = (api as any).execAsync.bind(api);
    (api as any).execAsync = async (...args: unknown[]) => {
      if (String(args[0]).includes('ADD COLUMN essencial')) {
        throw new Error('falha simulada na 004');
      }
      return original(...args);
    };

    await expect(migrarSeNecessario(api)).rejects.toThrow('falha simulada na 004');

    expect(versao(sqlite)).toBe(3);
    expect(colunasRecorrencias(sqlite)).toHaveLength(11);
    expect(
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'despesas'").get(),
    ).toBeUndefined();
    expect(sqlite.prepare("SELECT * FROM recorrencias WHERE id = 'rec-1'").get()).toMatchObject({
      id: 'rec-1',
      titulo: 'Aluguel',
      valor_centavos: 50000,
    });
    expect(bancoIntegro(sqlite)).toBe(true);
  });
});


describe('UC08 — saldo inicial', () => {
  let sqlite: Database.Database;

  beforeEach(async () => {
    sqlite = novoSqlite();
    await migrarSeNecessario(criarAdaptador(sqlite));
  });

  afterEach(() => {
    sqlite.close();
  });

  function inserirSaldo(
    uid: string,
    valor: number,
    mes: string,
  ) {
    sqlite.prepare(`
      INSERT INTO saldo_inicial (
        uid,
        valor_centavos,
        mes_referencia,
        atualizado_em
      ) VALUES (?, ?, ?, ?)
    `).run(uid, valor, mes, '2026-11-24T12:00:00Z');
  }

  it('cria a tabela saldo_inicial', () => {
    const tabela = sqlite.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table'
      AND name = 'saldo_inicial'
    `).get();

    expect(tabela).toBeDefined();
  });

  it.each([150000, 0, -50000])(
    'aceita saldo inicial de %i centavos',
    (valor) => {
      inserirSaldo('usuario-1', valor, '2026-11');

      const saldo = sqlite.prepare(`
        SELECT valor_centavos, sync_status
        FROM saldo_inicial
        WHERE uid = ?
      `).get('usuario-1');

      expect(saldo).toEqual({
        valor_centavos: valor,
        sync_status: 'pendente',
      });
    },
  );

  it.each([
    '',
    '2026-00',
    '2026-13',
    '2026-1',
    '11-2026',
    '0000-01',
  ])('rejeita mês inválido: %s', (mes) => {
    expect(() =>
      inserirSaldo('usuario-1', 1000, mes),
    ).toThrow();
  });

  it('rejeita valor fracionário em centavos', () => {
    expect(() =>
      inserirSaldo('usuario-1', 10.5, '2026-11'),
    ).toThrow();
  });

  it('impede dois registros para o mesmo usuário', () => {
    inserirSaldo('usuario-1', 1000, '2026-11');

    expect(() =>
      inserirSaldo('usuario-1', 2000, '2026-12'),
    ).toThrow();
  });

  it('permite registros de usuários diferentes', () => {
    inserirSaldo('usuario-1', 1000, '2026-11');
    inserirSaldo('usuario-2', -2000, '2026-11');

    const registros = sqlite.prepare(
      'SELECT * FROM saldo_inicial',
    ).all();

    expect(registros).toHaveLength(2);
  });

  it('preserva o saldo ao executar novamente as migrações', async () => {
    inserirSaldo('usuario-1', -5000, '2026-11');

    await migrarSeNecessario(criarAdaptador(sqlite));

    const saldo = sqlite.prepare(`
      SELECT valor_centavos
      FROM saldo_inicial
      WHERE uid = ?
    `).get('usuario-1');

    expect(saldo).toEqual({
      valor_centavos: -5000,
    });
  });
});

describe('UC08 — migração 008', () => {
  let sqlite: Database.Database;

  beforeEach(async () => {
    sqlite = novoSqlite();

    await migrarSeNecessario(criarAdaptador(sqlite));

    // Simula a estrutura anterior ao UC08.
    sqlite.exec('DROP TABLE saldo_inicial');
    sqlite.exec('PRAGMA user_version = 7');

    inserirReceitaValida(sqlite);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('migra da versão 7 para 8 preservando receitas', async () => {
    const antes = sqlite.prepare(
      'SELECT * FROM receitas',
    ).all();

    expect(versao(sqlite)).toBe(7);

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);

    expect(sqlite.prepare(
      'SELECT * FROM saldo_inicial',
    ).all()).toEqual([]);

    expect(sqlite.prepare(
      'SELECT * FROM receitas',
    ).all()).toEqual(antes);

    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('reverte a migração quando a gravação da versão falha', async () => {
    const db = criarAdaptador(sqlite);
    const antes = sqlite.prepare(
      'SELECT * FROM receitas',
    ).all();

    const executarOriginal = db.execAsync.bind(db);

    jest.spyOn(db, 'execAsync').mockImplementation(
      async (sql: string) => {
        if (sql.includes('PRAGMA user_version = 8')) {
          throw new Error('Falha simulada');
        }

        await executarOriginal(sql);
      },
    );

    await expect(
      migrarSeNecessario(db),
    ).rejects.toThrow();

    expect(versao(sqlite)).toBe(7);

    expect(sqlite.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table'
      AND name = 'saldo_inicial'
    `).get()).toBeUndefined();

    expect(sqlite.prepare(
      'SELECT * FROM receitas',
    ).all()).toEqual(antes);

    expect(bancoIntegro(sqlite)).toBe(true);
  });
});
describe('UC08 — migração 009 e teto monetário', () => {
  let sqlite: Database.Database;

  beforeEach(async () => {
    sqlite = novoSqlite();
    await migrarSeNecessario(criarAdaptador(sqlite));
  });

  afterEach(() => {
    sqlite.close();
  });

  function inserirSaldo(valor: number) {
    sqlite.prepare(`
      INSERT INTO saldo_inicial (
        uid,
        valor_centavos,
        mes_referencia,
        atualizado_em
      ) VALUES (?, ?, ?, ?)
    `).run(
      'usuario-1',
      valor,
      '2026-11',
      '2026-11-25T12:00:00Z',
    );
  }

  function simularVersao8() {
    sqlite.exec(`
      DROP TRIGGER trg_saldo_inicial_limite_insert;
      DROP TRIGGER trg_saldo_inicial_limite_update;
      PRAGMA user_version = 8;
    `);
  }

  function consultarSaldo() {
    return sqlite.prepare(
      'SELECT * FROM saldo_inicial WHERE uid = ?',
    ).get('usuario-1');
  }

  it.each([-99_999_999_999, 0, 99_999_999_999])(
    'aceita valor dentro do teto: %s',
    (valor) => {
      inserirSaldo(valor);

      expect(consultarSaldo()).toMatchObject({
        valor_centavos: valor,
      });
    },
  );

  it.each([-100_000_000_000, 100_000_000_000])(
    'rejeita inserção fora do teto: %s',
    (valor) => {
      expect(() => inserirSaldo(valor))
        .toThrow('saldo_inicial_limite');

      expect(consultarSaldo()).toBeUndefined();
    },
  );

  it.each([-100_000_000_000, 100_000_000_000])(
    'rejeita atualização fora do teto: %s',
    (valor) => {
      inserirSaldo(-15000);

      expect(() => {
        sqlite.prepare(`
          UPDATE saldo_inicial
          SET valor_centavos = ?
          WHERE uid = ?
        `).run(valor, 'usuario-1');
      }).toThrow('saldo_inicial_limite');

      expect(consultarSaldo()).toMatchObject({
        valor_centavos: -15000,
      });
    },
  );

  it('migra da versão 8 para 9 preservando os dados', async () => {
    simularVersao8();
    inserirSaldo(-15000);
    inserirReceitaValida(sqlite);

    const saldoAntes = consultarSaldo();
    const receitasAntes = sqlite.prepare(
      'SELECT * FROM receitas',
    ).all();

    await migrarSeNecessario(criarAdaptador(sqlite));

    expect(versao(sqlite)).toBe(9);
    expect(consultarSaldo()).toEqual(saldoAntes);

    expect(sqlite.prepare(
      'SELECT * FROM receitas',
    ).all()).toEqual(receitasAntes);

    expect(() => {
      sqlite.prepare(`
        UPDATE saldo_inicial
        SET valor_centavos = 100000000000
        WHERE uid = 'usuario-1'
      `).run();
    }).toThrow('saldo_inicial_limite');

    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('preserva dados legados incompatíveis e mantém a versão 8', async () => {
    simularVersao8();
    inserirSaldo(100_000_000_000);

    const antes = consultarSaldo();

    await expect(
      migrarSeNecessario(criarAdaptador(sqlite)),
    ).rejects.toThrow('Existem saldos iniciais fora do limite monetário');

    expect(versao(sqlite)).toBe(8);
    expect(consultarSaldo()).toEqual(antes);
    expect(bancoIntegro(sqlite)).toBe(true);
  });

  it('reverte a migração 009 se a gravação da versão falhar', async () => {
    simularVersao8();
    inserirSaldo(-15000);

    const antes = consultarSaldo();
    const db = criarAdaptador(sqlite);
    const executarOriginal = db.execAsync.bind(db);

    jest.spyOn(db, 'execAsync').mockImplementation(
      async (sql: string) => {
        if (sql.includes('PRAGMA user_version = 9')) {
          throw new Error('Falha simulada na 009');
        }

        await executarOriginal(sql);
      },
    );

    await expect(
      migrarSeNecessario(db),
    ).rejects.toThrow('Falha simulada na 009');

    expect(versao(sqlite)).toBe(8);
    expect(consultarSaldo()).toEqual(antes);

    const triggers = sqlite.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'trigger'
      AND tbl_name = 'saldo_inicial'
    `).all();

    expect(triggers).toEqual([]);
    expect(bancoIntegro(sqlite)).toBe(true);
  });
});


