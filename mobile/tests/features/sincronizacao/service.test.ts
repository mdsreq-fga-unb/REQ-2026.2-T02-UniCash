import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';
import { getDb, getDbDoDono } from '@/db/database';
import { definirSessao } from '@/features/conta/sessao';
import { envioPausado, restaurarDaNuvem, sincronizarPendentes } from '@/features/receitas/sync';
import { iniciarSincronizacaoAutomatica, syncService } from '@/features/sincronizacao/service';
import { instalarBanco, type BancoFalso } from '../../helpers/fakeDb';

let mockUsuario: { uid: string; emailVerified: boolean } | null;
jest.mock('@/lib/firebase', () => ({
  auth: { get currentUser() { return mockUsuario; } },
}));
jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  envioPausado: jest.fn(),
  sincronizarPendentes: jest.fn(),
  restaurarDaNuvem: jest.fn(),
}));

const enviar = jest.mocked(sincronizarPendentes);
const restaurar = jest.mocked(restaurarDaNuvem);
const consultarRede = jest.mocked(getNetworkStateAsync);
const escutarRede = jest.mocked(addNetworkStateListener);
const estaPausado = jest.mocked(envioPausado);

function entrar(uid = 'uc16') {
  mockUsuario = { uid, emailVerified: true };
  definirSessao({ status: 'ativa', uid, email: 'teste@example.com' });
}

function sair() {
  mockUsuario = null;
  definirSessao({ status: 'sem-sessao' });
}

function inserirReceitas(banco: BancoFalso, quantidade: number) {
  const inserir = banco.sqlite.prepare(`
    INSERT INTO receitas(id, valor_centavos, data, titulo, criado_em, atualizado_em)
    VALUES (?, 100, '2026-11-26', ?, '2026-11-26', '2026-11-26')
  `);
  for (let indice = 1; indice <= quantidade; indice++) {
    inserir.run(String(indice), `Receita ${indice}`);
  }
}

let banco: BancoFalso;

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  banco = instalarBanco();
  consultarRede.mockResolvedValue({ isConnected: true });
  estaPausado.mockResolvedValue(false);
  enviar.mockResolvedValue(false);
  restaurar.mockResolvedValue({ despesas: 0, receitas: 0, recorrencias: 0 });
  entrar();
});

afterEach(() => {
  sair();
  banco.sqlite.close();
});

it.each([0, 1, 50])('lista %i pendências com a mesma contagem do estado', async (quantidade) => {
  inserirReceitas(banco, quantidade);
  const consulta = await syncService.consultar();
  expect(consulta.estado.quantidadePendencias).toBe(quantidade);
  expect(consulta.pendencias).toHaveLength(quantidade);
  expect(consulta.pendencias.every(({ estado }) => estado === 'pendente')).toBe(true);
});

it('inclui exclusões lógicas com o tipo da operação', async () => {
  inserirReceitas(banco, 1);
  banco.sqlite.exec("UPDATE receitas SET excluido_em = '2026-11-26'");

  const { pendencias } = await syncService.consultar();

  expect(pendencias).toEqual([
    { id: '1', titulo: 'Receita 1', tipo: 'Receita', alteracao: 'Exclusão', estado: 'pendente' },
  ]);
});

it('lê a base local e suspende o envio sem sessão ativa', async () => {
  sair();
  inserirReceitas(banco, 1);
  await syncService.sincronizarAgora();
  expect(enviar).not.toHaveBeenCalled();
  expect((await syncService.consultar()).estado.quantidadePendencias).toBe(1);
  expect(getDb).toHaveBeenCalled();
});

