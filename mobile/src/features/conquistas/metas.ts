import type { SQLiteDatabase } from 'expo-sqlite';
import type { FonteMetas, MetaConcluida } from './types';

/**
 * Produção: metas do UC12 na base do dono. Enquanto a equipe não define o critério de conclusão
 * de uma meta de gasto (limite mensal), conta como concluída a meta de investimento cujo valor
 * acumulado informado alcançou o alvo, situação "alcançada" do UC12. A data de conclusão é a do
 * último informe do valor acumulado.
 */
export const fonteMetasUc12: FonteMetas = {
  async concluidas(db: SQLiteDatabase) {
    const linhas = await db.getAllAsync<{ id: string; objetivo: string; informado_em: string }>(
      `SELECT id, objetivo, valor_acumulado_atualizado_em AS informado_em FROM metas
       WHERE excluido_em IS NULL AND tipo = 'investimento'
         AND valor_acumulado_centavos IS NOT NULL AND valor_acumulado_atualizado_em IS NOT NULL
         AND valor_acumulado_centavos >= valor_alvo_centavos`,
    );
    return linhas.map((l) => ({ id: l.id, titulo: l.objetivo, concluidaEm: l.informado_em.slice(0, 10) }));
  },
};

/** Metas do protótipo [CQ1], para testes e roteiro manual. */
export const METAS_EXEMPLO: MetaConcluida[] = [
  { id: 'reserva', titulo: 'Reserva de emergência', concluidaEm: '2026-10-15' },
  { id: 'celular', titulo: 'Celular novo', concluidaEm: '2026-10-02' },
  { id: 'viagem', titulo: 'Viagem de julho', concluidaEm: '2026-09-12' },
];

export const fonteMetasExemplo: FonteMetas = {
  async concluidas() {
    return METAS_EXEMPLO;
  },
};

/** Liga as metas de exemplo no desenvolvimento com EXPO_PUBLIC_METAS_EXEMPLO=1 (roteiro manual). */
export function obterFonteMetas(): FonteMetas {
  return process.env.EXPO_PUBLIC_METAS_EXEMPLO === '1' ? fonteMetasExemplo : fonteMetasUc12;
}
