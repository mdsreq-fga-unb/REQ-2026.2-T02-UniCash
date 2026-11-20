import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * Roda no Firestore Emulator: npm run test:rules
 * A senha nunca chega ao Firestore (fica no Firebase Authentication, RNF01); por isso o teste de
 * "senha ausente" é feito sobre o cliente (validation.test.ts) e aqui se garante que nenhum campo
 * de senha ou CPF é aceito no perfil.
 */
let env: RulesTestEnvironment;

const ana = { email: 'ana@exemplo.com', email_verified: true };
const anaNaoConfirmada = { email: 'ana@exemplo.com', email_verified: false };
const bia = { email: 'bia@exemplo.com', email_verified: true };

const db = (uid: string, token: Record<string, unknown> = ana) => env.authenticatedContext(uid, token).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

const perfilValido = (extra: Record<string, unknown> = {}) => ({
  email: 'ana@exemplo.com',
  criadoEm: serverTimestamp(),
  ...extra,
});

async function semear(uid: string, dados: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), dados);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'unicash-rules-test',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe('perfil: acesso (RNF02, RNF03)', () => {
  it('lê o próprio perfil', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criadoEm: Timestamp.now() });
    await assertSucceeds(getDoc(doc(db('u1'), 'users', 'u1')));
  });

  it('perfil de outro usuário negado na leitura', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criadoEm: Timestamp.now() });
    await assertFails(getDoc(doc(db('u2', bia), 'users', 'u1')));
  });

  it('perfil de outro usuário negado na escrita', async () => {
    await assertFails(setDoc(doc(db('u2', bia), 'users', 'u1'), perfilValido({ email: 'bia@exemplo.com' })));
  });

  it('perfil de outro usuário negado na alteração', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criadoEm: Timestamp.now() });
    await assertFails(updateDoc(doc(db('u2', bia), 'users', 'u1'), { nome: 'Invasora' }));
  });

  it('sem autenticação nada é lido nem gravado', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criadoEm: Timestamp.now() });
    await assertFails(getDoc(doc(anonimo(), 'users', 'u1')));
    await assertFails(setDoc(doc(anonimo(), 'users', 'u2'), perfilValido()));
  });

  it('não é possível apagar o perfil', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criadoEm: Timestamp.now() });
    await assertFails(deleteDoc(doc(db('u1'), 'users', 'u1')));
  });

  it('coleções desconhecidas ficam fechadas', async () => {
    await assertFails(setDoc(doc(db('u1'), 'qualquer', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(db('u1'), 'qualquer', 'x')));
  });
});

describe('perfil: cadastro (A5, RNF04)', () => {
  it('cria o próprio perfil válido, mesmo com e-mail ainda não confirmado', async () => {
    await assertSucceeds(setDoc(doc(db('u1', anaNaoConfirmada), 'users', 'u1'), perfilValido()));
  });

  it('aceita nome de até 80 caracteres (valor-limite)', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ nome: 'a'.repeat(80) })));
  });

  it('recusa nome com 81 caracteres (valor-limite)', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ nome: 'a'.repeat(81) })));
  });

  it('recusa nome que não é texto', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ nome: 123 })));
  });

  it('cadastro com e-mail ausente recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), { criadoEm: serverTimestamp() }));
  });

  it('cadastro com e-mail vazio recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ email: '' })));
  });

  it.each(['ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana @exemplo.com'])('e-mail em formato inválido recusado: %s', async (e) => {
    await assertFails(setDoc(doc(db('u1', { email: e, email_verified: false }), 'users', 'u1'), perfilValido({ email: e })));
  });

  it('e-mail diferente do e-mail da conta recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ email: 'outra@exemplo.com' })));
  });

  it('e-mail compara sem diferenciar maiúsculas', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ email: 'ANA@exemplo.com' })));
  });

  it('e-mail com mais de 254 caracteres recusado (valor-limite)', async () => {
    const longo = `${'a'.repeat(250)}@b.co`;
    await assertFails(setDoc(doc(db('u1', { email: longo, email_verified: false }), 'users', 'u1'), perfilValido({ email: longo })));
  });

  it('não aceita CPF no perfil', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ cpf: '12345678901' })));
  });

  it('não aceita senha no perfil', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), perfilValido({ senha: 'Abcdef1!' })));
  });

  it('criadoEm precisa ser a hora do servidor', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), { email: 'ana@exemplo.com', criadoEm: Timestamp.fromMillis(0) }));
  });

  it('criadoEm ausente recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'users', 'u1'), { email: 'ana@exemplo.com' }));
  });
});

describe('perfil: alteração (UC11)', () => {
  const criadoEm = Timestamp.fromMillis(1_700_000_000_000);
  beforeEach(() => semear('u1', { email: 'ana@exemplo.com', criadoEm }));

  it('altera o nome', async () => {
    await assertSucceeds(updateDoc(doc(db('u1'), 'users', 'u1'), { nome: 'Ana Souza' }));
  });

  it('atualiza o e-mail quando bate com o da conta', async () => {
    await assertSucceeds(
      updateDoc(doc(db('u1', { email: 'nova@exemplo.com', email_verified: true }), 'users', 'u1'), {
        email: 'nova@exemplo.com',
        atualizadoEm: serverTimestamp(),
      }),
    );
  });

  it('recusa e-mail que não bate com o da conta', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'users', 'u1'), { email: 'outra@exemplo.com' }));
  });

  it('recusa mudar criadoEm', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'users', 'u1'), { criadoEm: Timestamp.now() }));
  });

  it('recusa acrescentar campos fora do modelo', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'users', 'u1'), { cpf: '12345678901' }));
  });

  it('recusa nome com 81 caracteres', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'users', 'u1'), { nome: 'a'.repeat(81) }));
  });
});

describe('dados sincronizados (RF62)', () => {

  it('dono com e-mail confirmado lê e grava', async () => {
    const ref = doc(db('u1'), 'users', 'u1', 'registros', 'r1');
    await assertSucceeds(setDoc(ref, { valor: 10 }));
    await assertSucceeds(getDoc(ref));
  });

  it('dono com e-mail não confirmado fica de fora', async () => {
    const ref = doc(db('u1', anaNaoConfirmada), 'users', 'u1', 'registros', 'r1');
    await assertFails(setDoc(ref, { valor: 10 }));
    await assertFails(getDoc(ref));
  });

  it('outro usuário não lê nem grava', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'u1', 'registros', 'r1'), { valor: 10 });
    });
    const ref = doc(db('u2', bia), 'users', 'u1', 'registros', 'r1');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { valor: 99 }));
  });

  it('sem autenticação não lê', async () => {
    await assertFails(getDoc(doc(anonimo(), 'users', 'u1', 'registros', 'r1')));
  });

});