it('preserva a fila offline e retoma sem sair do app após reconectar', async () => {
  inserirReceitas(banco, 1);
  consultarRede.mockResolvedValue({ isConnected: false });
  await syncService.sincronizarAgora();
  expect(enviar).not.toHaveBeenCalled();
  expect((await syncService.consultar()).estado.status).toBe('sem-conexao');

  let mudarRede: (rede: NetworkState) => void = () => {};
  escutarRede.mockImplementation((ouvinte) => {
    mudarRede = ouvinte;
    return { remove: jest.fn() };
  });
  const cancelar = iniciarSincronizacaoAutomatica();
  try {
    await Promise.resolve();
    consultarRede.mockResolvedValue({ isConnected: true });
    enviar.mockImplementation(async () => {
      banco.sqlite.exec("UPDATE receitas SET sync_status = 'sincronizado'");
      return false;
    });
    const concluido = new Promise<void>((resolve) => {
      const tirar = syncService.assinar(() => {
        if (jest.mocked(AsyncStorage.setItem).mock.calls.length === 0) return;
        tirar();
        resolve();
      });
    });
    mudarRede({ isConnected: true });
    await concluido;
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ manual: false }));
    expect(restaurar).toHaveBeenCalledWith({ servidor: true, uidEsperado: 'uc16' });
    const [, data] = jest.mocked(AsyncStorage.setItem).mock.calls[0];
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(data);
    const consulta = await syncService.consultar();
    expect(consulta.estado).toMatchObject({
      status: 'sincronizado', ultimaSincronizacao: data, quantidadePendencias: 0,
    });
  } finally {
    cancelar();
  }
});

it('contabiliza apenas os itens restantes quando o envio cai pela metade', async () => {
  inserirReceitas(banco, 3);
  enviar.mockImplementationOnce(async (opcoes) => {
    banco.sqlite.exec("UPDATE receitas SET sync_status = 'sincronizado' WHERE id = '1'");
    opcoes?.aoFalhar?.({ code: 'unavailable' });
    return false;
  });

  await syncService.sincronizarAgora();

  const consulta = await syncService.consultar();
  expect(consulta.estado).toMatchObject({ status: 'sem-conexao', quantidadePendencias: 2 });
  expect(consulta.pendencias.map(({ id }) => id)).toEqual(['2', '3']);
  expect(restaurar).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it.each([
  ['permission-denied', 'EX03'],
  ['falha-desconhecida', 'EX06'],
])('publica somente o código seguro quando ocorre %s', async (code, codigo) => {
  enviar.mockImplementationOnce(async (opcoes) => {
    opcoes?.aoFalhar?.(Object.assign(new Error('dado privado'), { code }));
    return false;
  });

  await syncService.sincronizarAgora();

  const consulta = await syncService.consultar();
  expect(consulta.estado).toMatchObject({ codigo, status: 'erro' });
  expect(JSON.stringify(consulta)).not.toContain('dado privado');
});

it('distingue falha de restauração e mantém a última data', async () => {
  restaurar.mockRejectedValueOnce(new Error('falha interna'));
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('2026-11-25T12:00:00.000Z');

  await syncService.sincronizarAgora();

  expect((await syncService.consultar()).estado).toMatchObject({
    codigo: 'EX07', ultimaSincronizacao: '2026-11-25T12:00:00.000Z',
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('aguarda um envio em curso sem disparar outra cópia da fila', async () => {
  await Promise.all([syncService.sincronizarAgora(), syncService.sincronizarAgora()]);

  expect(enviar).toHaveBeenCalledTimes(1);
  expect(restaurar).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
});

it('não restaura dados da conta anterior depois que a sessão muda', async () => {
  enviar.mockImplementationOnce(async () => {
    entrar('outra-conta');
    return false;
  });

  await syncService.sincronizarAgora();

  expect(restaurar).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('notifica o fim do ciclo para os resumos e para a fila', async () => {
  const ouvinte = jest.fn();
  const cancelar = syncService.assinar(ouvinte);
  try {
    await syncService.sincronizarAgora();
    expect(ouvinte).toHaveBeenCalledTimes(2);
  } finally {
    cancelar();
  }
  expect(getDbDoDono).toHaveBeenCalledWith('uc16');
});

it('mantém o registro pendente e informa EX04 se a fila não foi esvaziada', async () => {
  inserirReceitas(banco, 1);

  await syncService.sincronizarAgora();

  expect((await syncService.consultar()).estado).toMatchObject({
    codigo: 'EX04', quantidadePendencias: 1,
  });
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('não lê a fila de outra conta se a sessão mudar durante a consulta', async () => {
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(async () => {
    entrar('outra-conta');
    return '2026-11-25T12:00:00.000Z';
  });

  await expect(syncService.consultar()).rejects.toThrow('EX08');
});
