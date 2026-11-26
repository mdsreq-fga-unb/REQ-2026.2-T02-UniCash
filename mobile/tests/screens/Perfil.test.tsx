import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import Perfil from '@/app/perfil';
import { SecaoNotificacoes } from '@/components/perfil/SecaoNotificacoes';
import { MSG_NOTIFICACOES, ROTULOS_ALERTA } from '@/features/notificacoes/mensagens';
import { criarPermissaoSimulada } from '@/features/notificacoes/permissao.simulada';
import type { NotificationPreferences, TipoAlerta } from '@/features/notificacoes/types';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/notificacoes/preferencias', () => ({
  notificationPreferences: {
    donoAtual: () => ({ uid: 'local' }),
    listar: async () => ({ limite: false, conquistas: false }),
    isEnabled: async () => false,
    definir: async () => {},
  },
}));

function preferenciasFalsas(inicial: Record<TipoAlerta, boolean> = { limite: false, conquistas: false }) {
  const valores = { ...inicial };
  const sessao = { uid: 'uA' };
  const prefs = {
    valores,
    sessao,
    donoAtual: jest.fn(() => ({ uid: sessao.uid })),
    listar: jest.fn(async () => ({ ...valores })),
    isEnabled: jest.fn(async (t: TipoAlerta) => valores[t]),
    definir: jest.fn(async (t: TipoAlerta, a: boolean) => {
      valores[t] = a;
    }),
  };
  return prefs satisfies NotificationPreferences;
}

const interruptor = (tipo: TipoAlerta) => screen.getByRole('switch', { name: ROTULOS_ALERTA[tipo] });
const ligado = (tipo: TipoAlerta) => interruptor(tipo).props.accessibilityState?.checked;

async function alternar(tipo: TipoAlerta) {
  await act(async () => {
    fireEvent(interruptor(tipo), 'valueChange', true);
  });
}

