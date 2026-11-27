jest.unmock('@/db/database');
jest.mock('@/db/migrations', () => ({ migrarSeNecessario: jest.fn() }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async (nome: string) => ({ nome, closeAsync: jest.fn(), execAsync: jest.fn(), getAllAsync: jest.fn() })), deleteDatabaseAsync: jest.fn() }));
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null, authStateReady: jest.fn(async () => {}) } }));
import { deleteDatabaseAsync } from 'expo-sqlite';
import { auth } from '@/lib/firebase';
import { apagarBancoSemConta, getDb, getDbDoDono, getDbLocal } from '@/db/database';

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

it('apaga apenas a base sem conta e desvincula a última conta após o logout', async () => {
  const mudar = (u: unknown) => { (auth as { currentUser: unknown }).currentUser = u; };
  mudar({ uid: 'apagar-A', emailVerified: true });
  const conta = await getDb();
  await expect(apagarBancoSemConta()).rejects.toThrow('sessão ativa');
  mudar(null);
  const local = await getDbLocal();
  expect(await getDb()).toBe(conta);

  await apagarBancoSemConta();

  expect(deleteDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(deleteDatabaseAsync).toHaveBeenCalledWith('unicash.db');
  expect(local.closeAsync).toHaveBeenCalledTimes(1);
  expect(conta.closeAsync).not.toHaveBeenCalled();
  expect(await getDbDoDono('apagar-A')).toBe(conta);
  const novaBase = await getDbLocal();
  expect(novaBase).not.toBe(local);
  expect(await getDb()).toBe(novaBase);
});
