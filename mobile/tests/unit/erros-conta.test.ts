import { mensagemDoErro } from '@/features/conta/erros';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

describe('mensagemDoErro', () => {
  it('EX02', () => expect(mensagemDoErro(new ErroConta('email-em-uso'))).toBe(MSG.emailEmUso));
  it('EX03: sem conexão', () => expect(mensagemDoErro(new ErroConta('sem-conexao'))).toBe(MSG.semConexaoContinuar));
  it('EX05: sem conexão ao entrar', () =>
    expect(mensagemDoErro(new ErroConta('sem-conexao'), { entrando: true })).toBe(MSG.semConexaoEntrar));
  it('EX04: não revela qual dos dois errou', () => {
    const m = mensagemDoErro(new ErroConta('credenciais'));
    expect(m).toBe(MSG.credenciaisRejeitadas);
    expect(m.toLowerCase()).not.toContain('senha incorreta');
  });
  it('EX06', () => expect(mensagemDoErro(new ErroConta('ligacao-invalida'))).toBe(MSG.ligacaoInvalida));
  it('EX07: falha genérica', () => expect(mensagemDoErro(new ErroConta('falha'))).toBe(MSG.falhaCriarConta));
  it('EX10: usa o motivo do servidor', () =>
    expect(mensagemDoErro(new ErroConta('regras-recusadas', 'Motivo X'))).toBe('Motivo X'));
  it('EX10: sem motivo, cai na falha genérica', () =>
    expect(mensagemDoErro(new ErroConta('regras-recusadas'))).toBe(MSG.falhaCriarConta));
  it('EX11', () => expect(mensagemDoErro(new ErroConta('email-nao-confirmado'))).toBe(MSG.emailNaoConfirmado));
  it('erro desconhecido vira falha genérica', () => {
    expect(mensagemDoErro(new Error('boom'))).toBe(MSG.falhaCriarConta);
    expect(mensagemDoErro('qualquer coisa')).toBe(MSG.falhaCriarConta);
    expect(mensagemDoErro(undefined)).toBe(MSG.falhaCriarConta);
  });
});
