jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/alertas/notificador', () => ({
  notificadorLocal: { disponivel: async () => false, emitir: jest.fn() },
}));

// A base local real (expo-sqlite) é substituída por SQLite em memória.
jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

// Habilita o ambiente de testes do React para atualizações com act().
(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;