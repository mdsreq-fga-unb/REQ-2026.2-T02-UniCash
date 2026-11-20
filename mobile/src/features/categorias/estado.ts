import type { SQLiteDatabase } from 'expo-sqlite';
import type { EstadoLocalCategoria } from './types';

/**
 * Grava o estado local explícito da categoria na mesma transação da alteração
 * que o originou. A tabela é separada para manter a migração aditiva e não
 * alterar a estrutura histórica de `categorias`.
 */
export async function definirEstadoCategoria(
  tx: SQLiteDatabase,
  categoriaId: string,
  estado: EstadoLocalCategoria,
): Promise<void> {
  await tx.runAsync(
    `INSERT INTO categorias_estado (categoria_id, estado_local)
     VALUES (?, ?)
     ON CONFLICT(categoria_id) DO UPDATE SET estado_local = excluded.estado_local`,
    [categoriaId, estado],
  );
}

/** Lê o estado local de todas as categorias, com fallback conservador. */
export async function lerEstadosCategorias(
  tx: SQLiteDatabase,
): Promise<Map<string, EstadoLocalCategoria>> {
  const linhas = await tx.getAllAsync<{
    categoria_id: string;
    estado_local: EstadoLocalCategoria;
  }>('SELECT categoria_id, estado_local FROM categorias_estado');

  return new Map(linhas.map((l) => [l.categoria_id, l.estado_local]));
}
