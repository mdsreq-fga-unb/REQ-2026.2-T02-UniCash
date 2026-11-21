import { getDb } from '@/db/database';
import type { LimiteCategoria } from './calculo';
import type { LerTotaisLocais } from './consulta';

type Linha = {
  id: string;
  nome: string;
  limite_centavos: number | null;
  limite_percentual_centesimos: number | null;
  gasto: number;
  renda: number;
};

export const lerTotaisLocais: LerTotaisLocais = async (inicio, fim) => {
  const db = await getDb();
  const linhas = await db.getAllAsync<Linha>(
    `WITH gastos AS (
       SELECT categoria_id, SUM(valor_centavos) AS total
       FROM despesas
       WHERE excluido_em IS NULL AND categoria_id IS NOT NULL AND data >= ? AND data < ?
       GROUP BY categoria_id
     ), renda AS (
       SELECT COALESCE(SUM(valor_centavos), 0) AS total
       FROM receitas WHERE excluido_em IS NULL AND data >= ? AND data < ?
     )
     SELECT c.id, c.nome, c.limite_centavos, c.limite_percentual_centesimos,
            COALESCE(gastos.total, 0) AS gasto, renda.total AS renda
     FROM categorias c CROSS JOIN renda LEFT JOIN gastos ON gastos.categoria_id = c.id
     WHERE c.excluido_em IS NULL ORDER BY c.nome, c.id`,
    [inicio, fim, inicio, fim],
  );
  return {
    rendaCentavos: linhas[0]?.renda ?? 0,
    categorias: linhas.map((linha) => {
      let limite: LimiteCategoria | null = null;
      if (linha.limite_centavos !== null) limite = { tipo: 'reais', centavos: linha.limite_centavos };
      else if (linha.limite_percentual_centesimos !== null) {
        limite = { tipo: 'percentual', centesimosDePercentual: linha.limite_percentual_centesimos };
      }
      return { categoriaId: linha.id, nome: linha.nome, gastoCentavos: linha.gasto, limite };
    }),
  };
};
