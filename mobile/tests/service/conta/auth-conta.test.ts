import * as fa from 'firebase/auth';
import * as ff from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { criarAuthFirebase, iniciarObservadorDeSessao } from '@/features/conta/auth.firebase';
import { definirSessao, obterSessao } from '@/features/conta/sessao';
import type { CodigoErro } from '@/features/conta/types';

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: { __db: true } }));

jest.mock('firebase/auth', () => ({
  applyActionCode: jest.fn(),
  confirmPasswordReset: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  onAuthStateChanged: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updatePassword: jest.fn(),
  verifyBeforeUpdateEmail: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

const m = (f: unknown) => f as jest.Mock;
const setCurrentUser = (u: unknown) => ((auth as { currentUser: unknown }).currentUser = u);

function usuario(o: Record<string, unknown> = {}) {
  return {
    uid: 'u1',
    email: 'ana@exemplo.com',
    emailVerified: false,
    reload: jest.fn().mockResolvedValue(undefined),
    getIdToken: jest.fn().mockResolvedValue('token'),
    ...o,
  };
}

async function codigoDoErro(p: Promise<unknown>): Promise<CodigoErro | 'sem-erro'> {
  try {
    await p;
  } catch (e) {
    return (e as { codigo: CodigoErro }).codigo;
  }
  return 'sem-erro';
}

const erroFirebase = (code: string) => Object.assign(new Error(`${code} ana@exemplo.com token-secreto`), { code });

beforeEach(() => {
  jest.resetAllMocks();
  m(ff.doc).mockImplementation((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }));
  m(ff.serverTimestamp).mockReturnValue('TS');
  m(fa.EmailAuthProvider.credential).mockImplementation((email: string, senha: string) => ({ email, senha }));
  m(ff.setDoc).mockResolvedValue(undefined);
  m(ff.updateDoc).mockResolvedValue(undefined);
  m(fa.sendEmailVerification).mockResolvedValue(undefined);
  m(fa.deleteUser).mockResolvedValue(undefined);
  m(fa.signOut).mockResolvedValue(undefined);
  setCurrentUser(null);
  definirSessao({ status: 'sem-sessao' });
});

describe('signUp (fluxo A)', () => {
  const dados = { email: ' ana@exemplo.com ', senha: 'Abcdef1!' };

  it('cria a conta, grava o perfil e envia a confirmação, sem iniciar sessão (A5, A6)', async () => {
    const u = usuario();
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: u });

    await criarAuthFirebase().signUp(dados);

    expect(m(fa.createUserWithEmailAndPassword).mock.calls[0].slice(1)).toEqual(['ana@exemplo.com', 'Abcdef1!']);
    expect(m(ff.setDoc)).toHaveBeenCalledTimes(1);
    expect(m(fa.sendEmailVerification).mock.calls[0][0]).toBe(u);
    expect(obterSessao().status).toBe('sem-sessao');
    expect(m(fa.deleteUser)).not.toHaveBeenCalled();
  });

  it('o perfil guarda e-mail e data de criação, sem CPF e sem senha', async () => {
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: usuario() });
    await criarAuthFirebase().signUp(dados);
    const [ref, perfil] = m(ff.setDoc).mock.calls[0];
    expect(ref).toEqual({ path: 'usuarios/u1' });
    expect(perfil).toEqual({ email: 'ana@exemplo.com', criado_em: 'TS' });
    expect(Object.keys(perfil)).not.toContain('cpf');
    expect(JSON.stringify(perfil)).not.toContain('Abcdef1!');
  });

  it('inclui o nome quando informado e ignora nome em branco', async () => {
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: usuario() });
    await criarAuthFirebase().signUp({ ...dados, nome: '  Ana  ' });
    expect(m(ff.setDoc).mock.calls[0][1].nome).toBe('Ana');

    m(ff.setDoc).mockClear();
    await criarAuthFirebase().signUp({ ...dados, nome: '   ' });
    expect(m(ff.setDoc).mock.calls[0][1]).not.toHaveProperty('nome');
  });

  it('EX02: e-mail já em uso, sem gravar nada', async () => {
    m(fa.createUserWithEmailAndPassword).mockRejectedValue(erroFirebase('auth/email-already-in-use'));
    expect(await codigoDoErro(criarAuthFirebase().signUp(dados))).toBe('email-em-uso');
    expect(m(ff.setDoc)).not.toHaveBeenCalled();
  });

  it('EX03: sem conexão ao criar a conta', async () => {
    m(fa.createUserWithEmailAndPassword).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    expect(await codigoDoErro(criarAuthFirebase().signUp(dados))).toBe('sem-conexao');
  });

  it('EX07: falha ao criar a conta', async () => {
    m(fa.createUserWithEmailAndPassword).mockRejectedValue(erroFirebase('auth/internal-error'));
    expect(await codigoDoErro(criarAuthFirebase().signUp(dados))).toBe('falha');
  });

  it('EX10: regras recusam o perfil e a conta é desfeita', async () => {
    const u = usuario();
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: u });
    m(ff.setDoc).mockRejectedValue(erroFirebase('permission-denied'));
    expect(await codigoDoErro(criarAuthFirebase().signUp(dados))).toBe('regras-recusadas');
    expect(m(fa.deleteUser)).toHaveBeenCalledWith(u);
    expect(m(fa.sendEmailVerification)).not.toHaveBeenCalled();
  });

  it('EX07: falha no envio da confirmação desfaz a conta', async () => {
    const u = usuario();
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: u });
    m(fa.sendEmailVerification).mockRejectedValue(erroFirebase('auth/internal-error'));
    expect(await codigoDoErro(criarAuthFirebase().signUp(dados))).toBe('falha');
    expect(m(fa.deleteUser)).toHaveBeenCalledWith(u);
  });

  it('se não conseguir apagar a conta, ao menos encerra a autenticação', async () => {
    m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: usuario() });
    m(ff.setDoc).mockRejectedValue(erroFirebase('permission-denied'));
    m(fa.deleteUser).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    await codigoDoErro(criarAuthFirebase().signUp(dados));
    expect(m(fa.signOut)).toHaveBeenCalled();
  });

  describe('com tempo simulado', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('gravação do perfil presa por falta de rede vira EX03 e desfaz a conta', async () => {
      const u = usuario();
      m(fa.createUserWithEmailAndPassword).mockResolvedValue({ user: u });
      m(ff.setDoc).mockReturnValue(new Promise(() => {}));
      const resultado = codigoDoErro(criarAuthFirebase().signUp(dados));
      await jest.advanceTimersByTimeAsync(15000);
      expect(await resultado).toBe('sem-conexao');
      expect(m(fa.deleteUser)).toHaveBeenCalledWith(u);
    });
  });

  it('o erro lançado não expõe e-mail nem token do erro original (RNF14)', async () => {
    m(fa.createUserWithEmailAndPassword).mockRejectedValue(erroFirebase('auth/internal-error'));
    try {
      await criarAuthFirebase().signUp(dados);
    } catch (e) {
      expect(String((e as Error).message)).not.toMatch(/ana@exemplo\.com|token-secreto/);
    }
  });
});

