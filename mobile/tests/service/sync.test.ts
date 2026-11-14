import {
  completarRecorrencias,
  editarReceita,
  excluirReceita,
  registrarReceita,
} from '@/features/receitas/service';
import {
  consumirAcessoNegado,
  FalhaRestauracao,
  restaurarDaNuvem,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

// Firestore em memória: o que está em mockNuvem é o que "está na nuvem".
const mockNuvem = new Map<string, any>();
let mockUsuario: { uid: string } | null = { uid: 'u1' };
let mockRedeFora = false;
let mockCodigoErro = 'unavailable';

jest.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockUsuario;
    },
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  collection: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  getDocs: async (col: any) => {
    if (mockRedeFora) throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
    const docs = [...mockNuvem.entries()]
      .filter(([k]) => k.startsWith(col.path + '/'))
      .map(([k, v]) => ({ id: k.slice(col.path.length + 1), data: () => v }));
    return { docs };
  },
  setDoc: async (ref: any, dados: any) => {
    if (mockRedeFora) throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
    mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
  },
  getDoc: async (ref: any) => {
    if (mockRedeFora) throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
    const d = mockNuvem.get(ref.path);
    return { exists: () => d !== undefined, data: () => d };
  },
  deleteDoc: async (ref: any) => {
    if (mockRedeFora) throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
    mockNuvem.delete(ref.path);
  },
}));

