import { getDb } from '@/db/database';
import {
  CategoriaIndisponivel,
  FalhaPersistenciaCategoria,
  NomeDuplicado,
  NomeReservadoCategoriasPadrao,
  buscarCategoria,
  contarPendentesCategorias,
  criarCategoria,
  editarCategoria,
  excluirCategoria,
  listarCategorias,
  semearCategoriasPadrao,
} from '@/features/categorias/service';
import { EntradaCategoriaInvalida } from '@/features/categorias/validation';
import { CATEGORIAS_PADRAO } from '@/features/categorias/types';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';

const semLimite = { nome: 'Mercado', limite: null };
const comValor = { nome: 'Mercado', limite: { tipo: 'valor' as const, valor: 150_000 } };
const comPercentual = { nome: 'Mercado', limite: { tipo: 'percentual_renda' as const, valor: 1_250 } };

describe('Serviço de categorias (UC06)', () => {
  let banco: BancoFalso;
  beforeEach(() => {
    banco = instalarBanco();
  });

  // ---------------------------------------------------------------- semeadura

  describe('semearCategoriasPadrao (RN13)', () => {
    it('semeia os 7 padrões em banco vazio', async () => {
      await semearCategoriasPadrao();
      const linhas = banco.sqlite.prepare('SELECT * FROM categorias').all() as any[];
      expect(linhas).toHaveLength(CATEGORIAS_PADRAO.length);
      for (const l of linhas) {
        expect(l).toMatchObject({ padrao: 1, limite_tipo: null, limite_centavos: null, limite_percentual_centesimos: null, sync_status: 'pendente', excluido_em: null });
      }
    });

    it('semeia padrões mesmo com categoria própria existente', async () => {
      await criarCategoria(semLimite);
      await semearCategoriasPadrao();
      const linhas = banco.sqlite.prepare('SELECT * FROM categorias').all() as any[];
      expect(linhas).toHaveLength(CATEGORIAS_PADRAO.length + 1);
      expect(linhas.filter((l) => l.padrao === 1)).toHaveLength(CATEGORIAS_PADRAO.length);
    });

    it('é idempotente: segunda chamada não duplica', async () => {
      await semearCategoriasPadrao();
      await semearCategoriasPadrao();
      expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get()).toEqual({
        n: CATEGORIAS_PADRAO.length,
      });
    });

    it('re-semeia padrão ausente sem duplicar os presentes', async () => {
      await semearCategoriasPadrao();
      banco.sqlite.prepare('DELETE FROM categorias WHERE nome_normalizado = ?').run('casa');
      await semearCategoriasPadrao();
      const casa = banco.sqlite.prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa'").get();
      expect(casa).toEqual({ n: 1 });
    });

    it('preserva tombstone de padrão e cria nova ativa com o mesmo nome', async () => {
      await semearCategoriasPadrao();
      banco.sqlite
        .prepare("UPDATE categorias SET excluido_em = '2026-01-01T00:00:00Z' WHERE nome_normalizado = 'casa'")
        .run();

      await semearCategoriasPadrao();

      const linhas = banco.sqlite.prepare("SELECT * FROM categorias WHERE nome_normalizado = 'casa'").all() as any[];
      expect(linhas).toHaveLength(2);
      expect(linhas.filter((l) => l.excluido_em !== null)).toHaveLength(1); // tombstone preservado
      expect(linhas.filter((l) => l.excluido_em === null && l.padrao === 1)).toHaveLength(1); // nova ativa
    });

    it('aborda conflito: nome reservado pertence a categoria própria ATIVA (padrao = 0)', async () => {
      await criarCategoria({ nome: 'Casa', limite: null }); // própria ativa com nome reservado
      const antes = banco.sqlite.prepare('SELECT * FROM categorias ORDER BY id').all();

      await expect(semearCategoriasPadrao()).rejects.toThrow(NomeReservadoCategoriasPadrao);

      // Nada convertido, nada duplicado, transação revertida:
      expect(banco.sqlite.prepare('SELECT * FROM categorias ORDER BY id').all()).toEqual(antes);
      expect(
        (banco.sqlite.prepare("SELECT padrao FROM categorias WHERE nome_normalizado = 'casa'").get() as any).padrao,
      ).toBe(0); // continua própria, não virou padrão
    });

    it('erro lista todos os nomes reservados em conflito e preserva os dados', async () => {
      await criarCategoria({ nome: 'Casa', limite: null });
      await criarCategoria({ nome: 'Lazer', limite: null });
      const antes = banco.sqlite.prepare('SELECT * FROM categorias ORDER BY id').all();

      let mensagem = '';
      await semearCategoriasPadrao().catch((e) => {
        mensagem = e.message;
      });
      expect(mensagem).toContain('casa');
      expect(mensagem).toContain('lazer');
      expect(mensagem).toContain('Nada foi alterado');
      expect(banco.sqlite.prepare('SELECT * FROM categorias ORDER BY id').all()).toEqual(antes);
      expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(2);
    });

    it('nome reservado em tombstone de categoria própria não bloqueia a semeadura', async () => {
      const id = await criarCategoria({ nome: 'Casa', limite: null });
      await excluirCategoria(id); // tombstone própria: nome volta a estar livre

      await expect(semearCategoriasPadrao()).resolves.toBeUndefined();
      const casa = banco.sqlite.prepare("SELECT * FROM categorias WHERE nome_normalizado = 'casa'").all() as any[];
      expect(casa).toHaveLength(2);
      expect(casa.some((l) => l.padrao === 1 && l.excluido_em === null)).toBe(true); // padrão criado
      expect(casa.some((l) => l.padrao === 0 && l.excluido_em !== null)).toBe(true); // tombstone própria preservado
    });
  });

  // ---------------------------------------------------------------- criar (B)

  describe('criarCategoria', () => {
    it('cria sem limite, com nome trimado e normalizado', async () => {
      const id = await criarCategoria({ nome: '  Mercado Livre  ', limite: null });
      const c = (await buscarCategoria(id))!;
      expect(c).toMatchObject({ nome: 'Mercado Livre', nome_normalizado: 'mercado livre', padrao: 0 });
      expect(c.limite_tipo).toBeNull();
    });

    it('cria com limite por valor em centavos', async () => {
      const id = await criarCategoria(comValor);
      expect((await buscarCategoria(id))!).toMatchObject({
        limite_tipo: 'valor',
        limite_centavos: 150_000,
        limite_percentual_centesimos: null,
      });
    });

    it('cria com limite percentual em centésimos', async () => {
      const id = await criarCategoria(comPercentual);
      expect((await buscarCategoria(id))!).toMatchObject({
        limite_tipo: 'percentual_renda',
        limite_percentual_centesimos: 1_250,
        limite_centavos: null,
      });
    });

    it('rejeita nome duplicado ativo, sem diferenciar caixa (RN13, EX07)', async () => {
      await criarCategoria({ nome: 'Casa', limite: null });
      await expect(criarCategoria({ nome: 'casa', limite: null })).rejects.toThrow(NomeDuplicado);
      expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(1);
    });

    it('permite nome igual a tombstone (unicidade vale só para ativas)', async () => {
      const id1 = await criarCategoria({ nome: 'Lazer', limite: null });
      await excluirCategoria(id1);
      await expect(criarCategoria({ nome: 'Lazer', limite: null })).resolves.toBeTruthy();
    });

    it('revalida entradas no serviço (defesa em profundidade, RN13/RN14)', async () => {
      await expect(criarCategoria({ nome: '   ', limite: null })).rejects.toThrow(EntradaCategoriaInvalida);
      await expect(criarCategoria({ nome: 'a'.repeat(31), limite: null })).rejects.toThrow(EntradaCategoriaInvalida);
      await expect(
        criarCategoria({ nome: 'X', limite: { tipo: 'valor', valor: -5 } as any }),
      ).rejects.toThrow(EntradaCategoriaInvalida);
      await expect(
        criarCategoria({ nome: 'X', limite: { tipo: 'percentual_renda', valor: 0 } as any }),
      ).rejects.toThrow(EntradaCategoriaInvalida);
      await expect(criarCategoria({ nome: 'X', limite: { tipo: 'outro', valor: 1 } as any })).rejects.toThrow(
        EntradaCategoriaInvalida,
      );
      expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(0);
    });
  });

  // ---------------------------------------------------------------- editar (C)

  describe('editarCategoria', () => {
    it('edita categoria própria: nome e limite', async () => {
      const id = await criarCategoria(semLimite);
      await editarCategoria(id, { nome: 'Mercado Novo', limite: comValor.limite });
      expect((await buscarCategoria(id))!).toMatchObject({
        nome: 'Mercado Novo',
        nome_normalizado: 'mercado novo',
        limite_tipo: 'valor',
        limite_centavos: 150_000,
      });
    });

    it('rejeita renomear para nome duplicado ativo', async () => {
      await criarCategoria({ nome: 'Casa', limite: null });
      const id = await criarCategoria({ nome: 'Outra', limite: null });
      await expect(editarCategoria(id, { nome: 'casa', limite: null })).rejects.toThrow(NomeDuplicado);
      expect((await buscarCategoria(id))!.nome).toBe('Outra'); // nada alterado
    });

    it('categoria padrão: limite alterável, nome e identificação imutáveis', async () => {
      await semearCategoriasPadrao();
      const padrao = (banco.sqlite.prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1').get() as any);
      await editarCategoria(padrao.id, { nome: padrao.nome, limite: comValor.limite });

      const depois = (banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(padrao.id) as any);
      expect(depois).toMatchObject({
        nome: padrao.nome, // nome intacto
        nome_normalizado: padrao.nome_normalizado,
        padrao: 1,
        limite_tipo: 'valor',
        limite_centavos: 150_000,
      });
    });

    it('categoria padrão: nome divergente é rejeitado, não ignorado silenciosamente (EX02)', async () => {
      await semearCategoriasPadrao();
      const padrao = (banco.sqlite.prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1').get() as any);
      await expect(
        editarCategoria(padrao.id, { nome: 'Nome Diferente', limite: null }),
      ).rejects.toThrow(/não podem ser renomeadas/);
      expect((banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(padrao.id) as any).nome).toBe(
        padrao.nome,
      );
    });

    it('inexistente → CategoriaIndisponivel (EX06)', async () => {
      await expect(editarCategoria('nao-existe', semLimite)).rejects.toThrow(CategoriaIndisponivel);
    });

    it('entrada inválida é revalidada e nada é alterado', async () => {
      const id = await criarCategoria(semLimite);
      await expect(editarCategoria(id, { nome: 'a'.repeat(31), limite: null })).rejects.toThrow(
        EntradaCategoriaInvalida,
      );
      expect((await buscarCategoria(id))!.nome).toBe('Mercado');
    });
  });

  // ---------------------------------------------------------------- excluir (D)

  describe('excluirCategoria', () => {
    it('exclui própria com tombstone: excluido_em, limites nulos e pendente', async () => {
      const id = await criarCategoria(comValor);
      await excluirCategoria(id);

      const c = (banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(id) as any);
      expect(c.excluido_em).toBeTruthy();
      expect(c.limite_tipo).toBeNull();
      expect(c.limite_centavos).toBeNull();
      expect(c.limite_percentual_centesimos).toBeNull();
      expect(c.sync_status).toBe('pendente'); // exclusão precisa chegar à nuvem
      expect(await buscarCategoria(id)).toBeNull();
    });

    it('proíbe excluir categoria padrão (RN13, EX02)', async () => {
      await semearCategoriasPadrao();
      const padrao = (banco.sqlite.prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1').get() as any);
      await expect(excluirCategoria(padrao.id)).rejects.toThrow(/não podem ser renomeadas nem excluídas/);
      expect((banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(padrao.id) as any).excluido_em).toBeNull();
    });

    it('inexistente → CategoriaIndisponivel (EX06)', async () => {
      await expect(excluirCategoria('nao-existe')).rejects.toThrow(CategoriaIndisponivel);
    });

    it('nome de excluída volta a estar disponível (tombstone)', async () => {
      const id = await criarCategoria(semLimite);
      await excluirCategoria(id);
      await expect(criarCategoria(semLimite)).resolves.toBeTruthy();
    });
  });

  // ---------------------------------------------------------------- consultas

  describe('listarCategorias e contadores', () => {
    it('lista apenas ativas, padrão primeiro, nome em ordem, SEM total_lancamentos fictício', async () => {
      await semearCategoriasPadrao();
      await criarCategoria({ nome: 'Zebra', limite: null });
      await criarCategoria({ nome: 'Abacaxi', limite: null });
      const tombada = await criarCategoria({ nome: 'Tombada', limite: null });
      await excluirCategoria(tombada);

      const itens = await listarCategorias();
      expect(itens).toHaveLength(CATEGORIAS_PADRAO.length + 2); // tombada fora
      expect(itens[0].padrao).toBe(1); // padrões primeiro
      for (const item of itens) {
        expect(item).not.toHaveProperty('total_lancamentos'); // sem valor fictício
      }
      const proprias = itens.filter((i) => i.padrao === 0).map((i) => i.nome);
      expect(proprias).toEqual(['Abacaxi', 'Zebra']); // nome ASC dentro do grupo
    });

    it('contarPendentesCategorias conta gravações pendentes (RN11)', async () => {
      expect(await contarPendentesCategorias()).toBe(0);
      await criarCategoria(semLimite);
      await criarCategoria({ nome: 'Outra', limite: { tipo: 'valor' as const, valor: 150_000 } });
      expect(await contarPendentesCategorias()).toBe(2);
    });
  });

  // ---------------------------------------------------------------- transação

  it('falha na gravação é envolvida em FalhaPersistenciaCategoria e reverte a transação (RN11)', async () => {
    banco.falharNaOperacao(1); // a próxima gravação lança erro
    await expect(criarCategoria(semLimite)).rejects.toThrow(FalhaPersistenciaCategoria);
    expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(0);
  });

  it('violação de CHECK do banco é a última defesa (defesa em profundidade)', async () => {
    await expect(
      (await getDb()).runAsync(
        `INSERT INTO categorias (id, nome, nome_normalizado, padrao, sync_status, criado_em, atualizado_em)
         VALUES ('x', 'Nome Válido', 'nome válido', 2, 'pendente', 't', 't')`,
      ),
    ).rejects.toThrow(/padrao_valido/);
  });
});
