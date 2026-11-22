import {
  applyActionCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type ActionCodeSettings,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { comTimeout, traduzirErroFirebase } from './firebase-erros';
import { definirSessao, obterSessao } from './sessao';
import { ErroConta, type AuthService, type SessionState } from './types';

/** Opcional: URL de retorno das ligações. O prazo de 5 minutos NÃO é configurável aqui (ver pendência). */
const configAcao: ActionCodeSettings | undefined = process.env.EXPO_PUBLIC_AUTH_CONTINUE_URL
  ? { url: process.env.EXPO_PUBLIC_AUTH_CONTINUE_URL, handleCodeInApp: false }
  : undefined;

function sessaoDe(u: User | null): SessionState {
  // A sessão só existe para conta com e-mail confirmado (A6, E4, EX11).
  return u && u.emailVerified && u.email
    ? { status: 'ativa', uid: u.uid, email: u.email }
    : { status: 'sem-sessao' };
}

/** Mantém SessionState em dia com o Firebase (restaura a sessão ao abrir o app). Retorna o cancelamento. */
export function iniciarObservadorDeSessao(): () => void {
  return onAuthStateChanged(auth, (u) => definirSessao(sessaoDe(u)));
}

/** Usuário do Firebase atual, mesmo sem e-mail confirmado (necessário para reenviar e verificar a ligação). */
function usuarioAtual(): User {
  const u = auth.currentUser;
  if (!u) throw new ErroConta('ligacao-invalida');
  return u;
}

async function reautenticar(u: User, senhaAtual: string) {
  if (!u.email) throw new ErroConta('falha');
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, senhaAtual));
}

export function criarAuthFirebase(): AuthService {
  return {
    /** A5-A6: conta + perfil são um passo só. Se qualquer etapa falhar, nada fica criado. */
    async signUp({ email, senha, nome }) {
      let u: User;
      try {
        u = (await createUserWithEmailAndPassword(auth, email.trim(), senha)).user;
      } catch (e) {
        throw traduzirErroFirebase(e); // EX02, EX03, EX07
      }
      try {
        const perfil: Record<string, unknown> = {
          email: email.trim(),
          criado_em: serverTimestamp(),
        };
        if (nome?.trim()) perfil.nome = nome.trim();
        await comTimeout(setDoc(doc(db, 'usuarios', u.uid), perfil)); // sem CPF
        await sendEmailVerification(u, configAcao); // A6
      } catch (e) {
        // Desfaz: nenhuma conta ou perfil parcial (EX07, EX10).
        await deleteUser(u).catch(() => fbSignOut(auth).catch(() => {}));
        throw traduzirErroFirebase(e);
      }
      // O usuário continua autenticado internamente só para o fluxo E; SessionState segue "sem-sessao".
    },

    /** B3: se o e-mail não estiver confirmado não há sessão (EX11), mas o usuário fica à mão para reenviar. */
    async signIn(email, senha) {
      let u: User;
      try {
        u = (await signInWithEmailAndPassword(auth, email.trim(), senha)).user;
      } catch (e) {
        throw traduzirErroFirebase(e); // EX04, EX05
      }
      if (!u.emailVerified) throw new ErroConta('email-nao-confirmado'); // EX11
      definirSessao(sessaoDe(u));
    },

    /** C2: resposta neutra. Conta inexistente não é erro (não revela se o e-mail existe). */
    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email.trim(), configAcao);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'auth/user-not-found' || code === 'auth/invalid-email') return;
        throw traduzirErroFirebase(e);
      }
    },

    /** C4: grava a nova senha e invalida a ligação (uso único, o próprio Firebase invalida o código). */
    async confirmPasswordReset(codigo, novaSenha) {
      try {
        await fbConfirmPasswordReset(auth, codigo, novaSenha);
      } catch (e) {
        throw traduzirErroFirebase(e); // EX06, EX03
      }
    },

    /** E3-E4 */
    async checkEmailVerified() {
      const u = usuarioAtual();
      try {
        await u.reload();
        if (!u.emailVerified) return false;
        await u.getIdToken(true); // atualiza a claim email_verified usada pelas Security Rules
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
      definirSessao(sessaoDe(u));
      return true;
    },

    /** FA07 */
    async resendVerification() {
      const u = usuarioAtual();
      try {
        await sendEmailVerification(u, configAcao);
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },

    /** D2: não exige conexão (FA04, RNF34). A suspensão da sincronização acontece em index.ts. */
    async signOut() {
      await fbSignOut(auth);
      definirSessao({ status: 'sem-sessao' });
    },

    currentSession() {
      return obterSessao();
    },

    async changePassword({ senhaAtual, novaSenha }) {
      const u = usuarioAtual();
      try {
        await reautenticar(u, senhaAtual);
        await updatePassword(u, novaSenha);
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },

    async requestEmailChange({ novoEmail, senhaAtual }) {
      const u = usuarioAtual();
      try {
        await reautenticar(u, senhaAtual);
        await verifyBeforeUpdateEmail(u, novoEmail.trim(), configAcao);
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },

    async confirmEmailChange(codigo) {
      try {
        await applyActionCode(auth, codigo);
        const u = usuarioAtual();
        await u.reload();
        await u.getIdToken(true);
        if (u.email) {
          await comTimeout(updateDoc(doc(db, 'usuarios', u.uid), { email: u.email, atualizado_em: serverTimestamp() }));
        }
        definirSessao(sessaoDe(u));
      } catch (e) {
        throw traduzirErroFirebase(e);
      }
    },
  };
}
