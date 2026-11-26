import Database from 'better-sqlite3';
import { DDL_PREFERENCIAS_NOTIFICACAO } from '@/db/schema';
import { criarPreferencias } from '@/features/notificacoes/preferencias';
import { ESTADO_INICIAL } from '@/features/notificacoes/padroes';
import type { SessionState } from '@/features/conta/types';

function adaptador(sqlite: Database.Database, falhar = { leitura: false, escrita: false }) {
  return {
    getAllAsync: async (sql: string, params: unknown[] = []) => {
      if (falhar.leitura) throw new Error('leitura');
      return sqlite.prepare(sql).all(...params);
    },
    runAsync: async (sql: string, params: unknown[] = []) => {
      if (falhar.escrita) throw new Error('escrita');
      return sqlite.prepare(sql).run(...params);
    },
  };
}

function montar(sessao: SessionState = { status: 'sem-sessao' }) {
  const sqlite = new Database(':memory:');
  sqlite.exec(DDL_PREFERENCIAS_NOTIFICACAO);
  const falhar = { leitura: false, escrita: false };
  const estado = { sessao };
  const prefs = criarPreferencias(async () => adaptador(sqlite, falhar) as any, () => estado.sessao);
  const linhas = () => sqlite.prepare('SELECT * FROM preferencias_notificacao ORDER BY uid, tipo').all() as any[];
  return { prefs, falhar, estado, linhas };
}

describe('NotificationPreferences (UC14)', () => {
  it('sem escolha gravada, usa o estado inicial desligado (D25)', async () => {
    const { prefs, linhas } = montar();
    expect(await prefs.listar()).toEqual(ESTADO_INICIAL);
    expect(await prefs.isEnabled('limite')).toBe(false);
    expect(linhas()).toEqual([]); // FA08: consultar não grava
  });

  it('grava e passa a respeitar a escolha', async () => {
    const { prefs } = montar();
    await prefs.definir('conquistas', true);
    expect(await prefs.isEnabled('conquistas')).toBe(true);
    expect(await prefs.listar()).toEqual({ limite: false, conquistas: true });
    await prefs.definir('conquistas', false);
    expect(await prefs.isEnabled('conquistas')).toBe(false);
  });

  it('sem conta grava como local; com conta grava pendente de sincronização (FA05)', async () => {
    const { prefs, estado, linhas } = montar();
    await prefs.definir('limite', true);
    estado.sessao = { status: 'ativa', uid: 'u1', email: 'a@b.c' };
    await prefs.definir('limite', true);
    expect(linhas().map((l) => [l.uid, l.estado_sync])).toEqual([
      ['local', 'local'],
      ['u1', 'pendente'],
    ]);
  });

  it('isola as preferências por dono (RNF03)', async () => {
    const { prefs, estado } = montar({ status: 'ativa', uid: 'u1', email: 'a@b.c' });
    await prefs.definir('limite', true);
    estado.sessao = { status: 'ativa', uid: 'u2', email: 'x@y.z' };
    expect(await prefs.isEnabled('limite')).toBe(false);
  });

  it('isEnabled não lança em falha de leitura; listar e definir lançam (EX01, EX02)', async () => {
    const { prefs, falhar } = montar();
    falhar.leitura = true;
    expect(await prefs.isEnabled('limite')).toBe(false);
    await expect(prefs.listar()).rejects.toThrow();
    falhar.escrita = true;
    await expect(prefs.definir('limite', true)).rejects.toThrow();
  });
});
