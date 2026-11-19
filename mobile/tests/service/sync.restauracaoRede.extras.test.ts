import { consumirAcessoNegado, FalhaRestauracao, restaurarDaNuvem } from '@/features/receitas/sync';
import { instalarBanco } from '../helpers/fakeDb';

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDocs: async () => {
    throw Object.assign(new Error('unavailable'), { code: 'unavailable' });
  },
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

describe('restaurarDaNuvem: falha que não é de permissão', () => {
  beforeEach(() => {
    instalarBanco();
    consumirAcessoNegado();
  });

  it('lança FalhaRestauracao sem sinalizar acesso negado (EX04, não EX07)', async () => {
    await expect(restaurarDaNuvem()).rejects.toBeInstanceOf(FalhaRestauracao);
    expect(consumirAcessoNegado()).toBe(false);
  });
});
