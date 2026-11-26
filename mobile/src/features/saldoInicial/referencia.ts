import { getDb } from '@/db/database';
import { mesAnterior } from '@/features/receitas/dates';
import { mesReferenciaValido } from './validacao';

/** RN16. Contrato de leitura do saldo anterior para o UC04, em centavos. */
export async function consultarSaldoAnterior(mes: string): Promise<number | null> {
  if (!mesReferenciaValido(mes)) throw new RangeError('Mês de referência inválido.');
  const [ano, numero] = mes.split('-').map(Number);
  const anterior = mesAnterior(ano, numero);
  const inicioAnterior = `${String(anterior.ano).padStart(4, '0')}-${String(anterior.mes).padStart(2, '0')}-01`;
  const banco = await getDb();
  const resultado = await banco.getFirstAsync<{ saldo: number | null }>(
    `WITH periodo AS (SELECT ? AS inicio, ? AS fim, ? AS mes), referencia AS (
       SELECT mes_referencia, valor_centavos FROM saldo_inicial WHERE id = 1
     ), lancamentos AS (
       SELECT valor_centavos AS valor FROM receitas
       WHERE excluido_em IS NULL AND data >= (SELECT inicio FROM periodo) AND data < (SELECT fim FROM periodo)
       UNION ALL
       SELECT -valor_centavos FROM despesas
       WHERE excluido_em IS NULL AND data >= (SELECT inicio FROM periodo) AND data < (SELECT fim FROM periodo)
     )
     SELECT CASE
       WHEN (SELECT mes FROM periodo) < (SELECT mes_referencia FROM referencia) THEN NULL
       WHEN (SELECT mes FROM periodo) = (SELECT mes_referencia FROM referencia) THEN (SELECT valor_centavos FROM referencia)
       ELSE (SELECT SUM(valor) FROM lancamentos)
     END AS saldo`,
    [inicioAnterior, `${mes}-01`, mes],
  );
  return resultado?.saldo ?? null;
}
