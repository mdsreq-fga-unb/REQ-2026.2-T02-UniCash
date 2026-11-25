import { doc, runTransaction } from 'firebase/firestore';

import { getDb } from '@/db/database';
import { auth, db as firestore } from '@/lib/firebase';

import { consultarSaldoInicial } from './repository';
import { validarSaldoInicial } from './validation';

export type ResultadoSyncSaldoInicial =
  | 'sincronizado'
  | 'sem_pendencia'
  | 'nao_autorizado'
  | 'em_andamento'
  | 'conflito'
  | 'pendente';

let emAndamento = false;

export async function sincronizarSaldoInicial(
  uid: string,
  envioAutorizado: () => boolean,
): Promise<ResultadoSyncSaldoInicial> {
  const contaValida = () =>
    uid !== 'local' &&
    auth.currentUser?.uid === uid &&
    auth.currentUser.emailVerified === true &&
    envioAutorizado();

  if (!uid.trim() || !contaValida()) {
    return 'nao_autorizado';
  }

  if (emAndamento) {
    return 'em_andamento';
  }

  emAndamento = true;

  try {
    const sqlite = await getDb();

    if (!contaValida()) {
      return 'nao_autorizado';
    }

    const saldo = await consultarSaldoInicial(sqlite, uid);

    if (!saldo || saldo.sync_status !== 'pendente') {
      return 'sem_pendencia';
    }

    const erro = validarSaldoInicial({
      valorCentavos: saldo.valor_centavos,
      mesReferencia: saldo.mes_referencia,
    });

    if (erro) {
      return 'pendente';
    }

    const payload = {
      valor_centavos: saldo.valor_centavos,
      mes_referencia: saldo.mes_referencia,
      atualizado_em: saldo.atualizado_em,
    };

    if (!contaValida()) {
      return 'nao_autorizado';
    }

    const referencia = doc(
      firestore,
      'usuarios',
      uid,
      'saldo_inicial',
      'atual',
    );

    const resultado = await runTransaction(
      firestore,
      async (tx) => {
        if (!contaValida()) {
          throw new Error('Envio não autorizado.');
        }

        const remoto = await tx.get(referencia);

        if (!contaValida()) {
          throw new Error('Envio não autorizado.');
        }

        if (remoto.exists()) {
          const dados = remoto.data();

          const dataRemota = Date.parse(
            dados.atualizado_em,
          );

          const dataLocal = Date.parse(
            saldo.atualizado_em,
          );

          if (
            !Number.isFinite(dataRemota) ||
            !Number.isFinite(dataLocal)
          ) {
            return 'conflito' as const;
          }

          if (dataRemota > dataLocal) {
            return 'conflito' as const;
          }

          if (dataRemota === dataLocal) {
            if (
              dados.valor_centavos === saldo.valor_centavos &&
              dados.mes_referencia === saldo.mes_referencia
            ) {
              return 'enviado' as const;
            }

            return 'conflito' as const;
          }
        }

        tx.set(referencia, payload);

        return 'enviado' as const;
      },
    );

    if (resultado === 'conflito') {
      return 'conflito';
    }

    if (!contaValida()) {
      return 'pendente';
    }

    const atualizacao = await sqlite.runAsync(
      `UPDATE saldo_inicial
       SET sync_status = 'sincronizado'
       WHERE uid = ?
         AND atualizado_em = ?
         AND valor_centavos = ?
         AND mes_referencia = ?
         AND sync_status = 'pendente'`,
      [
        uid,
        saldo.atualizado_em,
        saldo.valor_centavos,
        saldo.mes_referencia,
      ],
    );

    return atualizacao.changes > 0
      ? 'sincronizado'
      : 'pendente';
  } catch {
    return 'pendente';
  } finally {
    emAndamento = false;
  }
}