const CHAVES = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Firebase em modo offline', () => {
  const original = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const chave of CHAVES) original.set(chave, process.env[chave]);
  });

  beforeEach(() => {
    jest.resetModules();
    for (const chave of CHAVES) delete process.env[chave];
  });

  afterEach(() => {
    for (const chave of CHAVES) {
      const valor = original.get(chave);
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
    jest.resetModules();
  });

  it('abre sem credenciais, mantém auth nulo e não lança invalid-api-key', () => {
    const { auth, db, firebaseConfigurado } = require('@/lib/firebase') as typeof import('@/lib/firebase');

    expect(firebaseConfigurado).toBe(false);
    expect(auth.currentUser).toBeNull();
    return expect(auth.authStateReady()).resolves.toBeUndefined().then(() => {
      expect(db).toBeDefined();
    });
  });
});
