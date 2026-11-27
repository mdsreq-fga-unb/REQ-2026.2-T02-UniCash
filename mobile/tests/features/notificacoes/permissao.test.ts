import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { mapearPermissao, notificationPermission } from '@/features/notificacoes/permissao';

const getP = jest.mocked(Notifications.getPermissionsAsync);
const reqP = jest.mocked(Notifications.requestPermissionsAsync);
const canal = jest.mocked(Notifications.setNotificationChannelAsync);
const r = (x: object) => ({ granted: false, canAskAgain: true, expires: 'never', ...x }) as any;

beforeEach(() => jest.clearAllMocks());

describe('NotificationPermission (UC14)', () => {
  it('mapeia o estado do sistema operacional', () => {
    expect(mapearPermissao(r({ status: 'undetermined' }))).toBe('nao-decidida');
    expect(mapearPermissao(r({ status: 'granted', granted: true }))).toBe('concedida');
    expect(mapearPermissao(r({ status: 'denied' }))).toBe('negada');
    expect(mapearPermissao(r({ status: 'undetermined', canAskAgain: false }))).toBe('negada');
  });

  it('no iOS, provisória conta como concedida', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    expect(mapearPermissao(r({ status: 'denied', ios: { status: 3 } }))).toBe('concedida');
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('não pede de novo quando já decidida (FA07)', async () => {
    getP.mockResolvedValueOnce(r({ status: 'denied' }));
    expect(await notificationPermission.solicitar()).toBe('negada');
    expect(reqP).not.toHaveBeenCalled();
  });

  it('no Android cria o canal antes de pedir', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    getP.mockResolvedValueOnce(r({ status: 'undetermined' }));
    reqP.mockResolvedValueOnce(r({ status: 'granted', granted: true }));
    expect(await notificationPermission.solicitar()).toBe('concedida');
    expect(canal).toHaveBeenCalledWith('alertas', expect.anything());
    expect(canal.mock.invocationCallOrder[0]).toBeLessThan(reqP.mock.invocationCallOrder[0]);
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });

  it('abre as configurações do aparelho', async () => {
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await notificationPermission.abrirConfiguracoes();
    expect(abrir).toHaveBeenCalled();
  });
});
