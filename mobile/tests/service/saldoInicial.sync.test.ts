import { doc, runTransaction } from 'firebase/firestore';

import { getDb } from '../../src/db/database';
import { auth } from '../../src/lib/firebase';
import { consultarSaldoInicial } from '../../src/features/saldoInicial/repository';
import { sincronizarSaldoInicial } from '../../src/features/saldoInicial/sync';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock('../../src/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock(
  '../../src/features/saldoInicial/repository',
  () => ({
    consultarSaldoInicial: jest.fn(),
  }),
);

const UID = 'usuario-1';

const saldo = {
  uid: UID,
  valor_centavos: -15000,
  mes_referencia: '2026-11',
  sync_status: 'pendente',
  atualizado_em: '2026-11-25T12:00:00.000Z',
};

const sessao = auth as unknown as {
  currentUser: {
    uid: string;
    emailVerified: boolean;
  } | null;
};

const executar = getDb as jest.Mock;
const consultar = consultarSaldoInicial as jest.Mock;
const documento = doc as jest.Mock;
const transacao = runTransaction as jest.Mock;

const atualizarLocal = jest.fn();
const gravarRemoto = jest.fn();
const consultarRemoto = jest.fn();
const autorizado = jest.fn();

describe('UC08 — sincronização do saldo inicial', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    sessao.currentUser = {
      uid: UID,
      emailVerified: true,
    };

    autorizado.mockReturnValue(true);

    executar.mockResolvedValue({
      runAsync: atualizarLocal,
    });

    consultar.mockResolvedValue({ ...saldo });

    atualizarLocal.mockResolvedValue({
      changes: 1,
    });

    documento.mockReturnValue({ id: 'atual' });

    consultarRemoto.mockResolvedValue({
      exists: () => false,
    });

    transacao.mockImplementation(
      async (_db, callback) =>
        callback({
          get: consultarRemoto,
          set: gravarRemoto,
        }),
    );
  });

  it('não envia sem autenticação', async () => {
    sessao.currentUser = null;

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('nao_autorizado');

    expect(executar).not.toHaveBeenCalled();
    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia com e-mail não confirmado', async () => {
    sessao.currentUser = {
      uid: UID,
      emailVerified: false,
    };

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('nao_autorizado');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia sem autorização', async () => {
    autorizado.mockReturnValue(false);

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('nao_autorizado');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia dados de outro usuário', async () => {
    expect(
      await sincronizarSaldoInicial(
        'usuario-2',
        autorizado,
      ),
    ).toBe('nao_autorizado');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia o perfil local provisório', async () => {
    sessao.currentUser = {
      uid: 'local',
      emailVerified: true,
    };

    expect(
      await sincronizarSaldoInicial(
        'local',
        autorizado,
      ),
    ).toBe('nao_autorizado');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia quando não existe saldo', async () => {
    consultar.mockResolvedValue(null);

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('sem_pendencia');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não reenvia saldo já sincronizado', async () => {
    consultar.mockResolvedValue({
      ...saldo,
      sync_status: 'sincronizado',
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('sem_pendencia');

    expect(transacao).not.toHaveBeenCalled();
  });

  it.each([-15000, 0, 15000])(
    'sincroniza saldo válido de %s centavos',
    async (valor) => {
      consultar.mockResolvedValue({
        ...saldo,
        valor_centavos: valor,
      });

      expect(
        await sincronizarSaldoInicial(
          UID,
          autorizado,
        ),
      ).toBe('sincronizado');

      expect(documento).toHaveBeenCalledWith(
        expect.anything(),
        'usuarios',
        UID,
        'saldo_inicial',
        'atual',
      );

      expect(gravarRemoto).toHaveBeenCalledWith(
        { id: 'atual' },
        {
          valor_centavos: valor,
          mes_referencia: saldo.mes_referencia,
          atualizado_em: saldo.atualizado_em,
        },
      );

      expect(atualizarLocal).toHaveBeenCalledWith(
        expect.stringContaining(
          "SET sync_status = 'sincronizado'",
        ),
        [
          UID,
          saldo.atualizado_em,
          valor,
          saldo.mes_referencia,
        ],
      );
    },
  );

  it('mantém pendente quando não há conexão', async () => {
    transacao.mockRejectedValue(
      new Error('Sem conexão'),
    );

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('mantém pendente quando o Firebase nega acesso', async () => {
    transacao.mockRejectedValue({
      code: 'permission-denied',
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('não sobrescreve saldo remoto mais recente', async () => {
    consultarRemoto.mockResolvedValue({
      exists: () => true,
      data: () => ({
        valor_centavos: 50000,
        mes_referencia: '2026-11',
        atualizado_em: '2026-11-26T12:00:00.000Z',
      }),
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('conflito');

    expect(gravarRemoto).not.toHaveBeenCalled();
    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('envia quando o saldo local é mais recente', async () => {
    consultarRemoto.mockResolvedValue({
      exists: () => true,
      data: () => ({
        valor_centavos: 50000,
        mes_referencia: '2026-11',
        atualizado_em: '2026-11-24T12:00:00.000Z',
      }),
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('sincronizado');

    expect(gravarRemoto).toHaveBeenCalledTimes(1);
    expect(atualizarLocal).toHaveBeenCalledTimes(1);
  });

  it('reconhece saldo remoto idêntico sem regravar', async () => {
    consultarRemoto.mockResolvedValue({
      exists: () => true,
      data: () => ({
        valor_centavos: saldo.valor_centavos,
        mes_referencia: saldo.mes_referencia,
        atualizado_em: saldo.atualizado_em,
      }),
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('sincronizado');

    expect(gravarRemoto).not.toHaveBeenCalled();
    expect(atualizarLocal).toHaveBeenCalledTimes(1);
  });

  it('detecta conflito com mesma data e valores diferentes', async () => {
    consultarRemoto.mockResolvedValue({
      exists: () => true,
      data: () => ({
        valor_centavos: 999,
        mes_referencia: saldo.mes_referencia,
        atualizado_em: saldo.atualizado_em,
      }),
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('conflito');

    expect(gravarRemoto).not.toHaveBeenCalled();
    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('mantém pendente se a atualização local não encontrar a versão enviada', async () => {
    atualizarLocal.mockResolvedValue({
      changes: 0,
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');
  });

  it('mantém pendente se a confirmação local falhar', async () => {
    atualizarLocal.mockRejectedValue(
      new Error('Falha no SQLite'),
    );

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');
  });

  it('não envia valor acima do teto', async () => {
    consultar.mockResolvedValue({
      ...saldo,
      valor_centavos: 100_000_000_000,
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('não envia mês inválido', async () => {
    consultar.mockResolvedValue({
      ...saldo,
      mes_referencia: '2026-13',
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(transacao).not.toHaveBeenCalled();
  });

  it('interrompe o envio quando a conta muda', async () => {
    consultarRemoto.mockImplementation(async () => {
      sessao.currentUser = {
        uid: 'usuario-2',
        emailVerified: true,
      };

      return {
        exists: () => false,
      };
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(gravarRemoto).not.toHaveBeenCalled();
    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('interrompe o envio quando a autorização é revogada', async () => {
    consultarRemoto.mockImplementation(async () => {
      autorizado.mockReturnValue(false);

      return {
        exists: () => false,
      };
    });

    expect(
      await sincronizarSaldoInicial(UID, autorizado),
    ).toBe('pendente');

    expect(gravarRemoto).not.toHaveBeenCalled();
    expect(atualizarLocal).not.toHaveBeenCalled();
  });

  it('impede duas sincronizações simultâneas', async () => {
    const primeira = sincronizarSaldoInicial(
      UID,
      autorizado,
    );

    const segunda = await sincronizarSaldoInicial(
      UID,
      autorizado,
    );

    expect(segunda).toBe('em_andamento');
    expect(await primeira).toBe('sincronizado');
    expect(transacao).toHaveBeenCalledTimes(1);
  });
});