describe('signIn (fluxo B)', () => {
  it('conta confirmada inicia a sessão (B4)', async () => {
    m(fa.signInWithEmailAndPassword).mockResolvedValue({ user: usuario({ emailVerified: true }) });
    await criarAuthFirebase().signIn(' ana@exemplo.com ', 'Abcdef1!');
    expect(m(fa.signInWithEmailAndPassword).mock.calls[0].slice(1)).toEqual(['ana@exemplo.com', 'Abcdef1!']);
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
  });

  it.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'])(
    'EX04: %s vira credenciais rejeitadas, sem indicar qual campo errou',
    async (code) => {
      m(fa.signInWithEmailAndPassword).mockRejectedValue(erroFirebase(code));
      expect(await codigoDoErro(criarAuthFirebase().signIn('ana@exemplo.com', 'x'))).toBe('credenciais');
      expect(obterSessao().status).toBe('sem-sessao');
    },
  );

  it('EX05: sem conexão', async () => {
    m(fa.signInWithEmailAndPassword).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    expect(await codigoDoErro(criarAuthFirebase().signIn('ana@exemplo.com', 'x'))).toBe('sem-conexao');
  });

  it('EX11: e-mail não confirmado não inicia a sessão', async () => {
    m(fa.signInWithEmailAndPassword).mockResolvedValue({ user: usuario({ emailVerified: false }) });
    expect(await codigoDoErro(criarAuthFirebase().signIn('ana@exemplo.com', 'Abcdef1!'))).toBe('email-nao-confirmado');
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('EX11: não encerra a autenticação, para que a confirmação possa ser verificada e reenviada', async () => {
    m(fa.signInWithEmailAndPassword).mockResolvedValue({ user: usuario({ emailVerified: false }) });
    await codigoDoErro(criarAuthFirebase().signIn('ana@exemplo.com', 'Abcdef1!'));
    expect(m(fa.signOut)).not.toHaveBeenCalled();
  });
});

describe('observador de sessão', () => {
  function ouvinte() {
    iniciarObservadorDeSessao();
    return m(fa.onAuthStateChanged).mock.calls[0][1] as (u: unknown) => void;
  }

  it('e-mail confirmado vira sessão ativa (restaura a sessão ao abrir o app)', () => {
    ouvinte()(usuario({ emailVerified: true }));
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
  });

  it('e-mail não confirmado continua sem sessão', () => {
    ouvinte()(usuario({ emailVerified: false }));
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('sem usuário volta a sem sessão', () => {
    const cb = ouvinte();
    cb(usuario({ emailVerified: true }));
    cb(null);
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('usuário confirmado sem e-mail não vira sessão', () => {
    ouvinte()(usuario({ emailVerified: true, email: null }));
    expect(obterSessao().status).toBe('sem-sessao');
  });
});

describe('sendPasswordReset (fluxo C, passo 2)', () => {
  it('envia para o e-mail informado, sem espaços', async () => {
    await criarAuthFirebase().sendPasswordReset(' ana@exemplo.com ');
    expect(m(fa.sendPasswordResetEmail).mock.calls[0][1]).toBe('ana@exemplo.com');
  });

  it.each(['auth/user-not-found', 'auth/invalid-email'])(
    'resposta neutra: %s não é erro (não revela se a conta existe)',
    async (code) => {
      m(fa.sendPasswordResetEmail).mockRejectedValue(erroFirebase(code));
      await expect(criarAuthFirebase().sendPasswordReset('x@y.com')).resolves.toBeUndefined();
    },
  );

  it('EX03: sem conexão', async () => {
    m(fa.sendPasswordResetEmail).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    expect(await codigoDoErro(criarAuthFirebase().sendPasswordReset('ana@exemplo.com'))).toBe('sem-conexao');
  });
});

describe('confirmPasswordReset (fluxo C, passo 4)', () => {
  it('grava a nova senha com o código da ligação', async () => {
    await criarAuthFirebase().confirmPasswordReset('cod123', 'Abcdef1!');
    expect(m(fa.confirmPasswordReset).mock.calls[0].slice(1)).toEqual(['cod123', 'Abcdef1!']);
  });

  it.each(['auth/expired-action-code', 'auth/invalid-action-code'])(
    'EX06: %s (expirada ou já usada)',
    async (code) => {
      m(fa.confirmPasswordReset).mockRejectedValue(erroFirebase(code));
      expect(await codigoDoErro(criarAuthFirebase().confirmPasswordReset('c', 'Abcdef1!'))).toBe('ligacao-invalida');
    },
  );

  it('EX03: sem conexão', async () => {
    m(fa.confirmPasswordReset).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    expect(await codigoDoErro(criarAuthFirebase().confirmPasswordReset('c', 'Abcdef1!'))).toBe('sem-conexao');
  });
});

describe('checkEmailVerified (fluxo E)', () => {
  it('ainda não confirmado: devolve false e não inicia a sessão', async () => {
    const u = usuario({ emailVerified: false });
    setCurrentUser(u);
    expect(await criarAuthFirebase().checkEmailVerified()).toBe(false);
    expect(u.reload).toHaveBeenCalled();
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('confirmado: devolve true, renova o token e inicia a sessão (E4)', async () => {
    const u = usuario();
    u.reload.mockImplementation(async () => {
      u.emailVerified = true;
    });
    setCurrentUser(u);
    expect(await criarAuthFirebase().checkEmailVerified()).toBe(true);
    expect(u.getIdToken).toHaveBeenCalledWith(true);
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
  });

  it('EX03: sem conexão ao verificar', async () => {
    const u = usuario();
    u.reload.mockRejectedValue(erroFirebase('auth/network-request-failed'));
    setCurrentUser(u);
    expect(await codigoDoErro(criarAuthFirebase().checkEmailVerified())).toBe('sem-conexao');
  });

  it('EX06: sem usuário autenticado', async () => {
    expect(await codigoDoErro(criarAuthFirebase().checkEmailVerified())).toBe('ligacao-invalida');
  });
});

describe('resendVerification (FA07)', () => {
  it('envia uma nova ligação ao usuário atual', async () => {
    const u = usuario();
    setCurrentUser(u);
    await criarAuthFirebase().resendVerification();
    expect(m(fa.sendEmailVerification).mock.calls[0][0]).toBe(u);
  });

  it('EX03: sem conexão', async () => {
    setCurrentUser(usuario());
    m(fa.sendEmailVerification).mockRejectedValue(erroFirebase('auth/network-request-failed'));
    expect(await codigoDoErro(criarAuthFirebase().resendVerification())).toBe('sem-conexao');
  });

  it('EX06: sem usuário autenticado', async () => {
    expect(await codigoDoErro(criarAuthFirebase().resendVerification())).toBe('ligacao-invalida');
  });
});

describe('signOut (fluxo D)', () => {
  it('invalida a sessão (D2)', async () => {
    definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
    await criarAuthFirebase().signOut();
    expect(m(fa.signOut)).toHaveBeenCalled();
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('EX09: se falhar, a sessão continua ativa', async () => {
    definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
    m(fa.signOut).mockRejectedValue(new Error('falha'));
    await expect(criarAuthFirebase().signOut()).rejects.toThrow();
    expect(obterSessao().status).toBe('ativa');
  });
});

describe('currentSession', () => {
  it('devolve o estado atual', () => {
    definirSessao({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
    expect(criarAuthFirebase().currentSession()).toEqual({ status: 'ativa', uid: 'u1', email: 'ana@exemplo.com' });
  });
});

describe('changePassword (UC11)', () => {
  it('reautentica com a senha atual e grava a nova', async () => {
    const u = usuario({ emailVerified: true });
    setCurrentUser(u);
    await criarAuthFirebase().changePassword({ senhaAtual: 'Atual@123', novaSenha: 'Nova@1234' });
    expect(m(fa.EmailAuthProvider.credential)).toHaveBeenCalledWith('ana@exemplo.com', 'Atual@123');
    expect(m(fa.updatePassword)).toHaveBeenCalledWith(u, 'Nova@1234');
  });

  it('senha atual errada não altera nada', async () => {
    setCurrentUser(usuario());
    m(fa.reauthenticateWithCredential).mockRejectedValue(erroFirebase('auth/invalid-credential'));
    expect(await codigoDoErro(criarAuthFirebase().changePassword({ senhaAtual: 'x', novaSenha: 'Nova@1234' }))).toBe(
      'credenciais',
    );
    expect(m(fa.updatePassword)).not.toHaveBeenCalled();
  });
});

describe('requestEmailChange e confirmEmailChange (UC11)', () => {
  it('pede a troca: reautentica e envia a ligação ao novo e-mail', async () => {
    const u = usuario();
    setCurrentUser(u);
    await criarAuthFirebase().requestEmailChange({ novoEmail: ' novo@exemplo.com ', senhaAtual: 'Atual@123' });
    expect(m(fa.reauthenticateWithCredential)).toHaveBeenCalled();
    expect(m(fa.verifyBeforeUpdateEmail).mock.calls[0][0]).toBe(u);
    expect(m(fa.verifyBeforeUpdateEmail).mock.calls[0][1]).toBe('novo@exemplo.com');
  });

  it('senha errada não envia a ligação', async () => {
    setCurrentUser(usuario());
    m(fa.reauthenticateWithCredential).mockRejectedValue(erroFirebase('auth/invalid-credential'));
    expect(
      await codigoDoErro(criarAuthFirebase().requestEmailChange({ novoEmail: 'novo@exemplo.com', senhaAtual: 'x' })),
    ).toBe('credenciais');
    expect(m(fa.verifyBeforeUpdateEmail)).not.toHaveBeenCalled();
  });

  it('confirma a troca: atualiza o perfil e a sessão com o novo e-mail', async () => {
    const u = usuario({ emailVerified: true });
    u.reload.mockImplementation(async () => {
      u.email = 'novo@exemplo.com';
    });
    setCurrentUser(u);
    await criarAuthFirebase().confirmEmailChange('cod');
    expect(m(fa.applyActionCode).mock.calls[0][1]).toBe('cod');
    expect(m(ff.updateDoc)).toHaveBeenCalledWith(
      { path: 'usuarios/u1' },
      { email: 'novo@exemplo.com', atualizado_em: 'TS' },
    );
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'u1', email: 'novo@exemplo.com' });
  });

  it('código expirado não altera o perfil', async () => {
    setCurrentUser(usuario({ emailVerified: true }));
    m(fa.applyActionCode).mockRejectedValue(erroFirebase('auth/expired-action-code'));
    expect(await codigoDoErro(criarAuthFirebase().confirmEmailChange('cod'))).toBe('ligacao-invalida');
    expect(m(ff.updateDoc)).not.toHaveBeenCalled();
  });
});
