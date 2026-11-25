
import type { SQLiteDatabase } from 'expo-sqlite';

import { validarSaldoInicial } from './validation';
import type { DadosSaldoInicial } from './validation';

export interface SaldoInicial {
  uid: string;
  valor_centavos: number;
  mes_referencia: string;
  sync_status: 'pendente' | 'sincronizado';
  atualizado_em: string;
}

export async function consultarSaldoInicial(
  db: SQLiteDatabase,
  uid: string,
): Promise<SaldoInicial | null> {
  return db.getFirstAsync<SaldoInicial>(
    `SELECT uid, valor_centavos, mes_referencia,
            sync_status, atualizado_em
     FROM saldo_inicial
     WHERE uid = ?`,
    [uid],
  );
}

export async function salvarSaldoInicial(
  db: SQLiteDatabase,
  uid: string,
  dados: DadosSaldoInicial,
): Promise<void> {
  if (!uid.trim()) {
    throw new Error('Usuário não identificado.');
  }

  const erro = validarSaldoInicial(dados);

  if (erro) {
    throw new Error(erro);
  }

  const atualizadoEm = new Date().toISOString();

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO saldo_inicial (
        uid,
        valor_centavos,
        mes_referencia,
        sync_status,
        atualizado_em
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        valor_centavos = excluded.valor_centavos,
        mes_referencia = excluded.mes_referencia,
        sync_status = excluded.sync_status,
        atualizado_em = excluded.atualizado_em`,
      [
        uid,
        dados.valorCentavos,
        dados.mesReferencia,
        'pendente',
        atualizadoEm,
      ],
    );
  });
}
