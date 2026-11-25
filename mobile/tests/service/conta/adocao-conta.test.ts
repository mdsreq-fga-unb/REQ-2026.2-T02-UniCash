import { adotarDadosLocais } from '@/features/conta/adocao.service';
import { getDbLocal, getDbDoDono } from '@/db/database';
import { auth } from '@/lib/firebase';

jest.mock('@/db/database', () => ({ getDbLocal: jest.fn(), getDbDoDono: jest.fn() }));
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
