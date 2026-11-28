import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkStateAsync } from 'expo-network';
import { signOut } from 'firebase/auth';
import { doc, getDocFromServer, runTransaction } from 'firebase/firestore';
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
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('firebase/auth', () => ({ signOut: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, colecao, id) => `${colecao}/${id}`),
  getDocFromServer: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
}));

const chave = PREFIXO_REMOCAO_LOCAL + 'dono';
const id = '00000000-0000-4000-8000-000000000001';
const renovarToken = jest.fn();
const sessao = auth as unknown as { currentUser: object | null };

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(getDocFromServer).mockReset();
  await AsyncStorage.clear();
  jest.mocked(getNetworkStateAsync).mockResolvedValue({ isConnected: true });
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
  expect(gravarPedido).toHaveBeenCalledWith('pedidos_remocao/dono', expect.objectContaining({ status: 'pendente', comprovante_id: id }));
  expect(await AsyncStorage.getItem(chave)).toBe('enviando:' + id);
  expect(apagarBancoDaConta).not.toHaveBeenCalled();

  expect(gravarPedido).toHaveBeenCalledWith('comprovantes_remocao/' + id, { recebido: true });
  sessao.currentUser = null;
  jest.mocked(getDocFromServer).mockResolvedValueOnce({ exists: () => true } as never);
  await retomarLimpezasDeConta();

  expect(getDocFromServer).toHaveBeenCalledWith('comprovantes_remocao/' + id);
  expect(apagarBancoDaConta).toHaveBeenCalledWith('dono');
  expect(await AsyncStorage.getItem(chave)).toBeNull();
});

it('retoma a limpeza após perder o UID usando o comprovante do pedido de outro aparelho', async () => {
  const idExistente = '00000000-0000-4000-8000-000000000002';
  const gravar = jest.fn();
  jest.mocked(runTransaction).mockImplementationOnce(async (_db, atualizar) =>
    atualizar({
      get: async () => ({ exists: () => true, get: () => idExistente }),
      set: gravar,
    } as never));
  await expect(solicitarExclusaoConta('senha', () => {
    throw new Error('App interrompido antes da confirmação local');
  })).rejects.toThrow('App interrompido');

  expect(gravar).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(chave)).toBe('enviando:' + idExistente);
  expect(apagarBancoDaConta).not.toHaveBeenCalled();

  sessao.currentUser = null;
  jest.mocked(getDocFromServer).mockImplementationOnce(async ref =>
    ({ exists: () => String(ref) === 'comprovantes_remocao/' + idExistente }) as never);
  await retomarLimpezasDeConta();

  expect(getDocFromServer).toHaveBeenCalledWith('comprovantes_remocao/' + idExistente);
  expect(apagarBancoDaConta).toHaveBeenCalledWith('dono');
  expect(await AsyncStorage.getItem(chave)).toBeNull();
});

it('preserva a base quando a transação falha e o app reabre após logout', async () => {
  jest.mocked(runTransaction).mockRejectedValueOnce({ code: 'unavailable' });
  await expect(solicitarExclusaoConta('senha', jest.fn())).rejects.toMatchObject({ codigo: 'sem-conexao' });
  sessao.currentUser = null;
  jest.mocked(getDocFromServer).mockResolvedValueOnce({ exists: () => false } as never);

  await retomarLimpezasDeConta();

  expect(apagarBancoDaConta).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(chave)).toBe('enviando:' + id);
});

it('preserva o envio legado sem sessão, pois falta prova de recebimento', async () => {
  await AsyncStorage.setItem(chave, 'enviando');
  sessao.currentUser = null;

  await retomarLimpezasDeConta();

  expect(apagarBancoDaConta).not.toHaveBeenCalled();
  expect(doc).not.toHaveBeenCalled();
});

it('preserva a base e o marcador se a rede falhar e a sessão continuar ativa', async () => {
  await AsyncStorage.setItem(chave, 'enviando:' + id);
  jest.mocked(getDocFromServer).mockRejectedValueOnce({ code: 'unavailable' }).mockRejectedValueOnce({ code: 'unavailable' });
  renovarToken.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

  await retomarLimpezasDeConta();

  expect(apagarBancoDaConta).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(chave)).toBe('enviando:' + id);
});

it('pede conexão antes de solicitar a exclusão de uma conta e preserva os dados locais', async () => {
  jest.mocked(getNetworkStateAsync).mockResolvedValueOnce({ isConnected: false });

  await expect(solicitarExclusaoConta('senha', jest.fn())).rejects.toMatchObject({ codigo: 'sem-conexao' });

  expect(runTransaction).not.toHaveBeenCalled();
  expect(apagarBancoDaConta).not.toHaveBeenCalled();
  expect(signOut).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(chave)).toBeNull();
});

it('descarta somente o marcador quando o servidor confirma a ausência do comprovante e do pedido', async () => {
  await AsyncStorage.setItem(chave, 'enviando:' + id);
  jest.mocked(getDocFromServer).mockResolvedValue({ exists: () => false } as never);
  try {
    await retomarLimpezasDeConta();
    expect(apagarBancoDaConta).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(chave)).toBeNull();
  } finally {
    jest.mocked(getDocFromServer).mockReset();
  }
});

it('preserva o marcador que falhou e continua a limpeza do próximo UID', async () => {
  sessao.currentUser = null;
  await AsyncStorage.setItem(chave, 'confirmado');
  const outraChave = PREFIXO_REMOCAO_LOCAL + 'outro';
  await AsyncStorage.setItem(outraChave, 'confirmado');
  jest.mocked(apagarBancoDaConta).mockRejectedValueOnce(new Error('SQLite indisponível'));

  await retomarLimpezasDeConta();

  expect(await AsyncStorage.getItem(chave)).toBe('confirmado');
  expect(apagarBancoDaConta).toHaveBeenCalledWith('outro');
  expect(await AsyncStorage.getItem(outraChave)).toBeNull();
});
