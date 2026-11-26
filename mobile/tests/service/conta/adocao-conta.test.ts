import { criarSincronizacaoDoApp } from '@/features/conta/sync.app';
import { sincronizarPendentes } from '@/features/receitas/sync';
import { instalarBanco } from '../../helpers/fakeDb';
import { adotarDadosLocais } from '@/features/conta/adocao.service';
import { getDb, getDbLocal, getDbDoDono } from '@/db/database';
import { auth } from '@/lib/firebase';

jest.mock('@/db/database', () => ({ getDb: jest.fn(), getDbLocal: jest.fn(), getDbDoDono: jest.fn() }));
jest.mock('@/features/receitas/sync', () => ({ sincronizarPendentes: jest.fn() }));
jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'A', emailVerified: true } } }));

function banco(uid?: string, linhas: Record<string, unknown>[] = []) {
  const tx = {
    execAsync: jest.fn(async () => {}),
    getFirstAsync: jest.fn(async () => uid ? { uid } : null),
    getAllAsync: jest.fn(async (sql: string) => sql === 'SELECT * FROM receitas' ? linhas : []),
    runAsync: jest.fn(async () => ({})),
  };
  return { ...tx, withExclusiveTransactionAsync: jest.fn(async (fn: (b: typeof tx) => Promise<void>) => fn(tx)) };
}

it('copia a receita local como pendente após autorização', async () => {
  const origem = banco(undefined, [{ id: 'r1', sync_status: 'sincronizado' }]);
  const destino = banco();
  (getDbLocal as jest.Mock).mockResolvedValue(origem);
  (getDbDoDono as jest.Mock).mockResolvedValue(destino);
  await adotarDadosLocais('A');
  expect(destino.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO receitas'), ['r1', 'pendente']);
});

it('não copia origem reservada para outra conta', async () => {
  const destino = banco();
  (getDbLocal as jest.Mock).mockResolvedValue(banco('B'));
  (getDbDoDono as jest.Mock).mockResolvedValue(destino);
  await adotarDadosLocais('A');
  expect(destino.withExclusiveTransactionAsync).not.toHaveBeenCalled();
});

it('não reaplica uma adoção com recibo no destino', async () => {
  const destino = banco('A');
  (getDbLocal as jest.Mock).mockResolvedValue(banco('A', [{ id: 'r1' }]));
  (getDbDoDono as jest.Mock).mockResolvedValue(destino);
  await adotarDadosLocais('A');
  expect(destino.runAsync).not.toHaveBeenCalled();
});

it('recusa uma sessão diferente do UID solicitado', async () => {
  expect(auth.currentUser?.uid).toBe('A');
  await expect(adotarDadosLocais('B')).rejects.toThrow('Sessão alterada');
});

it('permite nova tentativa após falha na cópia mantendo a origem', async () => {
  const origem = banco('A', [{ id: 'r1', sync_status: 'pendente' }]);
  const destino = banco();
  (getDbLocal as jest.Mock).mockResolvedValue(origem);
  (getDbDoDono as jest.Mock).mockResolvedValue(destino);
  destino.runAsync.mockRejectedValueOnce(new Error('falha na cópia'));
  await expect(adotarDadosLocais('A')).rejects.toThrow('falha na cópia');
  await adotarDadosLocais('A');
  expect(destino.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO receitas'), ['r1', 'pendente']);
  expect(origem.runAsync).not.toHaveBeenCalledWith(expect.stringContaining('DELETE'));
});

it('adota o saldo inicial e mantém o ID e a sequência do alerta', async () => {
  const origem = banco();
  origem.getAllAsync.mockImplementation(async (sql) => {
    if (sql === 'SELECT * FROM saldo_inicial') {
      return [{ id: 1, mes: '2026-11', valor_centavos: -2000 }];
    }
    if (sql.startsWith('SELECT * FROM alertas_emitidos')) {
      return [{ id: 'alerta-local', mes: '2026-11', transicao: 1, sync_status: 'sincronizado' }];
    }
    return [];
  });
  const destino = banco();
  (getDbLocal as jest.Mock).mockResolvedValue(origem);
  (getDbDoDono as jest.Mock).mockResolvedValue(destino);
  await adotarDadosLocais('A');
  expect(destino.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO saldo_inicial'), [1, '2026-11', -2000],
  );
  expect(destino.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO alertas_emitidos'), ['alerta-local', '2026-11', 1, 'pendente'],
  );
});

it('mantém a referência da conta e renumera alertas locais conflitantes para o envio autorizado', async () => {
  const local = instalarBanco();
  const apiLocal = await getDb();
  const conta = instalarBanco();
  const apiConta = await getDb();
  (getDbLocal as jest.Mock).mockResolvedValue(apiLocal);
  (getDbDoDono as jest.Mock).mockResolvedValue({
    ...apiConta,
    withTransactionAsync: (fn: () => Promise<void>) => apiConta.withExclusiveTransactionAsync(fn),
  });
  local.sqlite.exec(`
    INSERT INTO saldo_inicial VALUES (1, '2026-10', -2000);
    INSERT INTO alertas_emitidos (id, mes, anterior_centavos, saldo_centavos, criado_em, transicao)
    VALUES ('local-a', '2026-11', 0, -100, '2026-11-01', 1),
           ('local-b', '2026-11', 0, -200, '2026-11-02', 2);
  `);
  conta.sqlite.exec(`
    INSERT INTO saldo_inicial VALUES (1, '2026-11', 3000);
    INSERT INTO alertas_emitidos (id, mes, anterior_centavos, saldo_centavos, criado_em, transicao, sync_status)
    VALUES ('conta-a', '2026-11', 0, -300, '2026-11-03', 1, 'sincronizado');
  `);
  const servico = criarSincronizacaoDoApp();
  await servico.marcarTodosComoPendentes();
  await servico.marcarTodosComoPendentes();

  expect(conta.sqlite.prepare('SELECT mes, valor_centavos FROM saldo_inicial').get())
    .toEqual({ mes: '2026-11', valor_centavos: 3000 });
  const pendentes = () => conta.sqlite.prepare(
    "SELECT id, transicao FROM alertas_emitidos WHERE sync_status = 'pendente' ORDER BY transicao",
  ).all();
  const esperados = [
    { id: 'conta-a', transicao: 1 },
    { id: 'local-a', transicao: 2 },
    { id: 'local-b', transicao: 3 },
  ];
  expect(pendentes()).toEqual(esperados);
  (sincronizarPendentes as jest.Mock).mockImplementationOnce(async () => {
    expect(pendentes()).toEqual(esperados);
    conta.sqlite.exec("UPDATE alertas_emitidos SET sync_status = 'sincronizado'");
  });
  await expect(servico.sincronizar()).resolves.toBeUndefined();
  expect(sincronizarPendentes).toHaveBeenCalledWith({ manual: true });
  expect(await servico.contarPendentes()).toBe(0);
  local.sqlite.close();
  conta.sqlite.close();
});
