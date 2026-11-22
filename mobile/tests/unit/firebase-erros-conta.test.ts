import { comTimeout, traduzirErroFirebase } from '@/features/conta/firebase-erros';
import { ErroConta, type CodigoErro } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

describe('traduzirErroFirebase (tabela EX01 a EX10)', () => {
  const tabela: [string, CodigoErro][] = [
    ['auth/email-already-in-use', 'email-em-uso'],
    ['auth/network-request-failed', 'sem-conexao'],
    ['unavailable', 'sem-conexao'],
    ['deadline-exceeded', 'sem-conexao'],
    ['auth/invalid-credential', 'credenciais'],
    ['auth/wrong-password', 'credenciais'],
    ['auth/user-not-found', 'credenciais'],
    ['auth/invalid-email', 'credenciais'],
    ['auth/user-disabled', 'credenciais'],
    ['auth/expired-action-code', 'ligacao-invalida'],
    ['auth/invalid-action-code', 'ligacao-invalida'],
    ['permission-denied', 'regras-recusadas'],
    ['auth/password-does-not-meet-requirements', 'regras-recusadas'],
    ['auth/weak-password', 'regras-recusadas'],
    ['auth/too-many-requests', 'falha'],
    ['auth/qualquer-outro', 'falha'],
  ];

  it.each(tabela)('%s → %s', (code, esperado) => {
    const e = traduzirErroFirebase({ code, message: 'texto cru com a@b.com e token abc123' });
    expect(e).toBeInstanceOf(ErroConta);
    expect(e.codigo).toBe(esperado);
  });

  it('não repassa a mensagem original (RNF14)', () => {
    const e = traduzirErroFirebase({ code: 'permission-denied', message: 'token abc123 de ana@exemplo.com' });
    expect(`${e.message} ${e.motivo ?? ''}`).not.toMatch(/abc123|ana@exemplo\.com/);
  });

  it.each(['auth/password-does-not-meet-requirements', 'auth/weak-password'])(
    'política de senha recusada pelo servidor (%s) mostra o texto da política',
    (code) => {
      expect(traduzirErroFirebase({ code }).motivo).toBe(MSG.senhaForaDaPolitica);
    },
  );

  it('mantém um ErroConta que já veio traduzido', () => {
    const original = new ErroConta('email-nao-confirmado');
    expect(traduzirErroFirebase(original)).toBe(original);
  });

  it.each([null, undefined, 'texto', 42, {}])('valor inesperado vira falha: %p', (v) => {
    expect(traduzirErroFirebase(v).codigo).toBe('falha');
  });
});

describe('comTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('devolve o valor quando resolve a tempo', async () => {
    await expect(comTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('repassa o erro original quando rejeita a tempo', async () => {
    await expect(comTimeout(Promise.reject({ code: 'permission-denied' }), 1000)).rejects.toEqual({
      code: 'permission-denied',
    });
  });

  it('rejeita com deadline-exceeded quando passa do prazo', async () => {
    const p = comTimeout(new Promise(() => {}), 1000);
    const resultado = p.then(
      () => 'resolveu',
      (e) => e.code,
    );
    await jest.advanceTimersByTimeAsync(1000);
    await expect(resultado).resolves.toBe('deadline-exceeded');
  });

  it('valor-limite: um instante antes do prazo ainda não rejeita', async () => {
    let terminou = false;
    comTimeout(new Promise(() => {}), 1000).catch(() => {
      terminou = true;
    });
    await jest.advanceTimersByTimeAsync(999);
    expect(terminou).toBe(false);
  });
});
