import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const { values } = parseArgs({
  options: { projeto: { type: 'string' }, uid: { type: 'string' }, executar: { type: 'boolean' }, fila: { type: 'boolean' } },
});
const { projeto, uid, executar, fila } = values;
function uidValido(valor) {
  return Boolean(valor && valor.length <= 128 && !valor.includes('/') && valor !== '.' && valor !== '..');
}

if (!projeto || (fila ? uid !== undefined : !uidValido(uid))) {
  console.error('Uso: node processar.mjs --projeto ID (--uid UID | --fila) [--executar]');
  process.exit(2);
}

const app = initializeApp({ projectId: projeto, credential: applicationDefault() });
const db = getFirestore(app);
const pedidos = db.collection('pedidos_remocao');
const prazoMs = 30 * 24 * 60 * 60 * 1000;

async function registrarResultado(pedido, tentativa, status) {
  await db.runTransaction(async (tx) => {
    const atual = await tx.get(pedido);
    if (atual.get('tentativa') !== tentativa) return;
    tx.update(pedido, {
      status,
      tentativa: FieldValue.delete(),
      reservado_ate: FieldValue.delete(),
      ...(status === 'concluido' ? { concluido_em: FieldValue.serverTimestamp() } : {}),
    });
  });
}

async function processarPedido(pedido) {
  if (!uidValido(pedido.id)) throw new Error('UID inválido no pedido');
  const tentativa = randomUUID();

  const reservado = await db.runTransaction(async (tx) => {
    const doc = await tx.get(pedido);
    const status = doc.get('status');
    if (status === 'concluido') return 'concluido';
    if (status !== 'pendente' && status !== 'processando') throw new Error('Pedido ausente ou inválido');
    if (status === 'processando' && doc.get('reservado_ate')?.toMillis() > Date.now()) {
      return 'reservado';
    }
    tx.update(pedido, {
      status: 'processando',
      tentativa,
      reservado_ate: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
    });
    return 'assumido';
  });

  if (reservado !== 'assumido') return reservado;
  try {
    await db.recursiveDelete(db.collection('usuarios').doc(pedido.id));
    try {
      await getAuth(app).deleteUser(pedido.id);
    } catch (erro) {
      if (erro.code !== 'auth/user-not-found') throw erro;
    }
    await registrarResultado(pedido, tentativa, 'concluido');
    return 'removido';
  } catch (erro) {
    await registrarResultado(pedido, tentativa, 'pendente').catch(() => {
      console.error('O pedido poderá ser retomado após expirar a reserva.');
    });
    throw erro;
  }
}

async function processarFila() {
  const ativos = await pedidos.where('status', 'in', ['pendente', 'processando']).get();
  const solicitacao = doc => doc.get('solicitado_em')?.toMillis() ?? 0;
  const ordenados = ativos.docs.slice().sort((a, b) => solicitacao(a) - solicitacao(b));
  let removidos = 0;
  let falhas = 0;
  let vencidos = 0;
  for (const pedido of ordenados) {
    if (Date.now() - solicitacao(pedido) >= prazoMs) vencidos++;
    if (!executar) continue;
    try {
      if (await processarPedido(pedido.ref) === 'removido') removidos++;
    } catch (erro) {
      falhas++;
      console.error('Falha em um pedido:', erro.code ?? erro.message);
    }
  }
  console.log(`Pedidos encontrados: ${ordenados.length}, removidos: ${removidos}, vencidos na execução: ${vencidos}, falhas: ${falhas}.`);
  if (falhas || vencidos) process.exitCode = 1;
}

try {
  if (fila) {
    await processarFila();
  } else {
    const pedido = pedidos.doc(uid);
    const resultado = executar ? await processarPedido(pedido) : (await pedido.get()).get('status') ?? 'sem pedido';
    console.log(`Status do pedido: ${resultado}.`);
  }
} catch (erro) {
  console.error('Falha no processamento:', erro.code ?? erro.message);
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
