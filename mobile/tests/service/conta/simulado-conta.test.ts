import { controlesSimulacao, criarServicoSimulado } from '@/features/conta/service.simulado';
import { definirSessao, obterSessao } from '@/features/conta/sessao';
import type { CodigoErro } from '@/features/conta/types';

async function codigoDoErro(p: Promise<unknown>): Promise<CodigoErro | 'sem-erro'> {
  try {
    await p;
  } catch (e) {
    return (e as { codigo: CodigoErro }).codigo;
  }
  return 'sem-erro';
}

const original = new Map(controlesSimulacao.contas);

beforeEach(() => {
  // sem esperas de 400 ms
  jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => {
    fn();
    return 0;
  }) as unknown as typeof setTimeout);
  controlesSimulacao.online = true;
  controlesSimulacao.pendentes = 0;
  controlesSimulacao.contas.clear();
  original.forEach((v, k) => controlesSimulacao.contas.set(k, { ...v }));
  definirSessao({ status: 'sem-sessao' });
});
afterEach(() => jest.restoreAllMocks());

describe('serviço simulado', () => {
  it('cadastra e não inicia sessão (A6)', async () => {
    const s = criarServicoSimulado();
    await s.cadastrar({ email: 'novo@exemplo.com', senha: 'Abcdef1!' });
    expect(controlesSimulacao.contas.get('novo@exemplo.com')?.confirmada).toBe(false);
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('EX02: e-mail já em uso, sem diferenciar maiúsculas', async () => {
    const s = criarServicoSimulado();
    expect(await codigoDoErro(s.cadastrar({ email: 'TESTE@unicash.app', senha: 'Abcdef1!' }))).toBe('email-em-uso');
  });

  it('EX03: sem conexão no cadastro', async () => {
    controlesSimulacao.online = false;
    const s = criarServicoSimulado();
    expect(await codigoDoErro(s.cadastrar({ email: 'novo@exemplo.com', senha: 'Abcdef1!' }))).toBe('sem-conexao');
    expect(controlesSimulacao.contas.has('novo@exemplo.com')).toBe(false);
  });

  it('entra com credenciais corretas e conta confirmada', async () => {
    await criarServicoSimulado().entrar({ email: 'teste@unicash.app', senha: 'Senha@123' });
    expect(obterSessao()).toEqual({ status: 'ativa', uid: 'teste@unicash.app', email: 'teste@unicash.app' });
  });

  it.each([
    ['senha errada', 'teste@unicash.app', 'errada'],
    ['conta inexistente', 'ninguem@exemplo.com', 'Senha@123'],
  ])('EX04: %s', async (_nome, email, senha) => {
    expect(await codigoDoErro(criarServicoSimulado().entrar({ email, senha }))).toBe('credenciais');
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('EX05: sem conexão ao entrar', async () => {
    controlesSimulacao.online = false;
    expect(await codigoDoErro(criarServicoSimulado().entrar({ email: 'teste@unicash.app', senha: 'Senha@123' }))).toBe(
      'sem-conexao',
    );
  });

  it('EX11: e-mail não confirmado não inicia sessão', async () => {
    const s = criarServicoSimulado();
    await s.cadastrar({ email: 'novo@exemplo.com', senha: 'Abcdef1!' });
    expect(await codigoDoErro(s.entrar({ email: 'novo@exemplo.com', senha: 'Abcdef1!' }))).toBe('email-nao-confirmado');
    expect(obterSessao().status).toBe('sem-sessao');
  });

  it('confirmação: a primeira tentativa não confirma, a segunda inicia a sessão', async () => {
    const s = criarServicoSimulado();
    await s.cadastrar({ email: 'novo@exemplo.com', senha: 'Abcdef1!' });
    expect(await s.verificarConfirmacao('novo@exemplo.com')).toBe(false);
    expect(await s.verificarConfirmacao('novo@exemplo.com')).toBe(true);
    expect(obterSessao().status).toBe('ativa');
  });

  it('EX06: confirmação de conta que não existe', async () => {
    expect(await codigoDoErro(criarServicoSimulado().verificarConfirmacao('x@y.com'))).toBe('ligacao-invalida');
  });

  it('redefinirSenha: código válido passa; vazio ou expirado é EX06', async () => {
    const s = criarServicoSimulado();
    await expect(s.redefinirSenha({ codigo: 'abc', novaSenha: 'Abcdef1!' })).resolves.toBeUndefined();
    expect(await codigoDoErro(s.redefinirSenha({ codigo: '', novaSenha: 'Abcdef1!' }))).toBe('ligacao-invalida');
    expect(await codigoDoErro(s.redefinirSenha({ codigo: 'expirado', novaSenha: 'Abcdef1!' }))).toBe('ligacao-invalida');
  });

  it('EX03: sem conexão na recuperação', async () => {
    controlesSimulacao.online = false;
    expect(await codigoDoErro(criarServicoSimulado().enviarRecuperacao('a@b.com'))).toBe('sem-conexao');
  });

  it('pendentes: conta e zera ao sincronizar', async () => {
    const s = criarServicoSimulado();
    controlesSimulacao.pendentes = 3;
    expect(await s.contarPendentes()).toBe(3);
    await s.sincronizarAgora();
    expect(await s.contarPendentes()).toBe(0);
  });

  it('sincronizar sem conexão falha e mantém as pendências', async () => {
    controlesSimulacao.pendentes = 3;
    controlesSimulacao.online = false;
    expect(await codigoDoErro(criarServicoSimulado().sincronizarAgora())).toBe('sem-conexao');
    expect(controlesSimulacao.pendentes).toBe(3);
  });

  it('FA04: sair não exige conexão', async () => {
    const s = criarServicoSimulado();
    await s.entrar({ email: 'teste@unicash.app', senha: 'Senha@123' });
    controlesSimulacao.online = false;
    await s.sair();
    expect(obterSessao().status).toBe('sem-sessao');
  });
});
