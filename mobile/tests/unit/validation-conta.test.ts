import {
  MSG,
  senhaNaPolitica,
  validarCadastro,
  validarEmail,
  validarEntrada,
  validarSenhaNova,
} from '@/features/conta/validation';

describe('validarEmail (RNF04)', () => {
  it('aceita e-mail válido', () => {
    expect(validarEmail('ana@exemplo.com')).toBeUndefined();
  });
  it('ignora espaços nas pontas', () => {
    expect(validarEmail('  ana@exemplo.com  ')).toBeUndefined();
  });
  it.each(['', '   '])('rejeita e-mail não informado: %j', (v) => {
    expect(validarEmail(v)).toBe(MSG.emailVazio);
  });
  it.each(['ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana @exemplo.com', 'ana@@exemplo.com'])(
    'rejeita formato inválido: %s',
    (v) => {
      expect(validarEmail(v)).toBe(MSG.emailInvalido);
    },
  );
});

describe('senhaNaPolitica (A4)', () => {
  it('valor-limite: 8 caracteres válidos passam', () => {
    expect(senhaNaPolitica('Abcdef1!')).toBe(true);
  });
  it('valor-limite: 7 caracteres falham mesmo com todas as classes', () => {
    expect(senhaNaPolitica('Abcde1!')).toBe(false);
  });
  it('sem maiúscula falha', () => {
    expect(senhaNaPolitica('abcdefg!')).toBe(false);
  });
  it('sem minúscula falha', () => {
    expect(senhaNaPolitica('ABCDEFG!')).toBe(false);
  });
  it('sem caractere especial falha', () => {
    expect(senhaNaPolitica('Abcdefg1')).toBe(false);
  });
  it('número não conta como caractere especial', () => {
    expect(senhaNaPolitica('Abcdefg123')).toBe(false);
  });
  it.each(['_', '-', ' ', '#', '@', '€'])('aceita %j como caractere especial', (c) => {
    expect(senhaNaPolitica(`Abcdefg${c}`)).toBe(true);
  });
  it('reconhece maiúscula e minúscula acentuadas', () => {
    expect(senhaNaPolitica('Ábcdéfg!')).toBe(true);
  });
  it('aceita senha longa', () => {
    expect(senhaNaPolitica(`Aa!${'x'.repeat(200)}`)).toBe(true);
  });
});

describe('validarSenhaNova', () => {
  it('senha vazia', () => {
    expect(validarSenhaNova('')).toBe(MSG.senhaVazia);
  });
  it('senha fora da política', () => {
    expect(validarSenhaNova('abc')).toBe(MSG.senhaForaDaPolitica);
  });
  it('senha válida', () => {
    expect(validarSenhaNova('Abcdef1!')).toBeUndefined();
  });
});

describe('validarCadastro (EX01)', () => {
  it('dados válidos não geram erro', () => {
    expect(validarCadastro({ email: 'ana@exemplo.com', senha: 'Abcdef1!' })).toEqual({});
  });
  it('mostra o motivo ao lado de cada campo inválido', () => {
    expect(validarCadastro({ email: '', senha: '' })).toEqual({ email: MSG.emailVazio, senha: MSG.senhaVazia });
  });
  it('e-mail inválido e senha fora da política', () => {
    expect(validarCadastro({ email: 'x', senha: 'abc' })).toEqual({
      email: MSG.emailInvalido,
      senha: MSG.senhaForaDaPolitica,
    });
  });
  it('só a senha inválida', () => {
    expect(validarCadastro({ email: 'ana@exemplo.com', senha: 'Abcde1!' })).toEqual({
      senha: MSG.senhaForaDaPolitica,
    });
  });
});

describe('validarEntrada (B2)', () => {
  it('só confere o preenchimento, não a política', () => {
    expect(validarEntrada({ email: 'ana@exemplo.com', senha: 'a' })).toEqual({});
  });
  it('campos vazios', () => {
    expect(validarEntrada({ email: '  ', senha: '' })).toEqual({ email: MSG.emailVazio, senha: MSG.senhaVazia });
  });
});

describe('constantes', () => {
  it('textos literais do caso de uso', () => {
    expect(MSG.emailEmUso).toBe('Este e-mail já está em uso.');
    expect(MSG.credenciaisRejeitadas).toBe('E-mail ou senha incorretos. Confira e tente novamente.');
    expect(MSG.semConexaoContinuar).toBe('Sem conexão. Conecte-se à internet para continuar.');
    expect(MSG.semConexaoEntrar).toBe('Sem conexão. Conecte-se à internet para entrar.');
  });
});
