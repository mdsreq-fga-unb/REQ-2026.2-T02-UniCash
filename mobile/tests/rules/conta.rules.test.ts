import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

/**
 * UC10: perfil em usuarios/{uid}. Roda no Firestore Emulator: npm run test:rules
 * A senha nunca chega ao Firestore (fica no Firebase Authentication, RNF01); por isso o teste de
 * "senha ausente" é feito sobre o cliente (validation-conta.test.ts) e aqui se garante que nenhum campo
 * de senha ou CPF é aceito no perfil. As regras de receitas, despesas e recorrências têm teste próprio
 * em firestore.rules.test.ts.
 */
let env: RulesTestEnvironment;

const ana = { email: 'ana@exemplo.com', email_verified: true };
const anaNaoConfirmada = { email: 'ana@exemplo.com', email_verified: false };
const bia = { email: 'bia@exemplo.com', email_verified: true };

const db = (uid: string, token: Record<string, unknown> = ana) => env.authenticatedContext(uid, token).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

const perfilValido = (extra: Record<string, unknown> = {}) => ({
  email: 'ana@exemplo.com',
  criado_em: serverTimestamp(),
  ...extra,
});

async function semear(uid: string, dados: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'usuarios', uid), dados);
  });
}

/** Acha o firestore.rules: variável de ambiente, mobile/ ou a raiz do repositório (primeiro que existir). */
function caminhoDasRegras(): string {
  const candidatos = [
    process.env.FIRESTORE_RULES_PATH,
    resolve(__dirname, '../../firestore.rules'),
    resolve(__dirname, '../../../firestore.rules'),
  ].filter((c): c is string => Boolean(c));
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new Error(`firestore.rules não encontrado. Procurado em:\n${candidatos.join('\n')}`);
  return achado;
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'unicash-rules-test',
    firestore: { rules: readFileSync(caminhoDasRegras(), 'utf8') },
  });
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

describe('perfil: acesso (RNF02, RNF03)', () => {
  it('lê o próprio perfil', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criado_em: Timestamp.now() });
    await assertSucceeds(getDoc(doc(db('u1'), 'usuarios', 'u1')));
  });

  it('perfil de outro usuário negado na leitura', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criado_em: Timestamp.now() });
    await assertFails(getDoc(doc(db('u2', bia), 'usuarios', 'u1')));
  });

  it('perfil de outro usuário negado na escrita', async () => {
    await assertFails(setDoc(doc(db('u2', bia), 'usuarios', 'u1'), perfilValido({ email: 'bia@exemplo.com' })));
  });

  it('perfil de outro usuário negado na alteração', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criado_em: Timestamp.now() });
    await assertFails(updateDoc(doc(db('u2', bia), 'usuarios', 'u1'), { nome: 'Invasora' }));
  });

  it('sem autenticação nada é lido nem gravado', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criado_em: Timestamp.now() });
    await assertFails(getDoc(doc(anonimo(), 'usuarios', 'u1')));
    await assertFails(setDoc(doc(anonimo(), 'usuarios', 'u2'), perfilValido()));
  });

  it('não é possível apagar o perfil', async () => {
    await semear('u1', { email: 'ana@exemplo.com', criado_em: Timestamp.now() });
    await assertFails(deleteDoc(doc(db('u1'), 'usuarios', 'u1')));
  });

  it('coleções desconhecidas ficam fechadas', async () => {
    await assertFails(setDoc(doc(db('u1'), 'qualquer', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(db('u1'), 'qualquer', 'x')));
  });
});

describe('perfil: cadastro (A5, RNF04)', () => {
  it('cria o próprio perfil válido, mesmo com e-mail ainda não confirmado', async () => {
    await assertSucceeds(setDoc(doc(db('u1', anaNaoConfirmada), 'usuarios', 'u1'), perfilValido()));
  });

  it('aceita nome de até 80 caracteres (valor-limite)', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ nome: 'a'.repeat(80) })));
  });

  it('recusa nome com 81 caracteres (valor-limite)', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ nome: 'a'.repeat(81) })));
  });

  it('recusa nome que não é texto', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ nome: 123 })));
  });

  it('cadastro com e-mail ausente recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), { criado_em: serverTimestamp() }));
  });

  it('cadastro com e-mail vazio recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ email: '' })));
  });

  it.each(['ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana @exemplo.com'])('e-mail em formato inválido recusado: %s', async (e) => {
    await assertFails(setDoc(doc(db('u1', { email: e, email_verified: false }), 'usuarios', 'u1'), perfilValido({ email: e })));
  });

  it('e-mail diferente do e-mail da conta recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ email: 'outra@exemplo.com' })));
  });

  it('e-mail compara sem diferenciar maiúsculas', async () => {
    await assertSucceeds(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ email: 'ANA@exemplo.com' })));
  });

  it('e-mail com mais de 254 caracteres recusado (valor-limite)', async () => {
    const longo = `${'a'.repeat(250)}@b.co`;
    await assertFails(setDoc(doc(db('u1', { email: longo, email_verified: false }), 'usuarios', 'u1'), perfilValido({ email: longo })));
  });

  it('não aceita CPF no perfil', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ cpf: '12345678901' })));
  });

  it('não aceita senha no perfil', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), perfilValido({ senha: 'Abcdef1!' })));
  });

  it('criado_em precisa ser a hora do servidor', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), { email: 'ana@exemplo.com', criado_em: Timestamp.fromMillis(0) }));
  });

  it('criado_em ausente recusado', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1'), { email: 'ana@exemplo.com' }));
  });
});

