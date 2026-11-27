import { getDb } from '@/db/database';
import {
  CategoriaMetaIndisponivel,
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
  categoriaId: null,
  valorAcumuladoCentavos: null,
  ...extra,
});

describe('Serviço de metas (UC12)', () => {
  let banco: BancoFalso;
  beforeEach(() => {
    banco = instalarBanco();
  });

  const metas = () => banco.sqlite.prepare('SELECT * FROM metas ORDER BY id').all() as any[];

  function criarCategoriaAtiva(id = 'c1', nome = 'Mercado', padrao = 0): string {
    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'sincronizado', NULL, 't', 't')`,
      )
      .run(id, nome, nome.toLowerCase(), padrao);
    return id;
  }

  describe('criarMeta', () => {
    it('cria investimento com início explícito e campos de acumulado nulos', async () => {
      const id = await criarMeta(input({ objetivo: '  Viagem  ' }));
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

      const m = (await buscarMeta(id))!;
      expect(m).toMatchObject({
        id,
        objetivo: 'Viagem',
        tipo: 'investimento',
        valor_alvo_centavos: 500_000,
        prazo: '2027-12-31',
        categoria_id: null,
        valor_acumulado_centavos: null,
        valor_acumulado_atualizado_em: null,
        sync_status: 'pendente',
        excluido_em: null,
      });
      expect(m.inicio).toBeTruthy();
      expect(m.criado_em).toBeTruthy();
      expect(m.atualizado_em).toBe(m.criado_em);
    });

    it('aceita investimento com valor zero e registra a data do informe', async () => {
      const id = await criarMeta(input({ valorAcumuladoCentavos: 0 }));
      const m = (await buscarMeta(id))!;
      expect(m.valor_acumulado_centavos).toBe(0);
      expect(m.valor_acumulado_atualizado_em).toBeTruthy();
    });

    it('cria gasto somente com categoria ativa e sem valor acumulado', async () => {
      criarCategoriaAtiva('c1', 'Mercado');
      const id = await criarMeta(input({ tipo: 'gasto', categoriaId: 'c1' }));
      expect(await buscarMeta(id)).toMatchObject({
        tipo: 'gasto',
        categoria_id: 'c1',
        categoria_nome: 'Mercado',
      });

      await expect(
        criarMeta(input({ tipo: 'gasto', categoriaId: null })),
      ).rejects.toThrow(MSG_META.categoriaVazia);
      await expect(
        criarMeta(input({ tipo: 'gasto', categoriaId: 'inexistente' })),
      ).rejects.toThrow(CategoriaMetaIndisponivel);
      await expect(
        criarMeta(
          input({ tipo: 'gasto', categoriaId: 'c1', valorAcumuladoCentavos: 10 }),
        ),
      ).rejects.toThrow(MSG_META.valorAcumuladoNaoSeAplica);
      expect(metas()).toHaveLength(1);
    });

    it('aceita categoria padrão ativa', async () => {
      criarCategoriaAtiva('c1', 'Alimentação', 1);
      const id = await criarMeta(input({ tipo: 'gasto', categoriaId: 'c1' }));
      expect(await buscarMeta(id)).toMatchObject({
        categoria_id: 'c1',
        categoria_nome: 'Alimentação',
      });
    });

    it('aceita os valores-limite e rejeita prazo anterior ao início', async () => {
      criarCategoriaAtiva();
      const idMin = await criarMeta(input({ tipo: 'gasto', categoriaId: 'c1', valorAlvoCentavos: 1 }));
      const idMax = await criarMeta(input({ valorAlvoCentavos: 99_999_999_999 }));
      expect((await buscarMeta(idMin))!.valor_alvo_centavos).toBe(1);
      expect((await buscarMeta(idMax))!.valor_alvo_centavos).toBe(99_999_999_999);

      await expect(
        criarMeta(input({ prazo: '2020-01-01' })),
      ).rejects.toThrow(MSG_META.prazoAntesInicio);
    });

    it('revalida no serviço e não grava nada quando inválido', async () => {
      await expect(criarMeta(input({ objetivo: '   ' }))).rejects.toThrow(EntradaMetaInvalida);
      await expect(criarMeta(input({ valorAlvoCentavos: 0 }))).rejects.toThrow(
        MSG_META.valorInvalido,
      );
      await expect(criarMeta(input({ prazo: '2027-02-31' }))).rejects.toThrow(
        MSG_META.prazoInvalido,
      );
      await expect(criarMeta(input({ valorAcumuladoCentavos: -1 }))).rejects.toThrow(
        MSG_META.valorAcumuladoInvalido,
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
    it('altera objetivo, alvo, prazo e categoria sem mudar o tipo/start', async () => {
      criarCategoriaAtiva('c1');
      criarCategoriaAtiva('c2', 'Lazer');
      const id = await criarMeta(input({ tipo: 'gasto', categoriaId: 'c1', objetivo: 'Antiga' }));
      const antes = (await buscarMeta(id))!;

      await editarMeta(
        id,
        input({
          objetivo: 'Nova',
          tipo: 'gasto',
          categoriaId: 'c2',
          valorAlvoCentavos: 1_000_000,
          prazo: '2028-06-30',
        }),
      );

      expect(await buscarMeta(id)).toMatchObject({
        objetivo: 'Nova',
        tipo: 'gasto',
        categoria_id: 'c2',
        valor_alvo_centavos: 1_000_000,
        prazo: '2028-06-30',
        inicio: antes.inicio,
        sync_status: 'pendente',
      });
    });

    it('não permite alterar o tipo após a criação', async () => {
      const id = await criarMeta(input());
      const antes = (await buscarMeta(id))!;

      await expect(
        editarMeta(id, input({ tipo: 'gasto', categoriaId: 'c1' })),
      ).rejects.toThrow(MSG_META.tipoImutavel);
      expect(await buscarMeta(id)).toEqual(antes);
    });

    it('atualiza valor acumulado para zero, aumenta e reduz', async () => {
      const id = await criarMeta(input());
      await editarMeta(id, input({ valorAcumuladoCentavos: 0 }));
      expect((await buscarMeta(id))!.valor_acumulado_centavos).toBe(0);
      expect((await buscarMeta(id))!.valor_acumulado_atualizado_em).toBeTruthy();

      await editarMeta(id, input({ valorAcumuladoCentavos: 100_000 }));
      expect((await buscarMeta(id))!.valor_acumulado_centavos).toBe(100_000);

      await editarMeta(id, input({ valorAcumuladoCentavos: 30_000 }));
      expect((await buscarMeta(id))!.valor_acumulado_centavos).toBe(30_000);

      await editarMeta(id, input({ valorAcumuladoCentavos: null }));
      expect((await buscarMeta(id))!.valor_acumulado_centavos).toBeNull();
      expect((await buscarMeta(id))!.valor_acumulado_atualizado_em).toBeNull();
    });

    it('mantém a data do informe quando o valor não muda e atualiza quando muda', async () => {
      const id = await criarMeta(input({ valorAcumuladoCentavos: 10_000 }));
      banco.sqlite
        .prepare(
          "UPDATE metas SET valor_acumulado_atualizado_em = '2020-01-01T00:00:00.000Z' WHERE id = ?",
        )
        .run(id);

      await editarMeta(id, input({ objetivo: 'Outro', valorAcumuladoCentavos: 10_000 }));
      expect((await buscarMeta(id))!.valor_acumulado_atualizado_em).toBe(
        '2020-01-01T00:00:00.000Z',
      );

      await editarMeta(id, input({ valorAcumuladoCentavos: 20_000 }));
      expect((await buscarMeta(id))!.valor_acumulado_atualizado_em).not.toBe(
        '2020-01-01T00:00:00.000Z',
      );
    });

    it('meta de gasto legada sem categoria exige correção e deriva o início de criado_em', async () => {
      banco.sqlite
        .prepare(
          `INSERT INTO metas
            (id, objetivo, tipo, valor_alvo_centavos, prazo, inicio, categoria_id,
             valor_acumulado_centavos, valor_acumulado_atualizado_em, sync_status,
             excluido_em, criado_em, atualizado_em)
           VALUES ('legada', 'Mercado', 'gasto', 100000, '2027-12-31', NULL, NULL,
                   NULL, NULL, 'sincronizado', NULL, '2026-01-10T12:00:00.000Z', '2026-01-10T12:00:00.000Z')`,
        )
        .run();
      criarCategoriaAtiva('c1');

      await expect(
        editarMeta('legada', input({ tipo: 'gasto', categoriaId: null })),
      ).rejects.toThrow(MSG_META.categoriaVazia);

      await editarMeta('legada', input({ tipo: 'gasto', categoriaId: 'c1' }));
      expect(await buscarMeta('legada')).toMatchObject({
        categoria_id: 'c1',
        inicio: '2026-01-10',
      });
    });

    it('categoria inativa não é aceita na edição', async () => {
      criarCategoriaAtiva('c1');
      const id = await criarMeta(input({ tipo: 'gasto', categoriaId: 'c1' }));
      banco.sqlite
        .prepare("UPDATE categorias SET excluido_em = '2026-01-01T00:00:00Z' WHERE id = 'c1'")
        .run();

      await expect(
        editarMeta(id, input({ tipo: 'gasto', categoriaId: 'c1' })),
      ).rejects.toThrow(CategoriaMetaIndisponivel);
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
