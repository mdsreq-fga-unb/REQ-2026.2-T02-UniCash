import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  DependenciaInesperada,
  DadosLegadosInvalidos,
  EstruturaLegadaInesperada,
  ESTRUTURAS_ESPERADAS,
  FalhaMigracao,
  VersaoBancoDesconhecida,
  migrarSeNecessario,
} from '@/db/migrations';
import { DDL_ESQUEMA, PRAGMAS_SQL } from '@/db/schema';

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

      expect(versao(sqlite)).toBe(3);
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
      expect(versao(sqlite)).toBe(3);
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

      expect(versao(sqlite)).toBe(3);
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
      expect(sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all()).toEqual(recorrenciasAntes);
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

      expect(versao(sqlite)).toBe(3);
      expect(sqlCategorias(sqlite)).toBe(sqlAntes); // sem reconstrução
      expect(linhasCategorias(sqlite)).toHaveLength(1);
    });

    it('migra banco v1 válido até v3 preservando dados e adicionando o limite técnico', async () => {
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
      const antes = linhasCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(3);
      expect(linhasCategorias(sqlite)).toEqual(antes);
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

      expect(versao(sqlite)).toBe(3);
      expect(sqlCategorias(sqlite)).toBe(sqlAntes);
      expect(linhasCategorias(sqlite)).toEqual(antes);
    });
  });

  describe('migração 003: faixa percentual provisória por triggers', () => {
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

      expect(versao(sqlite)).toBe(3);
      expect(linhasCategorias(sqlite)).toEqual(antes);
      expect(nomesTriggers(sqlite)).toEqual([
        'trg_categorias_percentual_insert',
        'trg_categorias_percentual_update',
      ]);
      expect(bancoIntegro(sqlite)).toBe(true);
    });

    it('banco v2 com percentual legado acima de 100% preserva o valor e rejeita novas escritas fora da faixa', async () => {
      const sqlite = novoSqlite();
      sqlite.exec(DDL_ESQUEMA);
      inserirCategoria(sqlite, {
        id: 'legado',
        nome: 'Legado',
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 20_000_000, // 200000%
      });
      sqlite.exec('PRAGMA user_version = 2');
      const antes = linhasCategorias(sqlite);

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(3);
      expect(linhasCategorias(sqlite)).toEqual(antes); // sem apagar, reduzir ou converter

      expect(() =>
        inserirCategoria(sqlite, {
          id: 'novo',
          nome: 'Novo',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 10_001,
        }),
      ).toThrow(/limite_percentual_faixa/);

      expect(() =>
        sqlite
          .prepare("UPDATE categorias SET limite_percentual_centesimos = 10001 WHERE id = 'legado'")
          .run(),
      ).toThrow(/limite_percentual_faixa/);

      // tombstone/sync não tocam o limite e continuam permitidos no registro legado.
      expect(() =>
        sqlite
          .prepare(
            "UPDATE categorias SET sync_status = 'sincronizado', excluido_em = '2026-11-18T10:00:00Z' WHERE id = 'legado'",
          )
          .run(),
      ).not.toThrow();
    });

    it('registro legado acima de 100% pode ser corrigido para 100% sem perda de dados', async () => {
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

      sqlite.prepare("UPDATE categorias SET limite_percentual_centesimos = 10000 WHERE id = 'legado'").run();
      expect(
        sqlite.prepare("SELECT limite_percentual_centesimos AS p FROM categorias WHERE id = 'legado'").get(),
      ).toEqual({ p: 10_000 });
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
      expect(versao(sqlite)).toBe(3);
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

      expect(versao(sqlite)).toBe(3);
      expect(sqlCategorias(sqlite)).toContain('limite_coerente'); // categorias criada
      expect(sqlite.prepare('SELECT * FROM receitas').all()).toHaveLength(1); // dado preservado
    });

    it('banco parcial somente com receitas completa a instalação e preserva os dados', async () => {
      const sqlite = bancoParcialSomente('receitas');

      await migrarSeNecessario(criarAdaptador(sqlite));

      expect(versao(sqlite)).toBe(3);
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

      expect(versao(sqlite)).toBe(3);
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
      for (const nome of ['recorrencias', 'receitas'] as const) {
        const atual = (sqlite.prepare(`PRAGMA table_info(${nome})`).all() as any[]).map((c) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull,
          pk: c.pk,
        }));
        expect(atual).toEqual(ESTRUTURAS_ESPERADAS[nome]);
      }
    });
  });
});
