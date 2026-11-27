import Database from 'better-sqlite3';
import { ESQUEMA_SQL } from '@/db/schema';

/** Restrições estruturais da tabela de metas (UC12, RNF07). */
describe('Schema do banco — metas', () => {
  let sqlite: Database.Database;
  let sequencia = 0;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(ESQUEMA_SQL);
  });

  const base = {
    objetivo: 'Viagem',
    tipo: 'investimento',
    valor_alvo_centavos: 100_000,
    prazo: '2027-12-31',
    sync_status: 'pendente',
    excluido_em: null as string | null,
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
  };

  function inserir(overrides: Partial<typeof base> = {}): string {
    sequencia++;
    const id = `meta-${sequencia}`;
    sqlite
      .prepare(
        `INSERT INTO metas
           (id, objetivo, tipo, valor_alvo_centavos, prazo, sync_status,
            excluido_em, criado_em, atualizado_em)
         VALUES (@id, @objetivo, @tipo, @valor_alvo_centavos, @prazo, @sync_status,
            @excluido_em, @criado_em, @atualizado_em)`,
      )
      .run({ id, ...base, ...overrides });
    return id;
  }

  function inserirV9(overrides: Record<string, unknown> = {}): string {
    sequencia++;
    const id = `meta-${sequencia}`;
    const dados = {
      id,
      ...base,
      inicio: '2027-01-01',
      categoria_id: null,
      valor_acumulado_centavos: null,
      valor_acumulado_atualizado_em: null,
      ...overrides,
    };
    sqlite
      .prepare(
        `INSERT INTO metas
           (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
            valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
            excluido_em, criado_em, atualizado_em)
         VALUES (@id, @objetivo, @tipo, @valor_alvo_centavos, @prazo, @inicio,
            @categoria_id, @valor_acumulado_centavos, @valor_acumulado_atualizado_em,
            @sync_status, @excluido_em, @criado_em, @atualizado_em)`,
      )
      .run(dados);
    return id;
  }

  it('aceita meta válida de gasto e de investimento', () => {
    expect(() => inserir()).not.toThrow();
    expect(() => inserir({ tipo: 'gasto' })).not.toThrow();
  });

  it('aceita objetivo de 1 a 80 caracteres e conta code points', () => {
    expect(() => inserir({ objetivo: 'a' })).not.toThrow();
    expect(() => inserir({ objetivo: 'a'.repeat(80) })).not.toThrow();
    expect(() => inserir({ objetivo: '😀'.repeat(80) })).not.toThrow();
    expect(() => inserir({ objetivo: 'a'.repeat(81) })).toThrow(/objetivo_valido/);
    expect(() => inserir({ objetivo: '' })).toThrow(/objetivo_valido/);
    expect(() => inserir({ objetivo: '   ' })).toThrow(/objetivo_valido/);
  });

  it('aceita os valores-limite de 1 e 99.999.999.999 centavos', () => {
    expect(() => inserir({ valor_alvo_centavos: 1 })).not.toThrow();
    expect(() => inserir({ valor_alvo_centavos: 99_999_999_999 })).not.toThrow();
  });

  it.each([0, -1, 1.5, 100_000_000_000])('rejeita valor alvo %p', (valor) => {
    expect(() => inserir({ valor_alvo_centavos: valor as never })).toThrow(/valor_alvo_valido/);
  });

  it('rejeita tipo desconhecido', () => {
    expect(() => inserir({ tipo: 'outro' as never })).toThrow(/tipo_valido/);
  });

  it('rejeita prazo vazio, formato inválido e data inexistente', () => {
    expect(() => inserir({ prazo: '' })).toThrow(/prazo_valido/);
    expect(() => inserir({ prazo: '31/12/2027' })).toThrow(/prazo_valido/);
    expect(() => inserir({ prazo: '2027-02-31' })).toThrow(/prazo_valido/);
  });

  it('aceita prazo válido e tombstone', () => {
    expect(() => inserir({ prazo: '2027-02-28' })).not.toThrow();
    expect(() => inserir({ excluido_em: '2026-12-01T00:00:00Z' })).not.toThrow();
  });

  it('rejeita sync_status desconhecido e tombstone vazio', () => {
    expect(() => inserir({ sync_status: 'enviado' as never })).toThrow(/sync_status_valido/);
    expect(() => inserir({ excluido_em: '' })).toThrow(/excluido_em_valido/);
  });

  it('cria os índices de prazo, sincronização e categoria', () => {
    const nomes = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'metas'").all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(nomes).toEqual(
      expect.arrayContaining(['idx_metas_prazo', 'idx_metas_sync', 'idx_metas_categoria']),
    );
  });

  it('aceita investimento com zero e exige valor e data juntos', () => {
    expect(() =>
      inserirV9({
        tipo: 'investimento',
        valor_acumulado_centavos: 0,
        valor_acumulado_atualizado_em: '2026-11-25T00:00:00Z',
      }),
    ).not.toThrow();
    expect(() => inserirV9({ valor_acumulado_centavos: 100 })).toThrow(/meta_coerente/);
    expect(() =>
      inserirV9({ valor_acumulado_atualizado_em: '2026-11-25T00:00:00Z' }),
    ).toThrow(/meta_coerente/);
  });

  it.each([-1, 1.5, 100_000_000_000])('rejeita valor acumulado %p', (valor) => {
    expect(() =>
      inserirV9({
        valor_acumulado_centavos: valor,
        valor_acumulado_atualizado_em: '2026-11-25T00:00:00Z',
      }),
    ).toThrow(/valor_acumulado_valido/);
  });

  it('investimento não aceita categoria; gasto aceita e não aceita acumulado', () => {
    expect(() => inserirV9({ tipo: 'investimento', categoria_id: 'c1' })).toThrow(
      /meta_coerente/,
    );
    expect(() => inserirV9({ tipo: 'gasto', categoria_id: 'c1' })).not.toThrow();
    expect(() =>
      inserirV9({
        tipo: 'gasto',
        categoria_id: 'c1',
        valor_acumulado_centavos: 100,
        valor_acumulado_atualizado_em: '2026-11-25T00:00:00Z',
      }),
    ).toThrow(/meta_coerente/);
  });

  it('início deve ser data válida e não pode ultrapassar o prazo', () => {
    expect(() => inserirV9({ inicio: '2026-02-31' })).toThrow(/inicio_valido/);
    expect(() => inserirV9({ inicio: '2028-01-01' })).toThrow(/inicio_coerente/);
    expect(() => inserirV9({ inicio: '2027-12-31' })).not.toThrow();
  });
});
