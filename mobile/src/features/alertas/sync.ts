import type { SQLiteDatabase } from 'expo-sqlite';
import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';

import { docIdCategoriaRemota, nomeNormalizadoCategoriaPadraoPorSlug, slugDoDocIdPadrao } from '@/features/categorias/padroes';
import type { Categoria } from '@/features/categorias/types';
import { auth, db as firestore } from '@/lib/firebase';
import type { Alerta } from './service';

type AlertaRemoto = Omit<Alerta, 'proprietario_uid' | 'emitido_em'> & { emitido_em: string };

function alertaValido(dados: Record<string, unknown>): dados is AlertaRemoto {
  return (dados.tipo === 'aproximacao' || dados.tipo === 'ultrapassagem') &&
    typeof dados.ref_id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(dados.ref_id) &&
    typeof dados.periodo === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(dados.periodo) &&
    typeof dados.categoria_nome === 'string' && dados.categoria_nome.length > 0 &&
    typeof dados.gasto_centavos === 'number' && Number.isSafeInteger(dados.gasto_centavos) && dados.gasto_centavos > 0 &&
    typeof dados.limite_centavos === 'number' && Number.isSafeInteger(dados.limite_centavos) && dados.limite_centavos > 0 &&
    typeof dados.emitido_em === 'string' && Number.isFinite(Date.parse(dados.emitido_em));
}

export async function sincronizarAlertas(sqlite: SQLiteDatabase, uid: string) {
  const pendentes = await sqlite.getAllAsync<Alerta>(
    `SELECT * FROM alertas WHERE sync_status = 'pendente' AND emitido_em IS NOT NULL
       AND (proprietario_uid IS NULL OR proprietario_uid = ?)`,
    [uid],
  );

  for (const alerta of pendentes) {
    if (auth.currentUser?.uid !== uid) return;
    const { tipo, ref_id, periodo, categoria_nome, gasto_centavos, limite_centavos, emitido_em } = alerta;
    const categoria = await sqlite.getFirstAsync<Categoria>('SELECT * FROM categorias WHERE id = ?', [ref_id]);
    const refRemota = categoria ? docIdCategoriaRemota(categoria) : ref_id;
    const dados = { tipo, ref_id: refRemota, periodo, categoria_nome, gasto_centavos, limite_centavos, emitido_em };
    const ref = doc(firestore, 'usuarios', uid, 'alertas', `${tipo}_${refRemota}_${periodo}`);

    await sqlite.runAsync(
      'UPDATE alertas SET proprietario_uid = ? WHERE tipo = ? AND ref_id = ? AND periodo = ? AND proprietario_uid IS NULL',
      [uid, tipo, ref_id, periodo],
    );
    await runTransaction(firestore, async (tx) => {
      if (auth.currentUser?.uid !== uid) throw new Error('Conta alterada durante a sincronização de alertas.');
      if (!(await tx.get(ref)).exists()) tx.set(ref, dados);
    });
    await sqlite.runAsync(
      `UPDATE alertas SET sync_status = 'sincronizado'
         WHERE tipo = ? AND ref_id = ? AND periodo = ? AND proprietario_uid = ?`,
      [tipo, ref_id, periodo, uid],
    );
  }
}

export async function restaurarAlertas(sqlite: SQLiteDatabase, uid: string) {
  const snapshot = await getDocs(collection(firestore, 'usuarios', uid, 'alertas'));
  if (!snapshot.docs.length) return;

  await sqlite.withExclusiveTransactionAsync(async (tx) => {
    if (auth.currentUser?.uid !== uid) return;
    for (const doc of snapshot.docs) {
      const dados = doc.data();
      if (!alertaValido(dados)) continue;
      const slug = slugDoDocIdPadrao(dados.ref_id);
      const categoria = slug && await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM categorias WHERE padrao = 1 AND nome_normalizado = ?',
        [nomeNormalizadoCategoriaPadraoPorSlug(slug)],
      );
      const refLocal = categoria ? categoria.id : dados.ref_id;

      await tx.runAsync(
        `INSERT INTO alertas
           (tipo, ref_id, periodo, categoria_nome, gasto_centavos, limite_centavos, emitido_em, sync_status, proprietario_uid)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?)
         ON CONFLICT (tipo, ref_id, periodo) DO UPDATE SET
           categoria_nome = excluded.categoria_nome, gasto_centavos = excluded.gasto_centavos,
           limite_centavos = excluded.limite_centavos, emitido_em = excluded.emitido_em,
           sync_status = 'sincronizado', proprietario_uid = excluded.proprietario_uid
         WHERE alertas.proprietario_uid IS NULL OR alertas.proprietario_uid = excluded.proprietario_uid`,
        [dados.tipo, refLocal, dados.periodo, dados.categoria_nome, dados.gasto_centavos,
          dados.limite_centavos, dados.emitido_em, uid],
      );
    }
  });
}
