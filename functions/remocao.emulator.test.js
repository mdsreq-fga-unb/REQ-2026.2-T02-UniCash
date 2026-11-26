const assert = require('node:assert/strict');
const { test } = require('node:test');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

test('recebe o pedido após o logout e apaga a conta e suas subcoleções', async () => {
  const projectId = process.env.GCLOUD_PROJECT;
  assert.ok(projectId?.startsWith('demo-') && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  initializeApp({ projectId });

  const auth = getAuth();
  const db = getFirestore();
  const senha = 'Senha@12345';
  const email = 'remocao@exemplo.com';
  const usuario = await auth.createUser({ email, password: senha, emailVerified: true });
  const outro = await auth.createUser({ email: 'outra@exemplo.com', password: senha, emailVerified: true });
  const perfil = db.doc(`usuarios/${usuario.uid}`);
  const despesa = perfil.collection('despesas').doc('d1');
  await perfil.set({ email });
  await despesa.set({ titulo: 'Despesa' });

  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
  });
  assert.equal(login.status, 200);
  const { idToken } = await login.json();
  const chamar = (nome, token) => fetch(`http://127.0.0.1:5001/${projectId}/us-central1/${nome}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal((await chamar('autorizarRemocaoConta', 'invalido')).status, 401);
  const autorizacao = await chamar('autorizarRemocaoConta', idToken);
  assert.equal(autorizacao.status, 200);
  const { token } = await autorizacao.json();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal((await perfil.get()).exists, true);
  assert.equal((await chamar('solicitarRemocaoConta', '0'.repeat(64))).status, 403);
  const respostas = await Promise.all([
    chamar('solicitarRemocaoConta', token),
    chamar('solicitarRemocaoConta', token),
  ]);
  assert.deepEqual(respostas.map((resposta) => resposta.status), [202, 202]);

  const pedido = db.doc(`pedidos_remocao/${usuario.uid}`);
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    if ((await pedido.get()).data()?.estado === 'concluido') break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal((await pedido.get()).data()?.estado, 'concluido');
  assert.equal((await perfil.get()).exists, false);
  assert.equal((await despesa.get()).exists, false);
  await assert.rejects(auth.getUser(usuario.uid), { code: 'auth/user-not-found' });
  assert.equal((await auth.getUser(outro.uid)).uid, outro.uid);
  await db.terminate();
});
