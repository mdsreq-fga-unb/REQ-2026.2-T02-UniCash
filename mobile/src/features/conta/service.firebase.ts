
import { traduzirErroFirebase } from './firebase-erros';
import { obterSincronizacao } from './sync';
import { ErroConta, type AuthService, type ContaService } from './types';

/**
 * ContaService (o que as telas usam) montado sobre o AuthService
 * e a porta de sincronização.
 */
export function criarContaServiceFirebase(auth: AuthService): ContaService {
  return {
    async cadastrar(dados) {
      await auth.signUp(dados);

      // FA01: uma conta recém-criada não recebe automaticamente
      // os dados locais existentes no aparelho.
      await obterSincronizacao().pausarEnvioAutomatico().catch(() => {});
    },

    verificarConfirmacao: () => auth.checkEmailVerified(),

    reenviarConfirmacao: () => auth.resendVerification(),

    /**
     * E6: marca os registros do aparelho como pendentes e sincroniza.
     * O envio é solicitado explicitamente pelo usuário.
     */
    async enviarDadosDoAparelho() {
      try {
        const sync = obterSincronizacao();
        const sessao = auth.currentSession();

        if (sessao.status !== 'ativa') {
          throw new ErroConta('falha');
        }

        try {
          await sync.marcarTodosComoPendentes();
        } catch {
          throw new ErroConta('falha');
        }

        // Envio pedido pela pessoa (manual): libera o envio automático pausado em FA01.
        // Não chamar retomar() aqui: ele ocupa a trava do sincronizarPendentes() em segundo plano e
        // faria o envio manual ser descartado.
        await sync.sincronizar();
      } catch (e) {
        if (e instanceof ErroConta) {
          throw e;
        }

        throw traduzirErroFirebase(e);
      }
    },

    /**
     * B3-B4: inicia a sessão. A sincronização é retomada pelo observador de sessão (index.ts),
     * vinculada ao UID autenticado.
     */
    async entrar({ email, senha }) {
      await auth.signIn(email, senha);
    },

    enviarRecuperacao: (email) => auth.sendPasswordReset(email),

    redefinirSenha: ({ codigo, novaSenha }) =>
      auth.confirmPasswordReset(codigo, novaSenha),

    contarPendentes: () => obterSincronizacao().contarPendentes(),

    async sincronizarAgora() {
      try {
        const sessao = auth.currentSession();

        if (sessao.status !== 'ativa') {
          throw new ErroConta('falha');
        }

        // Sem retomar(): ele ocupa a trava do envio em segundo plano e faria este envio ser descartado.
        await obterSincronizacao().sincronizar();
      } catch (e) {
        if (e instanceof ErroConta) {
          throw e;
        }

        throw traduzirErroFirebase(e);
      }
    },

    /**
     * D2: suspende a sincronização antes de encerrar a sessão.
     * Os dados locais permanecem no aparelho (RN06).
     */
    async sair() {
      try {
        await obterSincronizacao().suspender();
        await auth.signOut();
      } catch {
        throw new ErroConta('falha');
      }
    },
  };
}
