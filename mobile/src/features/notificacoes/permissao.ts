import {
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { EstadoPermissao, NotificationPermission } from './types';

type Resposta = Awaited<ReturnType<typeof getPermissionsAsync>>;

// Valores de IosAuthorizationStatus: 2 AUTHORIZED, 3 PROVISIONAL, 4 EPHEMERAL.
const IOS_CONCEDIDA = new Set([2, 3, 4]);

export function mapearPermissao(r: Resposta): EstadoPermissao {
  if (r.granted || r.status === 'granted') return 'concedida';
  const iosStatus = (r as { ios?: { status?: number } }).ios?.status;
  if (Platform.OS === 'ios' && iosStatus !== undefined && IOS_CONCEDIDA.has(iosStatus)) return 'concedida';
  if (r.status === 'undetermined' && r.canAskAgain) return 'nao-decidida';
  return 'negada';
}

/** UC14 passo 4, FA06 e FA07: o sistema operacional decide se ainda cabe pedir (research R3). */
export const notificationPermission: NotificationPermission = {
  async consultar() {
    return mapearPermissao(await getPermissionsAsync());
  },
  async solicitar() {
    const atual = await this.consultar();
    if (atual !== 'nao-decidida') return atual;
    if (Platform.OS === 'android') {
      // Android 13+: o diálogo só aparece depois que existe ao menos um canal (research R2).
      await setNotificationChannelAsync('alertas', {
        name: 'Alertas',
        importance: AndroidImportance.DEFAULT,
      });
    }
    return mapearPermissao(await requestPermissionsAsync());
  },
  async abrirConfiguracoes() {
    await Linking.openSettings();
  },
};
