import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Security Rules no Firebase Emulator Suite.
 * Rode com: npm run test:rules  (firebase emulators:exec --only firestore ...)
 * O arquivo de regras é procurado na raiz do repositório; use FIRESTORE_RULES_PATH para outro local.
 */
function localizarRegras(): string {
  const candidatos = [
    process.env.FIRESTORE_RULES_PATH,
    path.resolve(__dirname, '../../../firestore.rules'),
    path.resolve(__dirname, '../../firestore.rules'),
  ].filter(Boolean) as string[];
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new Error(`firestore.rules não encontrado. Procurado em: ${candidatos.join(', ')}`);
  return achado;
}

const receita = (extra: Record<string, unknown> = {}) => ({
  valor_centavos: 15000,
  data: '2026-10-16',
  titulo: 'Freela de design',
  criado_em: '2026-10-16T12:00:00.000Z',
  atualizado_em: '2026-10-16T12:00:00.000Z',
  ...extra,
});

const serie = (extra: Record<string, unknown> = {}) => ({
  intervalo: 1,
  unidade: 'mes',
  inicio: '2026-10-16',
  ativa: true,
  valor_centavos: 10000,
  titulo: 'Mesada',
  atualizado_em: '2026-10-16T12:00:00.000Z',
  ...extra,
});

let env: RulesTestEnvironment;

/**
 * Host e porta do emulador do Firestore. O `firebase emulators:exec` define FIRESTORE_EMULATOR_HOST
 * (ex.: 127.0.0.1:8080). Informar os dois evita depender da descoberta pelo Emulator Hub.
 */
function enderecoDoEmulador(): { host: string; port: number } {
  const bruto = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const i = bruto.lastIndexOf(':');
  return { host: bruto.slice(0, i).replace(/^\[|\]$/g, ''), port: Number(bruto.slice(i + 1)) };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'unicash-rules-test',
    firestore: { rules: readFileSync(localizarRegras(), 'utf8'), ...enderecoDoEmulador() },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const db = (uid: string) => env.authenticatedContext(uid).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const rec = (d: any, uid = 'u1', id = 'r1') => doc(d, 'usuarios', uid, 'receitas', id);
const ser = (d: any, uid = 'u1', id = 's1') => doc(d, 'usuarios', uid, 'recorrencias', id);

describe('RNF03: acesso só ao próprio uid', () => {
  it('o dono grava, lê e exclui as próprias receitas', async () => {
    await assertSucceeds(setDoc(rec(db('u1')), receita()));
    await assertSucceeds(getDoc(rec(db('u1'))));
    await assertSucceeds(deleteDoc(rec(db('u1'))));
  });

  it('outro usuário não lê, não grava e não exclui', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(rec(ctx.firestore()), receita()));
    await assertFails(getDoc(rec(db('u2'))));
    await assertFails(setDoc(rec(db('u2')), receita({ titulo: 'invasor' })));
    await assertFails(deleteDoc(rec(db('u2'))));
  });

  it('outro usuário não grava na área do dono mesmo com dados válidos', async () => {
    await assertFails(setDoc(rec(db('u2'), 'u1', 'novo'), receita()));
  });

  it('sem autenticação: nada é permitido', async () => {
    await assertFails(getDoc(rec(anonimo())));
    await assertFails(setDoc(rec(anonimo()), receita()));
    await assertFails(deleteDoc(rec(anonimo())));
  });

  it('o mesmo vale para as recorrências', async () => {
    await assertSucceeds(setDoc(ser(db('u1')), serie()));
    await assertFails(getDoc(ser(db('u2'))));
    await assertFails(setDoc(ser(db('u2')), serie()));
    await assertFails(setDoc(ser(anonimo()), serie()));
  });
});

