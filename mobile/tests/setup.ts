// A base local real (expo-sqlite) é substituída por SQLite em memória.
jest.mock('@/db/database', () => (() => { const getDb = jest.fn(); return { getDb, getDbDoDono: getDb }; })());
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Habilita o ambiente de testes do React para atualizações com act().
(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;
// UC14: permissões de notificação; cada teste sobrescreve os retornos quando precisa.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { DEFAULT: 3 },
}));
