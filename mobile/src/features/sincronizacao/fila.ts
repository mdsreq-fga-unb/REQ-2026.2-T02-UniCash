import type { SQLiteDatabase } from 'expo-sqlite';
import type { AlteracaoPendente } from './contrato';

/** A fila é a projeção dos registros pendentes no SQLite, incluindo exclusões lógicas. */
export function listarFila(banco: SQLiteDatabase): Promise<AlteracaoPendente[]> {
  return banco.getAllAsync<AlteracaoPendente>(`
    SELECT tipo, id, titulo, alteracao, 'pendente' AS estado FROM (
      SELECT 'Receita' AS tipo, id, titulo,
             CASE WHEN excluido_em IS NULL THEN 'Envio' ELSE 'Exclusão' END AS alteracao
        FROM receitas WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Despesa', id, titulo, CASE WHEN excluido_em IS NULL THEN 'Envio' ELSE 'Exclusão' END
        FROM despesas WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Categoria', id, nome, CASE WHEN excluido_em IS NULL THEN 'Envio' ELSE 'Exclusão' END
        FROM categorias WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Recorrência', id, titulo, CASE WHEN excluido_em IS NULL THEN 'Envio' ELSE 'Exclusão' END
        FROM recorrencias WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Alerta de saldo', id, mes, 'Envio'
        FROM alertas_emitidos WHERE sync_status = 'pendente'
    ) ORDER BY tipo, titulo, id
  `);
}
