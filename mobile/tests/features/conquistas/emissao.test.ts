import { getDb } from '@/db/database';
import { DDL_CONQUISTAS_EMITIDAS, DDL_PREFERENCIAS_LOCAIS } from '@/db/schema';
import { avaliarEEmitir } from '@/features/conquistas/emissao';
import { criarEmissorSimulado } from '@/features/conquistas/emissor';
import type { FonteMetas, MetaConcluida } from '@/features/conquistas/types';
import { criarPermissaoSimulada } from '@/features/notificacoes/permissao.simulada';
import type { EstadoPermissao, NotificationPreferences } from '@/features/notificacoes/types';
import { excluirReceita, registrarReceita } from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../../helpers/fakeDb';
import { input } from '../../helpers/dados';

jest.mock('@/lib/firebase', () => ({
  get auth() {
    throw new Error('Conquistas não podem consultar a sessão do Firebase (RN06)');
  },
  get db() {
    throw new Error('Conquistas não podem depender do Firestore (RN06)');
  },
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

let banco: BancoFalso;
let metas: MetaConcluida[];
let alertaLigado: boolean;
let emissor: ReturnType<typeof criarEmissorSimulado>;
let permissao: ReturnType<typeof criarPermissaoSimulada>;
let dono: string;
let aoLerMetas: () => void;

const fonte: FonteMetas = {
  concluidas: async () => {
    aoLerMetas();
    return metas;
  },
};
const preferencias: NotificationPreferences = {
  donoAtual: () => ({ uid: dono }),
  isEnabled: async (t) => t === 'conquistas' && alertaLigado,
  listar: async () => ({ limite: false, conquistas: alertaLigado }),
  definir: async () => {},
};

const rodar = () => avaliarEEmitir({ fonte, preferencias, permissao, emissor });
const titulos = () => emissor.emitidas.map((n) => n.titulo);
const status = () =>
  banco.sqlite.prepare('SELECT chave, status FROM conquistas_emitidas ORDER BY chave').all() as { chave: string; status: string }[];
const verde = (data: string) => registrarReceita(input({ data, valorCentavos: 1000 }));

function preparar(estadoPermissao: EstadoPermissao = 'concedida') {
  banco = instalarBanco();
  banco.sqlite.exec(DDL_PREFERENCIAS_LOCAIS + DDL_CONQUISTAS_EMITIDAS);
  metas = [];
  alertaLigado = true;
  emissor = criarEmissorSimulado();
  permissao = criarPermissaoSimulada(estadoPermissao);
  dono = 'local';
  aoLerMetas = () => {};
}

beforeEach(() => {
  preparar();
  fixarHoje('2026-11-20');
});
afterEach(restaurarTempo);

describe('avaliarEEmitir (UC13, RF46)', () => {
  it('primeira avaliação registra o histórico sem notificar (FR-009a)', async () => {
    await verde('2026-09-05');
    await verde('2026-10-05');
    await rodar();

    expect(emissor.emitidas).toEqual([]);
    expect(status()).toEqual([
      { chave: 'no-verde:2026-09', status: 'emitida' },
      { chave: 'no-verde:2026-10', status: 'emitida' },
    ]);
  });

  it('selo novo depois da linha de base notifica uma vez, com nome e frase do marco', async () => {
    await rodar();
    await verde('2026-10-05');
    await rodar();
    await rodar();

    expect(emissor.emitidas).toEqual([
      { titulo: 'Novo selo: No verde em outubro', corpo: 'Você fechou outubro com saldo positivo. Toque para ver.', rota: '/conquistas' },
    ]);
  });

  it('alerta desligado: selo registrado sem notificação, e não notifica depois ao ligar (FA04)', async () => {
    await rodar();
    alertaLigado = false;
    await verde('2026-10-05');
    await rodar();
    alertaLigado = true;
    await rodar();

    expect(emissor.emitidas).toEqual([]);
    expect(status()).toEqual([{ chave: 'no-verde:2026-10', status: 'emitida' }]);
  });

  it('vários selos na mesma operação geram uma notificação cada (FA05)', async () => {
    await rodar();
    await verde('2026-10-05');
    metas = [{ id: 'm', titulo: 'Reserva', concluidaEm: '2026-11-10' }];
    await rodar();

    expect(titulos().sort()).toEqual(['Novo selo: No verde em outubro', 'Novo selo: Primeira meta concluída']);
  });

  it('falha na emissão fica pendente e é tentada de novo (EX02)', async () => {
    await rodar();
    await verde('2026-10-05');
    emissor.falharProxima();
    await rodar();
    expect(status()).toEqual([{ chave: 'no-verde:2026-10', status: 'pendente' }]);

    await rodar();
    expect(titulos()).toEqual(['Novo selo: No verde em outubro']);
    expect(status()).toEqual([{ chave: 'no-verde:2026-10', status: 'emitida' }]);
  });

  it('permissão negada deixa a emissão pendente', async () => {
    preparar('negada');
    await rodar();
    await verde('2026-10-05');
    await rodar();

    expect(emissor.emitidas).toEqual([]);
    expect(status()).toEqual([{ chave: 'no-verde:2026-10', status: 'pendente' }]);
  });

  it('selo que some e volta não é notificado de novo (FR-007a)', async () => {
    await rodar();
    await verde('2026-10-05');
    await rodar();
    await excluirReceita(banco.receitas()[0].id);
    await rodar();
    await verde('2026-10-06');
    await rodar();

    expect(titulos()).toEqual(['Novo selo: No verde em outubro']);
  });

  it('chamadas simultâneas não duplicam (SC-002)', async () => {
    await rodar();
    await verde('2026-10-05');
    await Promise.all([rodar(), rodar(), rodar()]);

    expect(titulos()).toEqual(['Novo selo: No verde em outubro']);
  });

  it('falha da base não lança e nada é gravado pela metade (EX01)', async () => {
    (getDb as jest.Mock).mockRejectedValueOnce(new Error('disco'));
    await expect(rodar()).resolves.toBeUndefined();
    expect(status()).toEqual([]);
  });

  it('agendamento não se repete quando a gravação da emissão falha (FA05, EX02)', async () => {
    await rodar();
    await verde('2026-10-05');
    banco.falharNaOperacao(1);
    await rodar();
    expect(emissor.emitidas).toEqual([]);

    await rodar();
    await rodar();
    expect(titulos()).toEqual(['Novo selo: No verde em outubro']);
    expect(status()).toEqual([{ chave: 'no-verde:2026-10', status: 'emitida' }]);
  });

  describe('isolamento por conta (RNF03)', () => {
    it('lê, grava e consulta a preferência na base do dono capturado no início', async () => {
      const abrirBase = jest.fn(async () => getDb());
      const isEnabled = jest.spyOn(preferencias, 'isEnabled');
      dono = 'conta-a';
      await avaliarEEmitir({ fonte, preferencias, permissao, emissor, abrirBase });
      await verde('2026-10-05');
      await avaliarEEmitir({ fonte, preferencias, permissao, emissor, abrirBase });

      expect(abrirBase.mock.calls).toEqual([[{ uid: 'conta-a' }], [{ uid: 'conta-a' }]]);
      expect(isEnabled).toHaveBeenCalledWith('conquistas', { uid: 'conta-a' });
      expect(titulos()).toEqual(['Novo selo: No verde em outubro']);
      isEnabled.mockRestore();
    });

    it('troca de conta durante a avaliação não grava nem notifica para a conta anterior', async () => {
      await rodar();
      await verde('2026-10-05');
      aoLerMetas = () => {
        dono = 'conta-b';
      };
      await rodar();

      expect(emissor.emitidas).toEqual([]);
      expect(status()).toEqual([]);
    });

    it('troca de conta na primeira avaliação não grava a linha de base', async () => {
      await verde('2026-10-05');
      aoLerMetas = () => {
        dono = 'conta-b';
      };
      await rodar();

      expect(status()).toEqual([]);
      expect(banco.sqlite.prepare("SELECT COUNT(*) AS n FROM preferencias_locais WHERE chave = 'conquistas_linha_base'").get()).toEqual({ n: 0 });
    });
  });
});
