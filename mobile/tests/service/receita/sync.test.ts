import { consultarAlertas } from '@/features/saldo/alertas';
import { consultarResumoMensal } from '@/features/saldo/service';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  definirEnvioAutomatico,
  FalhaRestauracao,
  restaurarDaNuvem,
  sincronizarPendentes,
} from '@/features/receitas/sync';
import { fixarHoje, restaurarTempo } from '../../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../../helpers/fakeDb';
import { input } from '../../helpers/dados';
import { categoriaLinha } from '../../helpers/categorias';
import {
  criarCategoria,
  editarCategoria,
  excluirCategoria,
  semearCategoriasPadrao,
} from '@/features/categorias/service';
import { lerSaldoInicial, salvarSaldoInicial } from '@/features/saldoInicial/service';
import type { Categoria } from '@/features/categorias/types';

// Firestore em memória: o que está em mockNuvem é o que "está na nuvem".
const mockNuvem = new Map<string, any>();
let mockUsuario: { uid: string; emailVerified: boolean } | null = { uid: 'u1', emailVerified: true };
let mockRedeFora = false;
let mockLeiturasRemotas = 0;
const mockDocumentosLidos: string[] = [];
let mockCodigoErro = 'unavailable';
/** Caminhos que a nuvem rejeita (permission-denied) mesmo com a rede funcionando. */
const mockCaminhosRejeitados = new Set<string>();
/** Ordem dos caminhos efetivamente enviados por setDoc. */
const mockOrdemEscritas: string[] = [];
/** Sentinela usada pelo mock de deleteField. */
const mockCampoRemovido = { __deleteField: true };
let mockAntesDaTransacao: (() => void) | null = null;
let mockErroTransacao: unknown = null;
let mockTransacoesDados = 0;
let mockAuthReadyFalha = false;
let mockTrocarUsuario = false;
let mockTrocarUsuarioDepois = 1;
let mockLeiturasUsuario = 0;

