import { getDb } from '@/db/database';
import {
  CategoriaIndisponivel,
  CategoriaPadraoProtegida,
  FalhaLeituraCategoria,
  FalhaPersistenciaCategoria,
  NomeDuplicado,
  buscarCategoria,
  contarPendentesCategorias,
  criarCategoria,
  editarCategoria,
  excluirCategoria,
  listarCategorias,
  semearCategoriasPadrao,
} from '@/features/categorias/service';
import { EntradaCategoriaInvalida, MSG_CAT } from '@/features/categorias/validation';
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
      const resultado = await semearCategoriasPadrao();
      expect(resultado).toEqual({ criadas: [...CATEGORIAS_PADRAO], conflitos: [] });
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
      const resultado = await semearCategoriasPadrao();
      expect(resultado).toEqual({ criadas: [], conflitos: [] });
      expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get()).toEqual({
        n: CATEGORIAS_PADRAO.length,
      });
    });

    it('re-semeia padrão ausente sem duplicar os presentes', async () => {
      await semearCategoriasPadrao();
      banco.sqlite.prepare('DELETE FROM categorias WHERE nome_normalizado = ?').run('casa');
      const resultado = await semearCategoriasPadrao();
      expect(resultado).toMatchObject({ criadas: ['Casa'], conflitos: [] });
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

    it('cria as demais padrão e reporta conflito com categoria própria ativa, preservando-a', async () => {
      const idPropria = await criarCategoria({
        nome: 'Casa',
        limite: { tipo: 'valor', valor: 12_345 },
      });

      const resultado = await semearCategoriasPadrao();

      expect(resultado.conflitos).toEqual(['Casa']);
      expect(resultado.criadas).toEqual(CATEGORIAS_PADRAO.filter((nome) => nome !== 'Casa'));

      // A categoria própria não foi apagada, renomeada, convertida nem teve o limite alterado.
      const propria = banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(idPropria) as any;
      expect(propria).toMatchObject({
        nome: 'Casa',
        nome_normalizado: 'casa',
        padrao: 0,
        limite_tipo: 'valor',
        limite_centavos: 12_345,
        excluido_em: null,
      });
      expect(
        (banco.sqlite.prepare("SELECT COUNT(*) AS n FROM categorias WHERE nome_normalizado = 'casa' AND excluido_em IS NULL").get() as any).n,
      ).toBe(1); // não duplicou o nome reservado
      expect(
        (banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias WHERE padrao = 1 AND excluido_em IS NULL').get() as any).n,
      ).toBe(CATEGORIAS_PADRAO.length - 1); // as demais padrão foram criadas
      expect(banco.sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    });

    it('reporta todos os conflitos e cria todas as padrão sem conflito', async () => {
      const idCasa = await criarCategoria({ nome: 'Casa', limite: null });
      const idLazer = await criarCategoria({
        nome: 'Lazer',
        limite: { tipo: 'valor', valor: 5_000 },
      });

      const resultado = await semearCategoriasPadrao();

      expect(new Set(resultado.conflitos)).toEqual(new Set(['Casa', 'Lazer']));
      expect(resultado.criadas).toEqual(CATEGORIAS_PADRAO.filter((nome) => nome !== 'Casa' && nome !== 'Lazer'));
      expect((banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(idCasa) as any)).toMatchObject({
        padrao: 0,
        excluido_em: null,
      });
      expect((banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(idLazer) as any)).toMatchObject({
        padrao: 0,
        limite_tipo: 'valor',
        limite_centavos: 5_000,
        excluido_em: null,
      });
      expect(
        (banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias WHERE padrao = 1 AND excluido_em IS NULL').get() as any).n,
      ).toBe(CATEGORIAS_PADRAO.length - 2);
      expect(banco.sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    });

    it('após excluir a própria conflitante, a próxima semeadura cria a padrão sem duplicar', async () => {
      const idPropria = await criarCategoria({
        nome: 'Casa',
        limite: { tipo: 'valor', valor: 12_345 },
      });

      const primeira = await semearCategoriasPadrao();
      expect(primeira.conflitos).toEqual(['Casa']);
      expect(primeira.criadas).toEqual(CATEGORIAS_PADRAO.filter((nome) => nome !== 'Casa'));

      await excluirCategoria(idPropria);

      const segunda = await semearCategoriasPadrao();
      expect(segunda).toEqual({ criadas: ['Casa'], conflitos: [] });

      const terceira = await semearCategoriasPadrao();
      expect(terceira).toEqual({ criadas: [], conflitos: [] });

      const casa = banco.sqlite.prepare("SELECT * FROM categorias WHERE nome_normalizado = 'casa'").all() as any[];
      expect(casa.filter((l) => l.padrao === 1 && l.excluido_em === null)).toHaveLength(1);
      expect(casa.filter((l) => l.padrao === 0 && l.excluido_em === null)).toHaveLength(0);
      expect(
        (banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias WHERE padrao = 1 AND excluido_em IS NULL').get() as any).n,
      ).toBe(CATEGORIAS_PADRAO.length);
      expect(banco.sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
    });

    it('nome reservado em tombstone de categoria própria não bloqueia a semeadura', async () => {
      const id = await criarCategoria({ nome: 'Casa', limite: null });
      await excluirCategoria(id); // tombstone própria: nome volta a estar livre

      const resultado = await semearCategoriasPadrao();
      expect(resultado).toMatchObject({ criadas: [...CATEGORIAS_PADRAO], conflitos: [] });
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

    it.each([0, 99, 10_001, 200_000])(
      'rejeita limite percentual de %i centésimos no serviço, sem gravar nada (RN14, EX01)',
      async (valor) => {
        await expect(
          criarCategoria({
            nome: 'Percentual inválido',
            limite: { tipo: 'percentual_renda', valor },
          }),
        ).rejects.toThrow(MSG_CAT.limitePercentualInvalido);
        expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(0);
      },
    );

    it.each([100, 5_000, 9_999, 10_000])(
      'persiste o percentual válido de %i centésimos',
      async (valor) => {
        const id = await criarCategoria({
          nome: `Categoria ${valor}`,
          limite: { tipo: 'percentual_renda', valor },
        });
        expect((await buscarCategoria(id))!).toMatchObject({
          limite_tipo: 'percentual_renda',
          limite_percentual_centesimos: valor,
        });
      },
    );

    it('rejeita nome duplicado ativo, sem diferenciar caixa (RN13, EX07)', async () => {
      await criarCategoria({ nome: 'Casa', limite: null });
      await expect(criarCategoria({ nome: 'casa', limite: null })).rejects.toThrow(NomeDuplicado);
      expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(1);
    });

    it('conta caracteres Unicode por code point: 30 emojis aceitos e 31 rejeitados (RN13)', async () => {
      const nome30 = '😀'.repeat(30);
      const id = await criarCategoria({ nome: nome30, limite: null });
      expect((await buscarCategoria(id))!.nome).toBe(nome30);
      await expect(criarCategoria({ nome: '😀'.repeat(31), limite: null })).rejects.toThrow(
        EntradaCategoriaInvalida,
      );
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

    it('edita categoria própria removendo o limite', async () => {
      const id = await criarCategoria(comValor);
      await editarCategoria(id, { nome: 'Mercado Novo', limite: null });

      expect((await buscarCategoria(id))!).toMatchObject({
        nome: 'Mercado Novo',
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
      });
    });

    it('edita categoria própria com limite percentual', async () => {
      const id = await criarCategoria(semLimite);
      await editarCategoria(id, { nome: 'Mercado Novo', limite: comPercentual.limite });

      expect((await buscarCategoria(id))!).toMatchObject({
        nome: 'Mercado Novo',
        limite_tipo: 'percentual_renda',
        limite_centavos: null,
        limite_percentual_centesimos: 1_250,
      });
    });

    it('edita categoria própria sem alterar o nome', async () => {
      const id = await criarCategoria(semLimite);
      await editarCategoria(id, { nome: 'Mercado', limite: comValor.limite });

      expect((await buscarCategoria(id))!).toMatchObject({
        nome: 'Mercado',
        limite_tipo: 'valor',
        limite_centavos: 150_000,
      });
    });

    it('categoria padrão: remove o limite', async () => {
      await semearCategoriasPadrao();
      const padrao = (banco.sqlite.prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1').get() as any);
      await editarCategoria(padrao.id, { nome: padrao.nome, limite: comValor.limite });
      await editarCategoria(padrao.id, { nome: padrao.nome, limite: null });

      const depois = (banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(padrao.id) as any);
      expect(depois).toMatchObject({
        limite_tipo: null,
        limite_centavos: null,
        limite_percentual_centesimos: null,
      });
    });

    it('categoria padrão: aceita limite percentual', async () => {
      await semearCategoriasPadrao();
      const padrao = (banco.sqlite.prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1').get() as any);
      await editarCategoria(padrao.id, { nome: padrao.nome, limite: comPercentual.limite });

      const depois = (banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(padrao.id) as any);
      expect(depois).toMatchObject({
        limite_tipo: 'percentual_renda',
        limite_centavos: null,
        limite_percentual_centesimos: 1_250,
      });
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

  describe('excluirCategoria: desvinculação e rollback', () => {
    const TS = '2026-01-01T00:00:00Z';

    function inserirDespesa(
      id: string,
      categoriaId: string | null,
      extra: Partial<{
        excluidoEm: string | null;
        syncStatus: 'pendente' | 'sincronizado';
        atualizadoEm: string;
        valorCentavos: number;
        titulo: string;
        data: string;
        descricao: string | null;
        fixaOuVariavel: 'fixa' | 'variavel' | null;
        essencial: 0 | 1 | null;
        recorrenciaId: string | null;
      }> = {},
    ): void {
      const {
        excluidoEm = null,
        syncStatus = 'sincronizado',
        atualizadoEm = TS,
        valorCentavos = 10_000,
        titulo = `Despesa ${id}`,
        data = '2026-01-10',
        descricao = 'Descricao',
        fixaOuVariavel = 'fixa',
        essencial = 1,
        recorrenciaId = null,
      } = extra;

      banco.sqlite
        .prepare(
          `INSERT INTO despesas
            (id, valor_centavos, data, titulo, descricao, categoria_id,
             fixa_ou_variavel, essencial, recorrencia_id, sync_status,
             excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          valorCentavos,
          data,
          titulo,
          descricao,
          categoriaId,
          fixaOuVariavel,
          essencial,
          recorrenciaId,
          syncStatus,
          excluidoEm,
          TS,
          atualizadoEm,
        );
    }

    function inserirSerie(
      id: string,
      categoriaId: string | null,
      extra: Partial<{
        tipo: 'receita' | 'despesa';
        ativa: 0 | 1;
        syncStatus: 'pendente' | 'sincronizado';
        atualizadoEm: string;
        valorCentavos: number;
        titulo: string;
        inicio: string;
        termino: string | null;
        intervalo: number;
        unidade: 'dia' | 'mes' | 'ano';
        descricao: string | null;
        fixaOuVariavel: 'fixa' | 'variavel' | null;
        essencial: 0 | 1 | null;
      }> = {},
    ): void {
      const {
        tipo = 'despesa',
        ativa = 1,
        syncStatus = 'sincronizado',
        atualizadoEm = TS,
        valorCentavos = 50_000,
        titulo = `Serie ${id}`,
        inicio = '2026-01-10',
        termino = '2026-12-10',
        intervalo = 1,
        unidade = 'mes',
        descricao = 'Serie',
        fixaOuVariavel = 'fixa',
        essencial = 1,
      } = extra;

      banco.sqlite
        .prepare(
          `INSERT INTO recorrencias
            (id, tipo, intervalo, unidade, inicio, termino, ativa,
             valor_centavos, titulo, descricao, categoria_id,
             fixa_ou_variavel, essencial, sync_status, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          tipo,
          intervalo,
          unidade,
          inicio,
          termino,
          ativa,
          valorCentavos,
          titulo,
          descricao,
          categoriaId,
          fixaOuVariavel,
          essencial,
          syncStatus,
          atualizadoEm,
        );
    }

    const lerDespesa = (id: string): any =>
      banco.sqlite.prepare('SELECT * FROM despesas WHERE id = ?').get(id);

    const lerSerie = (id: string): any =>
      banco.sqlite.prepare('SELECT * FROM recorrencias WHERE id = ?').get(id);

    const lerCategoria = (id: string): any =>
      banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(id);

    it('desvincula despesa avulsa ativa e preserva os demais campos', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('avulsa', id, {
        valorCentavos: 12_345,
        titulo: 'Aluguel',
        data: '2026-02-10',
        descricao: 'Contrato',
        fixaOuVariavel: 'variavel',
        essencial: 0,
      });
      const antes = lerDespesa('avulsa');

      await excluirCategoria(id);

      const depois = lerDespesa('avulsa');
      expect(depois).toMatchObject({
        categoria_id: null,
        sync_status: 'pendente',
        valor_centavos: antes.valor_centavos,
        titulo: antes.titulo,
        data: antes.data,
        descricao: antes.descricao,
        fixa_ou_variavel: antes.fixa_ou_variavel,
        essencial: antes.essencial,
        recorrencia_id: antes.recorrencia_id,
        criado_em: antes.criado_em,
      });
      expect(depois.atualizado_em).not.toBe(antes.atualizado_em);
    });

    it('desvincula série ativa e ocorrências não excluídas', async () => {
      const id = await criarCategoria(comValor);
      inserirSerie('serie-ativa', id, {
        valorCentavos: 77_777,
        titulo: 'Aluguel',
        inicio: '2026-01-15',
        termino: '2026-06-15',
        descricao: 'Serie ativa',
        fixaOuVariavel: 'variavel',
        essencial: 0,
      });
      inserirDespesa('oc-1', id, {
        recorrenciaId: 'serie-ativa',
        valorCentavos: 77_777,
        titulo: 'Aluguel',
        data: '2026-01-15',
      });
      inserirDespesa('oc-2', id, {
        recorrenciaId: 'serie-ativa',
        valorCentavos: 77_777,
        titulo: 'Aluguel',
        data: '2026-02-15',
      });

      await excluirCategoria(id);

      const serie = lerSerie('serie-ativa');
      expect(serie).toMatchObject({
        categoria_id: null,
        sync_status: 'pendente',
        ativa: 1,
        valor_centavos: 77_777,
        titulo: 'Aluguel',
        intervalo: 1,
        unidade: 'mes',
        inicio: '2026-01-15',
        termino: '2026-06-15',
        descricao: 'Serie ativa',
        fixa_ou_variavel: 'variavel',
        essencial: 0,
      });
      expect(serie.atualizado_em).not.toBe(TS);

      for (const [idOcorrencia, data] of [
        ['oc-1', '2026-01-15'],
        ['oc-2', '2026-02-15'],
      ] as const) {
        const ocorrencia = lerDespesa(idOcorrencia);
        expect(ocorrencia).toMatchObject({
          categoria_id: null,
          sync_status: 'pendente',
          recorrencia_id: 'serie-ativa',
          valor_centavos: 77_777,
          titulo: 'Aluguel',
          data,
        });
        expect(ocorrencia.atualizado_em).not.toBe(TS);
      }
    });

    it('desvincula série inativa e preserva ativa=0', async () => {
      const id = await criarCategoria(comValor);
      inserirSerie('serie-inativa', id, {
        ativa: 0,
        valorCentavos: 44_444,
        titulo: 'Serie encerrada',
      });
      const antes = lerSerie('serie-inativa');

      await excluirCategoria(id);

      const depois = lerSerie('serie-inativa');
      expect(depois).toMatchObject({
        categoria_id: null,
        sync_status: 'pendente',
        ativa: 0,
        valor_centavos: antes.valor_centavos,
        titulo: antes.titulo,
        intervalo: antes.intervalo,
        unidade: antes.unidade,
        inicio: antes.inicio,
        termino: antes.termino,
        descricao: antes.descricao,
        fixa_ou_variavel: antes.fixa_ou_variavel,
        essencial: antes.essencial,
      });
      expect(depois.atualizado_em).not.toBe(antes.atualizado_em);
    });

    it('preserva despesa tombstone sem alterar categoria, status ou timestamps', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('tombstone', id, {
        excluidoEm: '2026-02-01T00:00:00Z',
        atualizadoEm: '2026-02-02T00:00:00Z',
        syncStatus: 'pendente',
      });
      const antes = lerDespesa('tombstone');

      await excluirCategoria(id);

      expect(lerDespesa('tombstone')).toEqual(antes);
    });

    it('não altera série de receita mesmo com categoria_id', async () => {
      const id = await criarCategoria(comValor);
      inserirSerie('serie-receita', id, {
        tipo: 'receita',
        valorCentavos: 20_000,
        titulo: 'Receita',
        fixaOuVariavel: null,
        essencial: null,
      });
      const antes = lerSerie('serie-receita');

      await excluirCategoria(id);

      expect(lerSerie('serie-receita')).toEqual(antes);
    });

    it('não altera registros de outras categorias', async () => {
      const id = await criarCategoria(comValor);
      const outra = await criarCategoria({ nome: 'Outra', limite: null });
      inserirDespesa('outra-despesa', outra);
      inserirSerie('outra-serie', outra);
      const antesDespesa = lerDespesa('outra-despesa');
      const antesSerie = lerSerie('outra-serie');

      await excluirCategoria(id);

      expect(lerDespesa('outra-despesa')).toEqual(antesDespesa);
      expect(lerSerie('outra-serie')).toEqual(antesSerie);
    });

    it('categoria padrão rejeita e não altera referências', async () => {
      await semearCategoriasPadrao();
      const padrao = banco.sqlite
        .prepare('SELECT * FROM categorias WHERE padrao = 1 LIMIT 1')
        .get() as any;
      inserirDespesa('padrao-despesa', padrao.id);
      inserirSerie('padrao-serie', padrao.id);
      const antesDespesa = lerDespesa('padrao-despesa');
      const antesSerie = lerSerie('padrao-serie');

      await expect(excluirCategoria(padrao.id)).rejects.toThrow(
        CategoriaPadraoProtegida,
      );

      expect(lerCategoria(padrao.id).excluido_em).toBeNull();
      expect(lerDespesa('padrao-despesa')).toEqual(antesDespesa);
      expect(lerSerie('padrao-serie')).toEqual(antesSerie);
    });

    it('categoria inexistente rejeita e não altera referências', async () => {
      inserirDespesa('orfa-despesa', 'categoria-inexistente');
      inserirSerie('orfa-serie', 'categoria-inexistente');
      const antesDespesa = lerDespesa('orfa-despesa');
      const antesSerie = lerSerie('orfa-serie');

      await expect(excluirCategoria('categoria-inexistente')).rejects.toThrow(
        CategoriaIndisponivel,
      );

      expect(lerDespesa('orfa-despesa')).toEqual(antesDespesa);
      expect(lerSerie('orfa-serie')).toEqual(antesSerie);
    });

    it('segunda exclusão mantém CategoriaIndisponivel e não altera nada', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('segunda-despesa', id);
      inserirSerie('segunda-serie', id);

      await excluirCategoria(id);

      const categoria = lerCategoria(id);
      const despesa = lerDespesa('segunda-despesa');
      const serie = lerSerie('segunda-serie');

      await expect(excluirCategoria(id)).rejects.toThrow(
        CategoriaIndisponivel,
      );

      expect(lerCategoria(id)).toEqual(categoria);
      expect(lerDespesa('segunda-despesa')).toEqual(despesa);
      expect(lerSerie('segunda-serie')).toEqual(serie);
    });

    it('falha na primeira escrita mantém categoria e referências', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('falha-1-despesa', id);
      inserirSerie('falha-1-serie', id);
      const categoria = lerCategoria(id);
      const despesa = lerDespesa('falha-1-despesa');
      const serie = lerSerie('falha-1-serie');

      banco.chamadas = 0;
      banco.falharNaOperacao(1);

      await expect(excluirCategoria(id)).rejects.toThrow(
        FalhaPersistenciaCategoria,
      );

      expect(banco.chamadas).toBe(1);
      expect(lerCategoria(id)).toEqual(categoria);
      expect(lerDespesa('falha-1-despesa')).toEqual(despesa);
      expect(lerSerie('falha-1-serie')).toEqual(serie);
    });

    it('falha na segunda escrita reverte despesas e mantém séries', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('falha-2-despesa', id);
      inserirSerie('falha-2-serie', id);
      const categoria = lerCategoria(id);
      const despesa = lerDespesa('falha-2-despesa');
      const serie = lerSerie('falha-2-serie');

      banco.chamadas = 0;
      banco.falharNaOperacao(2);

      await expect(excluirCategoria(id)).rejects.toThrow(
        FalhaPersistenciaCategoria,
      );

      expect(banco.chamadas).toBe(2);
      expect(lerCategoria(id)).toEqual(categoria);
      expect(lerDespesa('falha-2-despesa')).toEqual(despesa);
      expect(lerSerie('falha-2-serie')).toEqual(serie);
    });

    it('falha na terceira escrita reverte todas as referências', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('falha-3-despesa', id);
      inserirSerie('falha-3-serie', id);
      const categoria = lerCategoria(id);
      const despesa = lerDespesa('falha-3-despesa');
      const serie = lerSerie('falha-3-serie');

      banco.chamadas = 0;
      banco.falharNaOperacao(3);

      await expect(excluirCategoria(id)).rejects.toThrow(
        FalhaPersistenciaCategoria,
      );

      expect(banco.chamadas).toBe(3);
      expect(lerCategoria(id)).toEqual(categoria);
      expect(lerDespesa('falha-3-despesa')).toEqual(despesa);
      expect(lerSerie('falha-3-serie')).toEqual(serie);
    });

    it('nova tentativa após falha conclui a exclusão', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('retry-despesa', id);
      inserirSerie('retry-serie', id);

      banco.chamadas = 0;
      banco.falharNaOperacao(2);
      await expect(excluirCategoria(id)).rejects.toThrow(
        FalhaPersistenciaCategoria,
      );

      await excluirCategoria(id);

      expect(lerCategoria(id).excluido_em).toBeTruthy();
      expect(lerDespesa('retry-despesa')).toMatchObject({
        categoria_id: null,
        sync_status: 'pendente',
      });
      expect(lerSerie('retry-serie')).toMatchObject({
        categoria_id: null,
        sync_status: 'pendente',
      });
    });

    it('categoria, despesas e séries afetadas recebem o mesmo atualizado_em', async () => {
      const id = await criarCategoria(comValor);
      inserirDespesa('mesmo-ts-despesa', id);
      inserirSerie('mesmo-ts-serie-ativa', id, { ativa: 1 });
      inserirSerie('mesmo-ts-serie-inativa', id, { ativa: 0 });

      await excluirCategoria(id);

      const categoria = lerCategoria(id);
      expect(categoria.atualizado_em).not.toBe(TS);
      expect(lerDespesa('mesmo-ts-despesa').atualizado_em).toBe(
        categoria.atualizado_em,
      );
      expect(lerSerie('mesmo-ts-serie-ativa').atualizado_em).toBe(
        categoria.atualizado_em,
      );
      expect(lerSerie('mesmo-ts-serie-inativa').atualizado_em).toBe(
        categoria.atualizado_em,
      );
    });

    it('registros não afetados mantêm seus timestamps originais', async () => {
      const id = await criarCategoria(comValor);
      const outra = await criarCategoria({ nome: 'Outra', limite: null });
      const TS_OUTRA = '2025-12-01T00:00:00Z';
      inserirDespesa('afetada-despesa', id);
      inserirSerie('afetada-serie', id);
      inserirDespesa('nao-afetada-despesa', outra, {
        atualizadoEm: TS_OUTRA,
      });
      inserirSerie('nao-afetada-serie', outra, {
        atualizadoEm: TS_OUTRA,
      });
      const antesDespesa = lerDespesa('nao-afetada-despesa');
      const antesSerie = lerSerie('nao-afetada-serie');

      await excluirCategoria(id);

      expect(lerDespesa('nao-afetada-despesa')).toEqual(antesDespesa);
      expect(lerSerie('nao-afetada-serie')).toEqual(antesSerie);
      expect(lerDespesa('nao-afetada-despesa').atualizado_em).toBe(TS_OUTRA);
      expect(lerSerie('nao-afetada-serie').atualizado_em).toBe(TS_OUTRA);
    });
  });

  // ---------------------------------------------------------------- consultas

  describe('listarCategorias e contadores', () => {
    it('lista apenas ativas, padrão primeiro, nome em ordem, com contagem real de lançamentos', async () => {
      await semearCategoriasPadrao();
      const zebra = await criarCategoria({ nome: 'Zebra', limite: null });
      await criarCategoria({ nome: 'Abacaxi', limite: null });
      const tombada = await criarCategoria({ nome: 'Tombada', limite: null });
      await excluirCategoria(tombada);

      const inserirDespesa = (id: string, categoriaId: string | null, excluidoEm: string | null = null) =>
        banco.sqlite
          .prepare(
            `INSERT INTO despesas
              (id, valor_centavos, data, titulo, categoria_id, sync_status, excluido_em, criado_em, atualizado_em)
             VALUES (?, 1000, '2026-10-16', 'Despesa', ?, 'sincronizado', ?, '2026-10-16T00:00:00Z', '2026-10-16T00:00:00Z')`,
          )
          .run(id, categoriaId, excluidoEm);
      inserirDespesa('d1', zebra);
      inserirDespesa('d2', zebra);
      inserirDespesa('d3', zebra, '2026-10-17T00:00:00Z'); // tombstone não conta
      inserirDespesa('d4', null);

      const itens = await listarCategorias();
      expect(itens).toHaveLength(CATEGORIAS_PADRAO.length + 2); // tombada fora
      expect(itens[0].padrao).toBe(1); // padrões primeiro
      expect(itens.find((i) => i.nome === 'Zebra')?.total_lancamentos).toBe(2);
      expect(itens.find((i) => i.nome === 'Abacaxi')?.total_lancamentos).toBe(0);
      const proprias = itens.filter((i) => i.padrao === 0).map((i) => i.nome);
      expect(proprias).toEqual(['Abacaxi', 'Zebra']); // nome ASC dentro do grupo
    });

    it('falha de leitura vira FalhaLeituraCategoria (EX08)', async () => {
      (getDb as jest.Mock).mockRejectedValueOnce(new Error('db fechado'));
      await expect(listarCategorias()).rejects.toThrow(FalhaLeituraCategoria);
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

  it('falha no meio da semeadura reverte todas as categorias criadas na chamada (RN11, RNF05)', async () => {
    banco.falharNaOperacao(3); // deixa as duas primeiras inserções acontecerem e falha na terceira

    await expect(semearCategoriasPadrao()).rejects.toThrow(FalhaPersistenciaCategoria);
    expect((banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get() as any).n).toBe(0);
    expect(banco.sqlite.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
  });

  it('falha na edição reverte a alteração e mantém os dados anteriores (EX04, RN11)', async () => {
    const id = await criarCategoria(comValor);
    banco.falharNaOperacao(1); // a próxima gravação (UPDATE) lança erro

    await expect(editarCategoria(id, { nome: 'Mercado Novo', limite: null })).rejects.toThrow(
      FalhaPersistenciaCategoria,
    );

    expect(await buscarCategoria(id)).toMatchObject({
      nome: 'Mercado',
      limite_tipo: 'valor',
      limite_centavos: 150_000,
      sync_status: 'pendente',
    });
  });

  it('falha na exclusão não grava o tombstone (EX04, RN11)', async () => {
    const id = await criarCategoria(comValor);
    banco.falharNaOperacao(1); // a próxima gravação (UPDATE) lança erro

    await expect(excluirCategoria(id)).rejects.toThrow(FalhaPersistenciaCategoria);

    const c = (banco.sqlite.prepare('SELECT * FROM categorias WHERE id = ?').get(id) as any);
    expect(c.excluido_em).toBeNull();
    expect(c.limite_centavos).toBe(150_000);
    expect(await buscarCategoria(id)).not.toBeNull();
  });

  it('violação de CHECK do banco é a última defesa (defesa em profundidade)', async () => {
    await expect(
      (await getDb()).runAsync(
        `INSERT INTO categorias (id, nome, nome_normalizado, padrao, sync_status, criado_em, atualizado_em)
         VALUES ('x', 'Nome Válido', 'nome válido', 2, 'pendente', 't', 't')`,
      ),
    ).rejects.toThrow(/padrao_valido/);
  });

  describe('mapeamento de categorias históricas da UC02', () => {
    const SLUGS = [
      ['casa', 'Casa'],
      ['alimentacao', 'Alimentação'],
      ['mobilidade', 'Mobilidade'],
      ['estudos', 'Estudos'],
      ['saude', 'Saúde'],
      ['lazer', 'Lazer'],
      ['reserva_financeira', 'Reserva financeira'],
    ] as const;
    const TS = '2026-01-01T00:00:00Z';

    function inserirDespesa(
      id: string,
      categoriaId: string,
      excluidoEm: string | null = null,
    ): void {
      banco.sqlite
        .prepare(
          `INSERT INTO despesas
            (id, valor_centavos, data, titulo, descricao, categoria_id, sync_status,
             excluido_em, criado_em, atualizado_em)
           VALUES (?, 1000, '2026-01-10', ?, 'Descricao', ?, 'sincronizado', ?, ?, ?)`,
        )
        .run(id, `Despesa ${id}`, categoriaId, excluidoEm, TS, TS);
    }

    function inserirRecorrencia(id: string, categoriaId: string, ativa = 1): void {
      banco.sqlite
        .prepare(
          `INSERT INTO recorrencias
            (id, intervalo, unidade, inicio, ativa, valor_centavos, titulo, descricao,
             categoria_id, sync_status, atualizado_em)
           VALUES (?, 1, 'mes', '2026-01-10', ?, 50000, ?, 'Serie', ?, 'sincronizado', ?)`,
        )
        .run(id, ativa, `Recorrencia ${id}`, categoriaId, TS);
    }

    function idPadrao(nome: string): string {
      const linha = banco.sqlite
        .prepare(
          'SELECT id FROM categorias WHERE nome = ? AND padrao = 1 AND excluido_em IS NULL',
        )
        .get(nome) as { id: string } | undefined;
      if (!linha) throw new Error(`Categoria padrão ausente: ${nome}`);
      return linha.id;
    }

    function despesa(id: string): any {
      return banco.sqlite.prepare('SELECT * FROM despesas WHERE id = ?').get(id);
    }

    function recorrencia(id: string): any {
      return banco.sqlite.prepare('SELECT * FROM recorrencias WHERE id = ?').get(id);
    }

    it('mapeia os sete slugs em despesas e recorrencias para os IDs reais', async () => {
      await semearCategoriasPadrao();
      for (const [slug] of SLUGS) {
        inserirDespesa(`d-${slug}`, slug);
        inserirRecorrencia(`r-${slug}`, slug);
      }

      await semearCategoriasPadrao();

      for (const [slug, nome] of SLUGS) {
        const id = idPadrao(nome);
        expect(despesa(`d-${slug}`)).toMatchObject({
          id: `d-${slug}`,
          valor_centavos: 1000,
          data: '2026-01-10',
          titulo: `Despesa d-${slug}`,
          descricao: 'Descricao',
          categoria_id: id,
          sync_status: 'pendente',
        });
        expect(recorrencia(`r-${slug}`)).toMatchObject({
          id: `r-${slug}`,
          valor_centavos: 50000,
          titulo: `Recorrencia r-${slug}`,
          descricao: 'Serie',
          categoria_id: id,
          sync_status: 'pendente',
        });
        expect(despesa(`d-${slug}`).atualizado_em).not.toBe(TS);
        expect(recorrencia(`r-${slug}`).atualizado_em).not.toBe(TS);
      }
    });

    it('segunda execução é idempotente e não altera timestamps nem sync_status', async () => {
      await semearCategoriasPadrao();
      inserirDespesa('d-casa', 'casa');
      inserirRecorrencia('r-casa', 'casa');
      await semearCategoriasPadrao();

      const antesDespesa = despesa('d-casa');
      const antesRecorrencia = recorrencia('r-casa');
      await semearCategoriasPadrao();

      expect(despesa('d-casa')).toEqual(antesDespesa);
      expect(recorrencia('r-casa')).toEqual(antesRecorrencia);
    });

    it('preserva IDs reais e valores desconhecidos', async () => {
      await semearCategoriasPadrao();
      const casa = idPadrao('Casa');
      inserirDespesa('d-real', casa);
      inserirDespesa('d-desconhecida', 'id-desconhecido');
      inserirRecorrencia('r-real', casa);
      inserirRecorrencia('r-desconhecida', 'id-desconhecido');

      const antesDespesaReal = despesa('d-real');
      const antesDespesaDesconhecida = despesa('d-desconhecida');
      const antesRecorrenciaReal = recorrencia('r-real');
      const antesRecorrenciaDesconhecida = recorrencia('r-desconhecida');

      await semearCategoriasPadrao();

      expect(despesa('d-real')).toEqual(antesDespesaReal);
      expect(despesa('d-desconhecida')).toEqual(antesDespesaDesconhecida);
      expect(recorrencia('r-real')).toEqual(antesRecorrenciaReal);
      expect(recorrencia('r-desconhecida')).toEqual(antesRecorrenciaDesconhecida);
    });

    it('mantém slug em quarentena enquanto houver conflito com categoria própria', async () => {
      const propria = await criarCategoria({ nome: 'Casa', limite: null });
      inserirDespesa('d-conflito', 'casa');
      inserirRecorrencia('r-conflito', 'casa');

      const resultado = await semearCategoriasPadrao();

      expect(resultado.conflitos).toContain('Casa');
      expect(despesa('d-conflito').categoria_id).toBe('casa');
      expect(recorrencia('r-conflito').categoria_id).toBe('casa');

      await excluirCategoria(propria);
      await semearCategoriasPadrao();

      const casa = idPadrao('Casa');
      expect(despesa('d-conflito').categoria_id).toBe(casa);
      expect(recorrencia('r-conflito').categoria_id).toBe(casa);
    });

    it('falha no UPDATE de recorrencias reverted semeadura e mapeamento de despesas', async () => {
      await semearCategoriasPadrao();
      inserirDespesa('d-falha', 'casa');
      inserirRecorrencia('r-falha', 'casa');
      const categoriasAntes = banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get();

      banco.falharNaOperacao(2); // UPDATE despesas OK; UPDATE recorrencias falha
      await expect(semearCategoriasPadrao()).rejects.toThrow(FalhaPersistenciaCategoria);

      expect(despesa('d-falha').categoria_id).toBe('casa');
      expect(despesa('d-falha').sync_status).toBe('sincronizado');
      expect(despesa('d-falha').atualizado_em).toBe(TS);
      expect(recorrencia('r-falha').categoria_id).toBe('casa');
      expect(recorrencia('r-falha').sync_status).toBe('sincronizado');
      expect(banco.sqlite.prepare('SELECT COUNT(*) AS n FROM categorias').get()).toEqual(
        categoriasAntes,
      );
      expect(banco.sqlite.prepare('PRAGMA integrity_check').get()).toEqual({
        integrity_check: 'ok',
      });
    });

    it('preserva tombstones de despesas e mapeia recorrências inativas', async () => {
      await semearCategoriasPadrao();
      inserirDespesa('d-excluida', 'casa', '2026-02-01T00:00:00Z');
      inserirRecorrencia('r-inativa', 'casa', 0);

      await semearCategoriasPadrao();

      const casa = idPadrao('Casa');
      expect(despesa('d-excluida')).toMatchObject({
        categoria_id: 'casa',
        sync_status: 'sincronizado',
        atualizado_em: TS,
        excluido_em: '2026-02-01T00:00:00Z',
      });
      expect(recorrencia('r-inativa')).toMatchObject({
        categoria_id: casa,
        sync_status: 'pendente',
        ativa: 0,
      });
    });
  });

  describe('estado local explícito (v6)', () => {
    const estado = (id: string) =>
      (banco.sqlite
        .prepare('SELECT estado_local FROM categorias_estado WHERE categoria_id = ?')
        .get(id) as { estado_local: string } | undefined)?.estado_local;

    it('padrões recém-semeadas ficam em semeadura', async () => {
      await semearCategoriasPadrao();
      const padrões = banco.sqlite
        .prepare('SELECT id FROM categorias WHERE padrao = 1')
        .all() as Array<{ id: string }>;
      expect(padrões).toHaveLength(CATEGORIAS_PADRAO.length);
      for (const p of padrões) expect(estado(p.id)).toBe('semeadura');
    });

    it('categoria própria nasce editada e a leitura devolve o estado', async () => {
      const id = await criarCategoria(semLimite);
      expect(estado(id)).toBe('editado');
      expect((await buscarCategoria(id))?.estado_local).toBe('editado');
      expect((await listarCategorias()).find((c) => c.id === id)?.estado_local).toBe('editado');
    });

    it('editar padrão ou própria marca editado', async () => {
      await semearCategoriasPadrao();
      const padrão = banco.sqlite
        .prepare("SELECT id FROM categorias WHERE nome_normalizado = 'casa'")
        .get() as { id: string };
      await editarCategoria(padrão.id, { nome: 'Casa', limite: { tipo: 'valor', valor: 1000 } });
      expect(estado(padrão.id)).toBe('editado');

      const própria = await criarCategoria(semLimite);
      await editarCategoria(própria, { nome: 'Mercado', limite: null });
      expect(estado(própria)).toBe('editado');
    });

    it('excluir própria mantém estado editado até a confirmação remota', async () => {
      const id = await criarCategoria(semLimite);
      await excluirCategoria(id);
      expect(estado(id)).toBe('editado');
    });
  });
});
