import type { NotificadorDeLimite } from './notificacoes';

export const notificadorLocal: NotificadorDeLimite = {
  disponivel: async () => false,
  emitir: async () => undefined,
};
