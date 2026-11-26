import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import {
  aplicarMetaRemota,
  decidirMetaRemota,
  normalizarMetaRemota,
  payloadMetaRemota,
  restaurarMetasDaNuvem,
  sincronizarMetasPendentes,
  type MetaRemota,
} from '@/features/metas/sync';
import type { Meta } from '@/features/metas/types';
import { criarMeta, excluirMeta } from '@/features/metas/service';
import { instalarBanco } from '../helpers/fakeDb';

jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));

const { doc: mockDoc, runTransaction: mockRunTransaction } = jest.requireMock(
  'firebase/firestore',
) as { doc: jest.Mock; runTransaction: jest.Mock };

const nuvem = new Map<string, any>();
const path = (id: string) => `usuarios/u1/metas/${id}`;

beforeEach(() => {
  nuvem.clear();
  mockDoc.mockImplementation((_db: unknown, ...partes: string[]) => ({
    path: partes.join('/'),
  }));
  mockRunTransaction.mockImplementation(
    async (_db: unknown, fn: (tx: any) => Promise<any>) =>
      fn({
        get: async (ref: any) => ({
          exists: () => nuvem.has(ref.path),
          data: () => nuvem.get(ref.path),
        }),
        set: (ref: any, dados: any) => nuvem.set(ref.path, JSON.parse(JSON.stringify(dados))),
      }),
  );
});

const remota = (extra: Partial<MetaRemota> = {}): MetaRemota => ({
  objetivo: 'Viagem',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-02T00:00:00Z',
  legado: false,
  ...extra,
});

const meta = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-02T00:00:00Z',
  ...extra,
});

describe('normalização de meta remota', () => {
  it('aceita documento válido ativo e tombstone', () => {
    expect(normalizarMetaRemota('m1', remota())).toEqual(remota());
    expect(normalizarMetaRemota('m1', remota({ excluido_em: '2026-02-01T00:00:00Z' }))).toMatchObject({
      excluido_em: '2026-02-01T00:00:00Z',
    });
  });

  it.each([
    ['objetivo vazio', { objetivo: '' }],
    ['objetivo longo', { objetivo: 'a'.repeat(81) }],
    ['tipo inválido', { tipo: 'outro' }],
    ['valor zero', { valor_alvo_centavos: 0 }],
    ['valor fracionado', { valor_alvo_centavos: 1.5 }],
    ['valor acima do teto', { valor_alvo_centavos: 100_000_000_000 }],
    ['prazo inválido', { prazo: '31/12/2027' }],
    ['prazo inexistente', { prazo: '2027-02-31' }],
    ['criado_em vazio', { criado_em: '' }],
    ['atualizado_em vazio', { atualizado_em: '' }],
    ['tombstone vazio', { excluido_em: '' }],
    ['início inexistente', { inicio: '2027-02-31' }],
    ['início depois do prazo', { inicio: '2028-01-01' }],
    ['categoria em investimento', { categoria_id: 'c1' }],
    ['acumulado negativo', { valor_acumulado_centavos: -1 }],
    [
      'acumulado sem data',
      { valor_acumulado_centavos: 0, valor_acumulado_atualizado_em: null },
    ],
  ])('rejeita %s', (_nome, extra) => {
    expect(normalizarMetaRemota('m1', remota(extra as never))).toBeNull();
  });

  it('aceita documento legado sem os campos novos, normalizando-os como nulos', () => {
    const legado = {
      objetivo: 'Viagem',
      tipo: 'investimento',
      valor_alvo_centavos: 100_000,
      prazo: '2027-12-31',
      criado_em: '2026-01-01T00:00:00Z',
      atualizado_em: '2026-01-02T00:00:00Z',
    };
    expect(normalizarMetaRemota('m1', legado)).toMatchObject({
      inicio: null,
      categoria_id: null,
      valor_acumulado_centavos: null,
      valor_acumulado_atualizado_em: null,
    });
  });

  it('aceita investimento com valor zero e data do informe', () => {
    expect(
      normalizarMetaRemota(
        'm1',
        remota({
          valor_acumulado_centavos: 0,
          valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
        }),
      ),
    ).toMatchObject({
      valor_acumulado_centavos: 0,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
    });
  });

  it('aceita gasto com categoria e rejeita valor acumulado em gasto', () => {
    expect(
      normalizarMetaRemota(
        'm1',
        remota({ tipo: 'gasto', categoria_id: 'c1' }),
      ),
    ).toMatchObject({ tipo: 'gasto', categoria_id: 'c1' });

    expect(
      normalizarMetaRemota(
        'm1',
        remota({ tipo: 'gasto', categoria_id: 'c1', valor_acumulado_centavos: 10 }),
      ),
    ).toBeNull();
  });
});

