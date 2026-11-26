import type { SQLiteDatabase } from 'expo-sqlite';
import type { AlteracaoPendente } from './contrato';

export interface ItemFila extends Omit<AlteracaoPendente, 'estado'> {
  revisao: string;
}

/** A fila é a projeção dos registros pendentes no SQLite, incluindo exclusões lógicas. */
export function listarFila(banco: SQLiteDatabase): Promise<ItemFila[]> {
  return banco.getAllAsync<ItemFila>(`
    SELECT tipo, id, titulo, alteracao, revisao FROM (
      SELECT 'Receita' AS tipo, id, titulo,
             CASE WHEN excluido_em IS NOT NULL THEN 'Exclusão'
                  WHEN criado_em = atualizado_em THEN 'Criação' ELSE 'Edição' END AS alteracao,
             atualizado_em AS revisao
        FROM receitas WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Despesa', id, titulo, CASE WHEN excluido_em IS NOT NULL THEN 'Exclusão'
           WHEN criado_em = atualizado_em THEN 'Criação' ELSE 'Edição' END, atualizado_em
        FROM despesas WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Categoria', id, nome, CASE WHEN excluido_em IS NOT NULL THEN 'Exclusão'
           WHEN criado_em = atualizado_em THEN 'Criação' ELSE 'Edição' END, atualizado_em
        FROM categorias WHERE sync_status = 'pendente'
      UNION ALL
      SELECT 'Recorrência', rec.id, rec.titulo,
             CASE WHEN rec.excluido_em IS NOT NULL THEN 'Exclusão'
                  WHEN rec.atualizado_em <= (
                    SELECT MIN(criado_em) FROM (
                      SELECT criado_em FROM receitas WHERE recorrencia_id = rec.id
                      UNION ALL
                      SELECT criado_em FROM despesas WHERE recorrencia_id = rec.id
                    )
                  ) THEN 'Criação' ELSE 'Edição' END, rec.atualizado_em
        FROM recorrencias rec WHERE rec.sync_status = 'pendente'
      UNION ALL
      SELECT 'Alerta de saldo', id, mes, 'Criação', criado_em
        FROM alertas_emitidos WHERE sync_status = 'pendente'
    ) ORDER BY tipo, titulo, id
  `);
}
