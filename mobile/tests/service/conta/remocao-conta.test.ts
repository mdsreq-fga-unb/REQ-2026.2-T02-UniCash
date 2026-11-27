import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { getDocFromServer, runTransaction } from 'firebase/firestore';
import { apagarBancoDaConta, PREFIXO_REMOCAO_LOCAL } from '@/db/database';
import { auth } from '@/lib/firebase';
import { retomarLimpezasDeConta, solicitarExclusaoConta } from '@/features/conta/remocao';

jest.mock('@/lib/firebase', () => ({
  auth: { authStateReady: jest.fn(), currentUser: null },
  db: {},
  firebaseConfigurado: true,
}));
jest.mock('@/db/database', () => ({
  apagarBancoDaConta: jest.fn(),
  PREFIXO_REMOCAO_LOCAL: 'unicash:remocao-conta:',
}));
jest.mock('@/features/conta/auth.firebase', () => ({ reautenticar: jest.fn().mockResolvedValue(undefined) }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDocFromServer: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
}));

const chave = PREFIXO_REMOCAO_LOCAL + 'dono';
const renovarToken = jest.fn();
const sessao = auth as unknown as { currentUser: object | null };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  sessao.currentUser = { uid: 'dono', email: 'teste@example.com', emailVerified: true, getIdToken: renovarToken };
  renovarToken.mockReset().mockResolvedValue('token');
});

it('limpa o SQLite ao reabrir se o pedido foi gravado antes da interrupção e o UID já foi excluído', async () => {
  const gravarPedido = jest.fn();
  jest.mocked(runTransaction).mockImplementationOnce(async (_db, atualizar) =>
    atualizar({ get: async () => ({ exists: () => false }), set: gravarPedido } as never));
  await expect(solicitarExclusaoConta('senha', () => {
    throw new Error('App interrompido após o commit remoto');
  })).rejects.toThrow('App interrompido');
  expect(gravarPedido).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: 'pendente' }));
  expect(await AsyncStorage.getItem(chave)).toBe('enviando');
  expect(apagarBancoDaConta).not.toHaveBeenCalled();

  sessao.currentUser = null;
  await retomarLimpezasDeConta();

  expect(getDocFromServer).not.toHaveBeenCalled();
  expect(apagarBancoDaConta).toHaveBeenCalledWith('dono');
  expect(await AsyncStorage.getItem(chave)).toBeNull();
});

it('limpa a base quando a sessão em cache pertence a um UID excluído', async () => {
  await AsyncStorage.setItem(chave, 'enviando');
  jest.mocked(getDocFromServer).mockRejectedValueOnce({ code: 'permission-denied' });
  renovarToken.mockRejectedValueOnce({ code: 'auth/user-token-expired' });

  await retomarLimpezasDeConta();

  expect(signOut).toHaveBeenCalledWith(auth);
  expect(apagarBancoDaConta).toHaveBeenCalledWith('dono');
});

it('preserva a base e o marcador se a rede falhar e a sessão continuar ativa', async () => {
  await AsyncStorage.setItem(chave, 'enviando');
  jest.mocked(getDocFromServer).mockRejectedValueOnce({ code: 'unavailable' });
  renovarToken.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

  await retomarLimpezasDeConta();

  expect(apagarBancoDaConta).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(chave)).toBe('enviando');
});