describe('decisão de conflito', () => {
  it('exclusão remota prevalece sobre edição local', () => {
    expect(
      decidirMetaRemota(meta(), remota({ excluido_em: '2026-02-01T00:00:00Z' })),
    ).toBe('remota');
  });

  it('exclusão local prevalece sobre edição remota', () => {
    expect(
      decidirMetaRemota(
        meta({ excluido_em: '2026-02-01T00:00:00Z' }),
        remota({ atualizado_em: '2026-03-01T00:00:00Z' }),
      ),
    ).toBe('local');
  });

  it('maior atualizado_em vence', () => {
    expect(decidirMetaRemota(meta(), remota({ atualizado_em: '2026-03-01T00:00:00Z' }))).toBe(
      'remota',
    );
    expect(
      decidirMetaRemota(meta({ atualizado_em: '2026-03-01T00:00:00Z' }), remota()),
    ).toBe('local');
  });

  it('tipo imutável vence qualquer versão remota que tente trocá-lo', () => {
    expect(
      decidirMetaRemota(
        meta({ tipo: 'investimento' }),
        remota({
          tipo: 'gasto',
          categoria_id: 'c1',
          atualizado_em: '2099-01-01T00:00:00Z',
        }),
      ),
    ).toBe('local');
  });
});

describe('aplicação local de meta remota', () => {
  let banco: ReturnType<typeof instalarBanco>;
  let db: SQLiteDatabase;

  beforeEach(async () => {
    banco = instalarBanco();
    db = (await getDb()) as unknown as SQLiteDatabase;
  });

  const linha = (id = 'm1') =>
    banco.sqlite.prepare('SELECT * FROM metas WHERE id = ?').get(id) as any;

  it('insere meta remota nova como sincronizada', async () => {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(tx as SQLiteDatabase, 'm1', remota());
    });
    expect(linha()).toMatchObject({
      id: 'm1',
      objetivo: 'Viagem',
      sync_status: 'sincronizado',
      excluido_em: null,
      inicio: '2026-01-01',
      categoria_id: null,
      valor_acumulado_centavos: null,
    });
  });

  it('preserva categoria ativa e desvincula categoria ausente', async () => {
    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES ('c1', 'Mercado', 'mercado', 0, NULL, NULL, NULL, 'sincronizado', NULL, 't', 't')`,
      )
      .run();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(
        tx as SQLiteDatabase,
        'm1',
        remota({ tipo: 'gasto', categoria_id: 'c1' }),
      );
      await aplicarMetaRemota(
        tx as SQLiteDatabase,
        'm2',
        remota({ objetivo: 'Outra', tipo: 'gasto', categoria_id: 'inexistente' }),
      );
    });

    expect(linha('m1').categoria_id).toBe('c1');
    expect(linha('m2').categoria_id).toBeNull();
  });

  it('payload remoto inclui os campos novos e mantém nulos explícitos', () => {
    expect(payloadMetaRemota(meta())).toMatchObject({
      inicio: '2026-01-01',
      categoria_id: null,
      valor_acumulado_centavos: null,
      valor_acumulado_atualizado_em: null,
    });
  });

  it('documento legado mais recente preserva campos novos já conhecidos localmente', async () => {
    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES ('c1', 'Mercado', 'mercado', 0, NULL, NULL, NULL, 'sincronizado', NULL, 't', 't')`,
      )
      .run();
    banco.sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
           valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES ('m1', 'Mercado', 'gasto', 100000, '2027-12-31', '2026-02-01', 'c1',
                 NULL, NULL, 'sincronizado', NULL, '2026-01-01T00:00:00Z',
                 '2026-01-01T00:00:00Z')`,
      )
      .run();

    const legado = normalizarMetaRemota('m1', {
      objetivo: 'Mercado atualizado',
      tipo: 'gasto',
      valor_alvo_centavos: 120_000,
      prazo: '2027-12-31',
      criado_em: '2026-01-01T00:00:00Z',
      atualizado_em: '2099-01-01T00:00:00Z',
    })!;
    expect(legado.legado).toBe(true);
    expect(legado.categoria_id).toBeNull();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(tx as SQLiteDatabase, 'm1', legado);
    });

    expect(linha()).toMatchObject({
      objetivo: 'Mercado atualizado',
      categoria_id: 'c1',
      inicio: '2026-02-01',
      sync_status: 'sincronizado',
    });
  });

  it('documento legado de investimento preserva valor acumulado local', async () => {
    banco.sqlite
      .prepare(
        `INSERT INTO metas
          (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
           valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
           excluido_em, criado_em, atualizado_em)
         VALUES ('m1', 'Reserva', 'investimento', 100000, '2027-12-31', '2026-01-01', NULL,
                 50000, '2026-03-01T00:00:00Z', 'sincronizado', NULL,
                 '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`,
      )
      .run();

    const legado = normalizarMetaRemota('m1', {
      objetivo: 'Reserva atualizada',
      tipo: 'investimento',
      valor_alvo_centavos: 100_000,
      prazo: '2027-12-31',
      criado_em: '2026-01-01T00:00:00Z',
      atualizado_em: '2099-01-01T00:00:00Z',
    })!;

    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(tx as SQLiteDatabase, 'm1', legado);
    });

    expect(linha()).toMatchObject({
      valor_acumulado_centavos: 50_000,
      valor_acumulado_atualizado_em: '2026-03-01T00:00:00Z',
    });
  });

  it('tombstone remoto prevalece e não apaga lançamentos', async () => {
    await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    banco.sqlite
      .prepare(
        "INSERT INTO despesas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('d1', 1000, '2026-01-10', 'Mercado', 'sincronizado', 't', 't')",
      )
      .run();
    const local = banco.sqlite.prepare('SELECT id FROM metas LIMIT 1').get() as { id: string };

    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(
        tx as SQLiteDatabase,
        local.id,
        remota({ excluido_em: '2026-02-01T00:00:00Z' }),
      );
    });

    expect(linha(local.id)).toMatchObject({
      excluido_em: '2026-02-01T00:00:00Z',
      sync_status: 'sincronizado',
    });
    expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM despesas').get()).toEqual({ n: 1 });
  });

  it('exclusão local não é ressuscitada por versão remota ativa', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    await excluirMeta(id);
    const antes = linha(id);

    await db.withExclusiveTransactionAsync(async (tx) => {
      await aplicarMetaRemota(tx as SQLiteDatabase, id, remota({ atualizado_em: '2026-04-01T00:00:00Z' }));
    });

    expect(linha(id)).toEqual(antes);
  });

  it('restaura vários documentos e ignora inválidos', async () => {
    const docs = [
      { id: 'm1', data: () => remota() },
      { id: 'm2', data: () => remota({ objetivo: '' }) },
    ];
    await db.withExclusiveTransactionAsync(async (tx) => {
      const r = await restaurarMetasDaNuvem(tx as SQLiteDatabase, docs as never);
      expect(r).toMatchObject({ aplicadas: 1, ignoradas: 1 });
    });
    expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM metas').get()).toEqual({ n: 1 });
  });
});

