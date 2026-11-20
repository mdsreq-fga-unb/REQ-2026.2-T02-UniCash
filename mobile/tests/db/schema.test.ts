import Database from 'better-sqlite3';
import { ESQUEMA_SQL } from '@/db/schema';

/**
 * Testes das restrições estruturais do schema (E2.1, issue #43 / UC06).
 * Executa o ESQUEMA_SQL real em um SQLite em memória e valida os CHECKs,
 * a unicidade de nomes ativos e os tombstones na camada do banco.
 */
describe('Schema do banco — restrições de categorias', () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(ESQUEMA_SQL);
  });

  let sequenciaId = 0;

  const base = {
    nome: 'Casa',
    nome_normalizado: 'casa',
    padrao: 0,
    limite_tipo: null as string | null,
    limite_centavos: null as number | null,
    limite_percentual_centesimos: null as number | null,
    sync_status: 'pendente',
    excluido_em: null as string | null,
    criado_em: '2026-11-12T10:00:00Z',
    atualizado_em: '2026-11-12T10:00:00Z',
  };

  function inserir(overrides: Partial<typeof base> = {}): string {
    sequenciaId++;
    const id = `cat-${sequenciaId}`;
    const linha = { id, ...base, ...overrides };
    sqlite
      .prepare(
        `INSERT INTO categorias
           (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
            limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (@id, @nome, @nome_normalizado, @padrao, @limite_tipo, @limite_centavos,
            @limite_percentual_centesimos, @sync_status, @excluido_em, @criado_em, @atualizado_em)`,
      )
      .run(linha);
    return id;
  }

  const contaCategorias = () => (sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n;

  describe('entradas válidas', () => {
    it('aceita categoria sem limite', () => {
      expect(() => inserir()).not.toThrow();
    });

    it('aceita limite por valor em centavos', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 150_000 })).not.toThrow();
    });

    it('aceita o limite mínimo de 1 centavo (RN09)', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 1 })).not.toThrow();
    });

    it('aceita o limite percentual mínimo de 1 centésimo (RN14)', () => {
      expect(() =>
        inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 1 }),
      ).not.toThrow();
    });

    it('aceita 100% (10.000 centésimos), máximo provisório da RN14', () => {
      expect(() =>
        inserir({
          nome: 'Cem',
          nome_normalizado: 'cem',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 10_000,
        }),
      ).not.toThrow();
    });

    it('rejeita 100,01% (10.001 centésimos) pela faixa provisória (RN14)', () => {
      expect(() =>
        inserir({
          nome: 'Cem um',
          nome_normalizado: 'cem um',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 10_001,
        }),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('rejeita o limite técnico de Number.MAX_SAFE_INTEGER pela faixa provisória', () => {
      expect(() =>
        inserir({
          nome: 'Maximo',
          nome_normalizado: 'maximo',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: Number.MAX_SAFE_INTEGER,
        }),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('conta caracteres Unicode no nome: 30 emojis aceitos e 31 rejeitados (RN13)', () => {
      const nome30 = '😀'.repeat(30);
      expect(() => inserir({ nome: nome30, nome_normalizado: nome30 })).not.toThrow();
      const nome31 = '😀'.repeat(31);
      expect(() => inserir({ nome: nome31, nome_normalizado: nome31 })).toThrow(/nome_valido/);
    });

    it('rejeita percentual acima de Number.MAX_SAFE_INTEGER (também fora da faixa)', () => {
      expect(() =>
        inserir({
          nome: 'Excedente',
          nome_normalizado: 'excedente',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 9007199254740992n as any,
        }),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('aceita limite percentual em centésimos', () => {
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 1_500 })).not.toThrow();
    });

    it('aceita categorias padrão (padrao = 1) e sincronizadas', () => {
      expect(() =>
        inserir({ nome: 'Alimentação', nome_normalizado: 'alimentação', padrao: 1, sync_status: 'sincronizado' }),
      ).not.toThrow();
    });
  });

  describe('nome (RN13)', () => {
    it('rejeita nome vazio', () => {
      expect(() => inserir({ nome: '', nome_normalizado: '' })).toThrow(/CHECK constraint failed: nome_valido/);
    });

    it('rejeita nome com 31 caracteres', () => {
      const nome31 = 'a'.repeat(31);
      expect(() => inserir({ nome: nome31, nome_normalizado: nome31 })).toThrow(/CHECK constraint failed: nome_valido/);
    });

    it('aceita nome com 30 caracteres (limite máximo)', () => {
      const nome30 = 'b'.repeat(30);
      expect(() => inserir({ nome: nome30, nome_normalizado: nome30 })).not.toThrow();
    });

    it('rejeita nome nulo (NOT NULL)', () => {
      expect(() => inserir({ nome: null as any, nome_normalizado: 'nulo' })).toThrow();
    });
  });

  describe('padrao', () => {
    it('rejeita valor fora de (0, 1)', () => {
      expect(() => inserir({ padrao: 2 })).toThrow(/CHECK constraint failed: padrao_valido/);
      expect(() => inserir({ padrao: -1 })).toThrow(/CHECK constraint failed: padrao_valido/);
    });
  });

  describe('limite monetário (RN09)', () => {
    it('rejeita limite zero e negativo', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 0 })).toThrow(
        /CHECK constraint failed: limite_centavos_valido/,
      );
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: -1 })).toThrow(
        /CHECK constraint failed: limite_centavos_valido/,
      );
    });

    it('rejeita limite acima de 99999999999 centavos', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 100_000_000_000 })).toThrow(
        /CHECK constraint failed: limite_centavos_valido/,
      );
    });

    it('aceita limite de exatamente 99999999999 centavos (R$ 999.999.999,99)', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 99_999_999_999 })).not.toThrow();
    });

    it('rejeita valor não inteiro (typeof real/texto)', () => {
      // REAL com parte fracionária permanece real (afinidade INTEGER não converte sem perda).
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 10.5 as any })).toThrow(
        /CHECK constraint failed: limite_centavos_valido/,
      );
      // Texto não numérico permanece texto (afinidade INTEGER só converte numéricos).
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 'muito' as any })).toThrow(
        /CHECK constraint failed: limite_centavos_valido/,
      );
    });

    it('texto numérico é convertido pela afinidade INTEGER e gravado como inteiro', () => {
      inserir({ limite_tipo: 'valor', limite_centavos: '100' as any });
      const r = sqlite
        .prepare('SELECT limite_centavos, typeof(limite_centavos) AS tipo FROM categorias WHERE limite_centavos = 100')
        .get() as any;
      expect(r).toEqual({ limite_centavos: 100, tipo: 'integer' });
    });
  });

  describe('limite percentual', () => {
    it('rejeita percentual zero e negativo', () => {
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 0 })).toThrow(
        /CHECK constraint failed: limite_percentual_valido/,
      );
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: -10 })).toThrow(
        /CHECK constraint failed: limite_percentual_valido/,
      );
    });

    it('rejeita percentual não inteiro (typeof real/texto)', () => {
      // REAL com parte fracionária permanece real (afinidade INTEGER não converte sem perda).
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 1.5 as any })).toThrow(
        /CHECK constraint failed: limite_percentual_valido/,
      );
      // Texto não numérico permanece texto (afinidade INTEGER só converte numéricos).
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 'dez' as any })).toThrow(
        /CHECK constraint failed: limite_percentual_valido/,
      );
    });

    it('aceita 99,99% (9.999 centésimos), imediatamente abaixo do máximo', () => {
      expect(() =>
        inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 9_999 }),
      ).not.toThrow();
    });

    it('rejeita 200000% (20.000.000 centésimos) pelo trigger de faixa', () => {
      expect(() =>
        inserir({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 20_000_000 }),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('rejeita UPDATE de limite para 100,01%', () => {
      const id = inserir({
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 10_000,
      });
      expect(() =>
        sqlite
          .prepare('UPDATE categorias SET limite_percentual_centesimos = 10001 WHERE id = ?')
          .run(id),
      ).toThrow(/limite_percentual_faixa/);
    });

    it('permite atualizar tombstone e sync_status sem tocar no limite', () => {
      const id = inserir({
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 10_000,
      });
      expect(() =>
        sqlite
          .prepare(
            "UPDATE categorias SET sync_status = 'sincronizado', excluido_em = '2026-11-18T10:00:00Z' WHERE id = ?",
          )
          .run(id),
      ).not.toThrow();
      const linha = sqlite
        .prepare('SELECT limite_percentual_centesimos AS p, excluido_em AS e FROM categorias WHERE id = ?')
        .get(id) as any;
      expect(linha).toEqual({ p: 10_000, e: '2026-11-18T10:00:00Z' });
    });
  });

  describe('coerência entre limite_tipo e colunas de limite', () => {
    it('rejeita limite_tipo nulo com limite_centavos preenchido', () => {
      expect(() => inserir({ limite_centavos: 100 })).toThrow(/CHECK constraint failed: limite_coerente/);
    });

    it('rejeita limite_tipo nulo com limite_percentual_centesimos preenchido', () => {
      expect(() => inserir({ limite_percentual_centesimos: 100 })).toThrow(/CHECK constraint failed: limite_coerente/);
    });

    it('rejeita limite_tipo nulo com ambas as colunas preenchidas', () => {
      expect(() => inserir({ limite_centavos: 100, limite_percentual_centesimos: 100 })).toThrow(
        /CHECK constraint failed: limite_coerente/,
      );
    });

    it('rejeita limite_tipo "valor" sem limite_centavos', () => {
      expect(() => inserir({ limite_tipo: 'valor' })).toThrow(/CHECK constraint failed: limite_coerente/);
    });

    it('rejeita limite_tipo "valor" com limite_percentual_centesimos preenchido', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_percentual_centesimos: 100 })).toThrow(
        /CHECK constraint failed: limite_coerente/,
      );
    });

    it('rejeita limite_tipo "valor" com ambas as colunas preenchidas', () => {
      expect(() => inserir({ limite_tipo: 'valor', limite_centavos: 100, limite_percentual_centesimos: 100 })).toThrow(
        /CHECK constraint failed: limite_coerente/,
      );
    });

    it('rejeita limite_tipo "percentual_renda" sem limite_percentual_centesimos', () => {
      expect(() => inserir({ limite_tipo: 'percentual_renda' })).toThrow(/CHECK constraint failed: limite_coerente/);
    });

    it('rejeita limite_tipo "percentual_renda" com limite_centavos preenchido', () => {
      expect(() => inserir({ limite_tipo: 'percentual_renda', limite_centavos: 100 })).toThrow(
        /CHECK constraint failed: limite_coerente/,
      );
    });

    it('rejeita limite_tipo inválido (valor textual arbitrário)', () => {
      expect(() => inserir({ limite_tipo: 'invalido' })).toThrow(/CHECK constraint failed: limite_tipo_valido/);
    });
  });

  describe('sync_status', () => {
    it('rejeita valor inválido', () => {
      expect(() => inserir({ sync_status: 'enviado' })).toThrow(/CHECK constraint failed: sync_status_valido/);
    });
  });

  describe('unicidade de nomes ativos (RN13) e tombstones', () => {
    it('rejeita nome normalizado duplicado entre ativas', () => {
      inserir({ nome: 'Casa', nome_normalizado: 'casa' });
      expect(() => inserir({ nome: 'casa ', nome_normalizado: 'casa' })).toThrow(/UNIQUE constraint failed/);
    });

    it('permite mesmo nome após exclusão lógica (tombstone) da anterior', () => {
      inserir({ nome: 'Lazer', nome_normalizado: 'lazer', excluido_em: '2026-11-12T09:00:00Z' });
      expect(() => inserir({ nome: 'Lazer', nome_normalizado: 'lazer' })).not.toThrow();
      expect(contaCategorias()).toBe(2);
    });

    it('aceita nomes ativos distintos', () => {
      inserir({ nome: 'Casa', nome_normalizado: 'casa' });
      inserir({ nome: 'Saúde', nome_normalizado: 'saúde' });
      expect(contaCategorias()).toBe(2);
    });
  });

  describe('preservação de receitas, recorrências e índices', () => {
    it('mantém as tabelas de receitas e recorrências funcionais', () => {
      sqlite
        .prepare(
          "INSERT INTO recorrencias (id, intervalo, unidade, inicio, ativa, valor_centavos, titulo, sync_status, atualizado_em) VALUES ('r1', 1, 'mes', '2026-11-12', 1, 1000, 'Aluguel', 'pendente', '2026-11-12T10:00:00Z')",
        )
        .run();
      sqlite
        .prepare(
          "INSERT INTO receitas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('e1', 1000, '2026-11-12', 'Freela', 'pendente', '2026-11-12T10:00:00Z', '2026-11-12T10:00:00Z')",
        )
        .run();
      const receita = sqlite.prepare('SELECT * FROM receitas WHERE id = ?').get('e1') as any;
      expect(receita.valor_centavos).toBe(1000);
    });

    it('mantém os índices existentes', () => {
      const objetos = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")
        .all() as any[];
      const nomes = objetos.map((o) => o.name);
      expect(nomes).toEqual(
        expect.arrayContaining([
          'idx_receitas_data',
          'idx_receitas_recorrencia',
          'idx_receitas_sync',
          'idx_categorias_nome_unico',
          'idx_categorias_sync',
          'idx_restauracao_pendente_categoria',
          'idx_restauracao_pendente_tipo',
        ]),
      );
    });
  });

  describe('estado local e restauração adiada (v6)', () => {
    it('aceita os três estados locais e rejeita valor desconhecido', () => {
      const inserirEstado = (id: string, estado: string) =>
        sqlite
          .prepare('INSERT INTO categorias_estado (categoria_id, estado_local) VALUES (?, ?)')
          .run(id, estado);

      expect(() => inserirEstado('a', 'semeadura')).not.toThrow();
      expect(() => inserirEstado('b', 'editado')).not.toThrow();
      expect(() => inserirEstado('c', 'sincronizado')).not.toThrow();
      expect(() => inserirEstado('d', 'outro')).toThrow(/estado_local_valido/);
    });

    it('restauração pendente exige tipo conhecido e chave primária composta', () => {
      const inserirPendente = (tipo: string, id: string) =>
        sqlite
          .prepare(
            `INSERT INTO restauracao_pendente
              (tipo, id, categoria_id, motivo, payload, atualizado_em, registrado_em)
             VALUES (?, ?, 'cat', 'categoria_nao_resolvida', '{}', 't', 't')`,
          )
          .run(tipo, id);

      expect(() => inserirPendente('despesa', 'd1')).not.toThrow();
      expect(() => inserirPendente('recorrencia', 'r1')).not.toThrow();
      expect(() => inserirPendente('categoria', 'c1')).not.toThrow();
      expect(() => inserirPendente('receita', 'x1')).toThrow(/tipo_pendente_valido/);
      expect(() => inserirPendente('despesa', 'd1')).toThrow(/UNIQUE constraint failed/);
    });
  });
});
