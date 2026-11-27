import type { SQLiteDatabase } from 'expo-sqlite';
import { dataISOValida } from '@/features/metas/validation';
import type { FonteMetas, MetaConcluida } from './types';

/** Metas de investimento alcançadas (D28), inclusive quando a data do informe é indeterminável. */
export const fonteMetasUc12: FonteMetas = {
  async concluidas(db: SQLiteDatabase) {
    const linhas = await db.getAllAsync<{ id: string; objetivo: string; informado_em: string | null }>(
      `SELECT id, objetivo, valor_acumulado_atualizado_em AS informado_em FROM metas
       WHERE excluido_em IS NULL AND tipo = 'investimento'
         AND valor_acumulado_centavos IS NOT NULL
         AND valor_acumulado_centavos >= valor_alvo_centavos`,
    );
    return linhas.map((l) => {
      const data = l.informado_em?.slice(0, 10);
      return { id: l.id, titulo: l.objetivo, concluidaEm: data && dataISOValida(data) ? data : null };
    });
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
