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

  it('cria os índices de prazo e sincronização', () => {
    const nomes = (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'metas'").all() as {
        name: string;
      }[]
    ).map((i) => i.name);
    expect(nomes).toEqual(expect.arrayContaining(['idx_metas_prazo', 'idx_metas_sync']));
  });
});
