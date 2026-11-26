import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { getDb } from '@/db/database';
import { semearCategoriasPadrao } from '@/features/categorias/service';
import { completarRecorrencias } from '@/features/receitas/service';
import { completarRecorrenciasDespesas } from '@/features/despesas/service';
import { restaurarDaNuvem, sincronizarPendentes } from '@/features/receitas/sync';
import { ouvirBaseAtualizada } from '@/lib/baseAtualizada';

/** Mesma lista de produção; o teste falha se uma rota com SQLite ficar desprotegida. */
const ROTAS_COM_BANCO = [
  'configuracoes-financeiras',
  'saldo-inicial',
  'categorias/index',
  'categorias/nova',
  'categorias/[id]/editar',
  'despesas/index',
  'despesas/nova',
  'despesas/[id]/index',
  'despesas/[id]/editar',
  'receitas/index',
  'receitas/nova',
  'receitas/[id]/index',
  'receitas/[id]/editar',
] as const;

interface EstadoMockNavegador {
  rotaAtiva: string;
  registros: Array<{ nome: string; oculta: boolean }>;
  stackProps: any[];
}

/**
 * Mini-navegador: lê a árvore de declaração sem montar as telas, registra quais
 * estão ocultas pelo guard e só monta a rota ativa quando ela está liberada.
 * Assim, "oculta" não é o mesmo que "renderizada".
 */
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const estado: EstadoMockNavegador = {
    rotaAtiva: 'index',
    registros: [],
    stackProps: [],
  };

  const Screen = (_props: { name: string }) => null;
  const Protected = (_props: { guard: boolean; children?: unknown }) => null;

  function coletar(children: any, oculta: boolean, registros: any[]) {
    React.Children.forEach(children, (child: any) => {
      if (!React.isValidElement(child)) return;

      if (child.type === Protected) {
        coletar(child.props.children, oculta || !child.props.guard, registros);
      } else if (child.type === Screen) {
        registros.push({ nome: child.props.name, oculta });
      }
    });
  }

  const Stack = ({ children, ...props }: any) => {
    estado.stackProps.push(props);

    const registros: any[] = [];
    coletar(children, false, registros);
    estado.registros = registros;

    const ativa = registros.find(
      (r) => r.nome === estado.rotaAtiva && !r.oculta,
    );
    return ativa
      ? React.createElement(Text, { testID: `tela:${ativa.nome}` }, ativa.nome)
      : null;
  };

  Stack.Screen = Screen;
  Stack.Protected = Protected;
  return { Stack, __estadoMock: estado };
});

const estadoNavegador = (
  jest.requireMock('expo-router') as { __estadoMock: EstadoMockNavegador }
).__estadoMock;

jest.mock('@/features/categorias/service', () => ({
  semearCategoriasPadrao: jest.fn(),
}));
jest.mock('@/features/receitas/service', () => ({
  completarRecorrencias: jest.fn(),
}));
jest.mock('@/features/despesas/service', () => ({
  completarRecorrenciasDespesas: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  restaurarDaNuvem: jest.fn(),
  sincronizarPendentes: jest.fn(),
}));
jest.mock('@/features/conta', () =>
  ({ iniciarConta: jest.fn()
}));

const mockGetDb = getDb as jest.Mock;
const mockSemear = semearCategoriasPadrao as jest.Mock;
const mockCompletar = completarRecorrencias as jest.Mock;
const mockCompletarDespesas = completarRecorrenciasDespesas as jest.Mock;
const mockSincronizar = sincronizarPendentes as jest.Mock;
const mockRestaurar = restaurarDaNuvem as jest.Mock;

function adiar<T = unknown>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  return { promessa, resolver, rejeitar };
}

function registro(nome: string) {
  return estadoNavegador.registros.find((r) => r.nome === nome);
}

function todasOcultas() {
  return estadoNavegador.registros
    .filter((r) => r.nome !== 'index')
    .every((r) => r.oculta);
}

let aviso: jest.SpyInstance;

