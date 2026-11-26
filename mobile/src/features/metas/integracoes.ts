/**
 * Ponto de integração para consumidores de metas (UC03, UC05 e UC09).
 *
 * A UC03 consome o resumo mensal por contrato próprio. Alertas e indicadores
 * das UC05/UC09 ainda não estão integrados à `develop`; este registro permite
 * que essas funcionalidades reajam às mudanças de metas quando forem
 * incorporadas, sem criar um segundo mecanismo de alertas.
 *
 * Nenhum cálculo de alerta, pontuação ou conquista é implementado aqui. A
 * notificação ocorre depois do commit e não participa da transação SQLite;
 * ela não deve ser usada como garantia de recálculo transacional de alertas.
 */
export type EventoMeta =
  | { tipo: 'criada'; metaId: string }
  | { tipo: 'editada'; metaId: string }
  | { tipo: 'excluida'; metaId: string };

export interface NotificadorMetas {
  aoAlterarMeta(evento: EventoMeta): void | Promise<void>;
}

const notificadores = new Set<NotificadorMetas>();

/** Registra um consumidor; devolve a função de cancelamento. */
export function registrarNotificadorMetas(notificador: NotificadorMetas): () => void {
  notificadores.add(notificador);
  return () => notificadores.delete(notificador);
}

/**
 * Notifica consumidores após o commit local. Falhas de consumidores não
 * revertem a operação local-first nem impedem a sincronização.
 */
export async function notificarAlteracaoMeta(evento: EventoMeta): Promise<void> {
  for (const notificador of notificadores) {
    try {
      await notificador.aoAlterarMeta(evento);
    } catch {
      // O consumidor é opcional nesta versão; a pendência fica documentada.
    }
  }
}

/** Apenas para testes: limpa consumidores registrados. */
export function limparNotificadoresMetas(): void {
  notificadores.clear();
}
