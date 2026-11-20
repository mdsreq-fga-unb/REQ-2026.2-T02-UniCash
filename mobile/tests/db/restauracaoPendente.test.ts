import { getDb } from '@/db/database';
import {
  contarPendentes,
  listarPendentes,
  registrarPendente,
  removerPendente,
} from '@/db/restauracaoPendente';
import { instalarBanco } from '../helpers/fakeDb';
import type { SQLiteDatabase } from 'expo-sqlite';

describe('fila de restauração adiada (v6)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    instalarBanco();
    db = (await getDb()) as unknown as SQLiteDatabase;
  });

  it('grava o payload original e mantém a versão mais nova', async () => {
    await registrarPendente(db, {
      tipo: 'despesa',
      id: 'd1',
      categoriaId: 'categoria-remota',
      motivo: 'categoria_nao_resolvida',
      payload: { valor_centavos: 1000, titulo: 'Mercado' },
      atualizadoEm: '2026-01-01T00:00:00Z',
      registradoEm: '2026-01-02T00:00:00Z',
    });
    await registrarPendente(db, {
      tipo: 'despesa',
      id: 'd1',
      categoriaId: 'categoria-remota',
      motivo: 'categoria_nao_resolvida',
      payload: { valor_centavos: 2000, titulo: 'Mercado novo' },
      atualizadoEm: '2026-01-03T00:00:00Z',
      registradoEm: '2026-01-04T00:00:00Z',
    });

    const pendentes = await listarPendentes(db);
    expect(pendentes).toHaveLength(1);
    expect(JSON.parse(pendentes[0].payload)).toMatchObject({
      valor_centavos: 2000,
      titulo: 'Mercado novo',
    });
    expect(pendentes[0].atualizadoEm).toBe('2026-01-03T00:00:00Z');
  });

  it('não sobrescreve uma versão pendente mais nova com payload antigo', async () => {
    await registrarPendente(db, {
      tipo: 'recorrencia',
      id: 'r1',
      motivo: 'categoria_nao_resolvida',
      payload: { titulo: 'Novo' },
      atualizadoEm: '2026-02-01T00:00:00Z',
    });
    await registrarPendente(db, {
      tipo: 'recorrencia',
      id: 'r1',
      motivo: 'categoria_nao_resolvida',
      payload: { titulo: 'Antigo' },
      atualizadoEm: '2026-01-01T00:00:00Z',
    });

    const pendentes = await listarPendentes(db);
    expect(JSON.parse(pendentes[0].payload)).toEqual({ titulo: 'Novo' });
  });

  it('remove por tipo e id e conta o total', async () => {
    await registrarPendente(db, {
      tipo: 'categoria',
      id: 'padrao_casa',
      motivo: 'conflito_nome',
      payload: { nome: 'Casa' },
      atualizadoEm: '2026-01-01T00:00:00Z',
    });
    await registrarPendente(db, {
      tipo: 'despesa',
      id: 'd1',
      motivo: 'categoria_nao_resolvida',
      payload: {},
      atualizadoEm: '2026-01-01T00:00:00Z',
    });
    expect(await contarPendentes(db)).toBe(2);

    await removerPendente(db, 'categoria', 'padrao_casa');
    expect(await contarPendentes(db)).toBe(1);
    expect((await listarPendentes(db)).map((p) => p.id)).toEqual(['d1']);
  });

  it('lista categorias antes de séries e despesas, e filtra por tipo', async () => {
    await registrarPendente(db, {
      tipo: 'despesa',
      id: 'd1',
      motivo: 'categoria_nao_resolvida',
      payload: {},
      atualizadoEm: '2026-01-01T00:00:00Z',
    });
    await registrarPendente(db, {
      tipo: 'categoria',
      id: 'c1',
      motivo: 'conflito_nome',
      payload: {},
      atualizadoEm: '2026-01-01T00:00:00Z',
    });
    await registrarPendente(db, {
      tipo: 'recorrencia',
      id: 'r1',
      motivo: 'categoria_nao_resolvida',
      payload: {},
      atualizadoEm: '2026-01-01T00:00:00Z',
    });

    expect((await listarPendentes(db)).map((p) => p.tipo)).toEqual([
      'categoria',
      'recorrencia',
      'despesa',
    ]);
    expect((await listarPendentes(db, ['despesa'])).map((p) => p.id)).toEqual(['d1']);
  });
});