describe('UC14 - seção Notificações', () => {
  it('a rota Perfil exibe a seção', async () => {
    await render(<Perfil />);
    expect(await screen.findByText(MSG_NOTIFICACOES.titulo)).toBeTruthy();
    expect(screen.getByText('Usando sem conta')).toBeTruthy();
  });

  describe('US1 - interruptores', () => {
    it('mostra os dois tipos desligados no primeiro uso e nada fora do RF58', async () => {
      await render(<SecaoNotificacoes preferencias={preferenciasFalsas()} permissao={criarPermissaoSimulada('concedida')} />);
      await screen.findByRole('switch', { name: ROTULOS_ALERTA.limite });
      expect(ligado('limite')).toBe(false);
      expect(ligado('conquistas')).toBe(false);
      for (const fora of ['Lembrete diário de registro', 'Aviso de mês sem movimentação', 'Prazos de metas', 'Atividade dos grupos', 'Saldo negativo']) {
        expect(screen.queryByText(new RegExp(fora, 'i'))).toBeNull();
      }
    });

    it('grava antes de ligar o interruptor', async () => {
      const prefs = preferenciasFalsas();
      let liberar!: () => void;
      prefs.definir.mockImplementationOnce(
        (t, a) => new Promise<void>((ok) => { liberar = () => { prefs.valores[t] = a; ok(); }; }),
      );
      await render(<SecaoNotificacoes preferencias={prefs} permissao={criarPermissaoSimulada('concedida')} />);
      await screen.findByRole('switch', { name: ROTULOS_ALERTA.conquistas });
      await alternar('conquistas');
      expect(prefs.definir).toHaveBeenCalledWith('conquistas', true, { uid: 'uA' });
      expect(ligado('conquistas')).toBe(false);
      expect(interruptor('limite').props.accessibilityState?.disabled).toBe(true);
      await act(async () => liberar());
      expect(ligado('conquistas')).toBe(true);
    });

    it('desliga um tipo ligado sem pedir permissão', async () => {
      const prefs = preferenciasFalsas({ limite: true, conquistas: false });
      const permissao = criarPermissaoSimulada('nao-decidida');
      await render(<SecaoNotificacoes preferencias={prefs} permissao={permissao} />);
      await waitFor(() => expect(ligado('limite')).toBe(true));
      await alternar('limite');
      expect(ligado('limite')).toBe(false);
      expect(permissao.chamadas.solicitar).toBe(0);
    });
  });

  describe('US2 - permissão do aparelho', () => {
    it('pede uma única vez e, negada, mantém a escolha e mostra o aviso (FA06, FA07)', async () => {
      const permissao = criarPermissaoSimulada('nao-decidida', 'negada');
      await render(<SecaoNotificacoes preferencias={preferenciasFalsas()} permissao={permissao} />);
      await screen.findByRole('switch', { name: ROTULOS_ALERTA.limite });
      expect(screen.queryByText(MSG_NOTIFICACOES.FA06)).toBeNull();

      await alternar('limite');
      expect(permissao.chamadas.pedidosAoSistema).toBe(1);
      expect(ligado('limite')).toBe(true);
      expect(screen.getByText(MSG_NOTIFICACOES.FA06)).toBeTruthy();

      await alternar('conquistas');
      expect(permissao.chamadas.pedidosAoSistema).toBe(1);

      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: MSG_NOTIFICACOES.abrirConfiguracoes }));
      });
      expect(permissao.chamadas.abrirConfiguracoes).toBe(1);
    });

    it('esconde o aviso com todos desligados', async () => {
      const permissao = criarPermissaoSimulada('negada');
      await render(<SecaoNotificacoes preferencias={preferenciasFalsas({ limite: true, conquistas: false })} permissao={permissao} />);
      expect(await screen.findByText(MSG_NOTIFICACOES.FA06)).toBeTruthy();
      await alternar('limite');
      expect(screen.queryByText(MSG_NOTIFICACOES.FA06)).toBeNull();
    });

    it('relê a permissão ao voltar ao app', async () => {
      const ouvintes: ((s: string) => void)[] = [];
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, f: any) => {
        ouvintes.push(f);
        return { remove: () => {} } as any;
      });
      const permissao = criarPermissaoSimulada('negada');
      await render(<SecaoNotificacoes preferencias={preferenciasFalsas({ limite: true, conquistas: false })} permissao={permissao} />);
      expect(await screen.findByText(MSG_NOTIFICACOES.FA06)).toBeTruthy();
      permissao.definir('concedida');
      await act(async () => ouvintes.forEach((f) => f('active')));
      expect(screen.queryByText(MSG_NOTIFICACOES.FA06)).toBeNull();
    });
  });

  it('troca de conta com o diálogo de permissão aberto não grava na outra conta (RNF03)', async () => {
    const prefs = preferenciasFalsas();
    const permissao = criarPermissaoSimulada('nao-decidida');
    let responder!: () => void;
    permissao.solicitar = jest.fn(
      () => new Promise<'concedida'>((ok) => { responder = () => ok('concedida'); }),
    );
    await render(<SecaoNotificacoes preferencias={prefs} permissao={permissao} />);
    await screen.findByRole('switch', { name: ROTULOS_ALERTA.conquistas });

    await alternar('conquistas'); // iniciado na conta A; o diálogo fica aberto
    prefs.sessao.uid = 'uB'; // a conta muda antes da resposta
    await act(async () => responder());

    expect(prefs.definir).not.toHaveBeenCalled();
    expect(ligado('conquistas')).toBe(false);
  });

  it('grava com o dono capturado ao abrir a seção', async () => {
    const prefs = preferenciasFalsas();
    await render(<SecaoNotificacoes preferencias={prefs} permissao={criarPermissaoSimulada('concedida')} />);
    await screen.findByRole('switch', { name: ROTULOS_ALERTA.limite });
    await alternar('limite');
    expect(prefs.listar).toHaveBeenCalledWith({ uid: 'uA' });
    expect(prefs.definir).toHaveBeenCalledWith('limite', true, { uid: 'uA' });
  });

  describe('US3 - falhas', () => {
    it('EX01: falha ao gravar mantém o estado anterior e informa', async () => {
      const prefs = preferenciasFalsas();
      prefs.definir.mockRejectedValueOnce(new Error('disco'));
      await render(<SecaoNotificacoes preferencias={prefs} permissao={criarPermissaoSimulada('concedida')} />);
      await screen.findByRole('switch', { name: ROTULOS_ALERTA.conquistas });
      await alternar('conquistas');
      expect(ligado('conquistas')).toBe(false);
      expect(screen.getByText(MSG_NOTIFICACOES.EX01)).toBeTruthy();
      await alternar('conquistas');
      expect(ligado('conquistas')).toBe(true);
      expect(screen.queryByText(MSG_NOTIFICACOES.EX01)).toBeNull();
    });

    it('EX02: falha ao ler oferece tentar novamente', async () => {
      const prefs = preferenciasFalsas();
      prefs.listar.mockRejectedValueOnce(new Error('leitura'));
      await render(<SecaoNotificacoes preferencias={prefs} permissao={criarPermissaoSimulada('concedida')} />);
      expect(await screen.findByText(MSG_NOTIFICACOES.EX02)).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: MSG_NOTIFICACOES.tentarNovamente }));
      });
      expect(await screen.findByRole('switch', { name: ROTULOS_ALERTA.limite })).toBeTruthy();
      expect(prefs.listar).toHaveBeenCalledTimes(2);
    });
  });
});
