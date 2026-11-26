import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
const despesa = (extra: Record<string, unknown> = {}) => ({
  valor_centavos: 15000,
  data: '2026-10-16',
  titulo: 'Aluguel',
  categoria_id: 'moradia',
  fixa_ou_variavel: 'fixa',
  essencial: 1,
  criado_em: '2026-10-16T12:00:00.000Z',
  atualizado_em: '2026-10-16T12:00:00.000Z',
  ...extra,
});

const serie = (extra: Record<string, unknown> = {}) => ({
  tipo: 'receita',
  intervalo: 1,
  unidade: 'mes',
  inicio: '2026-10-16',
  ativa: true,
  valor_centavos: 10000,
  titulo: 'Mesada',
  atualizado_em: '2026-10-16T12:00:00.000Z',
  ...extra,
});

const categoria = (extra: Record<string, unknown> = {}) => ({
  padrao: false,
  chave: null,
  nome: 'Mercado',
  nome_normalizado: 'mercado',
  limite_tipo: null,
  limite_centavos: null,
  limite_percentual_centesimos: null,
  excluido_em: null,
  criado_em: '2026-10-16T12:00:00.000Z',
  atualizado_em: '2026-10-16T12:00:00.000Z',
  aliases: [],
  ...extra,
});

const categoriaPadrao = (extra: Record<string, unknown> = {}) =>
  categoria({
    padrao: true,
    chave: 'casa',
    nome: 'Casa',
    nome_normalizado: 'casa',
    aliases: ['uuid-casa-a'],
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

const db = (uid: string) => env.authenticatedContext(uid, { email_verified: true }).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const rec = (d: any, uid = 'u1', id = 'r1') => doc(d, 'usuarios', uid, 'receitas', id);
const desp = (d: any, uid = 'u1', id = 'd1') => doc(d, 'usuarios', uid, 'despesas', id);
const ser = (d: any, uid = 'u1', id = 's1') => doc(d, 'usuarios', uid, 'recorrencias', id);
const cat = (d: any, uid = 'u1', id = 'uuid-cat') =>
  doc(d, 'usuarios', uid, 'categorias', id);

describe('RNF03: acesso só ao próprio uid', () => {
  it('o dono grava, lê e registra a exclusão das próprias receitas', async () => {
    await assertSucceeds(setDoc(rec(db('u1')), receita()));
    await assertSucceeds(getDoc(rec(db('u1'))));
    const ref = rec(db('u1'));
    const timestamp = '2026-11-26T12:00:00.000Z';
    await assertFails(setDoc(ref, { excluido_em: timestamp }));
    await assertSucceeds(setDoc(ref, { excluido_em: timestamp, atualizado_em: timestamp }));
    await assertFails(setDoc(ref, receita()));
    await assertFails(deleteDoc(ref));
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
describe('despesas: campos e limites', () => {
  it('permite gravar o marcador de exclusão e impede a recriação da despesa', async () => {
    const ref = desp(db('u1'));
    await assertSucceeds(setDoc(ref, despesa()));
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, despesa({ excluido_em: null })));
    const excluido_em = '2026-10-16T12:00:00.000Z';
    await assertFails(setDoc(ref, despesa({ excluido_em })));
    await assertSucceeds(setDoc(ref, { excluido_em, atualizado_em: excluido_em }));
    await assertFails(setDoc(ref, despesa()));
    await assertFails(deleteDoc(ref));
  });

  it('permite criar diretamente o marcador de uma despesa criada e excluída offline', async () => {
    const ref = desp(db('u1'));
    const excluido_em = '2026-10-16T12:00:00.000Z';
    const marcador = { excluido_em, atualizado_em: excluido_em };

    await assertFails(setDoc(desp(db('u2')), marcador));
    await assertFails(setDoc(ref, { excluido_em }));
    await assertSucceeds(setDoc(ref, marcador));
    expect((await assertSucceeds(getDoc(ref))).data()).toEqual(marcador);
    await assertFails(setDoc(ref, despesa()));
  });

  it('impede outro usuário de acessar despesas', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(desp(ctx.firestore()), despesa());
    });

    await assertFails(getDoc(desp(db('u2'))));
    await assertFails(setDoc(desp(db('u2')), despesa()));
    await assertFails(deleteDoc(desp(db('u2'))));
  });

  it('aceita despesas com campos opcionais ausentes', async () => {
    const {
      categoria_id: _categoria,
      fixa_ou_variavel: _classificacao,
      essencial: _essencial,
      ...basica
    } = despesa();

    await assertSucceeds(setDoc(desp(db('u1')), basica));
  });

  it.each([
    ['valor_centavos', 0],
    ['valor_centavos', -1],
    ['valor_centavos', 1.5],
    ['valor_centavos', '15000'],
    ['valor_centavos', 100_000_000_000],
    ['data', '16/10/2026'],
    ['titulo', ''],
    ['titulo', 'a'.repeat(81)],
    ['categoria_id', 123],
    ['fixa_ou_variavel', 'eventual'],
    ['essencial', 2],
  ])('rejeita campo inválido: %s = %p', async (campo, valor) => {
    await assertFails(setDoc(desp(db('u1')), despesa({ [campo]: valor })));
  });

  it('aceita classificações válidas', async () => {
    await assertSucceeds(
      setDoc(desp(db('u1'), 'u1', 'fixa'), despesa({ fixa_ou_variavel: 'fixa' })),
    );
    await assertSucceeds(
      setDoc(desp(db('u1'), 'u1', 'variavel'), despesa({ fixa_ou_variavel: 'variavel' })),
    );
    await assertSucceeds(
      setDoc(desp(db('u1'), 'u1', 'essencial'), despesa({ essencial: 1 })),
    );
    await assertSucceeds(
      setDoc(desp(db('u1'), 'u1', 'nao-essencial'), despesa({ essencial: 0 })),
    );
  });

  it('rejeita campos desconhecidos', async () => {
    await assertFails(setDoc(desp(db('u1')), despesa({ campo_desconhecido: true })));
  });

  it('valida também as atualizações', async () => {
    await assertSucceeds(setDoc(desp(db('u1')), despesa()));
    await assertFails(setDoc(desp(db('u1')), despesa({ valor_centavos: 0 })));
    await assertSucceeds(setDoc(desp(db('u1')), despesa({ titulo: 'Aluguel editado' })));
  });
});

describe('recorrências (RN19)', () => {
  it('aceita série válida, com e sem término', async () => {
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'a'), serie()));
    await assertSucceeds(setDoc(ser(db('u1'), 'u1', 'b'), serie({ termino: '2027-01-16', descricao: 'pai' })));
  });

  it('aceita série de despesa com categoria e classificações', async () => {
    await assertSucceeds(
      setDoc(
        ser(db('u1'), 'u1', 'desp'),
        serie({
          tipo: 'despesa',
          categoria_id: 'casa',
          fixa_ou_variavel: 'fixa',
          essencial: 1,
          titulo: 'Aluguel',
        }),
      ),
    );
  });

  it('aceita série de despesa sem categoria (campos opcionais omitidos ou nulos)', async () => {
    await assertSucceeds(
      setDoc(ser(db('u1'), 'u1', 'desp-omitida'), serie({ tipo: 'despesa' })),
    );
    await assertSucceeds(
      setDoc(
        ser(db('u1'), 'u1', 'desp-nula'),
        serie({ tipo: 'despesa', categoria_id: null, fixa_ou_variavel: null, essencial: null }),
      ),
    );
  });

  it('rejeita série de despesa com classificação inválida', async () => {
    await assertFails(
      setDoc(ser(db('u1')), serie({ tipo: 'despesa', fixa_ou_variavel: 'mensal' })),
    );
    await assertFails(setDoc(ser(db('u1')), serie({ tipo: 'despesa', essencial: 2 })));
  });

  it('rejeita série com tipo desconhecido', async () => {
    await assertFails(setDoc(ser(db('u1')), serie({ tipo: 'transferencia' })));
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

  it('aceita criar tombstone de série válido e atualizar série ativa', async () => {
    const ref = ser(db('u1'));
    await assertSucceeds(setDoc(ref, serie()));
    await assertSucceeds(setDoc(ref, serie({ titulo: 'Mesada editada' })));

    const excluido_em = '2026-10-16T12:00:00.000Z';
    await assertSucceeds(
      setDoc(
        ser(db('u1'), 'u1', 'tombstone'),
        serie({ ativa: false, excluido_em }),
      ),
    );
    await assertSucceeds(
      setDoc(ref, serie({ ativa: false, excluido_em })),
    );
  });

  it('impede reativar tombstone de série', async () => {
    const ref = ser(db('u1'));
    const excluido_em = '2026-10-16T12:00:00.000Z';

    await assertSucceeds(setDoc(ref, serie({ ativa: false, excluido_em })));
    await assertFails(setDoc(ref, serie()));
    await assertFails(setDoc(ref, serie({ ativa: true, excluido_em })));
    await assertFails(setDoc(ref, serie({ ativa: false, excluido_em: null })));
  });

  it('tombstone exige os campos financeiros e não pode ser vazio', async () => {
    const excluido_em = '2026-10-16T12:00:00.000Z';

    await assertFails(
      setDoc(ser(db('u1'), 'u1', 'sem-valor'), serie({ ativa: false, excluido_em, valor_centavos: 0 })),
    );
    await assertFails(
      setDoc(ser(db('u1'), 'u1', 'sem-titulo'), serie({ ativa: false, excluido_em, titulo: '' })),
    );
    await assertFails(
      setDoc(ser(db('u1'), 'u1', 'vazio'), serie({ ativa: false, excluido_em: '' })),
    );
    await assertFails(
      setDoc(ser(db('u1'), 'u1', 'ativa'), serie({ ativa: true, excluido_em })),
    );
  });

  it('exclusão física de recorrência é negada', async () => {
    const ref = ser(db('u1'));
    await assertSucceeds(setDoc(ref, serie()));
    await assertFails(deleteDoc(ref));

    const tomb = ser(db('u1'), 'u1', 'tombstone');
    await assertSucceeds(
      setDoc(tomb, serie({ ativa: false, excluido_em: '2026-10-16T12:00:00.000Z' })),
    );
    await assertFails(deleteDoc(tomb));
  });

  it('outro usuário não cria tombstone nem exclui a série', async () => {
    const excluido_em = '2026-10-16T12:00:00.000Z';
    await assertFails(
      setDoc(ser(db('u2'), 'u1', 'tombstone'), serie({ ativa: false, excluido_em })),
    );
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ser(ctx.firestore()), serie());
    });
    await assertFails(deleteDoc(ser(db('u2'))));
  });
});

