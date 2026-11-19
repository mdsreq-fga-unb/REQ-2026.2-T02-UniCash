/** Prazo das ligações enviadas por e-mail (RF01, RF31). Constante única. */
export const PRAZO_LIGACAO_MINUTOS = 5;

/** Textos literais do casos_de_uso.md (UC10). */
export const MSG = {
  emailVazio: 'Informe o e-mail.',
  emailInvalido: 'Informe um e-mail válido.',
  senhaVazia: 'Informe a senha.',
  senhaForaDaPolitica:
    'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, letra minúscula e um caractere especial.',
  emailEmUso: 'Este e-mail já está em uso.',
  semConexaoContinuar: 'Sem conexão. Conecte-se à internet para continuar.',
  semConexaoEntrar: 'Sem conexão. Conecte-se à internet para entrar.',
  credenciaisRejeitadas: 'E-mail ou senha incorretos. Confira e tente novamente.',
  ligacaoInvalida: 'Esta ligação expirou ou já foi usada. Solicite uma nova.',
  falhaCriarConta: 'Não foi possível criar a conta. Nenhuma alteração foi feita. Tente novamente.',
  falhaSair: 'Não foi possível sair. Tente novamente.',
  emailNaoConfirmado:
    'Este e-mail ainda não foi confirmado. Abra a ligação enviada ao seu e-mail ou peça um reenvio.',
} as const;

export type ErrosConta = Partial<Record<'email' | 'senha', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(valor: string): string | undefined {
  const email = valor.trim();
  if (!email) return MSG.emailVazio;
  if (!EMAIL_RE.test(email)) return MSG.emailInvalido;
  return undefined;
}

/**
 * Política de senha (A4): mínimo de 8 caracteres, maiúscula, minúscula e ao menos um caractere
 * especial. "Especial" = qualquer caractere que não seja letra nem número (ponto a validar).
 * Função única, usada no cadastro e na redefinição.
 */
export function senhaNaPolitica(senha: string): boolean {
  return (
    senha.length >= 8 &&
    /\p{Lu}/u.test(senha) &&
    /\p{Ll}/u.test(senha) &&
    /[^\p{L}\p{N}]/u.test(senha)
  );
}

export function validarSenhaNova(senha: string): string | undefined {
  if (!senha) return MSG.senhaVazia;
  if (!senhaNaPolitica(senha)) return MSG.senhaForaDaPolitica;
  return undefined;
}

export function validarCadastro(v: { email: string; senha: string }): ErrosConta {
  const erros: ErrosConta = {};
  const e = validarEmail(v.email);
  if (e) erros.email = e;
  const s = validarSenhaNova(v.senha);
  if (s) erros.senha = s;
  return erros;
}

/** B2: só confere o preenchimento; a validade das credenciais é do serviço (EX04). */
export function validarEntrada(v: { email: string; senha: string }): ErrosConta {
  const erros: ErrosConta = {};
  if (!v.email.trim()) erros.email = MSG.emailVazio;
  if (!v.senha) erros.senha = MSG.senhaVazia;
  return erros;
}
