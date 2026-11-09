// A base local real (expo-sqlite) é substituída por um SQLite em memória em cada teste (ver helpers/fakeDb.ts).
jest.mock('@/db/database', () => ({ getDb: jest.fn() }));