jest.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      mockLeiturasUsuario++;
      if (mockTrocarUsuario && mockLeiturasUsuario > mockTrocarUsuarioDepois) return { uid: 'u2' };
      return mockUsuario;
    },
    async authStateReady() {
      if (mockAuthReadyFalha) throw new Error('falha simulada de authStateReady');
    },
  },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  collection: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  getDocsFromServer: async (col: any) => {
    const { getDocs } = jest.requireMock('firebase/firestore');
    return getDocs(col);
  },
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
    mockOrdemEscritas.push(ref.path);
    mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
  },
  deleteField: () => mockCampoRemovido,
  runTransaction: async (_db: unknown, fn: (tx: any) => Promise<any>) => {
    if (mockAntesDaTransacao) {
      const hook = mockAntesDaTransacao;
      mockAntesDaTransacao = null;
      hook();
    }

    if (mockErroTransacao) {
      mockTransacoesDados++;
      const erro = mockErroTransacao;
      mockErroTransacao = null;
      throw erro;
    }

    let contou = false;
    const tx = {
      get: async (ref: any) => {
        if (!contou && !ref.path.includes('/alertas_emitidos/')) {
          mockTransacoesDados++;
          contou = true;
        }
        mockLeiturasRemotas++;
        if (mockRedeFora) {
          throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
        }
        const d = mockNuvem.get(ref.path);
        return { exists: () => d !== undefined, data: () => d };
      },
      set: (ref: any, dados: any) => {
        if (mockRedeFora) {
          throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
        }
        if (mockCaminhosRejeitados.has(ref.path)) {
          throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
        }
        mockOrdemEscritas.push(ref.path);
        mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
      },
      update: (ref: any, dados: any) => {
        if (mockRedeFora) {
          throw Object.assign(new Error(mockCodigoErro), { code: mockCodigoErro });
        }
        if (mockCaminhosRejeitados.has(ref.path)) {
          throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' });
        }
        const atual = mockNuvem.get(ref.path);
        if (atual === undefined) {
          throw Object.assign(new Error('not-found'), { code: 'not-found' });
        }

        const proximo = { ...atual };
        for (const [campo, valor] of Object.entries(dados)) {
          if (valor === mockCampoRemovido) {
            delete proximo[campo];
          } else {
            proximo[campo] = JSON.parse(JSON.stringify(valor));
          }
        }

        mockOrdemEscritas.push(ref.path);
        mockNuvem.set(ref.path, proximo);
      },
    };

    return fn(tx);
  },
  getDoc: async (ref: any) => {
    mockDocumentosLidos.push(ref.path);
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

  function inserirCategoria(
    extra: Partial<Categoria> = {},
  ): Categoria {
    const categoria = categoriaLinha({
      id: 'uuid-casa',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      ...extra,
    });

    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em,
           atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        categoria.id,
        categoria.nome,
        categoria.nome_normalizado,
        categoria.padrao,
        categoria.limite_tipo,
        categoria.limite_centavos,
        categoria.limite_percentual_centesimos,
        categoria.sync_status,
        categoria.excluido_em,
        categoria.criado_em,
        categoria.atualizado_em,
      );

    return categoria;
  }

  beforeEach(async () => {
    await AsyncStorage.clear();
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    mockNuvem.clear();
    mockUsuario = { uid: 'u1', emailVerified: true };
    mockRedeFora = false;
    mockLeiturasRemotas = 0;
    mockDocumentosLidos.length = 0;
    mockCodigoErro = 'unavailable';
    mockCaminhosRejeitados.clear();
    mockOrdemEscritas.length = 0;
    mockAntesDaTransacao = null;
    mockErroTransacao = null;
    mockTransacoesDados = 0;
    mockAuthReadyFalha = false;
    mockTrocarUsuario = false;
    mockTrocarUsuarioDepois = 1;
    mockLeiturasUsuario = 0;
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
      inserirCategoria();
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
      inserirCategoria();
      await registrarDespesa(inputDespesa());
      await registrarDespesa(inputDespesa({ titulo: 'Outra despesa' }));
      mockRedeFora = true;

      await sincronizarPendentes();

      expect(mockLeiturasRemotas).toBe(1);
      expect(banco.despesas().every(d => d.sync_status === 'pendente')).toBe(true);
    });

    it('grava na nuvem o marcador de uma despesa excluída', async () => {
      inserirCategoria();
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
        valor_centavos: 150000,
        data: '2026-10-16',
        titulo: 'Aluguel',
        descricao: 'Aluguel do apartamento',
        categoria_id: 'casa',
        sync_status: 'sincronizado',
      });
    });
    it('envia recorrência de despesa com tipo e classificações para a nuvem', async () => {
  inserirCategoria();
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
      inserirCategoria();
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

  describe('proteção de upload de despesas e recorrências (UC06)', () => {
    const caminhoDespesa = (id: string) => `usuarios/u1/despesas/${id}`;
    const caminhoSerie = (id: string) => `usuarios/u1/recorrencias/${id}`;

    function inputDespesa(extra: Partial<DespesaInput> = {}): DespesaInput {
      return {
        data: '2026-10-16',
        titulo: 'Aluguel',
        valorCentavos: 150000,
        descricao: null,
        categoriaId: 'uuid-casa',
        fixaOuVariavel: 'fixa',
        essencial: 1,
        recorrencia: null,
        ...extra,
      };
    }

    async function criarSerie(categoriaId: string | null) {
      await registrarDespesa(
        inputDespesa({
          categoriaId,
          recorrencia: {
            intervalo: 1,
            unidade: 'mes',
            termino: '2026-12-16',
          },
        }),
      );

      const serie = banco.recorrencias()[0];
      const ocorrencias = banco
        .despesas()
        .filter((d) => d.recorrencia_id === serie.id);

      return { serie, ocorrencias };
    }

    it('envia o ID real de uma categoria padrão ativa', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: 'uuid-casa' }));
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      expect(mockNuvem.get(caminhoDespesa(d.id))).toMatchObject({
        categoria_id: 'casa',
      });
      expect(d.sync_status).toBe('sincronizado');
    });

    it('envia o ID real de uma categoria própria ativa', async () => {
      inserirCategoria({
        id: 'uuid-mercado',
        nome: 'Mercado',
        nome_normalizado: 'mercado',
        padrao: 0,
      });
      await registrarDespesa(inputDespesa({ categoriaId: 'uuid-mercado' }));
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      expect(mockNuvem.get(caminhoDespesa(d.id))).toMatchObject({
        categoria_id: 'uuid-mercado',
      });
      expect(d.sync_status).toBe('sincronizado');
    });

    it('converte slug histórico em ID real no upload', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: 'casa' }));
      await sincronizarPendentes();

      const enviado = mockNuvem.get(caminhoDespesa(banco.despesas()[0].id));
      expect(enviado.categoria_id).toBe('casa');
      expect(enviado.categoria_id).not.toBe('uuid-casa');
    });

    it('slug sem padrão local não é enviado e mantém a despesa pendente', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: 'alimentacao' }));

      const antes = banco.despesas()[0];
      await sincronizarPendentes();
      const depois = banco.despesas()[0];

      expect(mockNuvem.has(caminhoDespesa(depois.id))).toBe(false);
      expect(depois.sync_status).toBe('pendente');
      expect(depois.atualizado_em).toBe(antes.atualizado_em);
    });

    it('ID de categoria desconhecido não é enviado', async () => {
      inserirCategoria();
      await registrarDespesa(
        inputDespesa({ categoriaId: 'uuid-desconhecido' }),
      );
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      expect(mockNuvem.has(caminhoDespesa(d.id))).toBe(false);
      expect(d.sync_status).toBe('pendente');
    });

    it('categoria excluída não é enviada', async () => {
      inserirCategoria();
      inserirCategoria({
        id: 'uuid-antiga',
        nome: 'Antiga',
        nome_normalizado: 'antiga',
        padrao: 0,
        excluido_em: '2026-02-01T00:00:00Z',
      });
      await registrarDespesa(inputDespesa({ categoriaId: 'uuid-antiga' }));
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      expect(mockNuvem.has(caminhoDespesa(d.id))).toBe(false);
      expect(d.sync_status).toBe('pendente');
    });

    it('categoria_id NULL é omitido do payload', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: null }));
      await sincronizarPendentes();

      const d = banco.despesas()[0];
      const enviado = mockNuvem.get(caminhoDespesa(d.id));

      expect(enviado).toBeDefined();
      expect(enviado).not.toHaveProperty('categoria_id');
      expect(d.sync_status).toBe('sincronizado');
    });

    it('categoria inválida local não sobrescreve categoria remota válida', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: 'uuid-casa' }));
      await sincronizarPendentes();

      const id = banco.despesas()[0].id;
      mockNuvem.set(caminhoDespesa(id), {
        ...mockNuvem.get(caminhoDespesa(id)),
        atualizado_em: '2000-01-01T00:00:00.000Z',
      });
      const remotoAntes = mockNuvem.get(caminhoDespesa(id));

      await editarDespesa(
        id,
        inputDespesa({
          categoriaId: 'categoria-removida',
          titulo: 'Inválida',
        }),
      );
      await sincronizarPendentes();

      expect(mockNuvem.get(caminhoDespesa(id))).toEqual(remotoAntes);
      expect(banco.despesas()[0].sync_status).toBe('pendente');
    });

    it('despesa inválida não impede o upload de outra despesa independente', async () => {
      inserirCategoria();
      await registrarDespesa(
        inputDespesa({ titulo: 'Inválida', categoriaId: 'alimentacao' }),
      );
      await registrarDespesa(
        inputDespesa({
          titulo: 'Válida',
          categoriaId: 'uuid-casa',
          data: '2026-10-17',
        }),
      );
      await sincronizarPendentes();

      const invalida = banco.despesas().find((d) => d.titulo === 'Inválida')!;
      const valida = banco.despesas().find((d) => d.titulo === 'Válida')!;

      expect(invalida.sync_status).toBe('pendente');
      expect(mockNuvem.has(caminhoDespesa(invalida.id))).toBe(false);
      expect(valida.sync_status).toBe('sincronizado');
      expect(mockNuvem.has(caminhoDespesa(valida.id))).toBe(true);
    });

    it('série de despesa envia o ID real da categoria', async () => {
      inserirCategoria();
      const { serie } = await criarSerie('uuid-casa');
      await sincronizarPendentes();

      expect(mockNuvem.get(caminhoSerie(serie.id))).toMatchObject({
        tipo: 'despesa',
        categoria_id: 'casa',
      });
      expect(banco.recorrencias()[0].sync_status).toBe('sincronizado');
    });

    it('série de despesa converte slug histórico em ID real', async () => {
      inserirCategoria();
      const { serie } = await criarSerie('casa');
      await sincronizarPendentes();

      const remoto = mockNuvem.get(caminhoSerie(serie.id));
      expect(remoto.categoria_id).toBe('casa');
      expect(remoto.categoria_id).not.toBe('uuid-casa');
    });

    it('série com categoria inválida não é enviada e permanece pendente', async () => {
      inserirCategoria();
      const { serie } = await criarSerie('alimentacao');
      const atualizadoAntes = serie.atualizado_em;

      await sincronizarPendentes();
      const depois = banco.recorrencias()[0];

      expect(mockNuvem.has(caminhoSerie(serie.id))).toBe(false);
      expect(depois.sync_status).toBe('pendente');
      expect(depois.atualizado_em).toBe(atualizadoAntes);
    });

    it('ocorrência de série bloqueada não é enviada e permanece pendente', async () => {
      inserirCategoria();
      const { ocorrencias } = await criarSerie('alimentacao');

      await sincronizarPendentes();

      for (const ocorrencia of ocorrencias) {
        expect(mockNuvem.has(caminhoDespesa(ocorrencia.id))).toBe(false);
        expect(
          banco.despesas().find((d) => d.id === ocorrencia.id)?.sync_status,
        ).toBe('pendente');
      }
    });

    it('ocorrência com categoria válida continua bloqueada quando a série é ignorada', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('alimentacao');
      const alvo = ocorrencias[0];

      await editarDespesa(
        alvo.id,
        inputDespesa({
          categoriaId: 'uuid-casa',
          data: alvo.data,
          titulo: alvo.titulo,
          valorCentavos: alvo.valor_centavos,
          descricao: alvo.descricao,
          fixaOuVariavel: alvo.fixa_ou_variavel,
          essencial: alvo.essencial,
        }),
        'esta',
      );

      expect(
        banco.despesas().find((d) => d.id === alvo.id)?.categoria_id,
      ).toBe('uuid-casa');

      await sincronizarPendentes();

      expect(mockNuvem.has(caminhoSerie(serie.id))).toBe(false);
      expect(mockNuvem.has(caminhoDespesa(alvo.id))).toBe(false);
      expect(
        banco.despesas().find((d) => d.id === alvo.id)?.sync_status,
      ).toBe('pendente');
    });

    it('ocorrência com categoria inválida não é enviada quando a série é válida', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('uuid-casa');
      const alvo = ocorrencias[0];

      await editarDespesa(
        alvo.id,
        inputDespesa({
          categoriaId: 'alimentacao',
          data: alvo.data,
          titulo: alvo.titulo,
          valorCentavos: alvo.valor_centavos,
          descricao: alvo.descricao,
          fixaOuVariavel: alvo.fixa_ou_variavel,
          essencial: alvo.essencial,
        }),
        'esta',
      );

      await sincronizarPendentes();

      expect(mockNuvem.has(caminhoSerie(serie.id))).toBe(true);
      expect(banco.recorrencias()[0].sync_status).toBe('sincronizado');
      expect(mockNuvem.has(caminhoDespesa(alvo.id))).toBe(false);
      expect(
        banco.despesas().find((d) => d.id === alvo.id)?.sync_status,
      ).toBe('pendente');
    });

    it('permission-denied na série bloqueia ocorrências e não impede despesa independente', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('uuid-casa');
      await registrarDespesa(
        inputDespesa({
          titulo: 'Independente',
          categoriaId: 'uuid-casa',
          data: '2026-10-17',
        }),
      );

      mockCaminhosRejeitados.add(caminhoSerie(serie.id));
      await sincronizarPendentes();

      const independente = banco
        .despesas()
        .find((d) => d.titulo === 'Independente')!;

      expect(mockNuvem.has(caminhoSerie(serie.id))).toBe(false);
      for (const ocorrencia of ocorrencias) {
        expect(mockNuvem.has(caminhoDespesa(ocorrencia.id))).toBe(false);
      }
      expect(mockNuvem.has(caminhoDespesa(independente.id))).toBe(true);
      expect(independente.sync_status).toBe('sincronizado');
      expect(consumirAcessoNegado()).toBe(true);
    });

    it('lápide de ocorrência de série bloqueada continua sendo enviada', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('alimentacao');
      const alvo = ocorrencias[0];

      await excluirDespesa(alvo.id, 'esta');
      await sincronizarPendentes();

      expect(mockNuvem.has(caminhoSerie(serie.id))).toBe(false);
      expect(mockNuvem.get(caminhoDespesa(alvo.id))).toEqual({
        excluido_em: expect.any(String),
        atualizado_em: expect.any(String),
      });
      expect(banco.despesas().find((d) => d.id === alvo.id)).toMatchObject({
        sync_status: 'sincronizado',
        excluido_em: expect.any(String),
      });
    });

    it('série de receita não envia categoria_id e ignora a validação', async () => {
      await registrarReceita(
        input({
          recorrencia: {
            intervalo: 1,
            unidade: 'mes',
            termino: '2026-12-16',
          },
        }),
      );

      const serie = banco.recorrencias()[0];
      banco.sqlite
        .prepare(
          "UPDATE recorrencias SET categoria_id = 'categoria-invalida', sync_status = 'pendente' WHERE id = ?",
        )
        .run(serie.id);

      await sincronizarPendentes();

      const remoto = mockNuvem.get(caminhoSerie(serie.id));
      expect(remoto).toBeDefined();
      expect(remoto).not.toHaveProperty('categoria_id');
      expect(banco.recorrencias()[0].sync_status).toBe('sincronizado');
    });

    it('registro ignorado mantém status e atualizado_em', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('alimentacao');
      const serieAntes = {
        sync_status: serie.sync_status,
        atualizado_em: serie.atualizado_em,
      };
      const ocorrenciasAntes = ocorrencias.map((o) => ({
        id: o.id,
        sync_status: o.sync_status,
        atualizado_em: o.atualizado_em,
      }));

      await sincronizarPendentes();

      expect(banco.recorrencias()[0]).toMatchObject({
        sync_status: 'pendente',
        atualizado_em: serieAntes.atualizado_em,
      });
      for (const antes of ocorrenciasAntes) {
        expect(
          banco.despesas().find((d) => d.id === antes.id),
        ).toMatchObject({
          sync_status: 'pendente',
          atualizado_em: antes.atualizado_em,
        });
      }
    });

    it('repetir a sincronização mantém o documento remoto intacto', async () => {
      inserirCategoria();
      await registrarDespesa(inputDespesa({ categoriaId: 'uuid-casa' }));
      await sincronizarPendentes();

      const id = banco.despesas()[0].id;
      mockNuvem.set(caminhoDespesa(id), {
        ...mockNuvem.get(caminhoDespesa(id)),
        atualizado_em: '2000-01-01T00:00:00.000Z',
      });
      await editarDespesa(
        id,
        inputDespesa({ categoriaId: 'categoria-removida' }),
      );

      const remoto = mockNuvem.get(caminhoDespesa(id));

      await sincronizarPendentes();
      expect(mockNuvem.get(caminhoDespesa(id))).toEqual(remoto);

      await sincronizarPendentes();
      expect(mockNuvem.get(caminhoDespesa(id))).toEqual(remoto);
      expect(banco.despesas()[0].sync_status).toBe('pendente');
    });

    it('pendência é sincronizada após a categoria ficar disponível', async () => {
      await registrarDespesa(inputDespesa({ categoriaId: 'casa' }));
      await sincronizarPendentes();

      const id = banco.despesas()[0].id;
      expect(mockNuvem.has(caminhoDespesa(id))).toBe(false);
      expect(banco.despesas()[0].sync_status).toBe('pendente');

      inserirCategoria();
      await sincronizarPendentes();

      expect(mockNuvem.get(caminhoDespesa(id))).toMatchObject({
        categoria_id: 'casa',
      });
      expect(banco.despesas()[0].sync_status).toBe('sincronizado');
    });

    it('catálogo é consultado uma única vez entre upload e conflito', async () => {
      inserirCategoria();
      inserirCategoria({
        id: 'uuid-remota',
        nome: 'Remota',
        nome_normalizado: 'remota',
        padrao: 0,
      });

      await registrarDespesa(
        inputDespesa({ titulo: 'Conflito', categoriaId: 'uuid-casa' }),
      );
      await sincronizarPendentes();

      const conflito = banco.despesas()[0];
      await editarDespesa(
        conflito.id,
        inputDespesa({ titulo: 'Conflito local', categoriaId: 'uuid-casa' }),
      );
      mockNuvem.set(caminhoDespesa(conflito.id), {
        ...mockNuvem.get(caminhoDespesa(conflito.id)),
        categoria_id: 'uuid-remota',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });

      await registrarDespesa(
        inputDespesa({
          titulo: 'Upload',
          categoriaId: 'uuid-casa',
          data: '2026-10-17',
        }),
      );
      const upload = banco.despesas().find((d) => d.titulo === 'Upload')!;

      const prepareOriginal = banco.sqlite.prepare.bind(banco.sqlite);
      let consultasCategorias = 0;
      const spy = jest
        .spyOn(banco.sqlite, 'prepare')
        .mockImplementation((sql: string) => {
          if (sql.includes('SELECT * FROM categorias')) consultasCategorias++;
          return prepareOriginal(sql);
        });

      try {
        await sincronizarPendentes();
        expect(consultasCategorias).toBe(1);
      } finally {
        spy.mockRestore();
      }

      expect(
        banco.despesas().find((d) => d.id === conflito.id)?.categoria_id,
      ).toBe('uuid-remota');
      expect(mockNuvem.has(caminhoDespesa(upload.id))).toBe(true);
    });

    it('série é processada antes das ocorrências', async () => {
      inserirCategoria();
      const { serie, ocorrencias } = await criarSerie('uuid-casa');

      await sincronizarPendentes();

      const indiceSerie = mockOrdemEscritas.indexOf(caminhoSerie(serie.id));
      expect(indiceSerie).toBeGreaterThanOrEqual(0);

      for (const ocorrencia of ocorrencias) {
        const indiceOcorrencia = mockOrdemEscritas.indexOf(
          caminhoDespesa(ocorrencia.id),
        );
        expect(indiceOcorrencia).toBeGreaterThan(indiceSerie);
      }
    });

    describe('reparo remoto de categoria excluída', () => {
      async function prepararDespesaComCategoriaExcluida() {
        inserirCategoria({
          id: 'uuid-antiga',
          nome: 'Antiga',
          nome_normalizado: 'antiga',
          padrao: 0,
        });
        await registrarDespesa(
          inputDespesa({
            categoriaId: 'uuid-antiga',
            titulo: 'Despesa local',
          }),
        );
        await sincronizarPendentes();
        mockTransacoesDados = 0;

        const despesa = banco.despesas()[0];
        const path = caminhoDespesa(despesa.id);
        const remotoOriginal = mockNuvem.get(path);

        await excluirCategoria('uuid-antiga');

        return { despesa, path, remotoOriginal };
      }

      function remotoMaisNovo(remoto: any, extra: Record<string, any> = {}) {
        return {
          ...remoto,
          titulo: 'Remoto mais novo',
          valor_centavos: 98_765,
          data: '2026-11-01',
          descricao: 'Descricao remota',
          categoria_id: 'uuid-antiga',
          atualizado_em: '2999-01-01T00:00:00.000Z',
          ...extra,
        };
      }

      it('remove somente categoria_id do remoto mais novo com tombstone local', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const remoto = remotoMaisNovo(remotoOriginal);
        mockNuvem.set(path, remoto);

        await sincronizarPendentes();

        const remotoDepois = mockNuvem.get(path);
        const { categoria_id: _categoria, ...camposRemotos } = remoto;

        expect(mockTransacoesDados).toBe(2);
        expect(remotoDepois).not.toHaveProperty('categoria_id');
        expect(remotoDepois).toEqual(camposRemotos);
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          sync_status: 'sincronizado',
          titulo: remoto.titulo,
          valor_centavos: remoto.valor_centavos,
          data: remoto.data,
          descricao: remoto.descricao,
        });
      });

      it('preserva a política remota quando a categoria remota é própria e ativa', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        inserirCategoria({
          id: 'uuid-c2',
          nome: 'C2',
          nome_normalizado: 'c2',
          padrao: 0,
        });
        const remoto = remotoMaisNovo(remotoOriginal, {
          categoria_id: 'uuid-c2',
        });
        mockNuvem.set(path, remoto);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(banco.despesas()[0].categoria_id).toBe('uuid-c2');
        expect(mockNuvem.get(path)).toEqual(remoto);
      });

      it('preserva a política remota quando a categoria remota é padrão e ativa', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        inserirCategoria();
        const remoto = remotoMaisNovo(remotoOriginal, {
          categoria_id: 'uuid-casa',
        });
        mockNuvem.set(path, remoto);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
        expect(mockNuvem.get(path)).toEqual(remoto);
      });

      it('preserva o comportamento anterior para ID desconhecido sem tombstone', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const remoto = remotoMaisNovo(remotoOriginal, {
          categoria_id: 'uuid-desconhecido',
        });
        mockNuvem.set(path, remoto);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(banco.despesas()[0].categoria_id).toBeNull();
        expect(mockNuvem.get(path)).toEqual(remoto);
      });

      it.each([undefined, null])(
        'não repara quando a categoria remota é %p',
        async (categoriaRemota) => {
          const { path, remotoOriginal } =
            await prepararDespesaComCategoriaExcluida();
          const remoto = remotoMaisNovo(remotoOriginal);
          if (categoriaRemota === undefined) {
            delete remoto.categoria_id;
          } else {
            remoto.categoria_id = categoriaRemota;
          }
          mockNuvem.set(path, remoto);

          await sincronizarPendentes();

          expect(mockTransacoesDados).toBe(2);
          expect(banco.despesas()[0].categoria_id).toBeNull();
          expect(mockNuvem.get(path)).toEqual(remoto);
        },
      );

      it('aplica a lápide remota quando o documento vira tombstone durante a disputa', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));

        mockAntesDaTransacao = () => {
          const atual = mockNuvem.get(path);
          mockNuvem.set(path, {
            ...atual,
            excluido_em: '2026-12-01T00:00:00Z',
            atualizado_em: '2999-01-01T00:00:00.000Z',
          });
        };

        await sincronizarPendentes();

        const local = banco.despesas()[0];
        expect(mockTransacoesDados).toBe(2);
        expect(local.excluido_em).toBeTruthy();
        expect(local.sync_status).toBe('sincronizado');
        expect(mockNuvem.get(path).excluido_em).toBe(
          '2026-12-01T00:00:00Z',
        );
      });

      it('não apaga uma categoria C2 alterada concorrentemente', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        inserirCategoria({
          id: 'uuid-c2',
          nome: 'C2',
          nome_normalizado: 'c2',
          padrao: 0,
        });
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));

        mockAntesDaTransacao = () => {
          const atual = mockNuvem.get(path);
          mockNuvem.set(path, { ...atual, categoria_id: 'uuid-c2' });
        };

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(banco.despesas()[0].categoria_id).toBe('uuid-c2');
        expect(mockNuvem.get(path).categoria_id).toBe('uuid-c2');
      });

      it('reavalia o documento quando o timestamp muda durante a transação', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));

        mockAntesDaTransacao = () => {
          const atual = mockNuvem.get(path);
          mockNuvem.set(path, {
            ...atual,
            titulo: 'Remoto reavaliado',
            atualizado_em: '2998-01-01T00:00:00.000Z',
          });
        };

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(mockNuvem.get(path)).not.toHaveProperty('categoria_id');
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          titulo: 'Remoto reavaliado',
          atualizado_em: '2998-01-01T00:00:00.000Z',
          sync_status: 'sincronizado',
        });
      });

      it('mantém pendente quando a transação falha por rede', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const remoto = remotoMaisNovo(remotoOriginal);
        mockNuvem.set(path, remoto);
        mockErroTransacao = Object.assign(new Error('unavailable'), {
          code: 'unavailable',
        });

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(1);
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          sync_status: 'pendente',
        });
        expect(mockNuvem.get(path)).toEqual(remoto);
      });

      it('mantém pendente e sinaliza acesso negado em permission-denied', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const remoto = remotoMaisNovo(remotoOriginal);
        mockNuvem.set(path, remoto);
        mockCaminhosRejeitados.add(path);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBeGreaterThan(0);
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          sync_status: 'pendente',
        });
        expect(consumirAcessoNegado()).toBe(true);
        expect(mockNuvem.get(path)).toEqual(remoto);
      });

      it('reconcilia na próxima sincronização após falha local pós-reparo', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));
        banco.falharNaOperacao(3);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(mockNuvem.get(path)).not.toHaveProperty('categoria_id');
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          sync_status: 'pendente',
        });

        mockTransacoesDados = 0;
        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(1);
        expect(banco.despesas()[0]).toMatchObject({
          categoria_id: null,
          sync_status: 'sincronizado',
        });
      });

      it('repetir a sincronização após o reparo não faz novas alterações', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));

        await sincronizarPendentes();
        const remoto = mockNuvem.get(path);
        const leituras = mockLeiturasRemotas;
        const transacoes = mockTransacoesDados;

        await sincronizarPendentes();

        expect(mockNuvem.get(path)).toEqual(remoto);
        expect(mockLeiturasRemotas).toBe(leituras);
        expect(mockTransacoesDados).toBe(transacoes);
      });

      it('timestamp igual preserva o comportamento atual de upload completo', async () => {
        const { despesa, path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const local = banco.despesas().find((d) => d.id === despesa.id)!;
        const remoto = remotoMaisNovo(remotoOriginal, {
          titulo: 'Remoto com timestamp igual',
          atualizado_em: local.atualizado_em,
        });
        mockNuvem.set(path, remoto);

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(mockNuvem.get(path)).not.toHaveProperty('categoria_id');
        expect(mockNuvem.get(path).titulo).toBe(local.titulo);
        expect(banco.despesas()[0].sync_status).toBe('sincronizado');
      });

      it('preserva recorrencia_id em ocorrência reparada de série', async () => {
        inserirCategoria({
          id: 'uuid-antiga',
          nome: 'Antiga',
          nome_normalizado: 'antiga',
          padrao: 0,
        });
        const { serie, ocorrencias } = await criarSerie('uuid-antiga');
        await sincronizarPendentes();

        const alvo = ocorrencias[0];
        const path = caminhoDespesa(alvo.id);
        const remotoOriginal = mockNuvem.get(path);

        await excluirCategoria('uuid-antiga');
        mockNuvem.set(
          path,
          remotoMaisNovo(remotoOriginal, {
            recorrencia_id: serie.id,
          }),
        );

        await sincronizarPendentes();

        const remoto = mockNuvem.get(path);
        expect(remoto).not.toHaveProperty('categoria_id');
        expect(remoto.recorrencia_id).toBe(serie.id);
        expect(mockNuvem.get(caminhoSerie(serie.id))).not.toHaveProperty(
          'categoria_id',
        );
        expect(banco.despesas().find((d) => d.id === alvo.id)).toMatchObject({
          categoria_id: null,
          recorrencia_id: serie.id,
          sync_status: 'sincronizado',
        });
      });

      it('tombstones de despesas continuam sendo enviados sem reparo de categoria', async () => {
        const { path, remotoOriginal } =
          await prepararDespesaComCategoriaExcluida();
        const despesa = banco.despesas()[0];
        await excluirDespesa(despesa.id);
        mockNuvem.set(path, remotoMaisNovo(remotoOriginal));

        await sincronizarPendentes();

        expect(mockTransacoesDados).toBe(2);
        expect(mockNuvem.get(path)).toEqual({
          excluido_em: expect.any(String),
          atualizado_em: expect.any(String),
        });
        expect(banco.despesas()[0]).toMatchObject({
          sync_status: 'sincronizado',
          excluido_em: expect.any(String),
          categoria_id: null,
        });
      });
    });
  });

  describe('tombstones persistentes de despesas e séries (UC06)', () => {
    const caminhoDespesa = (id: string) => `usuarios/u1/despesas/${id}`;
    const caminhoSerie = (id: string) => `usuarios/u1/recorrencias/${id}`;

    function dadosDespesa(extra: Partial<DespesaInput> = {}): DespesaInput {
      return {
        data: '2026-10-16',
        titulo: 'Aluguel',
        valorCentavos: 150000,
        descricao: 'Aluguel do apartamento',
        categoriaId: 'uuid-casa',
        fixaOuVariavel: 'fixa',
        essencial: 1,
        recorrencia: null,
        ...extra,
      };
    }

    async function criarSerieDespesa() {
      inserirCategoria();
      await registrarDespesa(
        dadosDespesa({
          recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
        }),
      );
      const serie = banco.recorrencias()[0];
      const ocorrencias = banco
        .despesas()
        .filter((d) => d.recorrencia_id === serie.id);
      return { serie, ocorrencias };
    }

    async function criarSerieReceita() {
      await registrarReceita(
        input({
          recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
        }),
      );
      const serie = banco.recorrencias()[0];
      const ocorrencias = banco
        .receitas()
        .filter((r) => r.recorrencia_id === serie.id);
      return { serie, ocorrencias };
    }

    // Formato atual do marcador de despesa: o tombstone remoto é terminal.
    const lapideDespesa = (excluido_em = '2026-10-20T12:00:00.000Z') => ({
      excluido_em,
      atualizado_em: excluido_em,
    });

    const lapideSerie = (
      remoto: Record<string, any>,
      excluido_em = '2026-10-20T12:00:00.000Z',
    ) => ({ ...remoto, ativa: false, excluido_em, atualizado_em: excluido_em });

    describe('despesas', () => {
      it('documento remoto ausente: despesa realmente nova é criada normalmente', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        expect(mockNuvem.size).toBe(0);

        await sincronizarPendentes();

        const d = banco.despesas()[0];
        expect(mockTransacoesDados).toBe(1);
        expect(mockNuvem.get(caminhoDespesa(d.id))).toMatchObject({
          valor_centavos: 150000,
          data: '2026-10-16',
          titulo: 'Aluguel',
          categoria_id: 'casa',
        });
        expect(d.sync_status).toBe('sincronizado');
      });

      it('despesa ativa local com tombstone remoto é excluída sem perder os dados', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        await editarDespesa(
          d.id,
          dadosDespesa({ titulo: 'Editada offline' }),
          'esta',
        );

        const remoto = lapideDespesa();
        mockNuvem.set(caminhoDespesa(d.id), remoto);

        await sincronizarPendentes();

        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual(remoto);
        expect(banco.despesas()[0]).toMatchObject({
          id: d.id,
          valor_centavos: 150000,
          data: '2026-10-16',
          titulo: 'Editada offline',
          descricao: 'Aluguel do apartamento',
          categoria_id: 'uuid-casa',
          excluido_em: remoto.excluido_em,
          atualizado_em: remoto.atualizado_em,
          sync_status: 'sincronizado',
        });

        // Repetir não ressuscita o documento.
        await sincronizarPendentes();
        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual(remoto);
        expect(banco.despesas()[0].excluido_em).toBe(remoto.excluido_em);
      });

      it('local pendente e exclusão remota concorrente: a exclusão prevalece', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        await editarDespesa(
          d.id,
          dadosDespesa({ titulo: 'Edição concorrente' }),
          'esta',
        );

        const remoto = lapideDespesa();
        mockAntesDaTransacao = () =>
          mockNuvem.set(caminhoDespesa(d.id), remoto);

        await sincronizarPendentes();

        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual(remoto);
        expect(banco.despesas()[0]).toMatchObject({
          titulo: 'Edição concorrente',
          valor_centavos: 150000,
          excluido_em: remoto.excluido_em,
          sync_status: 'sincronizado',
        });
      });

      it('tombstone local substitui documento remoto ativo e não permite ressurreição', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        await excluirDespesa(d.id);
        mockNuvem.set(caminhoDespesa(d.id), {
          ...mockNuvem.get(caminhoDespesa(d.id)),
          titulo: 'Ativo em outro aparelho',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        });

        await sincronizarPendentes();

        const remoto = mockNuvem.get(caminhoDespesa(d.id));
        expect(remoto).toEqual({
          excluido_em: expect.any(String),
          atualizado_em: expect.any(String),
        });
        expect(banco.despesas()[0]).toMatchObject({
          valor_centavos: 150000,
          titulo: 'Aluguel',
          excluido_em: remoto.excluido_em,
          sync_status: 'sincronizado',
        });

        await sincronizarPendentes();
        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual(remoto);
      });

      it('ambos tombstone: adota o remoto e não reescreve', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        await excluirDespesa(d.id);

        const remoto = lapideDespesa('2026-10-25T09:00:00.000Z');
        mockNuvem.set(caminhoDespesa(d.id), remoto);
        mockOrdemEscritas.length = 0;

        await sincronizarPendentes();

        expect(mockOrdemEscritas).not.toContain(caminhoDespesa(d.id));
        expect(banco.despesas()[0]).toMatchObject({
          excluido_em: remoto.excluido_em,
          atualizado_em: remoto.atualizado_em,
          sync_status: 'sincronizado',
        });
      });

      it('falha após a confirmação remota mantém a pendência e reconcilia na nova tentativa', async () => {
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        await excluirDespesa(d.id);

        banco.falharNaOperacao(1);
        await sincronizarPendentes();

        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual({
          excluido_em: expect.any(String),
          atualizado_em: expect.any(String),
        });
        expect(banco.despesas()[0]).toMatchObject({
          excluido_em: expect.any(String),
          sync_status: 'pendente',
        });

        await sincronizarPendentes();

        expect(mockNuvem.get(caminhoDespesa(d.id))).toEqual({
          excluido_em: banco.despesas()[0].excluido_em,
          atualizado_em: banco.despesas()[0].atualizado_em,
        });
        expect(banco.despesas()[0].sync_status).toBe('sincronizado');
      });
    });

    describe('séries', () => {
      it('série nova é criada ativamente e confirmada na nuvem', async () => {
        const { serie } = await criarSerieDespesa();

        await sincronizarPendentes();

        const remoto = mockNuvem.get(caminhoSerie(serie.id));
        expect(remoto).toMatchObject({
          tipo: 'despesa',
          ativa: true,
          valor_centavos: 150000,
          categoria_id: 'casa',
        });
        expect(remoto).not.toHaveProperty('excluido_em');
        expect(banco.recorrencias()[0]).toMatchObject({
          excluido_em: null,
          sync_status: 'sincronizado',
        });
      });

      it('pausar ou encerrar a série não gera tombstone', async () => {
        const { serie, ocorrencias } = await criarSerieDespesa();
        await sincronizarPendentes();

        await excluirDespesa(ocorrencias[0].id, 'proximas');
        await sincronizarPendentes();

        const remoto = mockNuvem.get(caminhoSerie(serie.id));
        expect(remoto.ativa).toBe(false);
        expect(remoto).not.toHaveProperty('excluido_em');
        expect(banco.recorrencias()[0]).toMatchObject({
          ativa: 0,
          excluido_em: null,
          sync_status: 'sincronizado',
        });
      });

      it('série ativa local com tombstone remoto é excluída e preserva as ocorrências', async () => {
        const { serie, ocorrencias } = await criarSerieDespesa();
        await sincronizarPendentes();

        await editarDespesa(
          ocorrencias[0].id,
          dadosDespesa({
            data: ocorrencias[0].data,
            titulo: 'Aluguel editado',
            recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
          }),
          'todas',
        );

        const remoto = lapideSerie(mockNuvem.get(caminhoSerie(serie.id)));
        mockNuvem.set(caminhoSerie(serie.id), remoto);

        await sincronizarPendentes();

        expect(banco.recorrencias()[0]).toMatchObject({
          tipo: 'despesa',
          ativa: 0,
          excluido_em: remoto.excluido_em,
          valor_centavos: 150000,
          titulo: 'Aluguel editado',
          sync_status: 'sincronizado',
        });

        const locais = banco.despesas();
        expect(locais).toHaveLength(ocorrencias.length);
        for (const original of ocorrencias) {
          const atual = locais.find((d) => d.id === original.id)!;
          expect(atual).toMatchObject({
            valor_centavos: original.valor_centavos,
            data: original.data,
            titulo: 'Aluguel editado',
            descricao: original.descricao,
            categoria_id: original.categoria_id,
            recorrencia_id: serie.id,
            excluido_em: remoto.excluido_em,
            sync_status: 'sincronizado',
          });
          expect(mockNuvem.get(caminhoDespesa(original.id))).toEqual({
            excluido_em: expect.any(String),
            atualizado_em: expect.any(String),
          });
        }
      });

      it('série de receita com tombstone remoto é excluída e preserva as ocorrências locais', async () => {
        const { serie, ocorrencias } = await criarSerieReceita();
        await sincronizarPendentes();

        await editarReceita(
          ocorrencias[0].id,
          input({
            data: ocorrencias[0].data,
            titulo: 'Mesada editada',
            recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
          }),
          'todas',
        );

        const remoto = lapideSerie(mockNuvem.get(caminhoSerie(serie.id)));
        mockNuvem.set(caminhoSerie(serie.id), remoto);

        await sincronizarPendentes();

        expect(banco.recorrencias()[0]).toMatchObject({
          tipo: 'receita',
          ativa: 0,
          excluido_em: remoto.excluido_em,
          valor_centavos: 15000,
          titulo: 'Mesada editada',
          sync_status: 'sincronizado',
        });

        const locais = banco.receitas();
        expect(locais).toHaveLength(ocorrencias.length);
        for (const original of ocorrencias) {
          expect(locais.find((r) => r.id === original.id)).toMatchObject({
            valor_centavos: original.valor_centavos,
            data: original.data,
            titulo: 'Mesada editada',
            recorrencia_id: serie.id,
            excluido_em: expect.any(String),
          });
        }
      });

      it('tombstone local de série substitui documento remoto ativo', async () => {
        const { serie, ocorrencias } = await criarSerieDespesa();
        await sincronizarPendentes();

        const ativoRemoto = {
          ...mockNuvem.get(caminhoSerie(serie.id)),
          titulo: 'Série reativada em outro aparelho',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        };

        await excluirDespesa(ocorrencias[0].id, 'todas');
        mockNuvem.set(caminhoSerie(serie.id), ativoRemoto);

        await sincronizarPendentes();

        const remoto = mockNuvem.get(caminhoSerie(serie.id));
        expect(remoto).toMatchObject({
          tipo: 'despesa',
          ativa: false,
          excluido_em: expect.any(String),
          valor_centavos: 150000,
          titulo: 'Aluguel',
          categoria_id: 'casa',
        });
        expect(remoto.atualizado_em).not.toBe(ativoRemoto.atualizado_em);

        await sincronizarPendentes();
        expect(mockNuvem.get(caminhoSerie(serie.id))).toEqual(remoto);
      });

      it('ambos tombstone: mantém o remoto e não reescreve a série', async () => {
        const { serie, ocorrencias } = await criarSerieDespesa();
        await sincronizarPendentes();

        await excluirDespesa(ocorrencias[0].id, 'todas');
        const remoto = lapideSerie(
          mockNuvem.get(caminhoSerie(serie.id)),
          '2026-10-30T10:00:00.000Z',
        );
        mockNuvem.set(caminhoSerie(serie.id), remoto);
        mockOrdemEscritas.length = 0;

        await sincronizarPendentes();

        expect(mockOrdemEscritas).not.toContain(caminhoSerie(serie.id));
        expect(banco.recorrencias()[0]).toMatchObject({
          excluido_em: remoto.excluido_em,
          atualizado_em: remoto.atualizado_em,
          sync_status: 'sincronizado',
        });
      });

      it('falha após confirmar o tombstone da série reconcilia na nova tentativa', async () => {
        const { serie, ocorrencias } = await criarSerieDespesa();
        await sincronizarPendentes();

        await excluirDespesa(ocorrencias[0].id, 'todas');

        banco.falharNaOperacao(1);
        await sincronizarPendentes();

        expect(mockNuvem.get(caminhoSerie(serie.id))).toMatchObject({
          ativa: false,
          excluido_em: expect.any(String),
        });
        expect(banco.recorrencias()[0].sync_status).toBe('pendente');

        await sincronizarPendentes();

        expect(banco.recorrencias()[0]).toMatchObject({
          ativa: 0,
          excluido_em: expect.any(String),
          sync_status: 'sincronizado',
        });
        for (const ocorrencia of banco.despesas()) {
          expect(mockNuvem.get(caminhoDespesa(ocorrencia.id))).toEqual({
            excluido_em: expect.any(String),
            atualizado_em: expect.any(String),
          });
        }
      });
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

    it('e-mail não confirmado: nada é enviado, nem em envio manual, e o registro segue pendente', async () => {
      mockUsuario = { uid: 'u1', emailVerified: false };
      await registrarReceita(input());
      expect(await sincronizarPendentes()).toBe(false);
      expect(await sincronizarPendentes({ manual: true })).toBe(false);
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('e-mail confirmado depois: o registro pendente é enviado no próximo envio', async () => {
      mockUsuario = { uid: 'u1', emailVerified: false };
      await registrarReceita(input());
      await sincronizarPendentes();
      expect(mockNuvem.size).toBe(0);

      mockUsuario = { uid: 'u1', emailVerified: true };
      await sincronizarPendentes();
      expect(banco.receitas()[0].sync_status).toBe('sincronizado');
      expect(mockNuvem.size).toBe(1);
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

  it('envia o alerta sem duplicar e recalcula o saldo após restaurar os lançamentos', async () => {
    await registrarReceita(input({ data: '2026-10-16', valorCentavos: 1000 }));
    await registrarDespesa({
      data: '2026-10-16', valorCentavos: 1500, titulo: 'Despesa de teste',
      descricao: null, categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
    });
    const [alerta] = await consultarAlertas();
    const ref = `usuarios/u1/alertas_emitidos/${alerta.id}`;
    mockRedeFora = true;
    await sincronizarPendentes();
    expect(mockNuvem.has(ref)).toBe(false);

    mockRedeFora = false;
    await sincronizarPendentes();
    await sincronizarPendentes();
    expect(mockNuvem.get(ref)).toMatchObject({ saldo_centavos: -500, anterior_centavos: 1000 });
    expect(mockOrdemEscritas.filter((path) => path === ref)).toEqual([ref]);

    banco = instalarBanco();
    await expect(restaurarDaNuvem()).resolves.toMatchObject({ receitas: 1, despesas: 1 });
    await expect(consultarResumoMensal('2026-10-01')).resolves.toMatchObject({
      receitas: 1000, despesas: 1500, saldo: -500,
    });
  });

  describe('envio', () => {
    it('mantém o saldo rejeitado pendente e continua enviando receitas', async () => {
      await salvarSaldoInicial({ valor_centavos: -100, mes_referencia: '2026-11' });
      await registrarReceita(input());
      mockCaminhosRejeitados.add('usuarios/u1/saldo_inicial/atual');

      await sincronizarPendentes();

      expect(await lerSaldoInicial()).toMatchObject({ sync_status: 'pendente' });
      expect(mockNuvem.has('usuarios/u1/saldo_inicial/atual')).toBe(false);
      expect(mockNuvem.has(caminho(banco.receitas()[0].id))).toBe(true);
      expect(banco.receitas()[0].sync_status).toBe("sincronizado");
      expect(consumirAcessoNegado()).toBe(true);
    });

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

  describe('UC16: retomada e restauração', () => {
    it('aguarda a falha do envio em curso antes de repetir a consulta do catálogo', async () => {
      await registrarDespesa({
        data: '2026-10-16', valorCentavos: 1500, titulo: 'Despesa de teste',
        descricao: null, categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
      });
      const preparar = banco.sqlite.prepare.bind(banco.sqlite);
      let falhar = true;
      const consulta = jest.spyOn(banco.sqlite, 'prepare').mockImplementation((sql: string) => {
        if (falhar && sql === 'SELECT * FROM categorias') {
          falhar = false;
          throw new Error('falha temporária no catálogo');
        }
        return preparar(sql);
      });

      try {
        const primeiro = sincronizarPendentes();
        const repeticao = sincronizarPendentes({ manual: true });
        await expect(primeiro).rejects.toThrow('falha temporária no catálogo');
        await repeticao;
        expect(banco.despesas()[0].sync_status).toBe('sincronizado');
      } finally {
        consulta.mockRestore();
      }
    });

    it.each([null, 'categoria-desconhecida'])(
      'reconcilia uma série remota mais recente com categoria %s',
      async (categoriaId) => {
        await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
        const serie = banco.recorrencias()[0];
        mockNuvem.set(`usuarios/u1/recorrencias/${serie.id}`, {
          intervalo: 2, unidade: 'mes', inicio: serie.inicio, ativa: false,
          valor_centavos: 3200, titulo: 'Série remota', categoria_id: categoriaId,
          atualizado_em: '2999-01-01T00:00:00.000Z',
        });

        await sincronizarPendentes();

        expect(banco.recorrencias()[0]).toMatchObject(categoriaId
          ? { titulo: serie.titulo, sync_status: 'pendente' }
          : { titulo: 'Série remota', intervalo: 2, ativa: 0, sync_status: 'sincronizado' });
      },
    );

    it('envia o marcador de exclusão de uma série que nunca chegou à nuvem', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      const serie = banco.recorrencias()[0];
      const excluidoEm = '2026-11-26T00:00:00.000Z';
      banco.sqlite.prepare('UPDATE recorrencias SET excluido_em = ?, ativa = 0 WHERE id = ?')
        .run(excluidoEm, serie.id);

      await sincronizarPendentes();

      expect(mockNuvem.get(`usuarios/u1/recorrencias/${serie.id}`))
        .toMatchObject({ excluido_em: excluidoEm, ativa: false });
    });

    it('mantém o alerta pendente quando o Firestore recusa o envio', async () => {
      await registrarReceita(input({ data: '2026-10-16', valorCentavos: 1000 }));
      await registrarDespesa({
        data: '2026-10-16', valorCentavos: 1500, titulo: 'Despesa de teste',
        descricao: null, categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
      });
      const [alerta] = await consultarAlertas();
      const ref = `usuarios/u1/alertas_emitidos/${alerta.id}`;
      mockCaminhosRejeitados.add(ref);

      await sincronizarPendentes();

      expect(consumirAcessoNegado()).toBe(true);
      expect(mockNuvem.has(ref)).toBe(false);
      expect(banco.sqlite.prepare('SELECT sync_status FROM alertas_emitidos WHERE id = ?').get(alerta.id))
        .toEqual({ sync_status: 'pendente' });
    });

    it('ignora alertas remotos com dados inválidos', async () => {
      const alerta = {
        mes: '2026-11', anterior_centavos: 10, saldo_centavos: -5,
        criado_em: '2026-11-26T00:00:00.000Z',
      };
      const invalidos = [
        { ...alerta, mes: null },
        { ...alerta, criado_em: null },
        { ...alerta, anterior_centavos: 1.5 },
        { ...alerta, saldo_centavos: 1.5 },
      ];
      invalidos.forEach((dados, indice) => mockNuvem.set(`usuarios/u1/alertas_emitidos/${indice}`, dados));

      await restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' });

      expect(banco.sqlite.prepare('SELECT id FROM alertas_emitidos').all()).toEqual([]);
    });

    it.each(['recorrencia', 'receita', 'despesa', 'alerta'])(
      'aborta o envio de %s se a conta mudar antes da transação remota',
      async (tipo) => {
        const despesa: DespesaInput = {
          data: '2026-10-16', valorCentavos: 1500, titulo: 'Despesa de teste',
          descricao: null, categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
        };
        let caminhoPendente: string;
        if (tipo === 'despesa') {
          await registrarDespesa(despesa);
          caminhoPendente = `usuarios/u1/despesas/${banco.despesas()[0].id}`;
        } else if (tipo === 'alerta') {
          await registrarReceita(input({ valorCentavos: 1000 }));
          await registrarDespesa(despesa);
          const [alerta] = await consultarAlertas();
          caminhoPendente = `usuarios/u1/alertas_emitidos/${alerta.id}`;
          banco.sqlite.exec("UPDATE receitas SET sync_status = 'sincronizado'");
          banco.sqlite.exec("UPDATE despesas SET sync_status = 'sincronizado'");
        } else if (tipo === 'recorrencia') {
          await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
          caminhoPendente = `usuarios/u1/recorrencias/${banco.recorrencias()[0].id}`;
        } else {
          await registrarReceita(input());
          caminhoPendente = caminho(banco.receitas()[0].id);
        }
        mockAntesDaTransacao = () => { mockUsuario = { uid: 'u2', emailVerified: true }; };
        const aoFalhar = jest.fn();

        await sincronizarPendentes({ aoFalhar });

        expect(aoFalhar).toHaveBeenCalledWith(new Error('conta alterada durante a sincronização'));
        expect(mockNuvem.size).toBe(0);

        mockUsuario = { uid: 'u1', emailVerified: true };
        await sincronizarPendentes();
        expect(mockNuvem.has(caminhoPendente)).toBe(true);
      },
    );

    it('aplica a exclusão remota de uma receita com edição local pendente', async () => {
      await registrarReceita(input());
      const { id } = banco.receitas()[0];
      const excluidoEm = '2026-11-26T00:00:00.000Z';
      mockNuvem.set(caminho(id), { excluido_em: excluidoEm, atualizado_em: excluidoEm });

      await expect(sincronizarPendentes()).resolves.toBe(true);

      expect(banco.receitas()[0]).toMatchObject({
        excluido_em: excluidoEm, atualizado_em: excluidoEm, sync_status: 'sincronizado',
      });
      expect(mockOrdemEscritas).toEqual([]);
    });

    it('reverte a restauração se a conta mudar antes do commit local', async () => {
      mockNuvem.set('usuarios/u1/alertas_emitidos/alerta', {
        mes: '2026-11', anterior_centavos: 10, saldo_centavos: -5,
        criado_em: '2026-11-26T00:00:00.000Z',
      });
      const preparar = banco.sqlite.prepare.bind(banco.sqlite);
      const consulta = jest.spyOn(banco.sqlite, 'prepare').mockImplementation((sql: string) => {
        if (sql.includes('INSERT INTO alertas_emitidos')) {
          mockUsuario = { uid: 'u2', emailVerified: true };
        }
        return preparar(sql);
      });

      try {
        await expect(restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' }))
          .rejects.toThrow('conta alterada durante a restauração');
        expect(banco.sqlite.prepare('SELECT id FROM alertas_emitidos').all()).toEqual([]);
      } finally {
        consulta.mockRestore();
      }
    });

    it('retoma após interrupção e não regrava cada item já confirmado', async () => {
      await registrarReceita(input({ titulo: 'Primeira' }));
      await registrarReceita(input({ titulo: 'Segunda' }));
      const ids = banco.receitas().map((r) => r.id);
      const escrever = mockOrdemEscritas.push.bind(mockOrdemEscritas);
      const interromper = jest.spyOn(mockOrdemEscritas, 'push').mockImplementation((...caminhos) => {
        const tamanho = escrever(...caminhos);
        if (tamanho === 1) mockRedeFora = true;
        return tamanho;
      });
      try {
        await sincronizarPendentes();
        expect(banco.receitas().filter((r) => r.sync_status === 'pendente')).toHaveLength(1);
        expect(mockNuvem.size).toBe(1);
      } finally {
        interromper.mockRestore();
        mockRedeFora = false;
      }

      await sincronizarPendentes();
      expect(banco.receitas().every((r) => r.sync_status === 'sincronizado')).toBe(true);
      expect([...mockNuvem.keys()].sort()).toEqual(ids.map(caminho).sort());

      // Simula confirmação remota que chegou antes de o SQLite registrar o recibo.
      banco.sqlite.exec("UPDATE receitas SET sync_status = 'pendente'");
      await sincronizarPendentes();
      expect(mockOrdemEscritas).toHaveLength(2);
      expect(banco.receitas().every((r) => r.sync_status === 'sincronizado')).toBe(true);
    });

    it('atualiza uma receita sincronizada por uma edição remota e preserva uma edição local mais nova', async () => {
      await registrarReceita(input({ titulo: 'Receita inicial' }));
      await registrarReceita(input({ titulo: 'Receita que fica no aparelho' }));
      await sincronizarPendentes();
      const editada = banco.receitas().find((r) => r.titulo === 'Receita inicial');
      const preservada = banco.receitas().find((r) => r.id !== editada.id);
      mockNuvem.set(caminho(editada.id), {
        ...mockNuvem.get(caminho(editada.id)), atualizado_em: '2099-01-01T00:00:00.000Z', valor_centavos: 17500,
      });
      await editarReceita(preservada.id, input({ titulo: 'Edição local', valorCentavos: 20000 }));
      mockNuvem.set(caminho(preservada.id), {
        ...mockNuvem.get(caminho(preservada.id)), atualizado_em: '2000-01-01T00:00:00.000Z',
      });

      expect(await restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' }))
        .toMatchObject({ receitas: 1 });
      expect(banco.receitas().find((r) => r.id === editada.id))
        .toMatchObject({ valor_centavos: 17500, sync_status: 'sincronizado' });
      expect(banco.receitas().find((r) => r.id === preservada.id))
        .toMatchObject({ titulo: 'Edição local', sync_status: 'pendente' });
      expect(await restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' }))
        .toMatchObject({ receitas: 0 });
    });

    it('restaura o alerta pelo mesmo ID sem duplicar a transição', async () => {
      const id = '5'.repeat(32);
      mockNuvem.set(`usuarios/u1/alertas_emitidos/${id}`, {
        mes: '2026-11', anterior_centavos: 10, saldo_centavos: -5,
        criado_em: '2026-11-26T00:00:00.000Z',
      });

      await restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' });
      await restaurarDaNuvem({ servidor: true, uidEsperado: 'u1' });
      expect(banco.sqlite.prepare('SELECT id, transicao, sync_status FROM alertas_emitidos').all())
        .toEqual([{ id, transicao: 1, sync_status: 'sincronizado' }]);
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

      expect(mockNuvem.get(caminho(id))).toEqual({
        excluido_em: expect.any(String), atualizado_em: expect.any(String),
      });
      banco = instalarBanco();
      await restaurarDaNuvem();
      expect(banco.receitas()).toEqual([
        expect.objectContaining({ id, excluido_em: expect.any(String), sync_status: 'sincronizado' }),
      ]);
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
      expect(mockNuvem.get(caminho(id))).toMatchObject({ excluido_em: expect.any(String) });
      expect(banco.receitas()[0]).toMatchObject({ sync_status: 'sincronizado', excluido_em: expect.any(String) });
    });

    it('ocorrência de série excluída mantém lápide sincronizada e não é recriada', async () => {
      await registrarReceita(input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      await sincronizarPendentes();
      const rec = banco.recorrencias()[0];
      const idExcluido = `${rec.id}_2026-12-16`;

      await excluirReceita(idExcluido, 'esta');
      await sincronizarPendentes();

      expect(mockNuvem.get(caminho(idExcluido))).toMatchObject({ excluido_em: expect.any(String) });
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
      expect(mockNuvem.get(caminho(id))).toMatchObject({ excluido_em: expect.any(String) });
      expect(banco.receitas()[0]).toMatchObject({ sync_status: 'sincronizado', excluido_em: expect.any(String) });
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

    async function prepararConflito(categoriaLocal: string | null = 'casa') {
      await registrarDespesa(dados({ categoriaId: categoriaLocal }));
      await sincronizarPendentes();

      const id = banco.despesas()[0].id;
      await editarDespesa(
        id,
        dados({ titulo: 'Local', categoriaId: categoriaLocal }),
      );

      const path = caminhoD(id);
      return { id, path, remoto: mockNuvem.get(path) };
    }

    it('EX08: referência remota inválida preserva a categoria local', async () => {
      inserirCategoria();
      const { path, remoto } = await prepararConflito('casa');

      mockNuvem.set(path, {
        ...remoto,
        titulo: 'Da nuvem',
        categoria_id: 'categoria-removida',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      const mudou = await sincronizarPendentes();

      expect(mudou).toBe(true);
      expect(banco.despesas()[0]).toMatchObject({
        titulo: 'Da nuvem',
        categoria_id: 'casa',
        sync_status: 'sincronizado',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
    });

    it('conflito com ID real de categoria padrão ativa grava o ID remoto', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      inserirCategoria({
        id: 'uuid-remota',
        nome: 'Remota',
        nome_normalizado: 'remota',
      });

      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'uuid-remota',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-remota');
    });

    it('conflito com ID real de categoria própria ativa grava o ID remoto', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      inserirCategoria({
        id: 'uuid-mercado',
        nome: 'Mercado',
        nome_normalizado: 'mercado',
        padrao: 0,
      });

      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'uuid-mercado',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-mercado');
    });

    it('conflito com slug histórico remoto converte para o ID real da padrão', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      inserirCategoria({
        id: 'uuid-alimentacao',
        nome: 'Alimentação',
        nome_normalizado: 'alimentação',
      });

      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'alimentacao',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-alimentacao');
      expect(banco.despesas()[0].categoria_id).not.toBe('alimentacao');
    });

    it('conflito com ID remoto desconhecido preserva a categoria local', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'uuid-desconhecido',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
    });

    it('conflito com categoria remota excluída preserva a categoria local', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      inserirCategoria({
        id: 'uuid-antiga',
        nome: 'Antiga',
        nome_normalizado: 'antiga',
        excluido_em: '2026-02-01T00:00:00Z',
      });
      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'uuid-antiga',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
    });

    it('conflito com slug sem padrão local preserva a categoria local', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: 'alimentacao',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
    });

    it('conflito com categoria_id remoto ausente limpa para NULL', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      const { path, remoto } = await prepararConflito('uuid-casa');
      const semCategoria = { ...remoto };
      delete semCategoria.categoria_id;

      mockNuvem.set(path, {
        ...semCategoria,
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('conflito com categoria_id remoto null limpa para NULL', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      const { path, remoto } = await prepararConflito('uuid-casa');

      mockNuvem.set(path, {
        ...remoto,
        categoria_id: null,
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      await sincronizarPendentes();

      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('conflito inválido atualiza demais campos, mantém timestamp/status e não reenvia', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      const { path, remoto } = await prepararConflito('uuid-casa');
      const remotoNovo = {
        ...remoto,
        titulo: 'Da nuvem',
        valor_centavos: 777,
        data: '2027-01-01',
        descricao: 'Descrição remota',
        categoria_id: 'uuid-desconhecido',
        fixa_ou_variavel: 'variavel',
        essencial: 0,
        atualizado_em: '2999-01-01T00:00:00.000Z',
      };
      mockNuvem.set(path, remotoNovo);

      await sincronizarPendentes();

      expect(banco.despesas()[0]).toMatchObject({
        titulo: 'Da nuvem',
        valor_centavos: 777,
        data: '2027-01-01',
        descricao: 'Descrição remota',
        categoria_id: 'uuid-casa',
        fixa_ou_variavel: 'variavel',
        essencial: 0,
        sync_status: 'sincronizado',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });

      const leiturasAntes = mockLeiturasRemotas;
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.get(path)).toEqual(remotoNovo);
      expect(mockLeiturasRemotas).toBe(leiturasAntes);
    });

    it('consulta categorias no máximo uma vez nos conflitos e nunca sem conflito', async () => {
      inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
      inserirCategoria({
        id: 'uuid-remota-1',
        nome: 'Remota 1',
        nome_normalizado: 'remota 1',
      });
      inserirCategoria({
        id: 'uuid-remota-2',
        nome: 'Remota 2',
        nome_normalizado: 'remota 2',
      });

      await registrarDespesa(
        dados({ titulo: 'A', data: '2026-10-16', categoriaId: 'uuid-casa' }),
      );
      await registrarDespesa(
        dados({ titulo: 'B', data: '2026-10-17', categoriaId: 'uuid-casa' }),
      );
      await sincronizarPendentes();

      const a = banco.despesas().find((d) => d.titulo === 'A')!;
      const b = banco.despesas().find((d) => d.titulo === 'B')!;
      await editarDespesa(a.id, dados({
        titulo: 'Local A',
        data: '2026-10-16',
        categoriaId: 'uuid-casa',
      }));
      await editarDespesa(b.id, dados({
        titulo: 'Local B',
        data: '2026-10-17',
        categoriaId: 'uuid-casa',
      }));

      mockNuvem.set(caminhoD(a.id), {
        ...mockNuvem.get(caminhoD(a.id)),
        categoria_id: 'uuid-remota-1',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });
      mockNuvem.set(caminhoD(b.id), {
        ...mockNuvem.get(caminhoD(b.id)),
        categoria_id: 'uuid-remota-2',
        atualizado_em: '2999-01-01T00:00:00.000Z',
      });

      const prepareOriginal = banco.sqlite.prepare.bind(banco.sqlite);
      let consultasCategorias = 0;
      const spy = jest
        .spyOn(banco.sqlite, 'prepare')
        .mockImplementation((sql: string) => {
          if (sql.includes('SELECT * FROM categorias')) consultasCategorias++;
          return prepareOriginal(sql);
        });

      try {
        await sincronizarPendentes();
        expect(consultasCategorias).toBe(1);

        consultasCategorias = 0;
        expect(await sincronizarPendentes()).toBe(false);
        expect(consultasCategorias).toBe(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('registro local mais recente sobrescreve a nuvem', async () => {
      inserirCategoria();
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
      inserirCategoria();
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
    it('identifica a receita recusada e envia a próxima da fila', async () => {
      await registrarReceita(input({ titulo: 'Recusada' }));
      await registrarReceita(input({ titulo: 'Aceita' }));
      const recusada = banco.receitas().find((receita) => receita.titulo === 'Recusada')!;
      const aceita = banco.receitas().find((receita) => receita.titulo === 'Aceita')!;
      const aoFalhar = jest.fn();
      mockCaminhosRejeitados.add(caminho(recusada.id));

      await sincronizarPendentes({ aoFalhar });

      expect(aoFalhar).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'permission-denied' }),
        { tipo: 'Receita', id: recusada.id, revisao: recusada.atualizado_em },
      );
      expect(mockNuvem.has(caminho(recusada.id))).toBe(false);
      expect(mockNuvem.has(caminho(aceita.id))).toBe(true);
      expect(banco.receitas().find(({ id }) => id === recusada.id)?.sync_status).toBe('pendente');
      expect(banco.receitas().find(({ id }) => id === aceita.id)?.sync_status).toBe('sincronizado');
    });

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
    it('integra o documento único do saldo inicial à restauração da conta', async () => {
      const dados = { valor_centavos: -12550, mes_referencia: '2026-11' };
      mockNuvem.set('usuarios/u1/saldo_inicial/atual', dados);

      await restaurarDaNuvem();

      expect(mockDocumentosLidos).toContain('usuarios/u1/saldo_inicial/atual');
      expect(await lerSaldoInicial()).toMatchObject({ ...dados, sync_status: 'sincronizado' });
    });

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
        inserirCategoria();
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();
        const antes = banco.despesas()[0];

        banco = instalarBanco(); // aparelho novo
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(1);
        expect(banco.despesas()).toHaveLength(1);
        expect(banco.despesas()[0]).toMatchObject({
          id: antes.id,
          valor_centavos: 150000,
          titulo: 'Aluguel',
          categoria_id: 'uuid-casa',
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
        inserirCategoria();
        await registrarDespesa(
          dadosDespesa({
            recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
          }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        const resultado = await restaurarDaNuvem();

        expect(resultado.recorrencias).toBe(1);
        expect(banco.recorrencias()[0]).toMatchObject({
          tipo: 'despesa',
          categoria_id: 'uuid-casa',
          fixa_ou_variavel: 'fixa',
          essencial: 1,
          sync_status: 'sincronizado',
        });

        await completarRecorrencias();
        await completarRecorrenciasDespesas();

        expect(banco.receitas()).toHaveLength(0);
      });

      const caminhoD = (id: string) => `usuarios/u1/despesas/${id}`;

      it('restaura despesa com ID real de categoria ativa local', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-casa' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
      });

      it('restaura despesa com categoria própria ativa', async () => {
        inserirCategoria({
          id: 'uuid-mercado',
          nome: 'Mercado',
          nome_normalizado: 'mercado',
          padrao: 0,
        });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-mercado' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({
          id: 'uuid-mercado',
          nome: 'Mercado',
          nome_normalizado: 'mercado',
          padrao: 0,
        });
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBe('uuid-mercado');
      });

      it('converte slug histórico em ID real da categoria padrão', async () => {
        inserirCategoria({
          id: 'uuid-alimentacao',
          nome: 'Alimentação',
          nome_normalizado: 'alimentação',
        });
        await registrarDespesa(
          dadosDespesa({ categoriaId: 'alimentacao' }),
        );
        await sincronizarPendentes();

        const id = banco.despesas()[0].id;
        mockNuvem.set(caminhoD(id), {
          ...mockNuvem.get(caminhoD(id)),
          categoria_id: 'alimentacao',
        });

        banco = instalarBanco();
        inserirCategoria({
          id: 'uuid-alimentacao',
          nome: 'Alimentação',
          nome_normalizado: 'alimentação',
        });
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBe('uuid-alimentacao');
        expect(banco.despesas()[0].categoria_id).not.toBe('alimentacao');
      });

      it('restaura recorrência de despesa com ID real local', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(
          dadosDespesa({
            categoriaId: 'uuid-casa',
            recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
          }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await restaurarDaNuvem();

        expect(banco.recorrencias()[0].categoria_id).toBe('uuid-casa');
      });

      it('converte slug histórico em recorrência de despesa', async () => {
        inserirCategoria({
          id: 'uuid-alimentacao',
          nome: 'Alimentação',
          nome_normalizado: 'alimentação',
        });
        await registrarDespesa(
          dadosDespesa({
            categoriaId: 'alimentacao',
            recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
          }),
        );
        await sincronizarPendentes();

        const rec = banco.recorrencias()[0];
        mockNuvem.set(`usuarios/u1/recorrencias/${rec.id}`, {
          ...mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`),
          categoria_id: 'alimentacao',
        });

        banco = instalarBanco();
        inserirCategoria({
          id: 'uuid-alimentacao',
          nome: 'Alimentação',
          nome_normalizado: 'alimentação',
        });
        await restaurarDaNuvem();

        expect(banco.recorrencias()[0].categoria_id).toBe('uuid-alimentacao');
        expect(banco.recorrencias()[0].categoria_id).not.toBe('alimentacao');
      });

      it('ID desconhecido fica pendente e é restaurado quando o vínculo é criado', async () => {
        inserirCategoria({
          id: 'uuid-desconhecido',
          nome: 'Desconhecida',
          nome_normalizado: 'desconhecida',
          padrao: 0,
        });
        await registrarDespesa(
          dadosDespesa({ categoriaId: 'uuid-desconhecido' }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await restaurarDaNuvem();

        expect(banco.despesas()).toHaveLength(0);
        expect(
          banco.sqlite
            .prepare("SELECT COUNT(*) AS n FROM restauracao_pendente WHERE tipo = 'despesa'")
            .get(),
        ).toEqual({ n: 1 });

        inserirCategoria({
          id: 'uuid-desconhecido',
          nome: 'Desconhecida',
          nome_normalizado: 'desconhecida',
          padrao: 0,
        });
        expect((await restaurarDaNuvem()).despesas).toBe(1);
        expect(banco.despesas()[0].categoria_id).toBe('uuid-desconhecido');
      });

      it('categoria excluída é restaurada como NULL', async () => {
        inserirCategoria({
          id: 'uuid-antiga',
          nome: 'Antiga',
          nome_normalizado: 'antiga',
          padrao: 0,
        });
        await registrarDespesa(
          dadosDespesa({ categoriaId: 'uuid-antiga' }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        inserirCategoria({
          id: 'uuid-antiga',
          nome: 'Antiga',
          nome_normalizado: 'antiga',
          excluido_em: '2026-02-01T00:00:00Z',
        });
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBeNull();
      });

      it('campo remoto explícito null é restaurado como NULL', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-casa' }));
        await sincronizarPendentes();

        const id = banco.despesas()[0].id;
        mockNuvem.set(caminhoD(id), {
          ...mockNuvem.get(caminhoD(id)),
          categoria_id: null,
          atualizado_em: '2999-01-01T00:00:00.000Z',
        });

        banco = instalarBanco();
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBeNull();
      });

      it('campo remoto ausente é restaurado como NULL', async () => {
        await registrarDespesa(dadosDespesa({ categoriaId: null }));
        await sincronizarPendentes();

        banco = instalarBanco();
        await restaurarDaNuvem();

        expect(banco.despesas()[0].categoria_id).toBeNull();
      });

      it('recorrência de receita continua sem categoria', async () => {
        await registrarReceita(
          input({
            recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
          }),
        );
        await sincronizarPendentes();

        const rec = banco.recorrencias()[0];
        mockNuvem.set(`usuarios/u1/recorrencias/${rec.id}`, {
          ...mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`),
          categoria_id: 'uuid-casa',
        });

        banco = instalarBanco();
        await restaurarDaNuvem();

        expect(banco.recorrencias()[0].tipo).toBe('receita');
        expect(banco.recorrencias()[0].categoria_id).toBeNull();
      });

      it('é idempotente com ID real de categoria', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-casa' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await restaurarDaNuvem();
        expect(banco.despesas()).toHaveLength(1);

        expect((await restaurarDaNuvem()).despesas).toBe(0);
        expect(banco.despesas()[0].categoria_id).toBe('uuid-casa');
      });

      it('catálogo vazio adia a categorizada e restaura as demais', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-casa' }));
        await registrarDespesa(
          dadosDespesa({
            categoriaId: null,
            titulo: 'Sem categoria',
            data: '2026-10-17',
          }),
        );
        await sincronizarPendentes();

        banco = instalarBanco();
        const primeiro = await restaurarDaNuvem();

        expect(primeiro.despesas).toBe(1);
        expect(banco.despesas()).toHaveLength(1);
        expect(banco.despesas()[0].titulo).toBe('Sem categoria');
        expect(
          banco.sqlite
            .prepare("SELECT COUNT(*) AS n FROM restauracao_pendente WHERE tipo = 'despesa'")
            .get(),
        ).toEqual({ n: 1 });

        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(1);
        expect(
          banco.despesas().find((d) => d.titulo === 'Aluguel')?.categoria_id,
        ).toBe('uuid-casa');
        expect(
          banco.despesas().find((d) => d.titulo === 'Sem categoria')
            ?.categoria_id,
        ).toBeNull();
      });

      it.each([true, false])(
        'catálogo vazio adia série de despesa categorizada (ativa=%s)',
        async (ativa) => {
          inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
          await registrarDespesa(
            dadosDespesa({
              categoriaId: 'uuid-casa',
              recorrencia: {
                intervalo: 1,
                unidade: 'mes',
                termino: '2026-12-16',
              },
            }),
          );
          await sincronizarPendentes();

          if (!ativa) {
            const rec = banco.recorrencias()[0];
            mockNuvem.set(`usuarios/u1/recorrencias/${rec.id}`, {
              ...mockNuvem.get(`usuarios/u1/recorrencias/${rec.id}`),
              ativa: false,
            });
          }

          banco = instalarBanco();
          await expect(restaurarDaNuvem()).resolves.toMatchObject({ recorrencias: 0 });
          expect(banco.despesas()).toHaveLength(0);
          expect(banco.recorrencias()).toHaveLength(0);
          expect(
            banco.sqlite
              .prepare("SELECT COUNT(*) AS n FROM restauracao_pendente")
              .get(),
          ).toEqual({ n: 4 });

          inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
          await restaurarDaNuvem();
          expect(banco.recorrencias()).toHaveLength(1);
          expect(banco.recorrencias()[0].categoria_id).toBe('uuid-casa');
          expect(banco.despesas()).toHaveLength(3);
        },
      );

      it('catálogo vazio permite restaurar somente receitas', async () => {
        await registrarReceita(input());
        await sincronizarPendentes();

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.receitas).toBe(1);
        expect(banco.receitas()).toHaveLength(1);
      });

      it('catálogo vazio permite restaurar despesas sem categoria', async () => {
        await registrarDespesa(dadosDespesa({ categoriaId: null }));
        await sincronizarPendentes();

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(1);
        expect(banco.despesas()[0].categoria_id).toBeNull();
      });

      it('lápide remota com categoria_id não bloqueia a restauração', async () => {
        mockNuvem.set('usuarios/u1/despesas/lapide', {
          excluido_em: '2026-03-01T00:00:00Z',
          atualizado_em: '2026-03-01T00:00:00Z',
          categoria_id: 'uuid-casa',
        });

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(0);
        expect(banco.despesas()).toHaveLength(1);
        expect(banco.despesas()[0]).toMatchObject({
          id: 'lapide',
          categoria_id: null,
          excluido_em: '2026-03-01T00:00:00Z',
        });
      });

      it('registro sem vínculo não altera os locais preexistentes', async () => {
        await registrarDespesa(
          dadosDespesa({ categoriaId: null, titulo: 'Local' }),
        );
        const antes = banco.instantaneo();

        mockNuvem.set('usuarios/u1/despesas/remota', {
          valor_centavos: 100,
          data: '2026-10-16',
          titulo: 'Remota',
          categoria_id: 'uuid-casa',
          criado_em: '2026-10-16T00:00:00Z',
          atualizado_em: '2026-10-16T00:00:00Z',
        });

        await expect(restaurarDaNuvem()).resolves.toMatchObject({ despesas: 0 });
        expect(banco.instantaneo()).toEqual(antes);
        expect(
          banco.sqlite
            .prepare("SELECT COUNT(*) AS n FROM restauracao_pendente WHERE tipo = 'despesa'")
            .get(),
        ).toEqual({ n: 1 });
      });

      // A exclusão local é um vínculo resolvido: a despesa volta como
      // "Sem categoria", preservando o registro financeiro (RN07/RN13).
      it('categoria excluída localmente resolve a despesa como Sem categoria', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa({ categoriaId: 'uuid-casa' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({
          id: 'uuid-casa',
          nome: 'Casa',
          excluido_em: '2026-02-01T00:00:00Z',
        });

        expect((await restaurarDaNuvem()).despesas).toBe(1);
        expect(banco.despesas()[0].categoria_id).toBeNull();
      });

      // Caso de borda B: documento inválido seria ignorado pelo laço.
      // Esperado: restaurar sem bloquear e não inserir o documento inválido.
      it('documento remoto inválido com categoria não bloqueia', async () => {
        mockNuvem.set('usuarios/u1/despesas/invalida', {
          valor_centavos: -5,
          data: '2026-10-16',
          titulo: 'Inválida',
          categoria_id: 'uuid-casa',
        });

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(0);
        expect(banco.despesas()).toHaveLength(0);
      });

      it('EX08: adia série e ocorrências até a categoria ser resolvida', async () => {
        inserirCategoria({
          id: 'categoria-removida',
          nome: 'Removida',
          nome_normalizado: 'removida',
          padrao: 0,
        });
        await registrarDespesa(dadosDespesa({
          categoriaId: 'categoria-removida',
          recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
        }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        expect(await restaurarDaNuvem()).toMatchObject({ despesas: 0, recorrencias: 0 });
        expect(banco.despesas()).toHaveLength(0);
        expect(banco.recorrencias()).toHaveLength(0);
        expect(
          banco.sqlite
            .prepare("SELECT COUNT(*) AS n FROM restauracao_pendente")
            .get(),
        ).toEqual({ n: 4 });

        inserirCategoria({
          id: 'categoria-removida',
          nome: 'Removida',
          nome_normalizado: 'removida',
          padrao: 0,
        });
        expect((await restaurarDaNuvem()).despesas).toBe(3);
        expect(banco.recorrencias()[0].categoria_id).toBe('categoria-removida');
        expect(banco.despesas().map((d) => d.categoria_id)).toEqual([
          'categoria-removida',
          'categoria-removida',
          'categoria-removida',
        ]);
      });

      it('RN07: restaura o marcador e não gera novamente a ocorrência excluída', async () => {
        await registrarDespesa(dadosDespesa({
          recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
        }));
        const { id } = banco.despesas()[0];
        await excluirDespesa(id, 'esta');
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await restaurarDaNuvem();
        await completarRecorrenciasDespesas();

        expect(banco.despesas().find(d => d.id === id)?.excluido_em).toBeTruthy();
        expect((await restaurarDaNuvem()).despesas).toBe(0);
      });

      it('é idempotente: restaurar duas vezes não duplica despesas', async () => {
        await registrarDespesa(dadosDespesa({ titulo: 'Avulsa' }));
        await sincronizarPendentes();

        banco = instalarBanco();
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
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

        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
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

      it('tombstone remoto de despesa preserva os dados locais existentes', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(dadosDespesa());
        await sincronizarPendentes();

        const d = banco.despesas()[0];
        const remoto = {
          excluido_em: '2026-10-20T12:00:00.000Z',
          atualizado_em: '2026-10-20T12:00:00.000Z',
        };
        mockNuvem.set(caminhoD(d.id), remoto);

        const resultado = await restaurarDaNuvem();

        expect(resultado.despesas).toBe(0);
        expect(banco.despesas()[0]).toMatchObject({
          id: d.id,
          valor_centavos: 150000,
          data: '2026-10-16',
          titulo: 'Aluguel',
          categoria_id: d.categoria_id,
          excluido_em: remoto.excluido_em,
          sync_status: 'sincronizado',
        });

        await restaurarDaNuvem();
        expect(banco.despesas()[0].excluido_em).toBe(remoto.excluido_em);
      });

      it('tombstone remoto de série exclui as ocorrências locais preservando o histórico', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(
          dadosDespesa({
            recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
          }),
        );
        await sincronizarPendentes();

        const serie = banco.recorrencias()[0];
        const ocorrencias = banco.despesas();
        const remoto = {
          ...mockNuvem.get(`usuarios/u1/recorrencias/${serie.id}`),
          ativa: false,
          excluido_em: '2026-10-20T12:00:00.000Z',
          atualizado_em: '2026-10-20T12:00:00.000Z',
        };
        mockNuvem.set(`usuarios/u1/recorrencias/${serie.id}`, remoto);

        const resultado = await restaurarDaNuvem();

        expect(resultado.recorrencias).toBe(0);
        expect(banco.recorrencias()[0]).toMatchObject({
          tipo: 'despesa',
          ativa: 0,
          excluido_em: remoto.excluido_em,
          valor_centavos: 150000,
          titulo: 'Aluguel',
          sync_status: 'sincronizado',
        });
        expect(banco.despesas()).toHaveLength(ocorrencias.length);
        for (const original of ocorrencias) {
          expect(banco.despesas().find((d) => d.id === original.id)).toMatchObject({
            valor_centavos: original.valor_centavos,
            data: original.data,
            titulo: original.titulo,
            recorrencia_id: serie.id,
            excluido_em: remoto.excluido_em,
            sync_status: 'pendente',
          });
        }

        const total = banco.despesas().length;
        fixarHoje('2027-06-01');
        await completarRecorrenciasDespesas();
        expect(banco.despesas()).toHaveLength(total);
      });

      it('tombstone remoto de série desconhecida restaura o snapshot financeiro', async () => {
        mockNuvem.set('usuarios/u1/recorrencias/serie-lapide', {
          tipo: 'despesa',
          intervalo: 1,
          unidade: 'mes',
          inicio: '2026-01-10',
          ativa: false,
          valor_centavos: 70000,
          titulo: 'Academia',
          categoria_id: 'uuid-casa',
          fixa_ou_variavel: 'fixa',
          essencial: 1,
          atualizado_em: '2026-03-01T00:00:00.000Z',
          excluido_em: '2026-03-01T00:00:00.000Z',
        });

        banco = instalarBanco();
        const resultado = await restaurarDaNuvem();

        expect(resultado.recorrencias).toBe(1);
        expect(banco.recorrencias()[0]).toMatchObject({
          id: 'serie-lapide',
          tipo: 'despesa',
          ativa: 0,
          valor_centavos: 70000,
          titulo: 'Academia',
          categoria_id: null,
          excluido_em: '2026-03-01T00:00:00.000Z',
          sync_status: 'sincronizado',
        });
      });

      it('tombstone local de série prevalece sobre série remota ativa', async () => {
        inserirCategoria({ id: 'uuid-casa', nome: 'Casa' });
        await registrarDespesa(
          dadosDespesa({
            recorrencia: { intervalo: 1, unidade: 'mes', termino: null },
          }),
        );
        await sincronizarPendentes();

        const serie = banco.recorrencias()[0];
        await excluirDespesa(banco.despesas()[0].id, 'todas');
        const excluidoLocal = banco.recorrencias()[0].excluido_em;

        await restaurarDaNuvem();

        expect(banco.recorrencias()[0]).toMatchObject({
          id: serie.id,
          ativa: 0,
          excluido_em: excluidoLocal,
        });
        expect(mockNuvem.get(`usuarios/u1/recorrencias/${serie.id}`)).toMatchObject({
          ativa: true,
        });
      });
    });

    it('sem conta: não restaura', async () => {
      mockUsuario = null;
      await expect(restaurarDaNuvem()).rejects.toBeInstanceOf(FalhaRestauracao);
    });
  });

  describe('sincronização de categorias (B1/B2)', () => {
    const catPath = (id: string) => `usuarios/u1/categorias/${id}`;
    const despPath = (id: string) => `usuarios/u1/despesas/${id}`;
    const serPath = (id: string) => `usuarios/u1/recorrencias/${id}`;

    function despesaInput(categoriaId: string | null, extra: Partial<DespesaInput> = {}): DespesaInput {
      return {
        valorCentavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        descricao: null,
        categoriaId,
        fixaOuVariavel: null,
        essencial: null,
        recorrencia: null,
        ...extra,
      };
    }

    function catLocal(id: string): any {
      return banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    }

    function estadoLocal(id: string): string | undefined {
      return (
        banco.sqlite
          .prepare('SELECT estado_local FROM categorias_estado WHERE categoria_id = ?')
          .get(id) as { estado_local: string } | undefined
      )?.estado_local;
    }

    /**
     * Simula a edição local que ocorre depois do snapshot de envio.
     * Mantém `atualizado_em` inalterado para provar que a assinatura de versão
     * detecta a mudança mesmo quando o relógio tem a mesma resolução.
     */
    function editarLocalConcorrente(id: string, limiteCentavos: number): void {
      banco.sqlite
        .prepare(
          `UPDATE categorias
              SET limite_centavos = ?, sync_status = 'pendente'
            WHERE id = ?`,
        )
        .run(limiteCentavos, id);
      banco.sqlite
        .prepare(
          `UPDATE categorias_estado
              SET estado_local = 'editado'
            WHERE categoria_id = ?`,
        )
        .run(id);
    }

    /** Simula a exclusão local concorrente com o mesmo efeito do serviço. */
    function excluirLocalConcorrente(id: string, excluidoEm: string): void {
      banco.sqlite
        .prepare(
          `UPDATE despesas
              SET categoria_id = NULL, sync_status = 'pendente', atualizado_em = ?
            WHERE categoria_id = ? AND excluido_em IS NULL`,
        )
        .run(excluidoEm, id);
      banco.sqlite
        .prepare(
          `UPDATE recorrencias
              SET categoria_id = NULL, sync_status = 'pendente', atualizado_em = ?
            WHERE categoria_id = ? AND tipo = 'despesa'`,
        )
        .run(excluidoEm, id);
      banco.sqlite
        .prepare(
          `UPDATE categorias
              SET excluido_em = ?, limite_tipo = NULL, limite_centavos = NULL,
                  limite_percentual_centesimos = NULL,
                  sync_status = 'pendente', atualizado_em = ?
            WHERE id = ?`,
        )
        .run(excluidoEm, excluidoEm, id);
      banco.sqlite
        .prepare(
          `UPDATE categorias_estado
              SET estado_local = 'editado'
            WHERE categoria_id = ?`,
        )
        .run(id);
    }

    function pendentes(): number {
      return (
        banco.sqlite.prepare('SELECT COUNT(*) AS n FROM restauracao_pendente').get() as { n: number }
      ).n;
    }

    function docCategoriaRemota(extra: Record<string, unknown> = {}) {
      return {
        padrao: false,
        chave: null,
        nome: 'Mercado',
        nome_normalizado: 'mercado',
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
        excluido_em: null,
        criado_em: '2026-01-01T00:00:00.000Z',
        atualizado_em: '2026-01-02T00:00:00.000Z',
        aliases: [],
        ...extra,
      };
    }

    it('restaura despesa Casa entre bancos com UUIDs padrão diferentes', async () => {
      inserirCategoria({
        id: 'uuid-casa-a',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
        sync_status: 'pendente',
      });
      await registrarDespesa(despesaInput('uuid-casa-a'));
      await sincronizarPendentes();

      const despesaId = banco.despesas()[0].id;
      expect(mockNuvem.get(catPath('padrao_casa'))).toMatchObject({
        padrao: true,
        chave: 'casa',
        aliases: expect.arrayContaining(['uuid-casa-a']),
      });
      expect(mockNuvem.get(despPath(despesaId)).categoria_id).toBe('casa');

      banco = instalarBanco();
      inserirCategoria({
        id: 'uuid-casa-b',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
      });
      await restaurarDaNuvem();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-casa-b');
      expect(catLocal('uuid-casa-b')).toMatchObject({ padrao: 1 });
    });

    it('restaura série e ocorrências entre bancos com UUIDs padrão diferentes', async () => {
      inserirCategoria({
        id: 'uuid-casa-a',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
        sync_status: 'pendente',
      });
      await registrarDespesa(
        despesaInput('uuid-casa-a', {
          recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' },
        }),
      );
      await sincronizarPendentes();

      banco = instalarBanco();
      inserirCategoria({
        id: 'uuid-casa-b',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
      });
      await restaurarDaNuvem();

      expect(banco.recorrencias()[0].categoria_id).toBe('uuid-casa-b');
      expect(banco.despesas()).toHaveLength(3);
      expect(banco.despesas().every((d) => d.categoria_id === 'uuid-casa-b')).toBe(true);
    });

    it('padrão recém-semeada não sobrescreve limite remoto e mescla aliases', async () => {
      await semearCategoriasPadrao();
      const casa = banco.sqlite
        .prepare("SELECT id FROM categorias WHERE nome_normalizado = 'casa'")
        .get() as { id: string };
      mockNuvem.set(
        catPath('padrao_casa'),
        docCategoriaRemota({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          limite_tipo: 'valor',
          limite_centavos: 5000,
          aliases: ['uuid-casa-de-outro-aparelho'],
        }),
      );

      await sincronizarPendentes();

      expect(catLocal(casa.id)).toMatchObject({
        limite_tipo: 'valor',
        limite_centavos: 5000,
        sync_status: 'sincronizado',
      });
      expect(estadoLocal(casa.id)).toBe('sincronizado');
      expect(mockNuvem.get(catPath('padrao_casa')).aliases).toEqual(
        expect.arrayContaining(['uuid-casa-de-outro-aparelho', casa.id]),
      );
    });

    it('normaliza percentual legado remoto e reenvia o valor corrigido ao Firestore', async () => {
      mockNuvem.set(
        catPath('legado'),
        docCategoriaRemota({
          nome: 'Legado',
          nome_normalizado: 'legado',
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 50, // 0,50% legado
        }),
      );

      await restaurarDaNuvem();

      expect(catLocal('legado')).toMatchObject({
        limite_percentual_centesimos: 100,
        sync_status: 'pendente',
      });

      await sincronizarPendentes();

      expect(mockNuvem.get(catPath('legado')).limite_percentual_centesimos).toBe(100);
      expect(catLocal('legado')).toMatchObject({
        limite_percentual_centesimos: 100,
        sync_status: 'sincronizado',
      });
    });

    it('restaura despesa antiga com UUID de padrão via alias do documento canônico', async () => {
      banco = instalarBanco();
      inserirCategoria({
        id: 'uuid-casa-b',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
      });
      mockNuvem.set(
        catPath('padrao_casa'),
        docCategoriaRemota({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          aliases: ['uuid-casa-a'],
        }),
      );
      mockNuvem.set(despPath('despesa-antiga'), {
        valor_centavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        categoria_id: 'uuid-casa-a',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });

      await restaurarDaNuvem();

      expect(banco.despesas()[0].categoria_id).toBe('uuid-casa-b');
    });

    it('sincroniza categoria própria preservando o UUID e restaura em outro banco', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id))).toMatchObject({
        padrao: false,
        nome: 'Mercado',
        aliases: [],
      });
      expect(mockNuvem.get(despPath(banco.despesas()[0].id)).categoria_id).toBe(id);

      banco = instalarBanco();
      await restaurarDaNuvem();

      expect(catLocal(id)).toMatchObject({ id, nome: 'Mercado', padrao: 0 });
      expect(banco.despesas()[0].categoria_id).toBe(id);
    });

    it('exclusão offline permanece pendente e sincroniza na retomada', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();

      await excluirCategoria(id);
      mockRedeFora = true;
      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({ sync_status: 'pendente' });
      expect(catLocal(id).excluido_em).toBeTruthy();
      expect(mockNuvem.get(catPath(id)).excluido_em).toBeNull();

      mockRedeFora = false;
      await sincronizarPendentes();
      expect(mockNuvem.get(catPath(id)).excluido_em).toEqual(expect.any(String));

      banco = instalarBanco();
      await restaurarDaNuvem();
      expect(catLocal(id)).toBeUndefined();
      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('edição remota mais recente da mesma categoria vence a edição local', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await sincronizarPendentes();
      await editarCategoria(id, { nome: 'Mercado local', limite: null });

      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          nome: 'Mercado remoto',
          nome_normalizado: 'mercado remoto',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );
      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({
        nome: 'Mercado remoto',
        sync_status: 'sincronizado',
      });
      expect(mockNuvem.get(catPath(id)).nome).toBe('Mercado remoto');
    });

    it('edição local mais recente da mesma categoria sobrescreve a remota', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await sincronizarPendentes();
      await editarCategoria(id, { nome: 'Mercado local', limite: null });

      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          nome: 'Mercado remoto',
          nome_normalizado: 'mercado remoto',
          atualizado_em: '2020-01-01T00:00:00.000Z',
        }),
      );
      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id)).nome).toBe('Mercado local');
      expect(catLocal(id)).toMatchObject({
        nome: 'Mercado local',
        sync_status: 'sincronizado',
      });
    });

    it('exclusão local prevalece sobre edição remota concorrente', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();
      await excluirCategoria(id);

      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          nome: 'Mercado remoto',
          nome_normalizado: 'mercado remoto',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );
      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id)).excluido_em).toEqual(expect.any(String));
      expect(catLocal(id).excluido_em).toBeTruthy();
      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('tombstone remoto prevalece sobre edição local concorrente', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();
      await editarCategoria(id, { nome: 'Mercado novo', limite: null });

      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          nome: 'Mercado',
          nome_normalizado: 'mercado',
          excluido_em: '2999-01-01T00:00:00.000Z',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );
      await sincronizarPendentes();

      expect(catLocal(id).excluido_em).toBeTruthy();
      expect(estadoLocal(id)).toBe('sincronizado');
      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('falha de rede mantém categoria pendente e nova tentativa envia', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      mockRedeFora = true;
      await sincronizarPendentes();

      expect(mockNuvem.has(catPath(id))).toBe(false);
      expect(catLocal(id).sync_status).toBe('pendente');

      mockRedeFora = false;
      await sincronizarPendentes();
      expect(mockNuvem.get(catPath(id))).toMatchObject({ padrao: false, nome: 'Mercado' });
      expect(catLocal(id).sync_status).toBe('sincronizado');
    });

    it('restauração repetida não duplica categoria nem despesa', async () => {
      inserirCategoria({
        id: 'uuid-casa-a',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
        sync_status: 'pendente',
      });
      await registrarDespesa(despesaInput('uuid-casa-a'));
      await sincronizarPendentes();

      banco = instalarBanco();
      inserirCategoria({
        id: 'uuid-casa-b',
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 1,
      });
      await restaurarDaNuvem();
      await restaurarDaNuvem();

      expect(
        banco.sqlite.prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa'").get(),
      ).toEqual({ n: 1 });
      expect(banco.despesas()).toHaveLength(1);
      expect(pendentes()).toBe(0);
    });

    it('categoria própria com nome reservado adia a padrão sem fundir', async () => {
      const propria = await criarCategoria({ nome: 'Casa', limite: null });
      mockNuvem.set(
        catPath('padrao_casa'),
        docCategoriaRemota({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
        }),
      );
      mockNuvem.set(
        despPath('despesa-casa'),
        {
          valor_centavos: 1000,
          data: '2026-10-16',
          titulo: 'Mercado',
          categoria_id: 'casa',
          criado_em: '2026-10-16T00:00:00Z',
          atualizado_em: '2026-10-16T00:00:00Z',
        },
      );

      await restaurarDaNuvem();

      expect(
        banco.sqlite
          .prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa' AND excluido_em IS NULL")
          .get(),
      ).toEqual({ n: 1 });
      expect(catLocal(propria)).toMatchObject({ padrao: 0 });
      expect(banco.despesas()).toHaveLength(0);
      expect(pendentes()).toBeGreaterThan(0);

      await excluirCategoria(propria);
      await restaurarDaNuvem();

      expect(
        banco.sqlite
          .prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa' AND excluido_em IS NULL")
          .get(),
      ).toEqual({ n: 1 });
      expect(catLocal(propria)).toMatchObject({ excluido_em: expect.any(String) });
      expect(banco.despesas()).toHaveLength(1);
      expect(banco.despesas()[0].categoria_id).toBeTruthy();
      expect(pendentes()).toBe(0);
    });

    it('retoma despesa pendente quando o vínculo aparece e o snapshot não traz o registro', async () => {
      mockNuvem.set(despPath('despesa-pendente'), {
        valor_centavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        categoria_id: 'uuid-futuro',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });

      const primeiro = await restaurarDaNuvem();
      expect(primeiro.despesas).toBe(0);
      expect(pendentes()).toBe(1);

      mockNuvem.delete(despPath('despesa-pendente'));
      inserirCategoria({
        id: 'uuid-futuro',
        nome: 'Futuro',
        nome_normalizado: 'futuro',
        padrao: 0,
      });

      const segundo = await restaurarDaNuvem();
      expect(segundo.despesas).toBe(1);
      expect(banco.despesas()[0].categoria_id).toBe('uuid-futuro');
      expect(pendentes()).toBe(0);
    });

    it('retoma série e ocorrências pendentes quando o vínculo aparece', async () => {
      mockNuvem.set(serPath('serie-pendente'), {
        tipo: 'despesa',
        intervalo: 1,
        unidade: 'mes',
        inicio: '2026-10-16',
        ativa: true,
        valor_centavos: 1000,
        titulo: 'Mercado',
        categoria_id: 'uuid-futuro',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });
      mockNuvem.set(despPath('oc-pendente'), {
        valor_centavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        categoria_id: 'uuid-futuro',
        recorrencia_id: 'serie-pendente',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });

      const primeiro = await restaurarDaNuvem();
      expect(primeiro).toMatchObject({ recorrencias: 0, despesas: 0 });
      expect(pendentes()).toBe(2);

      mockNuvem.delete(serPath('serie-pendente'));
      mockNuvem.delete(despPath('oc-pendente'));
      inserirCategoria({
        id: 'uuid-futuro',
        nome: 'Futuro',
        nome_normalizado: 'futuro',
        padrao: 0,
      });

      const segundo = await restaurarDaNuvem();
      expect(segundo).toMatchObject({ recorrencias: 1, despesas: 1 });
      expect(banco.recorrencias()[0].categoria_id).toBe('uuid-futuro');
      expect(banco.despesas()[0].categoria_id).toBe('uuid-futuro');
      expect(pendentes()).toBe(0);
    });

    it('payload pendente inválido é preservado sem bloquear a restauração', async () => {
      banco.sqlite
        .prepare(
          `INSERT INTO restauracao_pendente
            (tipo, id, categoria_id, motivo, payload, atualizado_em, registrado_em)
           VALUES ('despesa', 'corrompida', 'x', 'categoria_nao_resolvida', '{', 't', 't')`,
        )
        .run();

      await expect(restaurarDaNuvem()).resolves.toMatchObject({ despesas: 0 });
      expect(pendentes()).toBe(1);
    });

    it('continua a restauração quando authStateReady falha', async () => {
      mockAuthReadyFalha = true;
      mockNuvem.set(despPath('sem-categoria'), {
        valor_centavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });

      expect((await restaurarDaNuvem()).despesas).toBe(1);
    });

    it('exclusão de receita envia tombstone', async () => {
      await registrarReceita(input());
      await sincronizarPendentes();
      const id = banco.receitas()[0].id;

      await excluirReceita(id);
      await sincronizarPendentes();

      expect(mockNuvem.get(`usuarios/u1/receitas/${id}`)).toMatchObject({ excluido_em: expect.any(String) });
    });

    it('receita ativa de série excluída não é enviada por engano', async () => {
      await registrarReceita(
        input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
      );
      await sincronizarPendentes();
      const serie = banco.recorrencias()[0];
      const receita = banco.receitas()[0];
      const remotoAntes = mockNuvem.get(`usuarios/u1/receitas/${receita.id}`);

      banco.sqlite
        .prepare("UPDATE recorrencias SET excluido_em = '2026-10-20T00:00:00Z', ativa = 0 WHERE id = ?")
        .run(serie.id);
      banco.sqlite
        .prepare("UPDATE receitas SET titulo = 'Editada', sync_status = 'pendente' WHERE id = ?")
        .run(receita.id);

      await sincronizarPendentes();

      expect(mockNuvem.get(`usuarios/u1/receitas/${receita.id}`)).toEqual(remotoAntes);
    });

    it('retoma série pendente gravada diretamente na fila', async () => {
      const payload = {
        tipo: 'despesa',
        intervalo: 1,
        unidade: 'mes',
        inicio: '2026-10-16',
        ativa: true,
        valor_centavos: 1000,
        titulo: 'Mercado',
        categoria_id: 'uuid-futuro',
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      };
      banco.sqlite
        .prepare(
          `INSERT INTO restauracao_pendente
            (tipo, id, categoria_id, motivo, payload, atualizado_em, registrado_em)
           VALUES ('recorrencia', 'serie-fila', 'uuid-futuro', 'categoria_nao_resolvida', ?, '2026-10-16T00:00:00Z', 't')`,
        )
        .run(JSON.stringify(payload));
      inserirCategoria({
        id: 'uuid-futuro',
        nome: 'Futuro',
        nome_normalizado: 'futuro',
        padrao: 0,
      });

      await restaurarDaNuvem();

      expect(banco.recorrencias()).toHaveLength(1);
      expect(banco.recorrencias()[0].categoria_id).toBe('uuid-futuro');
      expect(pendentes()).toBe(0);
    });

    it('tombstone remoto de série conhecida encerra ocorrências locais', async () => {
      await registrarReceita(
        input({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
      );
      await sincronizarPendentes();
      const serie = banco.recorrencias()[0];
      const excluidoEm = '2026-10-20T00:00:00Z';
      mockNuvem.set(`usuarios/u1/recorrencias/${serie.id}`, {
        ...mockNuvem.get(`usuarios/u1/recorrencias/${serie.id}`),
        ativa: false,
        excluido_em: excluidoEm,
        atualizado_em: excluidoEm,
      });

      await restaurarDaNuvem();

      expect(banco.recorrencias()[0]).toMatchObject({ ativa: 0, excluido_em: excluidoEm });
      expect(banco.receitas().every((r) => r.excluido_em === excluidoEm)).toBe(true);
    });

    it('categoria remota de tipo inesperado fica pendente sem gravar NULL', async () => {
      mockNuvem.set(despPath('tipo-invalido'), {
        valor_centavos: 1000,
        data: '2026-10-16',
        titulo: 'Mercado',
        categoria_id: 123,
        criado_em: '2026-10-16T00:00:00Z',
        atualizado_em: '2026-10-16T00:00:00Z',
      });

      await restaurarDaNuvem();

      expect(banco.despesas()).toHaveLength(0);
      expect(pendentes()).toBe(1);
    });

    it('aborta a restauração se a conta mudar durante o processo', async () => {
      mockTrocarUsuario = true;
      await expect(restaurarDaNuvem()).rejects.toBeInstanceOf(FalhaRestauracao);
      expect(banco.despesas()).toHaveLength(0);
    });

    it('não marca como sincronizada uma edição local feita durante o envio', async () => {
      const id = await criarCategoria({
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 5000 },
      });
      const versaoInicial = catLocal(id);
      expect(versaoInicial).toMatchObject({
        limite_centavos: 5000,
        sync_status: 'pendente',
      });

      mockAntesDaTransacao = () => {
        editarLocalConcorrente(id, 8000);
      };

      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id))).toMatchObject({
        limite_centavos: 5000,
      });
      expect(catLocal(id)).toMatchObject({
        limite_centavos: 8000,
        sync_status: 'pendente',
        atualizado_em: versaoInicial.atualizado_em,
      });
      expect(estadoLocal(id)).toBe('editado');

      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id))).toMatchObject({
        limite_centavos: 8000,
      });
      expect(catLocal(id)).toMatchObject({
        limite_centavos: 8000,
        sync_status: 'sincronizado',
        atualizado_em: versaoInicial.atualizado_em,
      });
      expect(estadoLocal(id)).toBe('sincronizado');
    });

    it('não aplica decisão remota obsoleta sobre edição local feita durante a sincronização', async () => {
      const id = await criarCategoria({
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 5000 },
      });
      await sincronizarPendentes();
      await editarCategoria(id, {
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 8000 },
      });
      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          limite_tipo: 'valor',
          limite_centavos: 9000,
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );

      mockAntesDaTransacao = () => {
        editarLocalConcorrente(id, 7000);
      };

      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({
        limite_centavos: 7000,
        sync_status: 'pendente',
      });
      expect(estadoLocal(id)).toBe('editado');
      expect(mockNuvem.get(catPath(id))).toMatchObject({
        limite_centavos: 9000,
      });

      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({
        limite_centavos: 9000,
        sync_status: 'sincronizado',
      });
      expect(mockNuvem.get(catPath(id))).toMatchObject({
        limite_centavos: 9000,
      });
    });

    it('não reverte exclusão local feita durante a aplicação de versão remota ativa', async () => {
      const id = await criarCategoria({
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 5000 },
      });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();
      await editarCategoria(id, {
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 8000 },
      });
      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          limite_tipo: 'valor',
          limite_centavos: 9000,
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );

      mockAntesDaTransacao = () => {
        excluirLocalConcorrente(id, '2999-01-01T00:00:00.000Z');
      };

      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({
        excluido_em: '2999-01-01T00:00:00.000Z',
        limite_tipo: null,
        limite_centavos: null,
        sync_status: 'pendente',
      });
      expect(estadoLocal(id)).toBe('editado');
      expect(mockNuvem.get(catPath(id))).toMatchObject({ excluido_em: null });

      await sincronizarPendentes();

      expect(mockNuvem.get(catPath(id))).toMatchObject({
        excluido_em: '2999-01-01T00:00:00.000Z',
      });
      expect(catLocal(id)).toMatchObject({ sync_status: 'sincronizado' });
      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    it('tombstone remoto prevalece sobre edição local feita durante a transação remota', async () => {
      const id = await criarCategoria({
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 5000 },
      });
      await registrarDespesa(despesaInput(id));
      await sincronizarPendentes();
      await editarCategoria(id, {
        nome: 'Mercado',
        limite: { tipo: 'valor', valor: 8000 },
      });
      mockNuvem.set(
        catPath(id),
        docCategoriaRemota({
          excluido_em: '2999-01-01T00:00:00.000Z',
          atualizado_em: '2999-01-01T00:00:00.000Z',
        }),
      );

      mockAntesDaTransacao = () => {
        editarLocalConcorrente(id, 7000);
      };

      await sincronizarPendentes();

      expect(catLocal(id)).toMatchObject({
        excluido_em: '2999-01-01T00:00:00.000Z',
        limite_tipo: null,
        limite_centavos: null,
        sync_status: 'sincronizado',
      });
      expect(estadoLocal(id)).toBe('sincronizado');
      expect(banco.despesas()[0].categoria_id).toBeNull();
    });

    describe('normalização remota em massa (issue #71)', () => {
      it('normaliza padrão, própria, tombstone e categoria sem uso', async () => {
        mockNuvem.set(
          catPath('padrao_casa'),
          docCategoriaRemota({
            padrao: true,
            chave: 'casa',
            nome: 'Casa',
            nome_normalizado: 'casa',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 50,
          }),
        );
        mockNuvem.set(
          catPath('propria'),
          docCategoriaRemota({
            nome: 'Própria',
            nome_normalizado: 'própria',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 20_000,
          }),
        );
        mockNuvem.set(
          catPath('tombstone'),
          docCategoriaRemota({
            nome: 'Tombstone',
            nome_normalizado: 'tombstone',
            excluido_em: '2026-01-01T00:00:00.000Z',
            limite_tipo: 'valor',
            limite_centavos: 5000,
          }),
        );
        mockNuvem.set(
          catPath('sem-uso'),
          docCategoriaRemota({
            nome: 'Sem uso',
            nome_normalizado: 'sem uso',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 0,
          }),
        );
        const despesaRemota = {
          valor_centavos: 1000,
          data: '2026-10-16',
          titulo: 'Mercado',
          categoria_id: 'propria',
          criado_em: '2026-10-16T00:00:00Z',
          atualizado_em: '2026-10-16T00:00:00Z',
        };
        mockNuvem.set(despPath('despesa'), despesaRemota);

        await restaurarDaNuvem();

        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(100);
        expect(mockNuvem.get(catPath('propria')).limite_percentual_centesimos).toBe(10_000);
        expect(mockNuvem.get(catPath('tombstone'))).toMatchObject({
          limite_tipo: null,
          limite_centavos: null,
          limite_percentual_centesimos: null,
        });
        expect(mockNuvem.get(catPath('sem-uso')).limite_percentual_centesimos).toBe(100);
        expect(mockNuvem.get(despPath('despesa'))).toEqual(despesaRemota);
      });

      it('normaliza documento remoto mesmo quando a restauração local fica pendente por conflito de nome', async () => {
        const propria = await criarCategoria({ nome: 'Casa', limite: null });
        mockNuvem.set(
          catPath('padrao_casa'),
          docCategoriaRemota({
            padrao: true,
            chave: 'casa',
            nome: 'Casa',
            nome_normalizado: 'casa',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 50,
          }),
        );

        await restaurarDaNuvem();

        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(100);
        expect(catLocal(propria)).toMatchObject({ padrao: 0 });
      });

      it('é idempotente e não reescreve documentos já normalizados', async () => {
        mockNuvem.set(
          catPath('padrao_casa'),
          docCategoriaRemota({
            padrao: true,
            chave: 'casa',
            nome: 'Casa',
            nome_normalizado: 'casa',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 50,
          }),
        );

        await restaurarDaNuvem();
        const escritas = mockOrdemEscritas.length;

        await restaurarDaNuvem();

        expect(mockOrdemEscritas.length).toBe(escritas);
        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(100);
      });

      it('não altera documentos inválidos que não podem ser normalizados com segurança', async () => {
        const invalida = docCategoriaRemota({
          nome: 'x'.repeat(31),
          nome_normalizado: 'x'.repeat(31),
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: 50,
        });
        mockNuvem.set(catPath('invalida'), invalida);

        await restaurarDaNuvem();

        expect(mockNuvem.get(catPath('invalida'))).toEqual(invalida);
      });

      it('falha de rede na varredura não interrompe a restauração e permite nova tentativa', async () => {
        mockNuvem.set(
          catPath('padrao_casa'),
          docCategoriaRemota({
            padrao: true,
            chave: 'casa',
            nome: 'Casa',
            nome_normalizado: 'casa',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 50,
          }),
        );
        mockErroTransacao = Object.assign(new Error('unavailable'), {
          code: 'unavailable',
        });

        await expect(restaurarDaNuvem()).resolves.toBeDefined();
        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(50);

        await restaurarDaNuvem();
        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(100);
      });

      it('falha de permissão não interrompe a restauração e sinaliza acesso negado', async () => {
        mockNuvem.set(
          catPath('padrao_casa'),
          docCategoriaRemota({
            padrao: true,
            chave: 'casa',
            nome: 'Casa',
            nome_normalizado: 'casa',
            limite_tipo: 'percentual_renda',
            limite_percentual_centesimos: 50,
          }),
        );
        mockCaminhosRejeitados.add(catPath('padrao_casa'));

        await expect(restaurarDaNuvem()).resolves.toBeDefined();

        expect(mockNuvem.get(catPath('padrao_casa')).limite_percentual_centesimos).toBe(50);
        expect(consumirAcessoNegado()).toBe(true);
      });
    });

    it('permission-denied mantém categoria pendente e sinaliza acesso negado', async () => {
      const id = await criarCategoria({ nome: 'Mercado', limite: null });
      mockCaminhosRejeitados.add(catPath(id));
      await sincronizarPendentes();

      expect(catLocal(id).sync_status).toBe('pendente');
      expect(mockNuvem.has(catPath(id))).toBe(false);
      expect(consumirAcessoNegado()).toBe(true);
    });
  });

  it('só sincroniza uma vez por vez (sem envio concorrente duplicado)', async () => {
    await registrarReceita(input());
    await Promise.all([sincronizarPendentes(), sincronizarPendentes()]);
    expect(mockNuvem.size).toBe(1);
  });

  describe('envio automático pausado (FA01)', () => {
    it('com o envio pausado, o envio automático não sobe nada e os registros seguem pendentes', async () => {
      await registrarReceita(input());
      await definirEnvioAutomatico(false);
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('registros feitos depois de recusar também ficam só no aparelho', async () => {
      await definirEnvioAutomatico(false);
      await registrarReceita(input({ titulo: 'Depois da recusa' }));
      await sincronizarPendentes();
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('a pausa vale depois de reiniciar o app (fica no aparelho)', async () => {
      await registrarReceita(input());
      await definirEnvioAutomatico(false);
      // "reinício": o estado em memória do módulo não importa, o aparelho guarda a pausa
      await sincronizarPendentes();
      await sincronizarPendentes();
      expect(mockNuvem.size).toBe(0);
    });

    it('envio manual sobe os pendentes e libera o envio automático dali em diante', async () => {
      await registrarReceita(input({ titulo: 'Antes' }));
      await definirEnvioAutomatico(false);

      await sincronizarPendentes({ manual: true });
      expect(mockNuvem.size).toBe(1);
      expect(banco.receitas()[0].sync_status).toBe('sincronizado');

      await registrarReceita(input({ titulo: 'Depois do envio manual' }));
      await sincronizarPendentes(); // automático
      expect(mockNuvem.size).toBe(2);
    });

    it('definirEnvioAutomatico(true) libera o envio sem precisar do envio manual', async () => {
      await registrarReceita(input());
      await definirEnvioAutomatico(false);
      await definirEnvioAutomatico(true);
      await sincronizarPendentes();
      expect(mockNuvem.size).toBe(1);
    });

    it('isola a pausa entre UIDs ao trocar de conta', async () => {
      await definirEnvioAutomatico(false);
      mockUsuario = { uid: 'u2', emailVerified: true };
      await definirEnvioAutomatico(true);
      expect(await AsyncStorage.getItem('unicash:envio_automatico_pausado:u1')).toBe('1');
      expect(await AsyncStorage.getItem('unicash:envio_automatico_pausado:u2')).toBeNull();
      mockUsuario = { uid: 'u1', emailVerified: true };
      await registrarReceita(input());
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.size).toBe(0);
    });

    it('não altera a preferência sem UID', async () => {
      mockUsuario = null;
      await expect(definirEnvioAutomatico(false)).rejects.toThrow('Conta ausente');
      expect(await AsyncStorage.getAllKeys()).toHaveLength(0);
    });

    it('mantém o envio bloqueado quando a persistência da pausa falha', async () => {
      await registrarReceita(input());
      // setItem já é um jest.fn no mock oficial do AsyncStorage.
      jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('banco'));
      try {
        await expect(definirEnvioAutomatico(false, 'u1')).rejects.toThrow('banco');
        expect(await sincronizarPendentes()).toBe(false);
        expect(mockNuvem.size).toBe(0);
        expect(banco.receitas()[0].sync_status).toBe('pendente');
        await sincronizarPendentes({ manual: true });
        expect(mockNuvem.size).toBe(1);
      } finally {
        await definirEnvioAutomatico(true, 'u1');
      }
    });

    it('aborta o envio se a conta mudar antes de acessar os registros', async () => {
      await registrarReceita(input());
      mockLeiturasUsuario = 0;
      mockTrocarUsuario = true;
      expect(await sincronizarPendentes()).toBe(false);
      expect(mockNuvem.size).toBe(0);
      expect(banco.receitas()[0].sync_status).toBe('pendente');
    });

    it('aborta a restauração se a conta mudar antes da transação local', async () => {
      mockLeiturasUsuario = 0;
      mockTrocarUsuarioDepois = 3;
      mockTrocarUsuario = true;
      await expect(restaurarDaNuvem()).rejects.toThrow('conta alterada durante a restauração');
      expect(banco.receitas()).toHaveLength(0);
      expect(banco.despesas()).toHaveLength(0);
    });

    it('pausar duas vezes continua pausado e liberar remove a pausa', async () => {
      await definirEnvioAutomatico(false);
      await definirEnvioAutomatico(false);
      expect(await AsyncStorage.getItem('unicash:envio_automatico_pausado:u1')).toBe('1');
      await definirEnvioAutomatico(true);
      expect(await AsyncStorage.getItem('unicash:envio_automatico_pausado:u1')).toBeNull();
    });
  });
});
