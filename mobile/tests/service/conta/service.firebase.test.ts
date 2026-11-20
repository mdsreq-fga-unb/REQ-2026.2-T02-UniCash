import { criarContaServiceFirebase } from '@/features/conta/service.firebase';
import { definirSincronizacao, type SincronizacaoPort } from '@/features/conta/sync';
import { ErroConta, type AuthService, type CodigoErro } from '@/features/conta/types';

function authFalso() {
  return {
    signUp: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    confirmPasswordReset: jest.fn().mockResolvedValue(undefined),
    checkEmailVerified: jest.fn().mockResolvedValue(true),
    resendVerification: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    currentSession: jest.fn(),
    changePassword: jest.fn(),
    requestEmailChange: jest.fn(),
    confirmEmailChange: jest.fn(),
  } satisfies Record<keyof AuthService, jest.Mock>;
}

function syncFalso() {
  return {
    marcarTodosComoPendentes: jest.fn().mockResolvedValue(undefined),
    contarPendentes: jest.fn().mockResolvedValue(0),
    sincronizar: jest.fn().mockResolvedValue(undefined),
    retomar: jest.fn().mockResolvedValue(undefined),
    suspender: jest.fn().mockResolvedValue(undefined),
    restaurarSeAparelhoVazio: jest.fn().mockResolvedValue(undefined),
  } satisfies Record<keyof SincronizacaoPort, jest.Mock>;
}

async function codigoDoErro(p: Promise<unknown>): Promise<CodigoErro | 'sem-erro' | 'nao-e-erro-conta'> {
  try {
    await p;
  } catch (e) {
    return e instanceof ErroConta ? e.codigo : 'nao-e-erro-conta';
  }
  return 'sem-erro';
}

let auth: ReturnType<typeof authFalso>;
let sync: ReturnType<typeof syncFalso>;
let servico: ReturnType<typeof criarContaServiceFirebase>;

beforeEach(() => {
  auth = authFalso();
  sync = syncFalso();
  definirSincronizacao(sync);
  servico = criarContaServiceFirebase(auth as unknown as AuthService);
});

describe('delegação ao AuthService', () => {
  it('cadastrar → signUp', async () => {
    const dados = { email: 'a@b.com', senha: 'Abcdef1!', nome: 'Ana' };
    await servico.cadastrar(dados);
    expect(auth.signUp).toHaveBeenCalledWith(dados);
  });
  it('entrar → signIn', async () => {
    await servico.entrar({ email: 'a@b.com', senha: 'x' });
    expect(auth.signIn).toHaveBeenCalledWith('a@b.com', 'x');
  });
  it('verificarConfirmacao → checkEmailVerified', async () => {
    expect(await servico.verificarConfirmacao('a@b.com')).toBe(true);
  });
  it('reenviarConfirmacao → resendVerification', async () => {
    await servico.reenviarConfirmacao('a@b.com');
    expect(auth.resendVerification).toHaveBeenCalled();
  });
  it('enviarRecuperacao → sendPasswordReset', async () => {
    await servico.enviarRecuperacao('a@b.com');
    expect(auth.sendPasswordReset).toHaveBeenCalledWith('a@b.com');
  });
  it('redefinirSenha → confirmPasswordReset', async () => {
    await servico.redefinirSenha({ codigo: 'c', novaSenha: 'Abcdef1!' });
    expect(auth.confirmPasswordReset).toHaveBeenCalledWith('c', 'Abcdef1!');
  });
});

describe('enviarDadosDoAparelho (E6)', () => {
  it('marca os registros como pendentes e depois sincroniza', async () => {
    await servico.enviarDadosDoAparelho();
    expect(sync.marcarTodosComoPendentes).toHaveBeenCalled();
    expect(sync.sincronizar).toHaveBeenCalled();
    expect(sync.marcarTodosComoPendentes.mock.invocationCallOrder[0]).toBeLessThan(
      sync.sincronizar.mock.invocationCallOrder[0],
    );
  });

  it('EX08: falha na sincronização lança ErroConta, e os registros já ficaram marcados como pendentes', async () => {
    sync.sincronizar.mockRejectedValue({ code: 'unavailable' });
    expect(await codigoDoErro(servico.enviarDadosDoAparelho())).toBe('sem-conexao');
    expect(sync.marcarTodosComoPendentes).toHaveBeenCalled();
  });

  it('erro qualquer da sincronização também vira ErroConta (a tela só tolera ErroConta)', async () => {
    sync.marcarTodosComoPendentes.mockRejectedValue(new Error('banco local'));
    expect(await codigoDoErro(servico.enviarDadosDoAparelho())).toBe('falha');
  });
});

describe('pendências (FA03)', () => {
  it('conta as pendências', async () => {
    sync.contarPendentes.mockResolvedValue(4);
    expect(await servico.contarPendentes()).toBe(4);
  });
  it('sincroniza agora', async () => {
    await servico.sincronizarAgora();
    expect(sync.sincronizar).toHaveBeenCalled();
  });
  it('sem conexão ao sincronizar vira ErroConta', async () => {
    sync.sincronizar.mockRejectedValue({ code: 'unavailable' });
    expect(await codigoDoErro(servico.sincronizarAgora())).toBe('sem-conexao');
  });
});

describe('sair (fluxo D)', () => {
  it('invalida a sessão', async () => {
    await servico.sair();
    expect(auth.signOut).toHaveBeenCalled();
  });
  it('EX09: falha vira ErroConta "falha"', async () => {
    auth.signOut.mockRejectedValue(new Error('x'));
    expect(await codigoDoErro(servico.sair())).toBe('falha');
  });
});
