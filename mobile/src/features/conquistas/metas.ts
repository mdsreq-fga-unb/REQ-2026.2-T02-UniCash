import type { FonteMetas, MetaConcluida } from './types';

/** Produção: o UC12 (metas) ainda não existe, então não há metas concluídas (DoR do UC13). */
export const fonteMetasVazia: FonteMetas = {
  async concluidas() {
    return [];
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
  return process.env.EXPO_PUBLIC_METAS_EXEMPLO === '1' ? fonteMetasExemplo : fonteMetasVazia;
}
