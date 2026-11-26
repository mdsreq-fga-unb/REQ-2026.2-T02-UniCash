import { getDb } from '@/db/database';
import { consultarSaldoAnterior } from '@/features/saldoInicial/referencia';
import { lerSaldoInicial, salvarSaldoInicial } from '@/features/saldoInicial/service';
import { enviarSaldoInicial, lerSaldoInicialRemoto, observarConexaoSaldoInicial, restaurarSaldoInicial } from '@/features/saldoInicial/sync';
import { mesReferenciaValido, valorSaldoInicial } from '@/features/saldoInicial/validacao';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';
import { instalarBanco } from '../helpers/fakeDb';

jest.mock('@/db/database', () => {
  const getDb = jest.fn();
  return { getDb, getDbDoDono: getDb };
});
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'dono', emailVerified: true } }, db: {}, firebaseConfigurado: true }));
const mockTransacao = jest.fn();
const mockIdToken = jest.fn();
const mockSnapshot = jest.fn();
const mockGetDoc = jest.fn();
jest.mock('firebase/auth', () => ({
  onIdTokenChanged: (_auth: unknown, callback: unknown) => mockIdToken(callback),
}));
jest.mock('firebase/firestore', () => ({
  doc: (_banco: unknown, ...path: string[]) => path.join('/'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
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
  mockGetDoc.mockReset();
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
  await conexao.withExclusiveTransactionAsync(async (tx) => { await restaurarSaldoInicial(tx, { ...dados }); });
  expect(await lerSaldoInicial()).toMatchObject({ ...dados, sync_status: 'sincronizado' });
  await salvarSaldoInicial({ ...dados, valor_centavos: 0 });
  await conexao.withExclusiveTransactionAsync(async (tx) => { await restaurarSaldoInicial(tx, { ...dados }); });
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
    receber({ metadata: { fromCache, hasPendingWrites: false }, data: () => undefined });
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

it.each([false, true])('retoma a restauração com o app aberto e cadastro concorrente = %s', async (cadastroConcorrente) => {
  mockGetDoc.mockRejectedValueOnce(new Error('offline'));
  await expect(lerSaldoInicialRemoto('dono')).rejects.toThrow('offline');

  mockIdToken.mockImplementation((receber) => {
    receber({ uid: 'dono', emailVerified: true });
    return jest.fn();
  });
  mockSnapshot.mockReturnValue(jest.fn());
  const reenviar = jest.fn();
  const parar = observarConexaoSaldoInicial(reenviar);
  const avisar = jest.fn();
  const cancelar = ouvirBaseAtualizada(avisar);
  const receber = mockSnapshot.mock.calls[0][2];
  const conexao = await getDb();
  const aguardar = () => new Promise<void>((resolver) => setImmediate(resolver));
  try {
    receber({ metadata: { fromCache: true, hasPendingWrites: false }, data: () => dados });
    await aguardar();
    expect(await lerSaldoInicial()).toBeNull();

    if (cadastroConcorrente) {
      const transacao = conexao.withExclusiveTransactionAsync.bind(conexao);
      jest.spyOn(conexao, 'withExclusiveTransactionAsync').mockImplementationOnce(async (executar) => {
        await salvarSaldoInicial({ ...dados, valor_centavos: 0 });
        await transacao(executar);
      });
    }
    receber({ metadata: { fromCache: false, hasPendingWrites: false }, data: () => dados });
    await aguardar();

    expect(await lerSaldoInicial()).toMatchObject(cadastroConcorrente
      ? { ...dados, valor_centavos: 0, sync_status: 'pendente' }
      : { ...dados, sync_status: 'sincronizado' });
    expect(avisar).toHaveBeenCalledTimes(cadastroConcorrente ? 0 : 1);
    expect(reenviar).not.toHaveBeenCalled();
  } finally {
    cancelar();
    parar();
  }
});
