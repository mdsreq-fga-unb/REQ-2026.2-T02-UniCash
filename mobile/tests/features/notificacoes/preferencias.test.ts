import Database from 'better-sqlite3';
import { DDL_PREFERENCIAS_NOTIFICACAO } from '@/db/schema';
import { criarPreferencias } from '@/features/notificacoes/preferencias';
import { ESTADO_INICIAL } from '@/features/notificacoes/padroes';
import type { DonoPreferencias } from '@/features/notificacoes/types';
import type { SessionState } from '@/features/conta/types';

const contaA: SessionState = { status: 'ativa', uid: 'uA', email: 'a@b.c' };
const contaB: SessionState = { status: 'ativa', uid: 'uB', email: 'x@y.z' };

/** Uma base SQLite por dono, como o app (uma base por conta e a local). */
function montar(sessao: SessionState = { status: 'sem-sessao' }) {
  const bases = new Map<string, Database.Database>();
  const baseDe = (uid: string) => {
    if (!bases.has(uid)) {
      const sqlite = new Database(':memory:');
      sqlite.exec(DDL_PREFERENCIAS_NOTIFICACAO);
      bases.set(uid, sqlite);
    }
    return bases.get(uid)!;
  };
  const falhar = { leitura: false, escrita: false };
  const estado = { sessao };
  /** Quando definido, a abertura da base espera esta promessa (simula a demora de abrir o banco). */
  const abertura: { pendente: Promise<void> | null } = { pendente: null };
  const abrirBase = async (dono: DonoPreferencias) => {
    if (abertura.pendente) await abertura.pendente;
    const sqlite = baseDe(dono.uid);
    return {
      getAllAsync: async (sql: string, params: unknown[] = []) => {
        if (falhar.leitura) throw new Error('leitura');
        return sqlite.prepare(sql).all(...params);
      },
      runAsync: async (sql: string, params: unknown[] = []) => {
        if (falhar.escrita) throw new Error('escrita');
        return sqlite.prepare(sql).run(...params);
      },
    } as any;
  };
  const prefs = criarPreferencias(abrirBase, () => estado.sessao);
  const linhas = (uid: string) =>
    baseDe(uid).prepare('SELECT * FROM preferencias_notificacao ORDER BY uid, tipo').all() as any[];
  return { prefs, falhar, estado, linhas, abertura };
}

describe('NotificationPreferences (UC14)', () => {
  it('sem escolha gravada, usa o estado inicial desligado (D25)', async () => {
    const { prefs, linhas } = montar();
    expect(await prefs.listar()).toEqual(ESTADO_INICIAL);
    expect(await prefs.isEnabled('limite')).toBe(false);
    expect(linhas('local')).toEqual([]); // FA08: consultar não grava
  });

  it('grava e passa a respeitar a escolha', async () => {
    const { prefs } = montar();
    await prefs.definir('conquistas', true);
    expect(await prefs.isEnabled('conquistas')).toBe(true);
    expect(await prefs.listar()).toEqual({ limite: false, conquistas: true });
    await prefs.definir('conquistas', false);
    expect(await prefs.isEnabled('conquistas')).toBe(false);
  });

  it('desativar, "reabrir" e consultar continua desligado', async () => {
    const { prefs } = montar();
    await prefs.definir('limite', true);
    await prefs.definir('limite', false);
    expect(await prefs.isEnabled('limite')).toBe(false);
  });

  it('sem conta grava como local; com conta grava pendente de sincronização (FA05)', async () => {
    const { prefs, estado, linhas } = montar();
    await prefs.definir('limite', true);
    estado.sessao = contaA;
    await prefs.definir('limite', true);
    expect(linhas('local').map((l) => [l.uid, l.estado_sync])).toEqual([['local', 'local']]);
    expect(linhas('uA').map((l) => [l.uid, l.estado_sync])).toEqual([['uA', 'pendente']]);
  });

  it('isola as preferências por dono (RNF03)', async () => {
    const { prefs, estado } = montar(contaA);
    await prefs.definir('limite', true);
    estado.sessao = contaB;
    expect(await prefs.isEnabled('limite')).toBe(false);
  });

  it('troca de conta durante a abertura do banco não muda o destino da gravação (RNF03)', async () => {
    const { prefs, estado, linhas, abertura } = montar(contaA);
    let liberar!: () => void;
    abertura.pendente = new Promise<void>((ok) => (liberar = ok));

    const gravacao = prefs.definir('conquistas', true); // iniciada na conta A
    estado.sessao = contaB; // a conta muda enquanto a base abre
    liberar();
    await gravacao;

    expect(linhas('uA').map((l) => [l.uid, l.tipo, l.ativo])).toEqual([['uA', 'conquistas', 1]]);
    expect(linhas('uB')).toEqual([]);
  });

  it('troca de conta durante a abertura do banco não muda a origem da leitura (RNF03)', async () => {
    const { prefs, estado, abertura } = montar(contaA);
    await prefs.definir('limite', true);
    let liberar!: () => void;
    abertura.pendente = new Promise<void>((ok) => (liberar = ok));

    const leitura = prefs.listar();
    estado.sessao = contaB;
    liberar();

    expect(await leitura).toEqual({ limite: true, conquistas: false });
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
