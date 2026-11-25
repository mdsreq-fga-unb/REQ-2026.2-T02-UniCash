import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getDb } from '@/db/database';

import {
  consultarSaldoInicial,
  salvarSaldoInicial,
} from '@/features/saldoInicial/repository';

import type { SaldoInicial } from '@/features/saldoInicial/repository';

import { useSaldoInicial } from '@/features/saldoInicial/useSaldoInicial';

jest.mock('@/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/features/saldoInicial/repository', () => ({
  consultarSaldoInicial: jest.fn(),
  salvarSaldoInicial: jest.fn(),
}));

const obterBanco = getDb as jest.Mock;
const consultar = consultarSaldoInicial as jest.Mock;
const salvar = salvarSaldoInicial as jest.Mock;

const UID = 'usuario-1';
const banco = {};

const dados = {
  valorCentavos: -15000,
  mesReferencia: '2026-11',
};

function registro(
  extra: Partial<SaldoInicial> = {},
): SaldoInicial {
  return {
    uid: UID,
    valor_centavos: -15000,
    mes_referencia: '2026-11',
    sync_status: 'pendente',
    atualizado_em: '2026-11-01T00:00:00Z',
    ...extra,
  };
}

function adiar<T>() {
  let resolver!: (valor: T) => void;

  const promessa = new Promise<T>((resolve) => {
    resolver = resolve;
  });

  return { promessa, resolver };
}

describe('UC08 — useSaldoInicial', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    obterBanco.mockResolvedValue(banco);
    consultar.mockResolvedValue(null);
    salvar.mockResolvedValue(registro());
  });

  it('consulta o saldo inicial ao montar', async () => {
    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    expect(consultar).toHaveBeenCalledWith(banco, UID);
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('retorna null quando não existe saldo cadastrado', async () => {
    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    expect(result.current.saldo).toBeNull();
    expect(result.current.erro).toBeNull();
    expect(result.current.erroConsulta).toBe(false);
  });

  it('carrega o saldo inicial existente', async () => {
    consultar.mockResolvedValue(registro());

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.saldo).toEqual(registro()),
    );

    expect(result.current.carregando).toBe(false);
  });

  it('mantém o carregamento enquanto a consulta está pendente', async () => {
    const consulta = adiar<SaldoInicial | null>();

    consultar.mockReturnValue(consulta.promessa);

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    expect(result.current.carregando).toBe(true);

    await act(async () => {
      consulta.resolver(registro());
    });

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    expect(result.current.saldo).toEqual(registro());
  });

  it('identifica falha na consulta inicial', async () => {
    consultar.mockRejectedValue(
      new Error('Falha de leitura'),
    );

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    expect(result.current.erroConsulta).toBe(true);
    expect(result.current.erro).toContain('Falha de leitura');
    expect(result.current.saldo).toBeNull();
  });

  it('permite tentar novamente após falha de consulta', async () => {
    consultar
      .mockRejectedValueOnce(new Error('Falha de leitura'))
      .mockResolvedValueOnce(registro());

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.erroConsulta).toBe(true),
    );

    await act(async () => {
      await result.current.carregar();
    });

    expect(result.current.erroConsulta).toBe(false);
    expect(result.current.erro).toBeNull();
    expect(result.current.saldo).toEqual(registro());
  });

  it('salva e atualiza o saldo sem realizar nova consulta', async () => {
    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    await act(async () => {
      expect(await result.current.salvar(dados)).toBe(true);
    });

    expect(salvar).toHaveBeenCalledWith(banco, UID, dados);
    expect(result.current.saldo).toEqual(registro());
    expect(result.current.sucesso).toContain(
      'Sincronização pendente',
    );
    expect(result.current.erro).toBeNull();
    expect(result.current.salvando).toBe(false);
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it('rejeita valor inválido sem executar gravação', async () => {
    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    await act(async () => {
      expect(
        await result.current.salvar({
          ...dados,
          valorCentavos: 10.5,
        }),
      ).toBe(false);
    });

    expect(salvar).not.toHaveBeenCalled();
    expect(result.current.erro).not.toBeNull();
    expect(result.current.sucesso).toBeNull();
  });

  it('rejeita mês inválido sem executar gravação', async () => {
    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    await act(async () => {
      expect(
        await result.current.salvar({
          ...dados,
          mesReferencia: '2026-13',
        }),
      ).toBe(false);
    });

    expect(salvar).not.toHaveBeenCalled();
    expect(result.current.erro).not.toBeNull();
  });

  it('diferencia falha de gravação de falha de consulta', async () => {
    salvar.mockRejectedValue(
      new Error('Falha de gravação'),
    );

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    await act(async () => {
      expect(await result.current.salvar(dados)).toBe(false);
    });

    expect(result.current.erro).toContain('Falha de gravação');
    expect(result.current.erroConsulta).toBe(false);
    expect(result.current.sucesso).toBeNull();
    expect(result.current.salvando).toBe(false);
    expect(result.current.saldo).toBeNull();
  });

  it('preserva o saldo anterior quando a gravação falha', async () => {
    const anterior = registro({
      valor_centavos: 50000,
    });

    consultar.mockResolvedValue(anterior);

    salvar.mockRejectedValue(
      new Error('Falha de gravação'),
    );

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.saldo).toEqual(anterior),
    );

    await act(async () => {
      expect(await result.current.salvar(dados)).toBe(false);
    });

    expect(result.current.saldo).toEqual(anterior);
    expect(result.current.sucesso).toBeNull();
    expect(result.current.erroConsulta).toBe(false);
  });

  it('bloqueia gravações simultâneas', async () => {
    const gravacao = adiar<SaldoInicial>();

    salvar.mockReturnValue(gravacao.promessa);

    const { result } = await renderHook(
      () => useSaldoInicial(UID),
    );

    await waitFor(() =>
      expect(result.current.carregando).toBe(false),
    );

    let primeira!: Promise<boolean>;

    await act(async () => {
      primeira = result.current.salvar(dados);
    });

    expect(result.current.salvando).toBe(true);
    expect(result.current.sucesso).toBeNull();

    await act(async () => {
      expect(await result.current.salvar(dados)).toBe(false);
    });

    expect(salvar).toHaveBeenCalledTimes(1);

    await act(async () => {
      gravacao.resolver(registro());
      expect(await primeira).toBe(true);
    });

    expect(result.current.salvando).toBe(false);
    expect(result.current.saldo).toEqual(registro());
  });
});
