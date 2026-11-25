import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { dadosSaldoValidos, type DadosSaldoInicial } from './validacao';

export interface SaldoInicial extends DadosSaldoInicial {
  sync_status: 'pendente' | 'sincronizado';
  revisao: number;
}

export async function lerSaldoInicial(banco?: SQLiteDatabase): Promise<SaldoInicial | null> {
  return (banco ?? await getDb()).getFirstAsync<SaldoInicial>('SELECT * FROM saldo_inicial WHERE id = 1');
}

export async function salvarSaldoInicial(dados: DadosSaldoInicial): Promise<void> {
  if (!dadosSaldoValidos({ ...dados })) throw new RangeError('Saldo inicial inválido.');
  const banco = await getDb();
  await banco.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `INSERT INTO saldo_inicial (id, valor_centavos, mes_referencia) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET valor_centavos = excluded.valor_centavos,
         mes_referencia = excluded.mes_referencia, sync_status = 'pendente', revisao = revisao + 1`,
      [dados.valor_centavos, dados.mes_referencia],
    );
  });
}