describe('sincronização de metas pendentes', () => {
  let banco: ReturnType<typeof instalarBanco>;
  let db: SQLiteDatabase;

  beforeEach(async () => {
    banco = instalarBanco();
    db = (await getDb()) as unknown as SQLiteDatabase;
  });

  it('envia meta ativa e marca como sincronizada', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });

    await sincronizarMetasPendentes(db, 'u1');

    const enviada = nuvem.get(`usuarios/u1/metas/${id}`);
    expect(enviada).toMatchObject({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valor_alvo_centavos: 100_000,
      prazo: '2027-12-31',
    });
    expect(banco.sqlite.prepare('SELECT sync_status FROM metas WHERE id = ?').get(id)).toEqual({
      sync_status: 'sincronizado',
    });
  });

  it('envia tombstone local', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    await excluirMeta(id);

    await sincronizarMetasPendentes(db, 'u1');

    expect(nuvem.get(`usuarios/u1/metas/${id}`)).toMatchObject({
      excluido_em: expect.any(String),
    });
    expect(banco.sqlite.prepare('SELECT sync_status FROM metas WHERE id = ?').get(id)).toEqual({
      sync_status: 'sincronizado',
    });
  });

  it('tombstone remoto prevalece sobre edição local pendente', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    nuvem.set(`usuarios/u1/metas/${id}`, remota({ excluido_em: '2026-02-01T00:00:00Z' }));

    await sincronizarMetasPendentes(db, 'u1');

    expect(banco.sqlite.prepare('SELECT excluido_em, sync_status FROM metas WHERE id = ?').get(id)).toMatchObject({
      excluido_em: '2026-02-01T00:00:00Z',
      sync_status: 'sincronizado',
    });
  });

  it('versão remota mais recente atualiza a meta local', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    nuvem.set(
      `usuarios/u1/metas/${id}`,
      remota({ objetivo: 'Viagem nova', atualizado_em: '2099-01-01T00:00:00Z' }),
    );

    await sincronizarMetasPendentes(db, 'u1');

    expect(banco.sqlite.prepare('SELECT objetivo, sync_status FROM metas WHERE id = ?').get(id)).toEqual({
      objetivo: 'Viagem nova',
      sync_status: 'sincronizado',
    });
  });

  it('edição local mais recente é enviada à nuvem', async () => {
    const id = await criarMeta({
      objetivo: 'Viagem local',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    nuvem.set(path(id), remota({ objetivo: 'Viagem antiga', atualizado_em: '2000-01-01T00:00:00Z' }));

    await sincronizarMetasPendentes(db, 'u1');

    expect(nuvem.get(path(id))).toMatchObject({ objetivo: 'Viagem local' });
    expect(banco.sqlite.prepare('SELECT sync_status FROM metas WHERE id = ?').get(id)).toEqual({
      sync_status: 'sincronizado',
    });
  });

  it('não sobrescreve edição local feita durante a rede', async () => {
    const id = await criarMeta({
      objetivo: 'Original',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    nuvem.set(
      path(id),
      remota({ objetivo: 'Remota', atualizado_em: '2099-01-01T00:00:00Z' }),
    );
    mockRunTransaction.mockImplementationOnce(async (_db: unknown, fn: (tx: any) => Promise<any>) => {
      banco.sqlite
        .prepare("UPDATE metas SET objetivo = 'Local concorrente', atualizado_em = '2098-01-01T00:00:00Z' WHERE id = ?")
        .run(id);
      return fn({
        get: async (ref: any) => ({
          exists: () => nuvem.has(ref.path),
          data: () => nuvem.get(ref.path),
        }),
        set: (ref: any, dados: any) => nuvem.set(ref.path, JSON.parse(JSON.stringify(dados))),
      });
    });

    await sincronizarMetasPendentes(db, 'u1');

    expect(banco.sqlite.prepare('SELECT objetivo, sync_status FROM metas WHERE id = ?').get(id)).toEqual({
      objetivo: 'Local concorrente',
      sync_status: 'pendente',
    });
    expect(nuvem.get(path(id)).objetivo).toBe('Remota');
  });

  it('empate de timestamp usa a assinatura canônica de forma simétrica', async () => {
    const id = await criarMeta({
      objetivo: 'Alfa',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
    });
    banco.sqlite
      .prepare("UPDATE metas SET atualizado_em = '2026-01-01T00:00:00Z' WHERE id = ?")
      .run(id);
    nuvem.set(
      path(id),
      remota({ objetivo: 'Zebra', atualizado_em: '2026-01-01T00:00:00Z' }),
    );

    await sincronizarMetasPendentes(db, 'u1');

    expect(banco.sqlite.prepare('SELECT objetivo FROM metas WHERE id = ?').get(id)).toEqual({
      objetivo: 'Zebra',
    });
  });
});
