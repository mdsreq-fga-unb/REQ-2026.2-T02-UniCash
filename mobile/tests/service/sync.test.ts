import {
  completarRecorrencias,
  editarReceita,
  excluirReceita,
  registrarReceita,
} from '@/features/receitas/service';

import {
  completarRecorrenciasDespesas,
  editarDespesa,
  registrarDespesa,
  excluirDespesa,
} from '@/features/despesas/service';

import type { DespesaInput } from '@/features/despesas/types';

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
let mockLeiturasRemotas = 0;
let mockCodigoErro = 'unavailable';
/** Caminhos que a nuvem rejeita (permission-denied) mesmo com a rede funcionando. */
const mockCaminhosRejeitados = new Set<string>();

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
    if (mockCaminhosRejeitados.has(ref.path)) {
      throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
    }
    mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
  },
  getDoc: async (ref: any) => {
    mockLeiturasRemotas++;
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
    mockLeiturasRemotas = 0;
    mockCodigoErro = 'unavailable';
    mockCaminhosRejeitados.clear();
    consumirAcessoNegado();
  });
  afterEach(restaurarTempo);
    describe('sincronização de despesas', () => {
    const caminhoDespesa = (id: string) =>
      `usuarios/u1/despesas/${id}`;

    function inputDespesa(
      extra: Partial<DespesaInput> = {},
    ): DespesaInput {
      return {
        data: '2026-10-16',
        titulo: 'Aluguel',
        valorCentavos: 150000,
        descricao: 'Aluguel do apartamento',
        categoriaId: 'casa',
        fixaOuVariavel: 'fixa',
        essencial: 1,
        recorrencia: null,
        ...extra,
      };
    }

    it('envia despesa com categoria e classificações para a nuvem', async () => {
      await registrarDespesa(inputDespesa());
      await sincronizarPendentes();

      const d = banco.despesas()[0];

      expect(mockNuvem.get(caminhoDespesa(d.id))).toMatchObject({
        valor_centavos: 150000,
        data: '2026-10-16',
        titulo: 'Aluguel',
        descricao: 'Aluguel do apartamento',
        categoria_id: 'casa',
        fixa_ou_variavel: 'fixa',
        essencial: 1,
      });

      expect(d.sync_status).toBe('sincronizado');
    });

    it('mantém despesa pendente quando não há conexão', async () => {
      mockRedeFora = true;

      await registrarDespesa(inputDespesa());
      await sincronizarPendentes();

      expect(banco.despesas()).toHaveLength(1);
      expect(banco.despesas()[0].sync_status).toBe('pendente');
      expect(mockNuvem.size).toBe(0);
    });

    it('UC02 EX03: a primeira falha de rede interrompe a fila', async () => {
      await registrarDespesa(inputDespesa());
      await registrarDespesa(inputDespesa({ titulo: 'Outra despesa' }));
      mockRedeFora = true;

      await sincronizarPendentes();

      expect(mockLeiturasRemotas).toBe(1);
      expect(banco.despesas().every(d => d.sync_status === 'pendente')).toBe(true);
    });

    it('grava na nuvem o marcador de uma despesa excluída', async () => {
      await registrarDespesa(inputDespesa());
      await sincronizarPendentes();

      const d = banco.despesas()[0];

      expect(mockNuvem.has(caminhoDespesa(d.id))).toBe(true);

      await excluirDespesa(d.id);
      await sincronizarPendentes();

      const excluida = banco.despesas()[0];
      expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual({
        excluido_em: expect.any(String), atualizado_em: expect.any(String),
      });
      expect(excluida).toMatchObject({
        titulo: '', descricao: null, categoria_id: null, sync_status: 'sincronizado',
      });
    });
    it('envia recorrência de despesa com tipo e classificações para a nuvem', async () => {
  await registrarDespesa(
    inputDespesa({
      recorrencia: {
        intervalo: 1,
        unidade: 'mes',
        termino: '2026-12-16',
      },
    }),
  );

  await sincronizarPendentes();

  const rec = banco.recorrencias()[0];

  expect(mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`))
    .toMatchObject({
      tipo: 'despesa',
      intervalo: 1,
      unidade: 'mes',
      inicio: '2026-10-16',
      termino: '2026-12-16',
      ativa: true,
      categoria_id: 'casa',
      fixa_ou_variavel: 'fixa',
      essencial: 1,
    });

  expect(rec.sync_status).toBe('sincronizado');
});

    it('FA01: despesa sem categoria não envia campos nulos para a nuvem', async () => {
      await registrarDespesa(
        inputDespesa({
          categoriaId: null,
          fixaOuVariavel: null,
          essencial: null,
          descricao: null,
        }),
      );
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      const enviado = mockNuvem.get(caminhoDespesa(d.id));

      expect(enviado).toBeDefined();
      expect(enviado).not.toHaveProperty('categoria_id');
      expect(enviado).not.toHaveProperty('fixa_ou_variavel');
      expect(enviado).not.toHaveProperty('essencial');
      expect(Object.values(enviado)).not.toContain(null);
      expect(d.sync_status).toBe('sincronizado');
    });

    it('série de despesa sem categoria não envia campos nulos', async () => {
      await registrarDespesa(
        inputDespesa({
          categoriaId: null,
          fixaOuVariavel: null,
          essencial: null,
          recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
        }),
      );
      await sincronizarPendentes();

      const rec = banco.recorrencias()[0];
      const enviado = mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`);

      expect(enviado).toMatchObject({ tipo: 'despesa' });
      expect(Object.values(enviado)).not.toContain(null);
      expect(rec.sync_status).toBe('sincronizado');
    });

    it('um registro rejeitado pela nuvem não bloqueia os demais (fica pendente)', async () => {
      await registrarDespesa(inputDespesa({ titulo: 'Rejeitada' }));
      await registrarDespesa(inputDespesa({ titulo: 'Aceita', data: '2026-10-17' }));

      const rejeitada = banco.despesas().find((d) => d.titulo === 'Rejeitada');
      const aceita = banco.despesas().find((d) => d.titulo === 'Aceita');
      mockCaminhosRejeitados.add(caminhoDespesa(rejeitada.id));

      await sincronizarPendentes();

      const depois = banco.despesas();
      expect(depois.find((d) => d.id === rejeitada.id).sync_status).toBe('pendente');
      expect(depois.find((d) => d.id === aceita.id).sync_status).toBe('sincronizado');
      expect(mockNuvem.has(caminhoDespesa(aceita.id))).toBe(true);
      expect(mockNuvem.has(caminhoDespesa(rejeitada.id))).toBe(false);
      expect(consumirAcessoNegado()).toBe(true);
    });
  });

  describe('offline e sem conta', () => {
    it('sem conta: tudo funciona localmente e permanece pendente', async () => {
      mockUsuario = null;
      await registrarReceita(input());
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('sem conexão (UC01 EX04): a operação já está concluída e o registro fica pendente', async () => {
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
    it('EX08: edição mais recente na nuvem é aplicada com a categoria indisponível removida', async () => {
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

  describe('conflitos de despesas (EX04)', () => {
    const dados = (extra: Partial<DespesaInput> = {}): DespesaInput => ({
      data: '2026-10-16',
      titulo: 'Aluguel',
      valorCentavos: 150000,
      descricao: null,
      categoriaId: 'casa',
      fixaOuVariavel: 'fixa',
      essencial: 1,
      recorrencia: null,
      ...extra,
    });
    const caminhoD = (id: string) => `usuarios/u1/despesas/${id}`;

    it('EX08: edição mais recente na nuvem é aplicada com a categoria indisponível removida', async () => {
      await registrarDespesa(dados());
      await sincronizarPendentes();
      const id = banco.despesas()[0].id;
      await editarDespesa(id, dados({ titulo: 'Local' }));

      mockNuvem.set(caminhoD(id), {
        ...mockNuvem.get(caminhoD(id)),
        titulo: 'Da nuvem',
        categoria_id: 'categoria-removida',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      const mudou = await sincronizarPendentes();

      expect(mudou).toBe(true);
      expect(banco.despesas()[0]).toMatchObject({
        titulo: 'Da nuvem',
        categoria_id: null,
        sync_status: 'sincronizado',
      });
    });

    it('registro local mais recente sobrescreve a nuvem', async () => {
      await registrarDespesa(dados());
      await sincronizarPendentes();
      const id = banco.despesas()[0].id;
      mockNuvem.set(caminhoD(id), {
        ...mockNuvem.get(caminhoD(id)),
        titulo: 'Antigo',
        atualizado_em: '2000-01-01T00:00:00.000Z',
      });
      await editarDespesa(id, dados({ titulo: 'Local mais novo' }));

      await sincronizarPendentes();

      expect(mockNuvem.get(caminhoD(id)).titulo).toBe('Local mais novo');
    });

    it('EX04: marcador remoto vence uma edição pendente', async () => {
      await registrarDespesa(dados());
      const { id } = banco.despesas()[0];
      await sincronizarPendentes();
      await editarDespesa(id, dados({ titulo: 'Edição local' }));
      const excluidoEm = '2026-10-15T12:00:00.000Z';
      mockNuvem.set(caminhoD(id), {
        ...mockNuvem.get(caminhoD(id)),
        excluido_em: excluidoEm,
      });

      expect(await sincronizarPendentes()).toBe(true);
      expect(banco.despesas()[0]).toMatchObject({
        excluido_em: excluidoEm,
        sync_status: 'sincronizado',
      });
      expect(mockNuvem.get(caminhoD(id)).titulo).toBe('Aluguel');
    });

    it('edição contra exclusão: a exclusão local prevalece', async () => {
      await registrarDespesa(dados());
      await sincronizarPendentes();
      const id = banco.despesas()[0].id;

      await excluirDespesa(id);
      mockNuvem.set(caminhoD(id), {
        ...mockNuvem.get(caminhoD(id)),
        titulo: 'Editada em outro lugar',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });

      await sincronizarPendentes();

      expect(mockNuvem.get(caminhoD(id)).excluido_em).toBeTruthy();
      expect(banco.despesas()[0].sync_status).toBe('sincronizado');
    });
  });

  describe('acesso negado (UC01 EX07 / UC02 EX06)', () => {
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

    describe('despesas', () => {
      const dadosDespesa = (extra: Partial<DespesaInput> = {}): DespesaInput => ({
        data: '2026-10-16',
        titulo: 'Aluguel',
        valorCentavos: 150000,
        descricao: null,
        categoriaId: 'casa',
        fixaOuVariavel: 'fixa',
        essencial: 1,
        recorrencia: null,
        ...extra,
      });

      it('recupera despesa avulsa num aparelho limpo, já como sincronizada', async () => {
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();
        const antes = banco.despesas()[0];

        banco = instalarBanco(); // aparelho novo
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(1);
        expect(banco.despesas()).toHaveLength(1);
        expect(banco.despesas()[0]).toMatchObject({
          id: antes.id,
          valor_centavos: 150000,
          titulo: 'Aluguel',
          categoria_id: 'casa',
          fixa_ou_variavel: 'fixa',
          essencial: 1,
          sync_status: 'sincronizado',
        });
      });

      it('despesa sem categoria (FA01) volta com categoria_id NULL', async () => {
        await registrarDespesa(
          dadosDespesa({ categoriaId: null, fixaOuVariavel: null, essencial: null }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        await restaurarDaNuvem();

        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          fixa_ou_variavel: null,
          essencial: null,
        });
      });

      it('série de despesa preserva o tipo e as classificações e não gera receitas', async () => {
        await registrarDespesa(
          dadosDespesa({
            recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
          }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.recorrencias).toBe(1);
        expect(banco.recorrencias()[0]).toMatchObject({
          tipo: 'despesa',
          categoria_id: 'casa',
          fixa_ou_variavel: 'fixa',
          essencial: 1,
          sync_status: 'sincronizado',
        });

        await completarRecorrencias();
        await completarRecorrenciasDespesas();

        expect(banco.receitas()).toHaveLength(0);
      });

      it('EX08: restaura uma série e suas ocorrências sem a categoria indisponível', async () => {
        await registrarDespesa(dadosDespesa({
          categoriaId: 'categoria-removida',
          recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
        }));
        await sincronizarPendentes();

        banco = instalarBanco();
        expect((await restaurarDaNuvem()).despesas).toBe(3);
        expect(banco.recorrencias()[0].categoria_id).toBeNull();
        expect(banco.despesas().map(d => d.categoria_id)).toEqual([null, null, null]);
      });

      it('RN07: restaura o marcador e não gera novamente a ocorrência excluída', async () => {
        await registrarDespesa(dadosDespesa({
          recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
        }));
        const { id } = banco.despesas()[0];
        await excluirDespesa(id, 'esta');
        await sincronizarPendentes();

        banco = instalarBanco();
        await restaurarDaNuvem();
        await completarRecorrenciasDespesas();

        expect(banco.despesas().find(d => d.id === id)?.excluido_em).toBeTruthy();
        expect((await restaurarDaNuvem()).despesas).toBe(0);
      });

      it('é idempotente: restaurar duas vezes não duplica despesas', async () => {
        await registrarDespesa(dadosDespesa({ titulo: 'Avulsa' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        await restaurarDaNuvem();
        const n = banco.despesas().length;

        expect((await restaurarDaNuvem()).despesas).toBe(0);
        expect(banco.despesas()).toHaveLength(n);
      });

      it('despesa excluída localmente não reaparece nem sobrescreve edição pendente', async () => {
        await registrarDespesa(dadosDespesa({ titulo: 'A' }));
        await registrarDespesa(dadosDespesa({ titulo: 'B', data: '2026-10-17' }));
        await sincronizarPendentes();

        const [a, b] = banco.despesas();
        await excluirDespesa(a.id);
        await editarDespesa(b.id, dadosDespesa({ titulo: 'B editada', data: '2026-10-17' }), 'esta');

        const resultado = await restaurarDaNuvem(); // nuvem ainda tem as versões antigas

        expect(resultado.despesas).toBe(0);
        expect(banco.despesas().find((d) => d.id === a.id).excluido_em).toBeTruthy();
        expect(banco.despesas().find((d) => d.id === b.id).titulo).toBe('B editada');
      });

      it('ignora documentos de despesa inválidos', async () => {
        mockNuvem.set('usuarios/u1/despesas/ruim1', { valor_centavos: -5, data: '2026-10-16', titulo: 'X' });
        mockNuvem.set('usuarios/u1/despesas/ruim2', { valor_centavos: 100, titulo: 'sem data' });

        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(0);
        expect(banco.despesas()).toHaveLength(0);
      });
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
