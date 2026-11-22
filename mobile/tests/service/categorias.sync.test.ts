import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import {
  aplicarCategoriaRemota,
  normalizarCategoriaRemota,
  restaurarCategoriasDaNuvem,
  type CategoriaRemota,
} from '@/features/categorias/sync';
import type { Categoria } from '@/features/categorias/types';
import { categoriaLinha } from '../helpers/categorias';
import { instalarBanco } from '../helpers/fakeDb';

jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

const remota = (extra: Partial<CategoriaRemota> = {}): CategoriaRemota => ({
  padrao: false,
  chave: null,
  nome: 'Mercado',
  nome_normalizado: 'mercado',
  limite_tipo: null,
  limite_centavos: null,
  limite_percentual_centesimos: null,
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-02T00:00:00Z',
  aliases: [],
  ...extra,
});

describe('aplicação local de categorias remotas', () => {
  let banco: ReturnType<typeof instalarBanco>;
  let db: SQLiteDatabase;

  beforeEach(async () => {
    banco = instalarBanco();
    db = (await getDb()) as unknown as SQLiteDatabase;
  });

  function inserirCategoria(extra: Partial<Categoria> = {}): Categoria {
    const c = categoriaLinha({
      id: 'uuid-local',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
      estado_local: 'sincronizado',
      ...extra,
    });
    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        c.id,
        c.nome,
        c.nome_normalizado,
        c.padrao,
        c.limite_tipo,
        c.limite_centavos,
        c.limite_percentual_centesimos,
        c.sync_status,
        c.excluido_em,
        c.criado_em,
        c.atualizado_em,
      );
    banco.sqlite
      .prepare('INSERT INTO categorias_estado (categoria_id, estado_local) VALUES (?, ?)')
      .run(c.id, c.estado_local);
    return c;
  }

  function estado(id: string): string | undefined {
    return (
      banco.sqlite
        .prepare('SELECT estado_local FROM categorias_estado WHERE categoria_id = ?')
        .get(id) as { estado_local: string } | undefined
    )?.estado_local;
  }

  function categoria(id: string): any {
    return banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
  }

  it('padrão recém-semeada aceita limite remoto de outro aparelho', async () => {
    inserirCategoria({
      id: 'uuid-casa-b',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'semeadura',
      atualizado_em: '2026-03-01T00:00:00Z',
    });
    const r = normalizarCategoriaRemota(
      'padrao_casa',
      remota({
        padrao: true,
        chave: 'casa',
        nome: 'Casa',
        nome_normalizado: 'casa',
        limite_tipo: 'valor',
        limite_centavos: 5000,
        atualizado_em: '2026-01-01T00:00:00Z',
        aliases: ['uuid-casa-a'],
      }),
    )!;

    const resultado = await aplicarCategoriaRemota(db, 'padrao_casa', r);

    expect(resultado).toMatchObject({ status: 'aplicada', mapa: 'uuid-casa-b' });
    expect(categoria('uuid-casa-b')).toMatchObject({ limite_tipo: 'valor', limite_centavos: 5000 });
    expect(estado('uuid-casa-b')).toBe('sincronizado');
  });

  it('padrão com nome reservado por própria não é fundida e fica pendente', async () => {
    inserirCategoria({
      id: 'uuid-casa-propria',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 0,
    });
    const r = normalizarCategoriaRemota(
      'padrao_casa',
      remota({
        padrao: true,
        chave: 'casa',
        nome: 'Casa',
        nome_normalizado: 'casa',
      }),
    )!;

    const resultado = await aplicarCategoriaRemota(db, 'padrao_casa', r);

    expect(resultado).toMatchObject({ status: 'pendente', motivo: 'conflito_nome' });
    expect(
      banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get(),
    ).toEqual({ n: 1 });
  });

  it('próprias diferentes com o mesmo nome não são fundidas', async () => {
    inserirCategoria({ id: 'uuid-b', nome: 'Mercado', nome_normalizado: 'mercado' });
    const r = normalizarCategoriaRemota(
      'uuid-a',
      remota({ nome: 'Mercado', nome_normalizado: 'mercado' }),
    )!;

    const resultado = await aplicarCategoriaRemota(db, 'uuid-a', r);

    expect(resultado).toMatchObject({ status: 'pendente', motivo: 'conflito_nome' });
    expect(
      banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get(),
    ).toEqual({ n: 1 });
  });

  it('insere própria com o UUID remoto quando não há conflito', async () => {
    const r = normalizarCategoriaRemota(
      'uuid-mercado',
      remota({ nome: 'Mercado', nome_normalizado: 'mercado' }),
    )!;

    const resultado = await aplicarCategoriaRemota(db, 'uuid-mercado', r);

    expect(resultado).toMatchObject({ status: 'aplicada', mapa: 'uuid-mercado' });
    expect(categoria('uuid-mercado')).toMatchObject({
      nome: 'Mercado',
      padrao: 0,
      sync_status: 'sincronizado',
    });
    expect(estado('uuid-mercado')).toBe('sincronizado');
  });

  it('exclusão remota desvincula despesas e mantém o registro financeiro', async () => {
    inserirCategoria({ id: 'uuid-mercado', nome: 'Mercado', nome_normalizado: 'mercado' });
    banco.sqlite
      .prepare(
        `INSERT INTO despesas
          (id, valor_centavos, data, titulo, categoria_id, sync_status, criado_em, atualizado_em)
         VALUES ('d1', 1000, '2026-01-10', 'Mercado', 'uuid-mercado', 'sincronizado', 't', 't')`,
      )
      .run();
    const r = normalizarCategoriaRemota(
      'uuid-mercado',
      remota({ excluido_em: '2026-02-01T00:00:00Z' }),
    )!;

    const resultado = await aplicarCategoriaRemota(db, 'uuid-mercado', r);

    expect(resultado).toMatchObject({ status: 'aplicada', mapa: null });
    expect(categoria('uuid-mercado')).toMatchObject({
      excluido_em: '2026-02-01T00:00:00Z',
      sync_status: 'sincronizado',
    });
    expect(estado('uuid-mercado')).toBe('sincronizado');
    const despesa = banco.sqlite.prepare("SELECT * FROM despesas WHERE id = 'd1'").get() as any;
    expect(despesa.categoria_id).toBeNull();
  });

  it('restauração repetida não duplica padrão e mantém o mapa de aliases', async () => {
    inserirCategoria({
      id: 'uuid-casa-b',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'semeadura',
    });
    const doc = {
      id: 'padrao_casa',
      data: () => ({
        padrao: true,
        chave: 'casa',
        nome: 'Casa',
        nome_normalizado: 'casa',
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
        excluido_em: null,
        criado_em: '2026-01-01T00:00:00Z',
        atualizado_em: '2026-01-02T00:00:00Z',
        aliases: ['uuid-casa-a'],
      }),
    };

    const mapa1 = await restaurarCategoriasDaNuvem(db, [doc]);
    const mapa2 = await restaurarCategoriasDaNuvem(db, [doc]);

    expect(mapa1.get('uuid-casa-a')).toBe('uuid-casa-b');
    expect(mapa2.get('casa')).toBe('uuid-casa-b');
    expect(
      banco.sqlite.prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa'").get(),
    ).toEqual({ n: 1 });
  });

  it('categoria pendente é aplicada quando o conflito local é resolvido', async () => {
    inserirCategoria({
      id: 'uuid-casa-propria',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 0,
    });
    const doc = {
      id: 'padrao_casa',
      data: () => ({
        padrao: true,
        chave: 'casa',
        nome: 'Casa',
        nome_normalizado: 'casa',
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
        excluido_em: null,
        criado_em: '2026-01-01T00:00:00Z',
        atualizado_em: '2026-01-02T00:00:00Z',
        aliases: [],
      }),
    };

    await restaurarCategoriasDaNuvem(db, [doc]);
    expect(
      banco.sqlite.prepare("SELECT COUNT(*) AS n FROM restauracao_pendente WHERE tipo = 'categoria'").get(),
    ).toEqual({ n: 1 });

    banco.sqlite.prepare("DELETE FROM categorias WHERE id = 'uuid-casa-propria'").run();
    const mapa = await restaurarCategoriasDaNuvem(db, [doc]);

    expect(mapa.get('casa')).toBeTruthy();
    expect(
      banco.sqlite.prepare("SELECT COUNT(*) AS n FROM restauracao_pendente WHERE tipo = 'categoria'").get(),
    ).toEqual({ n: 0 });
    expect(
      banco.sqlite.prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa'").get(),
    ).toEqual({ n: 1 });
  });
});
