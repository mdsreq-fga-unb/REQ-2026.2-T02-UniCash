import * as ff from 'firebase/firestore';
import { definirSessao } from '@/features/conta/sessao';
import { criarSincronizacaoFirestore, type RegistroLocal } from '@/features/conta/sync.firestore';
import type { CodigoErro } from '@/features/conta/types';

jest.mock('@/lib/firebase', () => ({ db: { __db: true }, auth: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(),
  writeBatch: jest.fn(),
}));

const m = (f: unknown) => f as jest.Mock;

async function codigoDoErro(p: Promise<unknown>): Promise<CodigoErro | 'sem-erro'> {
  try {
    await p;
  } catch (e) {
    return (e as { codigo: CodigoErro }).codigo;
  }
  return 'sem-erro';
}

const reg = (tabela: string, id: string, dados: Record<string, unknown> = { valor: 1 }): RegistroLocal => ({ tabela, id, dados });

function repoFalso(lotes: RegistroLocal[][] = []) {
  const fila = [...lotes];
  return {
    tabelas: jest.fn().mockResolvedValue(['receitas', 'despesas']),
    marcarTodosComoPendentes: jest.fn().mockResolvedValue(undefined),
    contarPendentes: jest.fn().mockResolvedValue(0),
    lerPendentes: jest.fn(async () => fila.shift() ?? []),
    marcarComoSincronizados: jest.fn().mockResolvedValue(undefined),
    estaVazio: jest.fn().mockResolvedValue(true),
    gravarDaNuvem: jest.fn().mockResolvedValue(undefined),
  };
}

let batch: { set: jest.Mock; commit: jest.Mock };

