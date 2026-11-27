/** Contrato de sessão do UC10, consumido pelo UC11 (Gerenciar perfil). */
export type SessionState =
  | { status: 'sem-sessao' }
  | { status: 'ativa'; uid: string; email: string };

export type CodigoErro =
  | 'sem-conexao'
  | 'email-em-uso'
  | 'credenciais'
  | 'email-nao-confirmado'
  | 'ligacao-invalida'
  | 'regras-recusadas'
  | 'falha';

/** Erro lançado pelo serviço de conta; a tela traduz o código em mensagem (ver erros.ts). */
export class ErroConta extends Error {
  codigo: CodigoErro;
  /** Motivo informado pelo servidor (EX10, RNF14), quando houver. */
  motivo?: string;
  constructor(codigo: CodigoErro, motivo?: string) {
    super(codigo);
    this.codigo = codigo;
    this.motivo = motivo;
  }
}

export interface DadosCadastro {
  email: string;
  senha: string;
  nome?: string;
}

/**
 * Operações que as telas do UC10 precisam. A implementação real (Firebase Authentication)
 * entra por definirServicoConta(); enquanto isso vale a simulada (service.simulado.ts).
 */
export interface ContaService {
  /** A1-A5: cria conta e perfil e envia a ligação de confirmação. Não inicia sessão. */
  cadastrar(dados: DadosCadastro): Promise<void>;
  /** E3-E4: true se o e-mail já está confirmado (e a sessão foi iniciada). */
  verificarConfirmacao(email: string): Promise<boolean>;
  /** FA07: envia uma nova ligação de confirmação. */
  reenviarConfirmacao(email: string): Promise<void>;
  /** E6: marca os registros do aparelho como pendentes e sincroniza (RF62). */
  enviarDadosDoAparelho(): Promise<void>;
  /** B3-B4: valida credenciais e e-mail confirmado, inicia a sessão e retoma a sincronização. */
  entrar(dados: { email: string; senha: string }): Promise<void>;
  /** C2: envia a ligação de redefinição (resposta sempre neutra para o usuário). */
  enviarRecuperacao(email: string): Promise<void>;
  /** C3-C4: grava a nova senha e invalida a ligação. */
  redefinirSenha(dados: { codigo: string; novaSenha: string }): Promise<void>;
  /** FA03: quantidade de alterações ainda não sincronizadas. */
  contarPendentes(): Promise<number>;
  sincronizarAgora(): Promise<void>;
  /** D2: invalida a sessão e suspende a sincronização. Os dados locais permanecem (RN06). */
  sair(): Promise<void>;
}

/**
 * Contrato compartilhado com o UC11 (aprovado no início do timebox).
 * Camada fina sobre o Firebase Authentication; ContaService (acima) é montado em cima dela.
 */
export interface AuthService {
  /** A5-A6: cria conta + perfil e envia a ligação de confirmação. Não inicia sessão. Desfaz tudo se falhar. */
  signUp(dados: DadosCadastro): Promise<void>;
  /** B3: valida credenciais. Conta não confirmada lança 'email-nao-confirmado' e não inicia sessão. */
  signIn(email: string, senha: string): Promise<void>;
  /** C2 */
  sendPasswordReset(email: string): Promise<void>;
  /** C4 */
  confirmPasswordReset(codigo: string, novaSenha: string): Promise<void>;
  /** E3-E4: true se confirmado (e a sessão foi iniciada). */
  checkEmailVerified(): Promise<boolean>;
  /** FA07 */
  resendVerification(): Promise<void>;
  /** D2 */
  signOut(): Promise<void>;
  currentSession(): SessionState;
  /** UC11: reautentica com a senha atual e grava a nova. */
  changePassword(dados: { senhaAtual: string; novaSenha: string }): Promise<void>;
  /** UC11: reautentica e envia a ligação de confirmação ao NOVO e-mail. O e-mail só muda após confirmar. */
  requestEmailChange(dados: { novoEmail: string; senhaAtual: string }): Promise<void>;
  /** UC11: Aplica o código ou verifica a confirmação feita no navegador. */
  confirmEmailChange(codigo?: string, emailEsperado?: string): Promise<void>;
}