describe('perfil: alteração (UC11)', () => {
  const criado_em = Timestamp.now();
  beforeEach(() => semear('u1', { email: 'ana@exemplo.com', criado_em }));

  it('altera o nome', async () => {
    await assertSucceeds(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { nome: 'Ana Souza' }));
  });

  it('atualiza o e-mail quando bate com o da conta', async () => {
    await assertSucceeds(
      updateDoc(doc(db('u1', { email: 'nova@exemplo.com', email_verified: true }), 'usuarios', 'u1'), {
        email: 'nova@exemplo.com',
        atualizado_em: serverTimestamp(),
      }),
    );
  });

  it('recusa e-mail que não bate com o da conta', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { email: 'outra@exemplo.com' }));
  });

  it('recusa remover o e-mail obrigatório', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { email: deleteField() }));
  });

  it('recusa mudar criado_em', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { criado_em: Timestamp.now() }));
  });

  it('recusa acrescentar campos fora do modelo', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { cpf: '12345678901' }));
  });

  it('recusa nome com 81 caracteres', async () => {
    await assertFails(updateDoc(doc(db('u1'), 'usuarios', 'u1'), { nome: 'a'.repeat(81) }));
  });
});

describe('coexistência com as regras da develop', () => {
  it('o perfil não abre as subcoleções: receita inválida continua recusada', async () => {
    await assertFails(setDoc(doc(db('u1'), 'usuarios', 'u1', 'receitas', 'r1'), { titulo: 'sem os campos obrigatórios' }));
  });

  it('receita válida do próprio usuário continua aceita', async () => {
    await assertSucceeds(
      setDoc(doc(db('u1'), 'usuarios', 'u1', 'receitas', 'r1'), {
        valor_centavos: 1000,
        data: '2026-11-22',
        titulo: 'Salário',
        criado_em: '2026-11-22T10:00:00.000Z',
        atualizado_em: '2026-11-22T10:00:00.000Z',
      }),
    );
  });
});

describe('dados financeiros exigem confirmação', () => {
  it.each(['receitas', 'despesas', 'recorrencias', 'categorias'])('recusa leitura sem confirmação: %s', async (colecao) => {
    await assertFails(getDoc(doc(db('u1', anaNaoConfirmada), 'usuarios', 'u1', colecao, 'r1')));
    await assertSucceeds(getDoc(doc(db('u1', ana), 'usuarios', 'u1', colecao, 'r1')));
  });
});

describe('UC11: pedido de exclusão de conta', () => {
  const payload = () => ({ status: 'pendente', solicitado_em: serverTimestamp() });
  const recente = () => ({ ...ana, auth_time: Math.floor(Date.now() / 1000) });

  it('aceita o pedido recente do dono e impede edição, leitura por terceiros e exclusão', async () => {
    const ref = doc(db('u1', recente()), 'pedidos_remocao', 'u1');
    await assertSucceeds(setDoc(ref, payload()));
    await assertSucceeds(getDoc(ref));
    await assertFails(updateDoc(ref, { status: 'concluido' }));
    await assertFails(deleteDoc(ref));
    await assertFails(getDoc(doc(db('u2', bia), 'pedidos_remocao', 'u1')));
  });

  it('recusa autenticação antiga, pedido por terceiro e campos extras', async () => {
    await assertFails(setDoc(doc(db('u1', { ...ana, auth_time: 1 }), 'pedidos_remocao', 'u1'), payload()));
    await assertFails(setDoc(doc(db('u2', recente()), 'pedidos_remocao', 'u1'), payload()));
    await assertFails(setDoc(doc(db('u1', recente()), 'pedidos_remocao', 'u1'), { ...payload(), outro: true }));
  });

  it('bloqueia gravações de uma segunda sessão do mesmo UID desde o recebimento do pedido', async () => {
    const saldo = doc(db('u1'), 'usuarios', 'u1', 'saldo_inicial', 'atual');
    const dados = { valor_centavos: 100, mes_referencia: '2026-11' };
    await assertSucceeds(setDoc(saldo, dados));
    await assertSucceeds(setDoc(doc(db('u1', recente()), 'pedidos_remocao', 'u1'), payload()));
    await assertFails(setDoc(saldo, { ...dados, valor_centavos: 200 }));
    await assertSucceeds(setDoc(doc(db('u2', bia), 'usuarios', 'u2', 'saldo_inicial', 'atual'), dados));
  });
});
