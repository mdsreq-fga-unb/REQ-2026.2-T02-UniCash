import { traduzirErroFirebase } from './firebase-erros';
import { obterSincronizacao } from './sync';
import { ErroConta, type AuthService, type ContaService } from './types';

/** ContaService (o que as telas usam) montado sobre o AuthService e a porta de sincronização. */
export function criarContaServiceFirebase(auth: AuthService): ContaService {
  return {
    cadastrar: (dados) => auth.signUp(dados),
    verificarConfirmacao: () => auth.checkEmailVerified(),
    reenviarConfirmacao: () => auth.resendVerification(),

    /** E6: marca os registros do aparelho como pendentes e sincroniza. Se o envio falhar, seguem pendentes (EX08). */
    async enviarDadosDoAparelho() {
      try {
        const sync = obterSincronizacao();
        await sync.marcarTodosComoPendentes();
        await sync.sincronizar();
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },

    entrar: ({ email, senha }) => auth.signIn(email, senha),
    enviarRecuperacao: (email) => auth.sendPasswordReset(email),
    redefinirSenha: ({ codigo, novaSenha }) => auth.confirmPasswordReset(codigo, novaSenha),

    contarPendentes: () => obterSincronizacao().contarPendentes(),

    async sincronizarAgora() {
      try {
        await obterSincronizacao().sincronizar();
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },

    /** D2 (EX09): se falhar, a sessão continua ativa. */
    async sair() {
      try {
        await auth.signOut();
      } catch {
        throw new ErroConta('falha');
      }
    },
  };
}
