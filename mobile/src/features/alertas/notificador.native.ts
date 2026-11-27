import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import type { NotificadorDeLimite } from './notificacoes';

const CANAL = 'limites-de-gastos';

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const notificadorLocal: NotificadorDeLimite = {
  async disponivel() {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Limites de gastos',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const permissao = await Notifications.getPermissionsAsync();
    if (permissao.granted || !permissao.canAskAgain) return permissao.granted;
    return (await Notifications.requestPermissionsAsync()).granted;
  },
  async emitir(identifier, title, body) {
    const [agendadas, apresentadas] = await Promise.all([
      Notifications.getAllScheduledNotificationsAsync(),
      Notifications.getPresentedNotificationsAsync(),
    ]);
    if (agendadas.some((notificacao) => notificacao.identifier === identifier) ||
        apresentadas.some(({ request }) => request.identifier === identifier)) return;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body },
      trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
    });
  },
};
