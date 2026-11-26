const { createHash, randomBytes } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const auth = getAuth();
const autorizacoes = db.collection('autorizacoes_remocao');
const pedidos = db.collection('pedidos_remocao');
const hash = (token) => createHash('sha256').update(token).digest('hex');

exports.autorizarRemocaoConta = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.sendStatus(405);
  const tokenDaSessao = req.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!tokenDaSessao) return res.sendStatus(401);

  let sessao;
  try {
    sessao = await auth.verifyIdToken(tokenDaSessao, true);
  } catch {
    return res.sendStatus(401);
  }
  if (!sessao.email_verified) return res.sendStatus(403);

  const token = randomBytes(32).toString('hex');
  const ref = pedidos.doc(sessao.uid);
  const aceita = await db.runTransaction(async (tx) => {
    const pedido = await tx.get(ref);
    if (pedido.exists && pedido.data().estado !== 'preparado') return false;
    if (!pedido.exists) tx.create(ref, { estado: 'preparado' });
    tx.create(autorizacoes.doc(hash(token)), { uid: sessao.uid });
    return true;
  });
  if (!aceita) return res.sendStatus(409);
  res.set('Cache-Control', 'no-store').json({ token });
});

exports.solicitarRemocaoConta = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.sendStatus(405);
  const token = req.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return res.sendStatus(401);

  const aceita = await db.runTransaction(async (tx) => {
    const autorizacao = await tx.get(autorizacoes.doc(hash(token)));
    if (!autorizacao.exists) return false;
    const pedido = pedidos.doc(autorizacao.data().uid);
    const registro = await tx.get(pedido);
    if (!registro.exists) return false;
    if (registro.data().estado === 'preparado') {
      tx.update(pedido, { estado: 'solicitado', solicitadoEm: FieldValue.serverTimestamp() });
    }
    return true;
  });
  return res.sendStatus(aceita ? 202 : 403);
});

exports.executarRemocaoConta = onDocumentUpdated({
  document: 'pedidos_remocao/{uid}',
  retry: true,
}, async (event) => {
  if (event.data?.before.data()?.estado !== 'preparado' ||
      event.data?.after.data()?.estado !== 'solicitado') return;

  await removerConta(event.params.uid);
});

async function removerConta(uid) {
  const pedido = pedidos.doc(uid);
  if ((await pedido.get()).data()?.estado !== 'solicitado') return;

  // As regras também bloqueiam clientes que ainda possuem um ID token em cache.
  try {
    await auth.deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }
  await db.recursiveDelete(db.collection('usuarios').doc(uid));
  await pedido.update({ estado: 'concluido', concluidoEm: FieldValue.serverTimestamp() });
}

exports.reprocessarRemocoesPendentes = onSchedule('every 24 hours', async () => {
  const solicitados = await pedidos.where('estado', '==', 'solicitado').get();
  let falhas = 0;
  for (const pedido of solicitados.docs) {
    try {
      await removerConta(pedido.id);
    } catch {
      falhas++;
    }
  }
  if (falhas) throw new Error(`Falha ao reprocessar ${falhas} pedidos de remoção.`);
});
