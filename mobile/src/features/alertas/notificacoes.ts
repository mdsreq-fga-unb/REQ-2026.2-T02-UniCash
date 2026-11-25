import { getDb } from '@/db/database';
import { auth } from '@/lib/firebase';
import { formatarBRL } from '@/features/receitas/money';
import { alertasAtivos, type Alerta } from './service';

export interface NotificadorDeLimite {
  disponivel(): Promise<boolean>;
  emitir(id: string, titulo: string, mensagem: string): Promise<void>;
}

export async function emitirAlertasPendentes(notificador: NotificadorDeLimite): Promise<boolean> {
  const db = await getDb();
  const uid = auth.currentUser?.uid ?? null;
  if (!(await alertasAtivos(db))) return false;

  const pendentes = await db.getAllAsync<Alerta>(
    `SELECT * FROM alertas WHERE emitido_em IS NULL
       AND (proprietario_uid IS NULL OR proprietario_uid = ?)
       ORDER BY periodo, ref_id, tipo`,
    [uid],
  );
  if (!pendentes.length || !(await notificador.disponivel())) return false;

  let emitiu = false;
  for (const { tipo, ref_id, periodo } of pendentes) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      if ((auth.currentUser?.uid ?? null) !== uid || !(await alertasAtivos(tx))) return;
      const alerta = await tx.getFirstAsync<Alerta>(
        `SELECT * FROM alertas WHERE tipo = ? AND ref_id = ? AND periodo = ? AND emitido_em IS NULL
           AND (proprietario_uid IS NULL OR proprietario_uid = ?)`,
        [tipo, ref_id, periodo, uid],
      );
      if (!alerta) return;

      const titulo = tipo === 'aproximacao' ? 'Limite de gastos próximo' : 'Limite de gastos ultrapassado';
      const mensagem = `${alerta.categoria_nome} (${periodo}): gasto de ${formatarBRL(alerta.gasto_centavos)} de um limite de ${formatarBRL(alerta.limite_centavos)}.`;
      await tx.runAsync(
        `UPDATE alertas SET emitido_em = ?, proprietario_uid = COALESCE(proprietario_uid, ?)
           WHERE tipo = ? AND ref_id = ? AND periodo = ?`,
        [new Date().toISOString(), uid, tipo, ref_id, periodo],
      );
      await notificador.emitir(`unicash-limite-${tipo}-${ref_id}-${periodo}`, titulo, mensagem);
      emitiu = true;
    });
  }
  return emitiu;
}
