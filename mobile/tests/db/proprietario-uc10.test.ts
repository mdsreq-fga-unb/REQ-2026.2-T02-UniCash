jest.unmock('@/db/database');
jest.mock('@/db/migrations', () => ({ migrarSeNecessario: jest.fn() }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async (nome: string) => ({ nome, execAsync: jest.fn() })) }));
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null, authStateReady: jest.fn(async () => {}) } }));
import { auth } from '@/lib/firebase';
import { getDb, getDbDoDono } from '@/db/database';

it('mantém A após logout e não entrega sua base à conta B', async () => {
  const mudar = (u: unknown) => { (auth as { currentUser: unknown }).currentUser = u; };
  mudar({ uid: 'A', emailVerified: true });
  const a = await getDb();
  mudar(null);
  expect(await getDb()).toBe(a);
  mudar({ uid: 'B', emailVerified: true });
  const b = await getDb();
  expect(b).not.toBe(a);
  expect(await getDbDoDono('A')).toBe(a);
  expect(await getDbDoDono('B')).toBe(b);
  mudar({ uid: 'A', emailVerified: true });
  expect(await getDb()).toBe(a);
});