beforeEach(() => {
  jest.resetAllMocks();
  batch = { set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
  m(ff.writeBatch).mockReturnValue(batch);
  m(ff.doc).mockImplementation((_db: unknown, ...seg: string[]) => ({ path: seg.join('/') }));
  m(ff.collection).mockImplementation((_db: unknown, ...seg: string[]) => ({ path: seg.join('/') }));
  m(ff.serverTimestamp).mockReturnValue('TS');
  definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
});

describe('sincronizar (envio das pendências)', () => {
  it('envia cada registro para users/{uid}/{tabela}/{id} e depois marca como sincronizado', async () => {
    const repo = repoFalso([[reg('receitas', '1', { valor: 10 }), reg('despesas', '7', { valor: 3 })]]);
    await criarSincronizacaoFirestore(repo).sincronizar();

    expect(batch.set).toHaveBeenCalledWith({ path: 'users/u1/receitas/1' }, { valor: 10, atualizadoEm: 'TS' });
    expect(batch.set).toHaveBeenCalledWith({ path: 'users/u1/despesas/7' }, { valor: 3, atualizadoEm: 'TS' });
    expect(repo.marcarComoSincronizados).toHaveBeenCalledWith([
      { tabela: 'receitas', id: '1' },
      { tabela: 'despesas', id: '7' },
    ]);
    expect(batch.commit.mock.invocationCallOrder[0]).toBeLessThan(repo.marcarComoSincronizados.mock.invocationCallOrder[0]);
  });

  it('continua em lotes até não haver mais pendências', async () => {
    const repo = repoFalso([[reg('receitas', '1')], [reg('receitas', '2')]]);
    await criarSincronizacaoFirestore(repo).sincronizar();
    expect(batch.commit).toHaveBeenCalledTimes(2);
    expect(repo.marcarComoSincronizados).toHaveBeenCalledTimes(2);
  });

  it('sem pendências, não escreve nada', async () => {
    const repo = repoFalso([]);
    await criarSincronizacaoFirestore(repo).sincronizar();
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it('troca undefined por null (o Firestore não aceita undefined)', async () => {
    const repo = repoFalso([[reg('receitas', '1', { nome: undefined, valor: 1 })]]);
    await criarSincronizacaoFirestore(repo).sincronizar();
    expect(batch.set.mock.calls[0][1]).toEqual({ nome: null, valor: 1, atualizadoEm: 'TS' });
  });

  it('EX08: sem conexão os registros continuam pendentes e o erro é de conexão', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    batch.commit.mockRejectedValue({ code: 'unavailable' });
    expect(await codigoDoErro(criarSincronizacaoFirestore(repo).sincronizar())).toBe('sem-conexao');
    expect(repo.marcarComoSincronizados).not.toHaveBeenCalled();
  });

  it('depois de uma falha, uma nova tentativa funciona', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    const sync = criarSincronizacaoFirestore(repo);
    batch.commit.mockRejectedValueOnce({ code: 'unavailable' });
    await codigoDoErro(sync.sincronizar());
    repo.lerPendentes.mockResolvedValueOnce([reg('receitas', '1')]).mockResolvedValue([]);
    await expect(sync.sincronizar()).resolves.toBeUndefined();
    expect(repo.marcarComoSincronizados).toHaveBeenCalledTimes(1);
  });

  it('regras do servidor recusando o envio viram EX10', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    batch.commit.mockRejectedValue({ code: 'permission-denied' });
    expect(await codigoDoErro(criarSincronizacaoFirestore(repo).sincronizar())).toBe('regras-recusadas');
  });

  it('sem sessão ativa, não envia', async () => {
    definirSessao({ status: 'sem-sessao' });
    const repo = repoFalso([[reg('receitas', '1')]]);
    expect(await codigoDoErro(criarSincronizacaoFirestore(repo).sincronizar())).toBe('falha');
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it('chamadas simultâneas compartilham uma única execução', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    let liberar!: () => void;
    batch.commit.mockReturnValue(new Promise<void>((r) => (liberar = r)));
    const sync = criarSincronizacaoFirestore(repo);
    const a = sync.sincronizar();
    const b = sync.sincronizar();
    liberar();
    await Promise.all([a, b]);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});

describe('retomar e suspender', () => {
  it('suspensa, a sincronização é recusada e os dados locais não são tocados (D2, RN06)', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    const sync = criarSincronizacaoFirestore(repo);
    await sync.suspender();
    expect(await codigoDoErro(sync.sincronizar())).toBe('falha');
    expect(batch.commit).not.toHaveBeenCalled();
    expect(repo.marcarTodosComoPendentes).not.toHaveBeenCalled();
  });

  it('retomar reativa e envia as pendências (B4)', async () => {
    const repo = repoFalso([[reg('receitas', '1')]]);
    const sync = criarSincronizacaoFirestore(repo);
    await sync.suspender();
    await sync.retomar('u1');
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});

describe('delegação ao banco local', () => {
  it('marcarTodosComoPendentes e contarPendentes (E6, FA03)', async () => {
    const repo = repoFalso();
    repo.contarPendentes.mockResolvedValue(5);
    const sync = criarSincronizacaoFirestore(repo);
    await sync.marcarTodosComoPendentes();
    expect(repo.marcarTodosComoPendentes).toHaveBeenCalled();
    expect(await sync.contarPendentes()).toBe(5);
  });
});

describe('restaurarSeAparelhoVazio (FA02, RNF40)', () => {
  const doc_ = (id: string, dados: Record<string, unknown>) => ({ id, data: () => dados });

  it('aparelho com dados: não lê a nuvem', async () => {
    const repo = repoFalso();
    repo.estaVazio.mockResolvedValue(false);
    await criarSincronizacaoFirestore(repo).restaurarSeAparelhoVazio('u1');
    expect(m(ff.getDocs)).not.toHaveBeenCalled();
    expect(repo.gravarDaNuvem).not.toHaveBeenCalled();
  });

  it('aparelho vazio: lê users/{uid}/{tabela} de cada tabela e grava sem o campo atualizadoEm', async () => {
    const repo = repoFalso();
    m(ff.getDocs).mockResolvedValue({ docs: [doc_('1', { nome: 'Ana', atualizadoEm: 'TS' })] });
    await criarSincronizacaoFirestore(repo).restaurarSeAparelhoVazio('u1');
    expect(m(ff.collection).mock.calls.map((c) => c.slice(1).join('/'))).toEqual(['users/u1/receitas', 'users/u1/despesas']);
    expect(repo.gravarDaNuvem).toHaveBeenCalledWith('receitas', '1', { nome: 'Ana' });
    expect(repo.gravarDaNuvem).toHaveBeenCalledWith('despesas', '1', { nome: 'Ana' });
  });

  it('conta nova sem dados na nuvem: não grava nada', async () => {
    const repo = repoFalso();
    m(ff.getDocs).mockResolvedValue({ docs: [] });
    await criarSincronizacaoFirestore(repo).restaurarSeAparelhoVazio('u1');
    expect(repo.gravarDaNuvem).not.toHaveBeenCalled();
  });

  it('sem conexão ao ler a nuvem vira ErroConta', async () => {
    const repo = repoFalso();
    m(ff.getDocs).mockRejectedValue({ code: 'unavailable' });
    expect(await codigoDoErro(criarSincronizacaoFirestore(repo).restaurarSeAparelhoVazio('u1'))).toBe('sem-conexao');
  });
});
