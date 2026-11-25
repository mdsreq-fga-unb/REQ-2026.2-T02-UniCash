import { getDb } from '@/db/database';
import { consultarSaldoAnterior } from '@/features/saldoInicial/referencia';
import { lerSaldoInicial, salvarSaldoInicial } from '@/features/saldoInicial/service';
import { enviarSaldoInicial, observarConexaoSaldoInicial, restaurarSaldoInicial } from '@/features/saldoInicial/sync';
import { mesReferenciaValido, valorSaldoInicial } from '@/features/saldoInicial/validacao';
import { instalarBanco } from '../helpers/fakeDb';

jest.mock('@/db/database', () => {
  const getDb = jest.fn();
  return { getDb, getDbDoDono: getDb };
});
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'dono', emailVerified: true } }, db: {}, firebaseConfigurado: true }));
const mockTransacao = jest.fn();
const mockIdToken = jest.fn();
const mockSnapshot = jest.fn();
jest.mock('firebase/auth', () => ({
  onIdTokenChanged: (_auth: unknown, callback: unknown) => mockIdToken(callback),
}));
jest.mock('firebase/firestore', () => ({
  doc: (_banco: unknown, ...path: string[]) => path.join('/'),
  onSnapshot: (...args: unknown[]) => mockSnapshot(...args),
  runTransaction: (_banco: unknown, callback: unknown) => mockTransacao(callback),
}));

const dados = { mes_referencia: '2026-11', valor_centavos: -12550 };
let banco: ReturnType<typeof instalarBanco>;

beforeEach(() => {
  banco = instalarBanco();
  mockTransacao.mockReset();
  mockIdToken.mockReset();
  mockSnapshot.mockReset();
});

afterEach(() => banco.sqlite.close());

it.each([
  ['1.234,56', 123456], ['-125,5', -12550], ['0', 0],
  ['-0,00', 0], ['90.071.992.547.409,91', Number.MAX_SAFE_INTEGER],
  ['90.071.992.547.409,92', null], ['1,005', null], ['', null], ['-1a,2', null],
])('valida valor %s com precisão de centavos', (entrada, esperado) => {
  expect(valorSaldoInicial(entrada)).toBe(esperado);
});

it.each(['', '2026-00', '2026-13', '2026-2', '0000-01'])('rejeita mês inválido %s', (mes) => {
  expect(mesReferenciaValido(mes)).toBe(false);
});

it('substitui uma única linha e preserva o último saldo quando a gravação falha', async () => {
  expect(await lerSaldoInicial()).toBeNull();
  await salvarSaldoInicial(dados);
  banco.falharNaOperacao(1);
  await expect(salvarSaldoInicial({ ...dados, valor_centavos: 0 })).rejects.toThrow();
  expect(await lerSaldoInicial()).toMatchObject({ ...dados, sync_status: 'pendente' });
  await salvarSaldoInicial({ ...dados, valor_centavos: 0 });
  expect(await lerSaldoInicial()).toMatchObject({ ...dados, valor_centavos: 0 });
  expect(banco.sqlite.prepare('SELECT COUNT(*) AS total FROM saldo_inicial').get()).toEqual({ total: 1 });
});

it('recalcula a referência na leitura e exclui lançamentos anteriores ao corte', async () => {
  banco.sqlite.exec(`
    INSERT INTO receitas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em)
    VALUES ('out', 500, '2026-10-15', 'Outubro', 'pendente', 'agora', 'agora'),
           ('nov', 875, '2026-11-15', 'Novembro', 'pendente', 'agora', 'agora');
  `);
  expect(await consultarSaldoAnterior('2026-11')).toBe(500);
  await salvarSaldoInicial(dados);
  expect(await consultarSaldoAnterior('2026-10')).toBeNull();
  expect(await consultarSaldoAnterior('2026-11')).toBe(-12550);
  expect(await consultarSaldoAnterior('2026-12')).toBe(875);
  await salvarSaldoInicial({ mes_referencia: '2026-12', valor_centavos: 0 });
  expect(await consultarSaldoAnterior('2026-11')).toBeNull();
  expect(await consultarSaldoAnterior('2026-12')).toBe(0);
});

it('mantém a pendência offline e protege uma edição feita durante o envio', async () => {
  await salvarSaldoInicial(dados);
  const conexao = await getDb();
  mockTransacao.mockRejectedValueOnce(new Error('offline'));
  await expect(enviarSaldoInicial(conexao, 'dono')).rejects.toThrow('offline');
  expect(await lerSaldoInicial()).toMatchObject({ sync_status: 'pendente' });

  const set = jest.fn();
  mockTransacao.mockImplementationOnce(async (executar) => {
    await executar({ set });
    await salvarSaldoInicial({ ...dados, valor_centavos: 0 });
  });
  expect(await enviarSaldoInicial(conexao, 'dono')).toBe(false);
  expect(set).toHaveBeenCalledWith('usuarios/dono/saldo_inicial/atual', dados);
  expect(await lerSaldoInicial()).toMatchObject({ valor_centavos: 0, sync_status: 'pendente' });

  mockTransacao.mockImplementationOnce(async (executar) => executar({ set }));
  expect(await enviarSaldoInicial(conexao, 'dono')).toBe(true);
  expect(await lerSaldoInicial()).toMatchObject({ valor_centavos: 0, sync_status: 'sincronizado' });
});

it('restaura os dados da conta sem sobrescrever uma edição local pendente', async () => {
  const conexao = await getDb();
  await conexao.withExclusiveTransactionAsync((tx) => restaurarSaldoInicial(tx, { ...dados }));
  expect(await lerSaldoInicial()).toMatchObject({ ...dados, sync_status: 'sincronizado' });
  await salvarSaldoInicial({ ...dados, valor_centavos: 0 });
  await conexao.withExclusiveTransactionAsync((tx) => restaurarSaldoInicial(tx, { ...dados }));
  expect(await lerSaldoInicial()).toMatchObject({ valor_centavos: 0, sync_status: 'pendente' });
});


it('solicita reenvio quando a conexão volta e há uma alteração local pendente', async () => {
  await salvarSaldoInicial(dados);
  const cancelarSessao = jest.fn();
  const cancelarDocumento = jest.fn();
  mockIdToken.mockImplementation((receber) => {
    receber({ uid: 'dono', emailVerified: true });
    return cancelarSessao;
  });
  mockSnapshot.mockReturnValue(cancelarDocumento);
  const reenviar = jest.fn();
  const parar = observarConexaoSaldoInicial(reenviar);
  const receber = mockSnapshot.mock.calls[0][2];
  const enviarSnapshot = async (fromCache: boolean) => {
    receber({ metadata: { fromCache, hasPendingWrites: false } });
    await new Promise<void>((resolver) => setImmediate(resolver));
  };

  await enviarSnapshot(true);
  expect(reenviar).not.toHaveBeenCalled();
  await enviarSnapshot(false);
  await enviarSnapshot(false);
  expect(reenviar).toHaveBeenCalledTimes(1);
  await enviarSnapshot(true);
  await enviarSnapshot(false);
  expect(reenviar).toHaveBeenCalledTimes(2);
  parar();
  expect(cancelarDocumento).toHaveBeenCalledTimes(1);
  expect(cancelarSessao).toHaveBeenCalledTimes(1);
});