describe('receitas: campos e limites (RN08 a RN10)', () => {
  it('aceita receita válida, com e sem descrição e recorrencia_id', async () => {
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'a'), receita()));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'b'), receita({ descricao: 'Logo' })));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'c'), receita({ recorrencia_id: 's1' })));
  });

  it.each([
    ['valor_centavos', 0],
    ['valor_centavos', -1],
    ['valor_centavos', 1.5],
    ['valor_centavos', '15000'],
    ['valor_centavos', 100_000_000_000],
  ])('rejeita %s = %p', async (campo, valor) => {
    await assertFails(setDoc(rec(db('u1')), receita({ [campo]: valor })));
  });

  it('aceita o valor máximo (99.999.999.999 centavos) e o mínimo (1)', async () => {
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'max'), receita({ valor_centavos: 99_999_999_999 })));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'min'), receita({ valor_centavos: 1 })));
  });

  it('título: de 1 a 80 caracteres', async () => {
    await assertFails(setDoc(rec(db('u1')), receita({ titulo: '' })));
    await assertFails(setDoc(rec(db('u1')), receita({ titulo: 'a'.repeat(81) })));
    await assertFails(setDoc(rec(db('u1')), receita({ titulo: 123 })));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 't1'), receita({ titulo: 'a' })));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 't80'), receita({ titulo: 'a'.repeat(80) })));
  });

  it('descrição: até 255 caracteres', async () => {
    await assertFails(setDoc(rec(db('u1')), receita({ descricao: 'd'.repeat(256) })));
    await assertSucceeds(setDoc(rec(db('u1'), 'u1', 'd255'), receita({ descricao: 'd'.repeat(255) })));
  });

  it('data no formato AAAA-MM-DD', async () => {
    await assertFails(setDoc(rec(db('u1')), receita({ data: '16/10/2026' })));
    await assertFails(setDoc(rec(db('u1')), receita({ data: '2026-10' })));
  });

  it.each(['valor_centavos', 'data', 'titulo', 'criado_em', 'atualizado_em'])('campo obrigatório ausente: %s', async (campo) => {
    const { [campo]: _omitido, ...resto } = receita() as Record<string, unknown>;
    await assertFails(setDoc(rec(db('u1')), resto));
  });

  it('rejeita campos desconhecidos (receita não tem categoria, RN13)', async () => {
    await assertFails(setDoc(rec(db('u1')), receita({ categoria: 'Essencial' })));
  });

  it('atualização também é validada', async () => {
    await assertSucceeds(setDoc(rec(db('u1')), receita()));
    await assertFails(setDoc(rec(db('u1')), receita({ valor_centavos: 0 })));
    await assertSucceeds(setDoc(rec(db('u1')), receita({ titulo: 'Editada' })));
  });
});

describe('recorrências (RN19)', () => {
  it('aceita série válida, com e sem término', async () => {
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'a'), serie()));
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'b'), serie({ termino: '2027-01-16', descricao: 'pai' })));
  });

  it.each([0, -1, 1.5, '1'])('rejeita intervalo %p', async (intervalo) => {
    await assertFails(setDoc(ser(db('u1')), serie({ intervalo })));
  });

  it('rejeita unidade desconhecida e aceita dia, mes e ano', async () => {
    await assertFails(setDoc(ser(db('u1')), serie({ unidade: 'semana' })));
    for (const u of ['dia', 'mes', 'ano']) {
      await assertSucceeds(setDoc(ser(db('u1'), 'u1', `u-${u}`), serie({ unidade: u })));
    }
  });

  it('término anterior ao início é rejeitado; igual ou posterior é aceito', async () => {
    await assertFails(setDoc(ser(db('u1')), serie({ termino: '2026-10-15' })));
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'igual'), serie({ termino: '2026-10-16' })));
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'depois'), serie({ termino: '2026-12-16' })));
  });

  it('valor e título seguem os mesmos limites das receitas', async () => {
    await assertFails(setDoc(ser(db('u1')), serie({ valor_centavos: 0 })));
    await assertFails(setDoc(ser(db('u1')), serie({ titulo: '' })));
    await assertFails(setDoc(ser(db('u1')), serie({ titulo: 'a'.repeat(81) })));
  });
});