describe('Persistência local e sincronização (RN06, RN07, RF62)', () => {
  let banco: BancoFalso;
  const caminho = (id: string) => `usuarios/u1/receitas/${id}`;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    mockNuvem.clear();
    mockUsuario = { uid: 'u1' };
    mockRedeFora = false;
    mockCodigoErro = 'unavailable';
    consumirAcessoNegado();
  });
  afterEach(restaurarTempo);

  describe('offline e sem conta', () => {
    it('sem conta: tudo funciona localmente e permanece pendente', async () => {
      mockUsuario = null;
      await registrarReceita(input());
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('sem conexão (EX04): a operação já está concluída e o registro fica pendente', async () => {
      mockRedeFora = true;
      await registrarReceita(input());
      await expect(sincronizarPendentes()).resolves.toBe(false); // não lança
      expect(banco.receitas()).toHaveLength(1);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('quando a conexão volta, o registro pendente é reenviado (também após reiniciar o app)', async () => {
      mockRedeFora = true;
      await registrarReceita(input());
      await sincronizarPendentes();

      // "reinício do app": a base local persiste; só a conexão muda
      mockRedeFora = false;
      await sincronizarPendentes();

      const r = banco.receitas()[0];
      expect(r.sync_status).toBe('sincronizado');
      expect(mockNuvem.has(caminho(r.id))).toBe(true);
    });

    it('sessão expirada ou servidor fora do ar só suspendem o envio', async () => {
      await registrarReceita(input());
      mockRedeFora = true; // permission-denied / unavailable
      await sincronizarPendentes();
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });
  });

  describe('envio', () => {
    it('grava em usuarios/{uid}/receitas/{id} com os campos esperados', async () => {
      await registrarReceita(input({ descricao: 'Logo' }));
      await sincronizarPendentes();
      const r = banco.receitas()[0];
      expect(mockNuvem.get(caminho(r.id))).toEqual({
        valor_centavos: 15000,
        data: '2026-10-16',
        titulo: 'Freela de design',
        descricao: 'Logo',
        criado_em: r.criado_em,
        atualizado_em: r.atualizado_em,
      });
    });

    it('omite descrição vazia e não envia categoria (RN13)', async () => {
      await registrarReceita(input({ descricao: null }));
      await sincronizarPendentes();
      const doc = mockNuvem.get(caminho(banco.receitas()[0].id));
      expect(doc).not.toHaveProperty('descricao');
      expect(doc).not.toHaveProperty('categoria');
      expect(Number.isInteger(doc.valor_centavos)).toBe(true);
    });

    it('envia a série em usuarios/{uid}/recorrencias/{id} e as ocorrências com recorrencia_id', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }));
      await sincronizarPendentes();
      const rec = banco.recorrencias()[0];
      expect(mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`)).toMatchObject({
        intervalo: 1, unidade: 'mes', inicio: '2026-10-16', termino: '2026-12-16', ativa: true,
      });
      expect(banco.receitas().every((r) => mockNuvem.get(caminho(r.id)).recorrencia_id === rec.id)).toBe(true);
      expect(banco.recorrencias()[0].sync_status).toBe('sincronizado');
    });

    it('edição posterior é reenviada', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;
      await editarReceita(id, input({ titulo: 'Editada', valorCentavos: 20000 }));
      expect(banco.receitas()[0].sync_status).toBe('pendente');
      await sincronizarPendentes();
      expect(mockNuvem.get(caminho(id))).toMatchObject({ titulo: 'Editada', valor_centavos: 20000 });
    });
  });

  describe('exclusão (tombstone)', () => {
    it('excluir, sincronizar e restaurar da nuvem: o registro não reaparece', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;
      expect(mockNuvem.has(caminho(id))).toBe(true);

      await excluirReceita(id);
      expect(banco.receitas()[0].excluido_em).toBeTruthy(); // lápide guardada até sincronizar
      await sincronizarPendentes();

      // a nuvem não tem mais o documento, então uma restauração não o traria de volta
      expect(mockNuvem.has(caminho(id))).toBe(false);
      expect(mockNuvem.size).toBe(0);
      // e a linha local só é removida depois de sincronizada
      expect(banco.receitas()).toHaveLength(0);
    });

    it('sem conexão, a lápide é mantida até a exclusão chegar à nuvem', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;

      mockRedeFora = true;
      await excluirReceita(id);
      await sincronizarPendentes();
      expect(banco.receitas()).toHaveLength(1); // lápide ainda existe
      expect(mockNuvem.has(caminho(id))).toBe(true);

      mockRedeFora = false;
      await sincronizarPendentes();
      expect(mockNuvem.has(caminho(id))).toBe(false);
      expect(banco.receitas()).toHaveLength(0);
    });

    it('ocorrência de série excluída mantém lápide sincronizada e não é recriada', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      await sincronizarPendentes();
      const rec = banco.recorrencias()[0];
      const idExcluido = `${rec.id}_2026-12-16`;

      await excluirReceita(idExcluido, 'esta');
      await sincronizarPendentes();

      expect(mockNuvem.has(caminho(idExcluido))).toBe(false);
      const linha = banco.receitas().find((r) => r.id === idExcluido);
      expect(linha).toMatchObject({ sync_status: 'sincronizado' });
      expect(linha.excluido_em).toBeTruthy();

      await completarRecorrencias();
      expect(banco.receitas().filter((r) => r.id === idExcluido)).toHaveLength(1);
      expect(banco.receitas().filter((r) => !r.excluido_em)).toHaveLength(12);
    });
  });

  describe('conflitos (RN07, EX05)', () => {
    it('registro desatualizado: vale o atualizado_em mais recente (nuvem)', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;
      await editarReceita(id, input({ titulo: 'Local' }));

      mockNuvem.set(caminho(id), { ...mockNuvem.get(caminho(id)), titulo: 'Da nuvem', atualizado_em: '2999-01-01T00:00:00.000Z' });
      const mudou = await sincronizarPendentes();

      expect(mudou).toBe(true);
      expect(banco.receitas()[0]).toMatchObject({ titulo: 'Da nuvem', sync_status: 'sincronizado' });
    });

    it('registro local mais recente sobrescreve a nuvem', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;
      mockNuvem.set(caminho(id), { ...mockNuvem.get(caminho(id)), titulo: 'Antigo', atualizado_em: '2000-01-01T00:00:00.000Z' });
      await editarReceita(id, input({ titulo: 'Local mais novo' }));

      await sincronizarPendentes();
      expect(mockNuvem.get(caminho(id)).titulo).toBe('Local mais novo');
    });

    it('edição contra exclusão: a exclusão prevalece', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;

      await excluirReceita(id);
      // outro lado editou depois (atualizado_em mais recente na nuvem)
      mockNuvem.set(caminho(id), { ...mockNuvem.get(caminho(id)), titulo: 'Editada em outro lugar', atualizado_em: '2999-01-01T00:00:00.000Z' });

      await sincronizarPendentes();
      expect(mockNuvem.has(caminho(id))).toBe(false);
      expect(banco.receitas()).toHaveLength(0);
    });
  });

  describe('acesso negado (EX07)', () => {
    it('permission-denied na sincronização: registro segue pendente e o aviso é sinalizado uma vez', async () => {
      await registrarReceita(input());
      mockRedeFora = true;
      mockCodigoErro = 'permission-denied';
      await expect(sincronizarPendentes()).resolves.toBe(false);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
      expect(consumirAcessoNegado()).toBe(true);
      expect(consumirAcessoNegado()).toBe(false);
    });

    it('falha de rede comum não sinaliza acesso negado', async () => {
      await registrarReceita(input());
      mockRedeFora = true;
      await sincronizarPendentes();
      expect(consumirAcessoNegado()).toBe(false);
    });
  });

  describe('restauração da nuvem', () => {
    it('recupera receitas e séries num aparelho limpo, já como sincronizadas', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }));
      await registrarReceita(input({ titulo: 'Avulsa' }));
      await sincronizarPendentes();
      const antes = banco.receitas().map((r) => r.id).sort();

      banco = instalarBanco(); // aparelho novo
      const r = await restaurarDaNuvem();

      expect(r.recorrencias).toBe(1);
      expect(banco.receitas().map((x) => x.id).sort()).toEqual(antes);
      expect(banco.receitas().every((x) => x.sync_status === 'sincronizado')).toBe(true);
    });

    it('é idempotente: restaurar duas vezes (e abrir o app) não duplica ocorrências', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      await sincronizarPendentes();
      banco = instalarBanco();
      await restaurarDaNuvem();
      const n = banco.receitas().length;
      expect((await restaurarDaNuvem()).receitas).toBe(0);
      await completarRecorrencias();
      expect(banco.receitas()).toHaveLength(n);
    });

    it('não traz de volta o que foi excluído (lápide local) nem sobrescreve edição pendente', async () => {
      await registrarReceita(input({ titulo: 'A' }));
      await registrarReceita(input({ titulo: 'B' }));
      await sincronizarPendentes();
      const [a, b] = banco.receitas();
      await excluirReceita(a.id);
      await editarReceita(b.id, input({ titulo: 'B editada' }));

      await restaurarDaNuvem(); // nuvem ainda tem as versões antigas

      expect(banco.receitas().find((r) => r.id === a.id).excluido_em).toBeTruthy();
      expect(banco.receitas().find((r) => r.id === b.id).titulo).toBe('B editada');
    });

    it('falha de rede ou acesso negado: lança FalhaRestauracao e não altera a base', async () => {
      await registrarReceita(input());
      const antes = banco.instantaneo();
      mockRedeFora = true;
      mockCodigoErro = 'permission-denied';
      await expect(restaurarDaNuvem()).rejects.toBeInstanceOf(FalhaRestauracao);
      expect(banco.instantaneo()).toEqual(antes);
      expect(consumirAcessoNegado()).toBe(true);
    });

    it('sem conta: não restaura', async () => {
      mockUsuario = null;
      await expect(restaurarDaNuvem()).rejects.toBeInstanceOf(FalhaRestauracao);
    });
  });

  it('só sincroniza uma vez por vez (sem envio concorrente duplicado)', async () => {
    await registrarReceita(input());
    await Promise.all([sincronizarPendentes(), sincronizarPendentes()]);
    expect(mockNuvem.size).toBe(1);
  });
});
