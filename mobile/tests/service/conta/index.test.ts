jest.mock('@/features/conta/auth.firebase', () => ({
  criarAuthFirebase: jest.fn(() => ({ tag: 'auth' })),
  iniciarObservadorDeSessao: jest.fn(),
}));
jest.mock('@/features/conta/service.firebase', () => ({
  criarContaServiceFirebase: jest.fn(() => ({ tag: 'servico' })),
}));

const esperar = () => new Promise((r) => setImmediate(r));

function carregar() {
  jest.resetModules();
  const sync = {
    marcarTodosComoPendentes: jest.fn().mockResolvedValue(undefined),
    contarPendentes: jest.fn().mockResolvedValue(0),
    sincronizar: jest.fn().mockResolvedValue(undefined),
    retomar: jest.fn().mockResolvedValue(undefined),
    suspender: jest.fn().mockResolvedValue(undefined),
    restaurarSeAparelhoVazio: jest.fn().mockResolvedValue(undefined),
  };
  const { iniciarConta } = require('@/features/conta/index');
  const { obterServicoConta } = require('@/features/conta/service');
  const { definirSessao } = require('@/features/conta/sessao');
  const { definirSincronizacao } = require('@/features/conta/sync');
  const authMod = require('@/features/conta/auth.firebase');
  definirSincronizacao(sync);
  return { iniciarConta, obterServicoConta, definirSessao, authMod, sync };
}

describe('iniciarConta', () => {
  it('troca o serviço simulado pelo do Firebase', () => {
    const { iniciarConta, obterServicoConta } = carregar();
    iniciarConta();
    expect(obterServicoConta()).toEqual({ tag: 'servico' });
  });

  it('é idempotente: chamar duas vezes liga uma vez só', () => {
    const { iniciarConta, authMod } = carregar();
    iniciarConta();
    iniciarConta();
    expect(authMod.criarAuthFirebase).toHaveBeenCalledTimes(1);
    expect(authMod.iniciarObservadorDeSessao).toHaveBeenCalledTimes(1);
  });

  it('sessão ativa retoma a sincronização e depois restaura o aparelho vazio (B4, FA02)', async () => {
    const { iniciarConta, definirSessao, sync } = carregar();
    iniciarConta();
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    await esperar();
    expect(sync.retomar).toHaveBeenCalledWith('u1');
    expect(sync.restaurarSeAparelhoVazio).toHaveBeenCalledWith('u1');
    expect(sync.retomar.mock.invocationCallOrder[0]).toBeLessThan(sync.restaurarSeAparelhoVazio.mock.invocationCallOrder[0]);
  });

  it('sem sessão suspende a sincronização (D2)', async () => {
    const { iniciarConta, definirSessao, sync } = carregar();
    iniciarConta();
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    definirSessao({ status: 'sem-sessao' });
    await esperar();
    expect(sync.suspender).toHaveBeenCalled();
  });

  it('EX08: falha ao retomar não quebra nada e não tenta restaurar', async () => {
    const { iniciarConta, definirSessao, sync } = carregar();
    sync.retomar.mockRejectedValue(new Error('sem rede'));
    iniciarConta();
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    await esperar();
    expect(sync.restaurarSeAparelhoVazio).not.toHaveBeenCalled();
  });

  it('falha ao suspender não quebra nada', async () => {
    const { iniciarConta, definirSessao, sync } = carregar();
    sync.suspender.mockRejectedValue(new Error('x'));
    iniciarConta();
    definirSessao({ status: 'ativa', uid: 'u1', email: 'a@b.com' });
    definirSessao({ status: 'sem-sessao' });
    await esperar();
    expect(sync.suspender).toHaveBeenCalled();
  });
});
