import { getDb } from '@/db/database';
import {
  definirEnvioAutomatico,
  restaurarDaNuvem,
  sincronizarEmSegundoPlano,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { criarSincronizacaoDoApp } from '@/features/conta/sync.app';
import type { CodigoErro } from '@/features/conta/types';

jest.mock('@/db/database', () => ({ getDb: jest.fn() }));
jest.mock('@/features/receitas/sync', () => ({
  definirEnvioAutomatico: jest.fn(),
  restaurarDaNuvem: jest.fn(),
  sincronizarEmSegundoPlano: jest.fn(),
  sincronizarPendentes: jest.fn(),
}));

const m = (f: unknown) => f as jest.Mock;

async function codigoDoErro(p: Promise<unknown>): Promise<CodigoErro | 'sem-erro'> {
  try {
    await p;
  } catch (e) {
    return (e as { codigo: CodigoErro }).codigo;
  }
  return 'sem-erro';
}

/** Banco falso: tabelas existentes e contagens por tabela (pendentes e total). */
function bancoFalso(
  opcoes: { pendentes?: Record<string, number>; total?: Record<string, number>; tabelas?: string[] } = {},
) {
  const {
    pendentes = {},
    total = {},
    tabelas = ['receitas', 'despesas', 'recorrencias', 'categorias', 'preferencias'],
  } = opcoes;
  return {
    getAllAsync: jest.fn(async () => tabelas.map((name) => ({ name }))),
    getFirstAsync: jest.fn(async (sql: string) => {
      const tabela = /FROM (\w+)/.exec(sql)![1];
      const mapa = sql.includes("sync_status = 'pendente'") ? pendentes : total;
      return { n: mapa[tabela] ?? 0 };
    }),
    runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  m(sincronizarPendentes).mockResolvedValue(false);
  m(definirEnvioAutomatico).mockResolvedValue(undefined);
  m(restaurarDaNuvem).mockResolvedValue({ receitas: 0, despesas: 0, recorrencias: 0 });
});

describe('marcarTodosComoPendentes (E6)', () => {
  it('marca receitas, despesas e recorrências como pendentes, em uma transação', async () => {
    const banco = bancoFalso();
    m(getDb).mockResolvedValue(banco);
    await criarSincronizacaoDoApp().marcarTodosComoPendentes();
    const sqls = banco.runAsync.mock.calls.map((c) => c[0] as string);
    expect(sqls).toEqual([
      "UPDATE receitas SET sync_status = 'pendente'",
      "UPDATE despesas SET sync_status = 'pendente'",
      "UPDATE recorrencias SET sync_status = 'pendente'",
    ]);
    expect(banco.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('esquema sem a tabela de despesas: marca só as que existem, sem consultar a que não existe', async () => {
    const banco = bancoFalso({ tabelas: ['receitas', 'recorrencias', 'preferencias'] });
    m(getDb).mockResolvedValue(banco);
    await criarSincronizacaoDoApp().marcarTodosComoPendentes();
    expect(banco.runAsync.mock.calls.map((c) => c[0])).toEqual([
      "UPDATE receitas SET sync_status = 'pendente'",
      "UPDATE recorrencias SET sync_status = 'pendente'",
    ]);
  });

  it('não mexe nas categorias (elas ainda não sincronizam)', async () => {
    const banco = bancoFalso();
    m(getDb).mockResolvedValue(banco);
    await criarSincronizacaoDoApp().marcarTodosComoPendentes();
    expect(banco.runAsync.mock.calls.some((c) => String(c[0]).includes('categorias'))).toBe(false);
  });
});

describe('contarPendentes (FA03)', () => {
  it('soma as pendências das três tabelas', async () => {
    m(getDb).mockResolvedValue(bancoFalso({ pendentes: { receitas: 2, despesas: 1, recorrencias: 4 } }));
    expect(await criarSincronizacaoDoApp().contarPendentes()).toBe(7);
  });

  it('esquema sem a tabela de despesas: soma só as que existem e não consulta despesas', async () => {
    const banco = bancoFalso({ tabelas: ['receitas', 'recorrencias'], pendentes: { receitas: 2, recorrencias: 1, despesas: 9 } });
    m(getDb).mockResolvedValue(banco);
    expect(await criarSincronizacaoDoApp().contarPendentes()).toBe(3);
    expect(banco.getFirstAsync.mock.calls.some((c) => String(c[0]).includes('despesas'))).toBe(false);
  });

  it('sem pendências devolve zero', async () => {
    m(getDb).mockResolvedValue(bancoFalso());
    expect(await criarSincronizacaoDoApp().contarPendentes()).toBe(0);
  });
});

describe('sincronizar', () => {
  it('sem pendências sobrando, conclui', async () => {
    m(getDb).mockResolvedValue(bancoFalso());
    await expect(criarSincronizacaoDoApp().sincronizar()).resolves.toBeUndefined();
    expect(sincronizarPendentes).toHaveBeenCalledTimes(1);
  });

  it('FA01: é um envio pedido pela pessoa, então chama o envio como manual', async () => {
    m(getDb).mockResolvedValue(bancoFalso());
    await criarSincronizacaoDoApp().sincronizar();
    expect(sincronizarPendentes).toHaveBeenCalledWith({ manual: true });
  });

  it('EX08: o sincronizarPendentes não lança em falha de rede; pendências que sobram viram erro de conexão', async () => {
    m(getDb).mockResolvedValue(bancoFalso({ pendentes: { receitas: 1 } }));
    expect(await codigoDoErro(criarSincronizacaoDoApp().sincronizar())).toBe('sem-conexao');
  });

  it('erro inesperado do sincronizarPendentes vira ErroConta', async () => {
    m(sincronizarPendentes).mockRejectedValue(new Error('catálogo'));
    m(getDb).mockResolvedValue(bancoFalso());
    expect(await codigoDoErro(criarSincronizacaoDoApp().sincronizar())).toBe('falha');
  });
});

describe('pausar o envio automático (FA01)', () => {
  it('pausarEnvioAutomatico desliga o envio automático', async () => {
    await criarSincronizacaoDoApp().pausarEnvioAutomatico();
    expect(definirEnvioAutomatico).toHaveBeenCalledWith(false);
  });

  it('retomar não libera a pausa: a escolha "Não enviar" vale até a pessoa pedir o envio', async () => {
    await criarSincronizacaoDoApp().retomar('uid-conta-123');
    expect(definirEnvioAutomatico).not.toHaveBeenCalled();
    expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
  });
});

describe('retomar e suspender', () => {
  it('retomar dispara o envio em segundo plano (B4)', async () => {
    await criarSincronizacaoDoApp().retomar('u1');
    expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
  });

  it('suspender não apaga nem altera os dados locais (D2, RN06)', async () => {
    const banco = bancoFalso();
    m(getDb).mockResolvedValue(banco);
    await criarSincronizacaoDoApp().suspender();
    expect(banco.runAsync).not.toHaveBeenCalled();
  });
});

describe('restaurarSeAparelhoVazio (FA02, RNF40)', () => {
  it('aparelho com dados: não restaura', async () => {
    m(getDb).mockResolvedValue(bancoFalso({ total: { despesas: 3 } }));
    await criarSincronizacaoDoApp().restaurarSeAparelhoVazio('u1');
    expect(restaurarDaNuvem).not.toHaveBeenCalled();
  });

  it.each(['receitas', 'despesas', 'recorrencias'])('basta ter dados em %s para não restaurar', async (tabela) => {
    m(getDb).mockResolvedValue(bancoFalso({ total: { [tabela]: 1 } }));
    await criarSincronizacaoDoApp().restaurarSeAparelhoVazio('u1');
    expect(restaurarDaNuvem).not.toHaveBeenCalled();
  });

  it('esquema sem a tabela de despesas: a checagem de aparelho vazio não consulta despesas', async () => {
    const banco = bancoFalso({ tabelas: ['receitas', 'recorrencias'] });
    m(getDb).mockResolvedValue(banco);
    await criarSincronizacaoDoApp().restaurarSeAparelhoVazio('u1');
    expect(restaurarDaNuvem).toHaveBeenCalledTimes(1);
    expect(banco.getFirstAsync.mock.calls.some((c) => String(c[0]).includes('despesas'))).toBe(false);
  });

  it('aparelho vazio: restaura da nuvem', async () => {
    m(getDb).mockResolvedValue(bancoFalso());
    await criarSincronizacaoDoApp().restaurarSeAparelhoVazio('u1');
    expect(restaurarDaNuvem).toHaveBeenCalledTimes(1);
  });

  it('falha na restauração vira ErroConta (os dados locais não mudam: a restauração é transacional)', async () => {
    m(getDb).mockResolvedValue(bancoFalso());
    m(restaurarDaNuvem).mockRejectedValue(new Error('FalhaRestauracao'));
    expect(await codigoDoErro(criarSincronizacaoDoApp().restaurarSeAparelhoVazio('u1'))).toBe('falha');
  });
});
