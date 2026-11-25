import { ErroConta } from './types';
import { MSG } from './validation';

/**
 * Tabela de códigos de erro (EX01 a EX10). Converte o erro bruto do Firebase em ErroConta.
 * Nunca repassa a mensagem original: ela pode conter e-mail, token ou detalhes internos (RNF14).
 * O texto mostrado ao usuário vem de erros.ts (mensagemDoErro).
 *
 *  Firebase                                              → código            → exceção
 *  auth/email-already-in-use                             → email-em-uso      → EX02
 *  auth/network-request-failed, unavailable, timeout     → sem-conexao       → EX03 / EX05
 *  auth/invalid-credential, wrong-password,
 *    user-not-found, invalid-email, user-disabled        → credenciais       → EX04
 *  auth/expired-action-code, invalid-action-code         → ligacao-invalida  → EX06
 *  permission-denied (Security Rules)                    → regras-recusadas  → EX10
 *  auth/password-does-not-meet-requirements,
 *    auth/weak-password (política de senha do servidor)  → regras-recusadas  → EX01 (texto da política)
 *  qualquer outro                                        → falha             → EX07
 *  (email-nao-confirmado é lançado pelo próprio serviço → EX11)
 */
export function traduzirErroFirebase(e: unknown): ErroConta {
  if (e instanceof ErroConta) return e;
  const code = String((e as { code?: unknown } | null)?.code ?? '');
  switch (code) {
    case 'auth/email-already-in-use':
      return new ErroConta('email-em-uso');
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return new ErroConta('sem-conexao');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/user-disabled':
      return new ErroConta('credenciais');
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return new ErroConta('ligacao-invalida');
    case 'auth/password-does-not-meet-requirements':
    case 'auth/weak-password':
      // A política de senha também vale no servidor (Authentication > Settings > Password policy).
      return new ErroConta('regras-recusadas', MSG.senhaForaDaPolitica);
    case 'permission-denied':
      return new ErroConta('regras-recusadas', 'Os dados informados foram recusados pelo servidor.');
    default:
      return new ErroConta('falha');
  }
}

/** Evita que uma gravação no Firestore fique presa para sempre quando o aparelho está sem rede. */
export function comTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject({ code: 'deadline-exceeded' }), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}
