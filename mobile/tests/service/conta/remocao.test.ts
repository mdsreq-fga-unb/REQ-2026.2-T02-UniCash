import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import {
  chaveRemocao,
  clearLocalDatabase,
  desvincularBaseRemovida,
  listarContasComRemocaoPendente,
  obterRemocaoConfirmada,
} from '@/db/database';
import { definirSessao, obterSessao } from '@/features/conta/sessao';
import { iniciarReenvioDeRemocoes, remocaoConta } from '@/features/conta/remocao';
import { waitFor } from '@testing-library/react-native';

const mockUsuario = { uid: 'u1', emailVerified: true, getIdToken: jest.fn() };
const mockAuth = { currentUser: mockUsuario as typeof mockUsuario | null, authStateReady: jest.fn() };

jest.mock('@/lib/firebase', () => ({ get auth() { return mockAuth; }, firebaseConfigurado: true }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: false }),
}));
jest.mock('@/db/database', () => ({
  chaveRemocao: jest.fn((uid) => 'remocao:' + uid),
  listarContasComRemocaoPendente: jest.fn(),
  obterRemocaoConfirmada: jest.fn(),
  clearLocalDatabase: jest.fn(),
  desvincularBaseRemovida: jest.fn(),
}));

const sessao = { status: 'ativa', uid: 'u1', email: 'a@exemplo.com' } as const;
const token = 'a'.repeat(64);
const fetchOriginal = global.fetch;
const fetchMock = jest.fn();

beforeEach(async () => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  jest.mocked(clearLocalDatabase).mockReset();
  jest.mocked(chaveRemocao).mockImplementation((uid) => 'remocao:' + uid);
  jest.mocked(listarContasComRemocaoPendente).mockResolvedValue([]);
  jest.mocked(signOut).mockImplementation(async () => { mockAuth.currentUser = null; });
  global.fetch = fetchMock;
  mockAuth.currentUser = mockUsuario;
  mockUsuario.getIdToken.mockResolvedValue('sessao');
  definirSessao(sessao);
  await AsyncStorage.clear();
  await AsyncStorage.setItem('unicash:autoriza-remocao:u1', token);
});

afterEach(() => { global.fetch = fetchOriginal; });

it('não altera uma conta de outro usuário', async () => {
  await expect(remocaoConta.excluir('u2')).rejects.toThrow('sessao-invalida');
  expect(clearLocalDatabase).not.toHaveBeenCalled();
});

it('preserva a sessão e não envia um pedido se a transação local falhar', async () => {
  jest.mocked(clearLocalDatabase).mockRejectedValue(new Error('falha-local'));
  jest.mocked(listarContasComRemocaoPendente).mockResolvedValue(['u1']);
  jest.mocked(obterRemocaoConfirmada).mockResolvedValue(false);

  await expect(remocaoConta.excluir('u1')).rejects.toThrow('falha-local');

  expect(obterSessao()).toEqual(sessao);
  expect(signOut).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('mantém o pedido depois de ficar offline e o reenvia sem sessão', async () => {
  jest.mocked(listarContasComRemocaoPendente).mockResolvedValue(['u1']);
  jest.mocked(obterRemocaoConfirmada).mockResolvedValue(true);
  fetchMock.mockRejectedValueOnce(new Error('offline'));

  await remocaoConta.excluir('u1');
  expect(obterSessao()).toEqual({ status: 'sem-sessao' });
  expect(await AsyncStorage.getItem(chaveRemocao('u1'))).toBe(token);
  expect(clearLocalDatabase).toHaveBeenCalledWith('u1', expect.any(String));
  expect(desvincularBaseRemovida).toHaveBeenCalledWith('u1');
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

  fetchMock.mockResolvedValue({ ok: true });
  const parar = iniciarReenvioDeRemocoes();
  try {
    await waitFor(async () => expect(await AsyncStorage.getItem(chaveRemocao('u1'))).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringMatching(/solicitarRemocaoConta$/),
      expect.objectContaining({ headers: { Authorization: `Bearer ${token}` } }));
    expect(mockUsuario.getIdToken).not.toHaveBeenCalled();
  } finally {
    parar();
  }
});
