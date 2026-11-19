import { getDb } from '@/db/database';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';

let mockUsuario: { uid: string } | null = null;

jest.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockUsuario;
    },
  },
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
}));

describe('sincronizarEmSegundoPlano', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuario = null;
  });

  it('sem conta, não faz nada e não lança', () => {
    expect(() => sincronizarEmSegundoPlano()).not.toThrow();
    expect(getDb).not.toHaveBeenCalled();
  });

  it('com conta, dispara a sincronização sem esperar por ela', async () => {
    mockUsuario = { uid: 'u1' };
    (getDb as jest.Mock).mockResolvedValue({ getAllAsync: jest.fn().mockResolvedValue([]) });

    sincronizarEmSegundoPlano();

    await new Promise((r) => setTimeout(r, 0));
    expect(getDb).toHaveBeenCalled();
  });
});
