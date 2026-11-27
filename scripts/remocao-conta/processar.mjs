import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const { values } = parseArgs({
  options: { projeto: { type: 'string' }, uid: { type: 'string' }, executar: { type: 'boolean' } },
});
const { projeto, uid, executar } = values;
if (!projeto || !uid || uid.length > 128 || uid.includes('/') || uid === '.' || uid === '..') {
  console.error('Uso: node processar.mjs --projeto ID --uid UID [--executar]');
  process.exit(2);
}

const app = initializeApp({ projectId: projeto, credential: applicationDefault() });
const db = getFirestore(app);
const pedido = db.collection('pedidos_remocao').doc(uid);
const tentativa = randomUUID();

async function registrarResultado(status) {
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

async function processar() {
  if (!executar) {
    const doc = await pedido.get();
    console.log(`Projeto ${projeto}, UID ${uid}: ${doc.get('status') ?? 'sem pedido'}. Use --executar para processar.`);
    return;
  }

  const reservado = await db.runTransaction(async (tx) => {
    const doc = await tx.get(pedido);
    const status = doc.get('status');
    if (status === 'concluido') return false;
    if (status !== 'pendente' && status !== 'processando') throw new Error('Pedido ausente ou inválido');
    if (status === 'processando' && doc.get('reservado_ate')?.toMillis() > Date.now()) {
      throw new Error('Pedido reservado por outro processo');
    }
    tx.update(pedido, {
      status: 'processando',
      tentativa,
      reservado_ate: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
    });
    return true;
  });

  if (!reservado) {
    console.log('Pedido já concluído.');
    return;
  }
  try {
    await db.recursiveDelete(db.collection('usuarios').doc(uid));
    try {
      await getAuth(app).deleteUser(uid);
    } catch (erro) {
      if (erro.code !== 'auth/user-not-found') throw erro;
    }
    await registrarResultado('concluido');
    console.log('Exclusão concluída.');
  } catch (erro) {
    await registrarResultado('pendente').catch(() => {
      console.error('O pedido poderá ser retomado após expirar a reserva.');
    });
    throw erro;
  }
}

try {
  await processar();
} catch (erro) {
  console.error('Falha no processamento:', erro.code ?? erro.message);
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
