import { registrarReceita } from '@/features/receitas/service';
import { restaurarDaNuvem, sincronizarPendentes } from '@/features/receitas/sync';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

const mockNuvem = new Map<string, any>();

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  collection: (_db: unknown, ...partes: string[]) => ({ path: partes.join('/') }),
  getDocs: async (col: any) => ({
    docs: [...mockNuvem.entries()]
      .filter(([k]) => k.startsWith(col.path + '/'))
      .map(([k, v]) => ({ id: k.slice(col.path.length + 1), data: () => v })),
  }),
  setDoc: async (ref: any, dados: any) => {
    mockNuvem.set(ref.path, JSON.parse(JSON.stringify(dados)));
  },
  getDoc: async (ref: any) => ({ exists: () => mockNuvem.has(ref.path), data: () => mockNuvem.get(ref.path) }),
  deleteDoc: async (ref: any) => {
    mockNuvem.delete(ref.path);
  },
}));

describe('Sincronização: campos opcionais da série e restauração com dados incompletos', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    mockNuvem.clear();
  });
  afterEach(restaurarTempo);

  describe('envio da série', () => {
    it('série sem término e com descrição: envia a descrição e omite o término', async () => {
      await registrarReceita(
        input({ titulo: 'Mesada', descricao: 'Da família', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
      );
      await sincronizarPendentes();
      const doc = mockNuvem.get(`usuarios/u1/recorrencias/${banco.recorrencias()[0].id}`);
      expect(doc.descricao).toBe('Da família');
      expect(doc).not.toHaveProperty('termino');
    });

    it('série com término e sem descrição: envia o término e omite a descrição', async () => {
      await registrarReceita(
        input({ titulo: 'Bolsa', descricao: null, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }),
      );
      await sincronizarPendentes();
      const doc = mockNuvem.get(`usuarios/u1/recorrencias/${banco.recorrencias()[0].id}`);
      expect(doc.termino).toBe('2026-12-16');
      expect(doc).not.toHaveProperty('descricao');
    });
  });

  describe('restaurarDaNuvem com documentos incompletos ou inválidos', () => {
    const SERIES = 'usuarios/u1/recorrencias/';
    const RECEITAS = 'usuarios/u1/receitas/';
    const serieMinima = { intervalo: 1, unidade: 'mes', inicio: '2026-10-16', valor_centavos: 1000, titulo: 'Mínima' };
    const receitaMinima = { valor_centavos: 500, data: '2026-10-16', titulo: 'R1' };

    it('séries: aceita o mínimo, respeita os opcionais e ignora as inválidas', async () => {
      mockNuvem.set(SERIES + 'sA', serieMinima);
      mockNuvem.set(SERIES + 'sB', {
        ...serieMinima,
        titulo: 'Completa',
        termino: '2026-12-16',
        descricao: 'D',
        ativa: false,
        atualizado_em: '2026-10-01T00:00:00.000Z',
      });
      mockNuvem.set(SERIES + 'inv1', { ...serieMinima, intervalo: 'um' });
      mockNuvem.set(SERIES + 'inv2', { intervalo: 1, unidade: 'mes', inicio: '2026-10-16', titulo: 'Sem valor' });

      const r = await restaurarDaNuvem();

      expect(r.recorrencias).toBe(2);
      const series = banco.recorrencias();
      expect(series.map((s) => s.id).sort()).toEqual(['sA', 'sB']);
      expect(series.find((s) => s.id === 'sA')).toMatchObject({ termino: null, descricao: null, ativa: 1 });
      expect(series.find((s) => s.id === 'sB')).toMatchObject({
        termino: '2026-12-16', descricao: 'D', ativa: 0, atualizado_em: '2026-10-01T00:00:00.000Z',
      });
    });

    it('receitas: aceita o mínimo, preserva os opcionais e ignora as inválidas', async () => {
      mockNuvem.set(SERIES + 'sA', serieMinima);
      mockNuvem.set(RECEITAS + 'r1', receitaMinima);
      mockNuvem.set(RECEITAS + 'r2', {
        ...receitaMinima,
        titulo: 'R2',
        descricao: 'x',
        recorrencia_id: 'sA',
        criado_em: '2026-01-01T00:00:00.000Z',
        atualizado_em: '2026-02-01T00:00:00.000Z',
      });
      mockNuvem.set(RECEITAS + 'r3', { ...receitaMinima, titulo: 'R3', recorrencia_id: 'inexistente' });
      mockNuvem.set(RECEITAS + 'x1', { ...receitaMinima, valor_centavos: 0 });
      mockNuvem.set(RECEITAS + 'x2', { ...receitaMinima, valor_centavos: 'abc' });
      mockNuvem.set(RECEITAS + 'x3', { ...receitaMinima, data: 20261016 });
      mockNuvem.set(RECEITAS + 'x4', { valor_centavos: 500, data: '2026-10-16' });

      const r = await restaurarDaNuvem();

      expect(r.receitas).toBe(3);
      const linhas = banco.receitas();
      expect(linhas.map((l) => l.id).sort()).toEqual(['r1', 'r2', 'r3']);
      const r1 = linhas.find((l) => l.id === 'r1');
      expect(r1).toMatchObject({ descricao: null, recorrencia_id: null });
      expect(r1.criado_em).toBe(r1.atualizado_em); // sem datas na nuvem, usa o momento da restauração
      expect(linhas.find((l) => l.id === 'r2')).toMatchObject({
        descricao: 'x',
        recorrencia_id: 'sA',
        criado_em: '2026-01-01T00:00:00.000Z',
        atualizado_em: '2026-02-01T00:00:00.000Z',
      });
      expect(linhas.find((l) => l.id === 'r3').recorrencia_id).toBeNull(); // série desconhecida
    });
  });
});
