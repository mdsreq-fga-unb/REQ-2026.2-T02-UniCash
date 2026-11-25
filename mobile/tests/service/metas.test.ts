import { getDb } from '@/db/database';
import {
  FalhaLeituraMeta,
  FalhaPersistenciaMeta,
  MetaIndisponivel,
  buscarMeta,
  contarPendentesMetas,
  criarMeta,
  editarMeta,
  excluirMeta,
  listarMetas,
} from '@/features/metas/service';
import { EntradaMetaInvalida, MSG_META } from '@/features/metas/validation';
import type { MetaInput } from '@/features/metas/types';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';

const input = (extra: Partial<MetaInput> = {}): MetaInput => ({
  objetivo: 'Viagem de férias',
  tipo: 'investimento',
  valorAlvoCentavos: 500_000,
  prazo: '2027-12-31',
  ...extra,
});

describe('Serviço de metas (UC12)', () => {
  let banco: BancoFalso;
  beforeEach(() => {
    banco = instalarBanco();
  });

  const metas = () => banco.sqlite.prepare('SELECT * FROM metas ORDER BY id').all() as any[];

  describe('criarMeta', () => {
    it('cria com id estável, objetivo trimado e sync pendente', async () => {
      const id = await criarMeta(input({ objetivo: '  Viagem  ' }));
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      const m = (await buscarMeta(id))!;
      expect(m).toMatchObject({
        id,
        objetivo: 'Viagem',
        tipo: 'investimento',
        valor_alvo_centavos: 500_000,
        prazo: '2027-12-31',
        sync_status: 'pendente',
        excluido_em: null,
      });
      expect(m.criado_em).toBeTruthy();
      expect(m.atualizado_em).toBe(m.criado_em);
    });

    it('aceita meta de gasto e os valores-limite', async () => {
      const idMin = await criarMeta(input({ tipo: 'gasto', valorAlvoCentavos: 1 }));
      const idMax = await criarMeta(input({ valorAlvoCentavos: 99_999_999_999 }));
      expect((await buscarMeta(idMin))!.valor_alvo_centavos).toBe(1);
      expect((await buscarMeta(idMax))!.valor_alvo_centavos).toBe(99_999_999_999);
    });

    it('revalida no serviço e não grava nada quando inválido', async () => {
      await expect(criarMeta(input({ objetivo: '   ' }))).rejects.toThrow(EntradaMetaInvalida);
      await expect(criarMeta(input({ valorAlvoCentavos: 0 }))).rejects.toThrow(
        MSG_META.valorInvalido,
      );
      await expect(criarMeta(input({ prazo: '2027-02-31' }))).rejects.toThrow(
        MSG_META.prazoInvalido,
      );
      expect(metas()).toHaveLength(0);
    });

    it('falha de gravação não deixa estado parcial', async () => {
      banco.falharNaOperacao(1);
      await expect(criarMeta(input())).rejects.toThrow(FalhaPersistenciaMeta);
      expect(metas()).toHaveLength(0);
    });
  });

  describe('listar e buscar', () => {
    it('lista apenas metas ativas em ordem de prazo', async () => {
      const a = await criarMeta(input({ objetivo: 'Longe', prazo: '2030-01-01' }));
      const b = await criarMeta(input({ objetivo: 'Perto', prazo: '2027-01-01' }));
      const c = await criarMeta(input({ objetivo: 'Excluída' }));
      await excluirMeta(c);

      const lista = await listarMetas();
      expect(lista.map((m) => m.id)).toEqual([b, a]);
      expect(lista.every((m) => m.excluido_em === null)).toBe(true);
    });

    it('buscar meta inexistente ou excluída retorna null', async () => {
      expect(await buscarMeta('nao-existe')).toBeNull();
      const id = await criarMeta(input());
      await excluirMeta(id);
      expect(await buscarMeta(id)).toBeNull();
    });

    it('falha de leitura é explícita', async () => {
      (getDb as jest.Mock).mockRejectedValueOnce(new Error('db fechado'));
      await expect(listarMetas()).rejects.toThrow(FalhaLeituraMeta);
    });
  });

  describe('editarMeta', () => {
    it('altera os campos e marca como pendente', async () => {
      const id = await criarMeta(input());
      await editarMeta(
        id,
        input({ objetivo: 'Carro', tipo: 'gasto', valorAlvoCentavos: 1_000_000, prazo: '2028-06-30' }),
      );
      expect(await buscarMeta(id)).toMatchObject({
        objetivo: 'Carro',
        tipo: 'gasto',
        valor_alvo_centavos: 1_000_000,
        prazo: '2028-06-30',
        sync_status: 'pendente',
      });
    });

    it('meta inexistente → MetaIndisponivel', async () => {
      await expect(editarMeta('nao-existe', input())).rejects.toThrow(MetaIndisponivel);
    });

    it('entrada inválida não altera a meta', async () => {
      const id = await criarMeta(input());
      const antes = (await buscarMeta(id))!;
      await expect(editarMeta(id, input({ objetivo: 'a'.repeat(81) }))).rejects.toThrow(
        EntradaMetaInvalida,
      );
      expect(await buscarMeta(id)).toEqual(antes);
    });

    it('falha de gravação mantém os dados anteriores', async () => {
      const id = await criarMeta(input());
      const antes = (await buscarMeta(id))!;
      banco.falharNaOperacao(1);
      await expect(editarMeta(id, input({ objetivo: 'Outro' }))).rejects.toThrow(
        FalhaPersistenciaMeta,
      );
      expect(await buscarMeta(id)).toEqual(antes);
    });
  });

  describe('excluirMeta', () => {
    it('faz exclusão lógica com tombstone e mantém lançamentos', async () => {
      const id = await criarMeta(input());
      banco.sqlite
        .prepare(
          "INSERT INTO despesas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('d1', 1234, '2026-01-10', 'Mercado', 'sincronizado', 't', 't')",
        )
        .run();
      banco.sqlite
        .prepare(
          "INSERT INTO receitas (id, valor_centavos, data, titulo, sync_status, criado_em, atualizado_em) VALUES ('r1', 5000, '2026-01-10', 'Freela', 'sincronizado', 't', 't')",
        )
        .run();

      await excluirMeta(id);

      const linha = banco.sqlite.prepare('SELECT * FROM metas WHERE id = ?').get(id) as any;
      expect(linha.excluido_em).toBeTruthy();
      expect(linha.sync_status).toBe('pendente');
      expect(await buscarMeta(id)).toBeNull();
      expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM despesas').get()).toEqual({ n: 1 });
      expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM receitas').get()).toEqual({ n: 1 });
      expect((banco.sqlite.prepare("SELECT valor_centavos FROM despesas WHERE id = 'd1'").get() as any).valor_centavos).toBe(1234);
      expect((banco.sqlite.prepare("SELECT valor_centavos FROM receitas WHERE id = 'r1'").get() as any).valor_centavos).toBe(5000);
    });

    it('meta inexistente → MetaIndisponivel', async () => {
      await expect(excluirMeta('nao-existe')).rejects.toThrow(MetaIndisponivel);
    });

    it('falha de gravação não exclui parcialmente', async () => {
      const id = await criarMeta(input());
      banco.falharNaOperacao(1);
      await expect(excluirMeta(id)).rejects.toThrow(FalhaPersistenciaMeta);
      expect(await buscarMeta(id)).not.toBeNull();
    });
  });

  it('conta metas pendentes de sincronização', async () => {
    const a = await criarMeta(input());
    await criarMeta(input({ objetivo: 'Outra' }));
    await excluirMeta(a);
    expect(await contarPendentesMetas()).toBe(2);
    banco.sqlite.prepare("UPDATE metas SET sync_status = 'sincronizado'").run();
    expect(await contarPendentesMetas()).toBe(0);
  });
});
