import { act, render, screen, waitFor } from '@testing-library/react-native';
import ListaReceitas from '@/app/receitas/index';
import { listarReceitas } from '@/features/receitas/service';
import { contarPendentes } from '@/features/receitas/pendencias';
import {
  consumirAcessoNegado,
  FalhaLeituraCatalogoSincronizacao,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { setFeedback } from '@/lib/feedback';
import { MSG } from '@/features/receitas/validation';
import { receitaLinha } from '../../helpers/dados';

let mockSairFoco: (() => void) | null = null;

jest.mock('expo-router', () => {
  const React = require('react');
  const base = require('../../helpers/expoRouterMock');

  return {
    ...base,
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = cb();
        mockSairFoco = typeof cleanup === 'function' ? cleanup : null;
        return () => {
          mockSairFoco = null;
          if (typeof cleanup === 'function') cleanup();
        };
      }, [cb]);
    },
  };
});

function adiar<T = unknown>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: unknown) => void;
  const promessa = new Promise<T>((resolve, reject) => {
    resolver = resolve;
    rejeitar = reject;
  });
  return { promessa, resolver, rejeitar };
}

function sairDoFoco() {
  const cleanup = mockSairFoco;
  mockSairFoco = null;
  cleanup?.();
}
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  listarReceitas: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
  FalhaLeituraCatalogoSincronizacao: class FalhaLeituraCatalogoSincronizacao extends Error {},
}));
jest.mock('@/features/receitas/pendencias', () => ({ contarPendentes: jest.fn().mockResolvedValue(0) }));

const listar = listarReceitas as jest.Mock;

describe('Lista de receitas: sincronização ao abrir (EX05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSairFoco = null;
    (contarPendentes as jest.Mock).mockResolvedValue(0);
    (sincronizarPendentes as jest.Mock).mockResolvedValue(false);
    (consumirAcessoNegado as jest.Mock).mockReturnValue(false);
    listar.mockResolvedValue({ itens: [receitaLinha()], total: 15000 });
  });

  it('se a sincronização atualizou algo a partir da nuvem, a lista é recarregada', async () => {
    (sincronizarPendentes as jest.Mock).mockResolvedValueOnce(true);
    await render(<ListaReceitas />);
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('sem mudanças vindas da nuvem, a lista é carregada uma única vez', async () => {
    await render(<ListaReceitas />);
    await screen.findByText('Freela de design');
    await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('o cabeçalho usa o singular com um registro pendente', async () => {
    (contarPendentes as jest.Mock).mockResolvedValue(1);
    await render(<ListaReceitas />);
    expect(await screen.findByText(/\b1 pendente\b/)).toBeTruthy();
  });

  describe('rejeições e perda de foco', () => {
    it('FalhaLeituraCatalogoSincronizacao: warning, lista preservada e pendências atualizadas', async () => {
      const erroCatalogo = new FalhaLeituraCatalogoSincronizacao(
        'falha simulada no catálogo',
      );
      (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(erroCatalogo);
      (contarPendentes as jest.Mock).mockClear();

      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await render(<ListaReceitas />);

        expect(await screen.findByText('Freela de design')).toBeTruthy();
        await waitFor(() =>
          expect(warn).toHaveBeenCalledWith(
            expect.stringMatching(/catálogo/i),
            erroCatalogo,
          ),
        );
        expect(error).not.toHaveBeenCalled();
        expect(
          screen.queryByText(new RegExp(MSG.acessoNegado.slice(0, 20))),
        ).toBeNull();
        await waitFor(() =>
          expect(contarPendentes).toHaveBeenCalledTimes(2),
        );
      } finally {
        warn.mockRestore();
        error.mockRestore();
      }
    });

    it('rejeição inesperada: registra console.error e mantém a lista', async () => {
      const erro = new Error('falha inesperada de sincronização');
      (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(erro);
      (contarPendentes as jest.Mock).mockClear();

      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await render(<ListaReceitas />);

        expect(await screen.findByText('Freela de design')).toBeTruthy();
        await waitFor(() =>
          expect(error).toHaveBeenCalledWith(
            expect.stringMatching(/inesperada/i),
            erro,
          ),
        );
        expect(warn).not.toHaveBeenCalled();
        expect(
          screen.queryByText(new RegExp(MSG.acessoNegado.slice(0, 20))),
        ).toBeNull();
        await waitFor(() =>
          expect(contarPendentes).toHaveBeenCalledTimes(2),
        );
      } finally {
        warn.mockRestore();
        error.mockRestore();
      }
    });

    it('acesso negado real anterior à rejeição mantém a mensagem e os dados', async () => {
      (consumirAcessoNegado as jest.Mock).mockReturnValue(true);
      (sincronizarPendentes as jest.Mock).mockRejectedValueOnce(
        new Error('falha inesperada'),
      );

      const error = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await render(<ListaReceitas />);

        expect(
          await screen.findByText(
            new RegExp(MSG.acessoNegado.slice(0, 30)),
          ),
        ).toBeTruthy();
        expect(screen.getByText('Freela de design')).toBeTruthy();
        expect(error).toHaveBeenCalled();
        expect(contarPendentes).toHaveBeenCalled();
      } finally {
        error.mockRestore();
      }
    });

    it('resultado tardio após blur não recarrega, não mostra feedback nem consome acesso', async () => {
      setFeedback({ tipo: 'sucesso', texto: 'Feedback inicial' });
      (consumirAcessoNegado as jest.Mock).mockReturnValue(true);
      (contarPendentes as jest.Mock).mockClear();

      const adiado = adiar<boolean>();
      (sincronizarPendentes as jest.Mock).mockReturnValue(adiado.promessa);

      await render(<ListaReceitas />);
      expect(await screen.findByText('Freela de design')).toBeTruthy();
      expect(await screen.findByText(/Feedback inicial/)).toBeTruthy();
      expect(listar).toHaveBeenCalledTimes(1);
      expect(contarPendentes).toHaveBeenCalledTimes(1);

      sairDoFoco();

      await act(async () => {
        adiado.resolver(true);
      });

      expect(listar).toHaveBeenCalledTimes(1);
      expect(contarPendentes).toHaveBeenCalledTimes(1);
      expect(consumirAcessoNegado).not.toHaveBeenCalled();
      expect(screen.getByText(/Feedback inicial/)).toBeTruthy();
      expect(
        screen.queryByText(new RegExp(MSG.acessoNegado.slice(0, 20))),
      ).toBeNull();
    });

    it('sucesso com mudou=false preserva somente a recarga inicial', async () => {
      (sincronizarPendentes as jest.Mock).mockResolvedValue(false);

      await render(<ListaReceitas />);

      expect(await screen.findByText('Freela de design')).toBeTruthy();
      await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
      expect(listar).toHaveBeenCalledTimes(1);
    });

    it('sucesso com mudou=true preserva exatamente uma recarga adicional', async () => {
      (sincronizarPendentes as jest.Mock).mockResolvedValue(true);

      await render(<ListaReceitas />);

      await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(sincronizarPendentes).toHaveBeenCalled());
      expect(listar).toHaveBeenCalledTimes(2);
    });
  });
});