describe('UC04: alertas emitidos', () => {
  const id = 'a'.repeat(32);
  const alerta = { mes: '2026-11', anterior_centavos: 0, saldo_centavos: -100, criado_em: '2026-11-01T10:00:00.000Z' };
  const ref = (d: ReturnType<typeof db>) => doc(d, 'usuarios', 'u1', 'alertas_emitidos', id);

  it('aceita reenvio idêntico do dono e impede alteração do evento', async () => {
    await assertSucceeds(setDoc(ref(db('u1')), alerta));
    await assertSucceeds(setDoc(ref(db('u1')), alerta));
    await assertSucceeds(getDoc(ref(db('u1'))));
    await assertFails(setDoc(ref(db('u1')), { ...alerta, saldo_centavos: -200 }));
    await assertFails(deleteDoc(ref(db('u1'))));
  });

  it('impede leitura e emissão pela conta titular sem e-mail confirmado', async () => {
    const verificado = ref(db('u1'));
    const pendente = ref(env.authenticatedContext('u1', { email_verified: false }).firestore());
    await assertFails(setDoc(pendente, alerta));
    await assertSucceeds(setDoc(verificado, alerta));
    await assertFails(getDoc(pendente));
  });

  it('valida a transição e restringe o acesso ao dono', async () => {
    await assertFails(setDoc(ref(db('u1')), { ...alerta, anterior_centavos: -1 }));
    await assertFails(setDoc(ref(db('u1')), { ...alerta, saldo_centavos: 0 }));
    await assertFails(setDoc(ref(db('u2')), alerta));
    await assertFails(getDoc(ref(anonimo())));
    await assertSucceeds(setDoc(ref(db('u1')), alerta));
    await assertFails(getDoc(ref(db('u2'))));
  });
});
describe('categorias: identidade, tombstones e isolamento (UC06)', () => {
  it('o dono cria, lê e atualiza categoria própria', async () => {
    const ref = cat(db('u1'));
    await assertSucceeds(setDoc(ref, categoria()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(
      setDoc(ref, categoria({ nome: 'Mercado novo', nome_normalizado: 'mercado novo' })),
    );
    await assertFails(
      setDoc(ref, categoria({ criado_em: '2027-01-01T00:00:00.000Z' })),
    );
  });

  it('outro usuário e anônimo não acessam a categoria', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(cat(ctx.firestore()), categoria());
    });
    await assertFails(getDoc(cat(db('u2'))));
    await assertFails(setDoc(cat(db('u2')), categoria()));
    await assertFails(getDoc(cat(anonimo())));
    await assertFails(setDoc(cat(anonimo()), categoria()));
  });

  it('aceita documento canônico de padrão e rejeita nome/chave/docId divergentes', async () => {
    await assertSucceeds(setDoc(cat(db('u1'), 'u1', 'padrao_casa'), categoriaPadrao()));
    await assertFails(
      setDoc(
        cat(db('u1'), 'u1', 'padrao_casa'),
        categoriaPadrao({ nome: 'Outra', nome_normalizado: 'outra' }),
      ),
    );
    await assertFails(
      setDoc(
        cat(db('u1'), 'u1', 'padrao_casa'),
        categoriaPadrao({ chave: 'lazer', nome: 'Lazer', nome_normalizado: 'lazer' }),
      ),
    );
    await assertFails(
      setDoc(cat(db('u1'), 'u1', 'padrao_lazer'), categoriaPadrao()),
    );
  });

  it('padrão pode alterar limite e adicionar alias, mas não identidade nem remover alias', async () => {
    const ref = cat(db('u1'), 'u1', 'padrao_casa');
    await assertSucceeds(setDoc(ref, categoriaPadrao()));
    await assertSucceeds(
      setDoc(
        ref,
        categoriaPadrao({
          limite_tipo: 'valor',
          limite_centavos: 5000,
          aliases: ['uuid-casa-a', 'uuid-casa-b'],
        }),
      ),
    );
    // A remoção do limite é permitida em categoria padrão (issue #72).
    await assertSucceeds(
      setDoc(
        ref,
        categoriaPadrao({
          limite_tipo: null,
          limite_centavos: null,
          limite_percentual_centesimos: null,
          aliases: ['uuid-casa-a', 'uuid-casa-b'],
        }),
      ),
    );
    await assertFails(
      setDoc(ref, categoriaPadrao({ aliases: ['uuid-casa-b'] })),
    );
    await assertFails(
      setDoc(ref, categoriaPadrao({ nome: 'Casa nova', nome_normalizado: 'casa nova' })),
    );
  });

  it('atualização parcial apenas do limite passa nas Rules (varredura da issue #71)', async () => {
    const ref = cat(db('u1'), 'u1', 'padrao_casa');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        cat(ctx.firestore(), 'u1', 'padrao_casa'),
        categoriaPadrao({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 50,
        }),
      );
    });

    await assertSucceeds(
      updateDoc(ref, { limite_percentual_centesimos: 100 }),
    );
  });

  it('atualização parcial de própria ativa normaliza percentual legado', async () => {
    const ref = cat(db('u1'), 'u1', 'uuid-propria');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        cat(ctx.firestore(), 'u1', 'uuid-propria'),
        categoria({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 50,
        }),
      );
    });

    await assertSucceeds(
      updateDoc(ref, { limite_percentual_centesimos: 100 }),
    );
  });

  it('atualização parcial de tombstone limpa limites legados sem ressuscitar', async () => {
    const ref = cat(db('u1'), 'u1', 'uuid-tombstone');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        cat(ctx.firestore(), 'u1', 'uuid-tombstone'),
        categoria({
          excluido_em: '2026-10-16T12:00:00.000Z',
          limite_tipo: 'valor',
          limite_centavos: 5000,
        }),
      );
    });

    await assertSucceeds(
      updateDoc(ref, {
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
      }),
    );
    await assertFails(
      updateDoc(ref, { excluido_em: null }),
    );
  });

  it('padrão não pode virar tombstone', async () => {
    const ref = cat(db('u1'), 'u1', 'padrao_casa');
    await assertSucceeds(setDoc(ref, categoriaPadrao()));
    await assertFails(
      setDoc(
        ref,
        categoriaPadrao({
          excluido_em: '2026-10-16T12:00:00.000Z',
          limite_tipo: null,
          limite_centavos: null,
          limite_percentual_centesimos: null,
        }),
      ),
    );
  });

  it('própria aceita tombstone uma vez e não ressuscita', async () => {
    const ref = cat(db('u1'));
    await assertSucceeds(setDoc(ref, categoria()));
    const excluido = categoria({ excluido_em: '2026-10-16T12:00:00.000Z' });
    await assertSucceeds(setDoc(ref, excluido));
    await assertFails(setDoc(ref, categoria()));
  });

  it('própria não pode usar prefixo de documento padrão', async () => {
    await assertFails(
      setDoc(cat(db('u1'), 'u1', 'padrao_mercado'), categoria()),
    );
  });

  it('rejeita limite incoerente, nome longo e alias inválido', async () => {
    await assertFails(
      setDoc(cat(db('u1'), 'u1', 'limite'), categoria({
        limite_tipo: 'valor',
        limite_percentual_centesimos: 100,
      })),
    );
    await assertFails(
      setDoc(cat(db('u1'), 'u1', 'nome'), categoria({ nome: 'x'.repeat(31), nome_normalizado: 'x'.repeat(31) })),
    );
    await assertFails(
      setDoc(cat(db('u1'), 'u1', 'alias'), categoria({ aliases: ['ok', 1] })),
    );
  });

  it('aceita percentual de 1% a 100% e rejeita fora da faixa definitiva', async () => {
    await assertSucceeds(
      setDoc(
        cat(db('u1'), 'u1', 'p-min'),
        categoria({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 100,
        }),
      ),
    );
    await assertSucceeds(
      setDoc(
        cat(db('u1'), 'u1', 'p-max'),
        categoria({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 10_000,
        }),
      ),
    );
    await assertFails(
      setDoc(
        cat(db('u1'), 'u1', 'p-abaixo'),
        categoria({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 99,
        }),
      ),
    );
    await assertFails(
      setDoc(
        cat(db('u1'), 'u1', 'p-acima'),
        categoria({
          limite_tipo: 'percentual_renda',
          limite_centavos: null,
          limite_percentual_centesimos: 10_001,
        }),
      ),
    );
  });

  it('exclusão física de categoria é negada', async () => {
    const ref = cat(db('u1'));
    await assertSucceeds(setDoc(ref, categoria()));
    await assertFails(deleteDoc(ref));
  });
});