describe('Layout raiz: gate de inicialização', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetDb.mockReset();
    mockSemear.mockReset();
    mockCompletar.mockReset();
    mockCompletarDespesas.mockReset();
    mockRestaurar.mockReset();
    mockSincronizar.mockReset();

    mockGetDb.mockResolvedValue({});
    mockSemear.mockResolvedValue({ criadas: [], conflitos: [] });
    mockCompletar.mockResolvedValue(undefined);
    mockCompletarDespesas.mockResolvedValue(undefined);
    mockRestaurar.mockResolvedValue({ receitas: 0, despesas: 0, recorrencias: 0 });
    mockSincronizar.mockResolvedValue(false);

    estadoNavegador.rotaAtiva = 'index';
    estadoNavegador.registros = [];
    estadoNavegador.stackProps = [];

    aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await cleanup();
    aviso.mockRestore();
  });

  // ---------------------------------------------------------------- Stack

  it('monta o Stack desde a primeira renderização, antes de getDb terminar', async () => {
    const banco = adiar();
    mockGetDb.mockReturnValue(banco.promessa);

    await render(<RootLayout />);

    expect(estadoNavegador.stackProps).toContainEqual(
      expect.objectContaining({ screenOptions: { headerShown: false } }),
    );
    expect(screen.getByText('Preparando seus dados locais…')).toBeTruthy();

    banco.resolver({});
    await waitFor(() =>
      expect(screen.queryByText('Preparando seus dados locais…')).toBeNull(),
    );
  });

  // ---------------------------------------------------------------- guard

  it('mantém a Home montada atrás da camada bloqueante durante a preparação', async () => {
    mockGetDb.mockReturnValue(adiar().promessa);

    await render(<RootLayout />);

    expect(
      screen.getByTestId('tela:index', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText('Preparando seus dados locais…')).toBeTruthy();
  });

  it('mantém o guard falso enquanto getDb está pendente', async () => {
    mockGetDb.mockReturnValue(adiar().promessa);

    await render(<RootLayout />);

    expect(registro('index')?.oculta).toBe(false);
    for (const rota of ROTAS_COM_BANCO) {
      expect(registro(rota)?.oculta).toBe(true);
    }
    expect(mockSemear).not.toHaveBeenCalled();
  });

  it('mantém o guard falso enquanto a semeadura está pendente', async () => {
    const semeadura = adiar();
    mockSemear.mockReturnValue(semeadura.promessa);

    await render(<RootLayout />);

    await waitFor(() => expect(mockSemear).toHaveBeenCalledTimes(1));
    expect(todasOcultas()).toBe(true);

    semeadura.resolver({ criadas: [], conflitos: [] });
    await waitFor(() => expect(todasOcultas()).toBe(false));
  });

  it('só libera o guard depois de getDb e da semeadura', async () => {
    const banco = adiar();
    const semeadura = adiar();
    mockGetDb.mockReturnValue(banco.promessa);
    mockSemear.mockReturnValue(semeadura.promessa);

    await render(<RootLayout />);
    expect(todasOcultas()).toBe(true);

    banco.resolver({});
    await waitFor(() => expect(mockSemear).toHaveBeenCalledTimes(1));
    expect(todasOcultas()).toBe(true);

    semeadura.resolver({ criadas: [], conflitos: [] });
    await waitFor(() => expect(todasOcultas()).toBe(false));
  });

  it('executa getDb, semeadura e liberação nesta ordem', async () => {
    const ordem: string[] = [];
    mockGetDb.mockImplementation(async () => {
      ordem.push('getDb');
      return {};
    });
    mockSemear.mockImplementation(async () => {
      ordem.push('semear');
      return { criadas: [], conflitos: [] };
    });
    mockCompletar.mockImplementation(async () => {
      ordem.push('receitas');
    });
    mockCompletarDespesas.mockImplementation(async () => {
      ordem.push('despesas');
    });
    mockSincronizar.mockImplementation(async () => {
      ordem.push('sincronizar');
      return false;
    });

    await render(<RootLayout />);

    await waitFor(() => expect(mockSincronizar).toHaveBeenCalledTimes(1));
    expect(ordem).toEqual(['getDb', 'semear', 'receitas', 'despesas', 'sincronizar']);
    expect(todasOcultas()).toBe(false);
  });

  // ---------------------------------------------------------------- falhas

  it('mantém as rotas protegidas quando getDb falha', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('falha no banco'));

    await render(<RootLayout />);

    await waitFor(() =>
      expect(screen.getByText('Não foi possível preparar os dados locais.')).toBeTruthy(),
    );
    expect(todasOcultas()).toBe(true);
    expect(mockSemear).not.toHaveBeenCalled();
  });

  it('mantém as rotas protegidas quando a semeadura falha', async () => {
    mockSemear.mockRejectedValueOnce(new Error('falha na semeadura'));

    await render(<RootLayout />);

    await waitFor(() =>
      expect(screen.getByText('Não foi possível preparar os dados locais.')).toBeTruthy(),
    );
    expect(todasOcultas()).toBe(true);
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(mockSincronizar).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- retry

  it('permite tentar novamente depois de falha em getDb', async () => {
    mockGetDb
      .mockRejectedValueOnce(new Error('falha no banco'))
      .mockResolvedValueOnce({});

    await render(<RootLayout />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.queryByText('Não foi possível preparar os dados locais.')).toBeNull(),
    );
    expect(mockGetDb).toHaveBeenCalledTimes(2);
    expect(mockSemear).toHaveBeenCalledTimes(1);
    expect(todasOcultas()).toBe(false);
  });

  it('permite tentar novamente depois de falha na semeadura', async () => {
    mockSemear
      .mockRejectedValueOnce(new Error('falha na semeadura'))
      .mockResolvedValueOnce({ criadas: [], conflitos: [] });

    await render(<RootLayout />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy(),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() =>
      expect(screen.queryByText('Não foi possível preparar os dados locais.')).toBeNull(),
    );
    expect(mockGetDb).toHaveBeenCalledTimes(2);
    expect(mockSemear).toHaveBeenCalledTimes(2);
    expect(todasOcultas()).toBe(false);
  });

  it('não duplica a preparação em tentativas concorrentes', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('falha inicial'));

    await render(<RootLayout />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy(),
    );

    const retry = adiar();
    mockGetDb.mockReturnValue(retry.promessa);

    const botao = screen.getByRole('button', { name: 'Tentar novamente' });
    await act(async () => {
      botao.props.onClick();
      botao.props.onClick();
    });

    expect(mockGetDb).toHaveBeenCalledTimes(2);

    retry.resolver({});
    await waitFor(() =>
      expect(screen.queryByText('Não foi possível preparar os dados locais.')).toBeNull(),
    );
    expect(mockSemear).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------- rotinas

  it('não inicia as rotinas posteriores antes da preparação', async () => {
    const banco = adiar();
    const semeadura = adiar();
    mockGetDb.mockReturnValue(banco.promessa);
    mockSemear.mockReturnValue(semeadura.promessa);

    await render(<RootLayout />);

    expect(mockCompletar).not.toHaveBeenCalled();
    expect(mockCompletarDespesas).not.toHaveBeenCalled();
    expect(mockRestaurar).not.toHaveBeenCalled();
    expect(mockSincronizar).not.toHaveBeenCalled();

    banco.resolver({});
    await waitFor(() => expect(mockSemear).toHaveBeenCalledTimes(1));
    expect(mockCompletar).not.toHaveBeenCalled();

    semeadura.resolver({ criadas: [], conflitos: [] });
    await waitFor(() => expect(mockRestaurar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockSincronizar).toHaveBeenCalledTimes(1));
  });

  it('não bloqueia a navegação enquanto uma rotina posterior está pendente', async () => {
    const receitas = adiar();
    mockCompletar.mockReturnValue(receitas.promessa);

    await render(<RootLayout />);

    await waitFor(() => expect(mockCompletar).toHaveBeenCalledTimes(1));
    expect(estadoNavegador.stackProps.length).toBeGreaterThan(0);
    expect(todasOcultas()).toBe(false);
    expect(screen.queryByText('Preparando seus dados locais…')).toBeNull();

    receitas.resolver(undefined);
    await waitFor(() => expect(mockSincronizar).toHaveBeenCalledTimes(1));
  });

  it('registra falhas das rotinas e ainda executa as seguintes', async () => {
    const erroReceitas = new Error('falha nas receitas');
    const erroDespesas = new Error('falha nas despesas');
    const erroRestauracao = new Error('falha na restauração');
    mockCompletar.mockRejectedValue(erroReceitas);
    mockCompletarDespesas.mockRejectedValue(erroDespesas);
    mockRestaurar.mockRejectedValue(erroRestauracao);

    await render(<RootLayout />);

    await waitFor(() => expect(mockSincronizar).toHaveBeenCalledTimes(1));
    expect(mockCompletarDespesas).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith(
      expect.stringContaining('receitas'),
      erroReceitas,
    );
    expect(aviso).toHaveBeenCalledWith(
      expect.stringContaining('despesas'),
      erroDespesas,
    );
    expect(aviso).toHaveBeenCalledWith(
      expect.stringContaining('restaurar'),
      erroRestauracao,
    );
    expect(estadoNavegador.stackProps.length).toBeGreaterThan(0);
    expect(todasOcultas()).toBe(false);
  });

  it('executa só uma vez por abertura, mesmo se o layout renderizar de novo', async () => {
    const { rerender } = await render(<RootLayout />);

    await waitFor(() => expect(mockSincronizar).toHaveBeenCalledTimes(1));
    await rerender(<RootLayout />);

    await waitFor(() => expect(estadoNavegador.stackProps.length).toBeGreaterThan(1));
    expect(mockGetDb).toHaveBeenCalledTimes(1);
    expect(mockSemear).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockRestaurar).toHaveBeenCalledTimes(1);
    expect(mockSincronizar).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------- rotas

  it('protege as rotas com SQLite e mantém a Home fora do guard', async () => {
    mockGetDb.mockReturnValue(adiar().promessa);
    estadoNavegador.rotaAtiva = 'despesas/index';

    await render(<RootLayout />);

    expect(estadoNavegador.registros).toHaveLength(ROTAS_COM_BANCO.length + 1);
    expect(registro('index')).toEqual({ nome: 'index', oculta: false });
    for (const rota of ROTAS_COM_BANCO) {
      expect(registro(rota)).toEqual({ nome: rota, oculta: true });
    }
    expect(screen.queryByTestId('tela:despesas/index')).toBeNull();
  });

  it('monta a rota ativa somente depois da liberação do guard', async () => {
    const banco = adiar();
    mockGetDb.mockReturnValue(banco.promessa);
    estadoNavegador.rotaAtiva = 'despesas/index';

    await render(<RootLayout />);
    expect(screen.queryByTestId('tela:despesas/index')).toBeNull();

    banco.resolver({});
    await waitFor(() =>
      expect(screen.getByTestId('tela:despesas/index')).toBeTruthy(),
    );
  });

  // ---------------------------------------------------------------- sinal para a Home (UC03)

  describe('sinal de base atualizada', () => {
    let sinais: number;
    let parar: () => void;

    beforeEach(() => {
      sinais = 0;
      parar = ouvirBaseAtualizada(() => {
        sinais += 1;
      });
    });
    afterEach(() => parar());

    it('avisa ao liberar o guard e de novo ao terminar as rotinas posteriores', async () => {
      const restauracao = adiar();
      mockRestaurar.mockReturnValue(restauracao.promessa);

      await render(<RootLayout />);

      await waitFor(() => expect(sinais).toBe(1));
      expect(todasOcultas()).toBe(false);
      expect(mockSincronizar).not.toHaveBeenCalled();

      restauracao.resolver({ receitas: 3, despesas: 1, recorrencias: 0 });
      await waitFor(() => expect(sinais).toBe(2));
      expect(mockSincronizar).toHaveBeenCalledTimes(1);
    });

    it('avisa ao terminar as rotinas mesmo quando alguma delas falha', async () => {
      mockRestaurar.mockRejectedValue(new Error('sem rede'));

      await render(<RootLayout />);

      await waitFor(() => expect(sinais).toBe(2));
    });

    it('não avisa enquanto a preparação falha, e avisa quando o "Tentar novamente" dá certo', async () => {
      mockGetDb.mockRejectedValueOnce(new Error('falha ao abrir'));

      await render(<RootLayout />);

      expect(await screen.findByText('Não foi possível preparar os dados locais.')).toBeTruthy();
      expect(sinais).toBe(0);

      await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
      await waitFor(() => expect(sinais).toBeGreaterThanOrEqual(1));
    });
  });
});
