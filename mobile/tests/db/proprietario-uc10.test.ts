jest.unmock('@/db/database');
jest.mock('@/db/migrations', () => ({ migrarSeNecessario: jest.fn() }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async (nome: string) => ({ nome, execAsync: jest.fn(), getAllAsync: jest.fn() })) }));
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

import { consultarConsumoMensal } from '@/features/consumo/consulta';
import { lerTotaisLocais } from '@/features/consumo/sqlite';

it('consulta consumo apenas na base da conta ativa (UC09 EX03)', async () => {
  const mudar = (uid: string) => {
    (auth as { currentUser: unknown }).currentUser = { uid, emailVerified: true };
  };
  mudar('consumo-A');
  const a = await getDb();
  jest.mocked(a.getAllAsync).mockResolvedValue([
    { id: 'a', nome: 'Alimentação', gasto: 8000, renda: 0, limite_centavos: 10000, limite_percentual_centesimos: null },
  ]);
  mudar('consumo-B');
  const b = await getDb();
  jest.mocked(b.getAllAsync).mockResolvedValue([]);
  expect(await consultarConsumoMensal('2026-11', lerTotaisLocais)).toEqual([]);
  expect(a.getAllAsync).not.toHaveBeenCalled();
  mudar('consumo-A');
  expect(await consultarConsumoMensal('2026-11', lerTotaisLocais))
    .toMatchObject([{ categoriaId: 'a', consumoPercentual: 80 }]);
});
