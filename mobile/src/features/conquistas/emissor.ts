import { scheduleNotificationAsync } from 'expo-notifications';
import type { EmissorNotificacao } from './types';

/**
 * RF46: notificação local imediata. `trigger: { channelId }` mostra na hora e usa o canal
 * "alertas" criado pelo UC14 no Android (doc v58, research R6).
 */
export const emissorExpo: EmissorNotificacao = {
  async emitir({ titulo, corpo, rota }) {
    await scheduleNotificationAsync({
      content: { title: titulo, body: corpo, data: { rota } },
      trigger: { channelId: 'alertas' },
    });
  },
};

/** Versão simulada para testes: guarda o que seria emitido e pode falhar uma vez (EX02). */
export function criarEmissorSimulado() {
  const emitidas: { titulo: string; corpo: string; rota: string }[] = [];
  let falhar = false;
  return {
    emitidas,
    falharProxima() {
      falhar = true;
    },
    async emitir(n: { titulo: string; corpo: string; rota: '/conquistas' }) {
      if (falhar) {
        falhar = false;
        throw new Error('Falha simulada na emissão');
      }
      emitidas.push(n);
    },
  } satisfies EmissorNotificacao & Record<string, unknown>;
}
