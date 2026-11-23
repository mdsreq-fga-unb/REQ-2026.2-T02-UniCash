import type { Categoria } from '@/features/categorias/types';
import {
  CATEGORIAS_PADRAO_DESPESA,
  categoriaConhecida,
  nomeCategoriaPorId,
  resolverCategoriaRemota,
  rotuloCategoria,
  ROTULO_SEM_CATEGORIA,
} from '@/features/despesas/categorias';

describe('categorias padrão de despesa (RN13)', () => {
  it('são as sete categorias do caso de uso, na ordem', () => {
    expect(CATEGORIAS_PADRAO_DESPESA.map((c) => c.nome)).toEqual([
      'Casa',
      'Alimentação',
      'Mobilidade',
      'Estudos',
      'Saúde',
      'Lazer',
      'Reserva financeira',
    ]);
  });

  it('têm ids únicos', () => {
    const ids = CATEGORIAS_PADRAO_DESPESA.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CATEGORIAS_PADRAO_DESPESA.map((c) => [c.id, c.nome]))(
    'o id %s tem o rótulo %s',
    (id, nome) => {
      expect(categoriaConhecida(id)).toBe(true);
      expect(rotuloCategoria(id)).toBe(nome);
    },
  );

  it.each([null, undefined, '', 'Moradia', 'categoria-removida'])(
    'id %p aparece como "Sem categoria"',
    (id) => {
      expect(categoriaConhecida(id)).toBe(false);
      expect(rotuloCategoria(id)).toBe(ROTULO_SEM_CATEGORIA);
    },
  );
});

function categoria(extra: Partial<Categoria> = {}): Categoria {
  return {
    id: 'uuid-casa',
    nome: 'Casa',
    nome_normalizado: 'casa',
    padrao: 1,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'sincronizado',
    excluido_em: null,
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

describe('nomeCategoriaPorId (IDs reais do UC06)', () => {
  it('resolve o nome de uma categoria padrão ativa', () => {
    const padrao = categoria({ id: 'uuid-casa', nome: 'Casa', padrao: 1 });

    expect(nomeCategoriaPorId('uuid-casa', [padrao])).toBe('Casa');
  });

  it('resolve o nome de uma categoria própria ativa', () => {
    const propria = categoria({
      id: 'uuid-mercado',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
    });

    expect(nomeCategoriaPorId('uuid-mercado', [propria])).toBe('Mercado');
  });

  it('retorna "Sem categoria" para categoriaId nulo', () => {
    expect(nomeCategoriaPorId(null, [categoria()])).toBe(
      ROTULO_SEM_CATEGORIA,
    );
  });

  it('retorna "Sem categoria" para slug histórico em quarentena', () => {
    const categorias = [categoria({ id: 'uuid-casa', nome: 'Casa' })];

    expect(nomeCategoriaPorId('casa', categorias)).toBe(
      ROTULO_SEM_CATEGORIA,
    );
  });

  it('retorna "Sem categoria" para ID desconhecido', () => {
    expect(nomeCategoriaPorId('uuid-inexistente', [categoria()])).toBe(
      ROTULO_SEM_CATEGORIA,
    );
  });

  it('retorna "Sem categoria" para categoria excluída', () => {
    const excluida = categoria({
      id: 'uuid-antiga',
      nome: 'Antiga',
      excluido_em: '2026-02-01T00:00:00Z',
    });

    expect(nomeCategoriaPorId('uuid-antiga', [excluida])).toBe(
      ROTULO_SEM_CATEGORIA,
    );
  });

  it('retorna "Sem categoria" para lista vazia', () => {
    expect(nomeCategoriaPorId('uuid-casa', [])).toBe(ROTULO_SEM_CATEGORIA);
  });

  it('não modifica o ID nem a lista recebida', () => {
    const categorias = Object.freeze([
      categoria({ id: 'uuid-casa', nome: 'Casa' }),
      categoria({ id: 'uuid-mercado', nome: 'Mercado', padrao: 0 }),
    ]);
    const antes = categorias.map((c) => ({ ...c }));
    const id = 'uuid-mercado';

    expect(nomeCategoriaPorId(id, categorias)).toBe('Mercado');

    expect(id).toBe('uuid-mercado');
    expect(categorias).toEqual(antes);
    expect(categorias).toHaveLength(2);
  });

  it('preserva o comportamento de categoriaConhecida e rotuloCategoria', () => {
    expect(categoriaConhecida('casa')).toBe(true);
    expect(rotuloCategoria('casa')).toBe('Casa');
    expect(categoriaConhecida('uuid-casa')).toBe(false);
    expect(rotuloCategoria('uuid-casa')).toBe(ROTULO_SEM_CATEGORIA);
  });
});

describe('resolverCategoriaRemota (contrato da nuvem)', () => {
  const MAPEAMENTO = [
    ['casa', 'Casa', 'casa', 'uuid-casa'],
    ['alimentacao', 'Alimentação', 'alimentação', 'uuid-alimentacao'],
    ['mobilidade', 'Mobilidade', 'mobilidade', 'uuid-mobilidade'],
    ['estudos', 'Estudos', 'estudos', 'uuid-estudos'],
    ['saude', 'Saúde', 'saúde', 'uuid-saude'],
    ['lazer', 'Lazer', 'lazer', 'uuid-lazer'],
    ['reserva_financeira', 'Reserva financeira', 'reserva financeira', 'uuid-reserva'],
  ] as const;

  function categoriasPadrao() {
    return MAPEAMENTO.map(([, nome, nome_normalizado, id]) =>
      categoria({ id, nome, nome_normalizado, padrao: 1 }),
    );
  }

  it.each(MAPEAMENTO)(
    'mapeia o slug %s para o ID real da padrão %s',
    (slug, _nome, _normalizado, id) => {
      const resultado = resolverCategoriaRemota(slug, categoriasPadrao());

      expect(resultado).toEqual({ tipo: 'valida', id });
      expect(resultado.tipo).toBe('valida');
      if (resultado.tipo === 'valida') {
        expect(resultado.id).not.toBe(slug);
      }
    },
  );

  it('aceita ID real de categoria padrão ativa', () => {
    expect(
      resolverCategoriaRemota('uuid-casa', categoriasPadrao()),
    ).toEqual({ tipo: 'valida', id: 'uuid-casa' });
  });

  it('aceita ID real de categoria própria ativa', () => {
    const propria = categoria({
      id: 'uuid-mercado',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
    });

    expect(resolverCategoriaRemota('uuid-mercado', [propria])).toEqual({
      tipo: 'valida',
      id: 'uuid-mercado',
    });
  });

  it.each([null, undefined])('%p vira sem_categoria', (valor) => {
    expect(resolverCategoriaRemota(valor, categoriasPadrao())).toEqual({
      tipo: 'sem_categoria',
    });
  });

  it('slug sem categoria padrão correspondente é inválido', () => {
    const propriaComNomeReservado = categoria({
      id: 'uuid-casa-propria',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 0,
    });

    expect(
      resolverCategoriaRemota('casa', [propriaComNomeReservado]),
    ).toEqual({ tipo: 'invalida' });
  });

  it('slug sem nenhuma categoria correspondente é inválido', () => {
    expect(resolverCategoriaRemota('casa', [])).toEqual({
      tipo: 'invalida',
    });
  });

  it('ID desconhecido é inválido', () => {
    expect(
      resolverCategoriaRemota('uuid-desconhecido', categoriasPadrao()),
    ).toEqual({ tipo: 'invalida' });
  });

  it('categoria excluída é inválida mesmo com o ID presente', () => {
    const excluida = categoria({
      id: 'uuid-antiga',
      nome: 'Antiga',
      nome_normalizado: 'antiga',
      padrao: 0,
      excluido_em: '2026-02-01T00:00:00Z',
    });

    expect(resolverCategoriaRemota('uuid-antiga', [excluida])).toEqual({
      tipo: 'invalida',
    });
  });

  it('padrão excluída não resolve o slug', () => {
    const excluida = categoria({
      id: 'uuid-casa',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      excluido_em: '2026-02-01T00:00:00Z',
    });

    expect(resolverCategoriaRemota('casa', [excluida])).toEqual({
      tipo: 'invalida',
    });
  });

  it.each([42, true, {}, [], '', 'Casa', 'CASA'])(
    'valor remoto %p de tipo/forma inesperada é inválido',
    (valor) => {
      expect(resolverCategoriaRemota(valor, categoriasPadrao())).toEqual({
        tipo: 'invalida',
      });
    },
  );

  it('não confunde categoria própria com padrão de nome semelhante', () => {
    const propria = categoria({
      id: 'uuid-casas',
      nome: 'Casas',
      nome_normalizado: 'casas',
      padrao: 0,
    });

    expect(resolverCategoriaRemota('casa', [propria])).toEqual({
      tipo: 'invalida',
    });
  });

  it('não modifica o valor remoto nem a lista recebida', () => {
    const categorias = Object.freeze(categoriasPadrao());
    const antes = categorias.map((c) => ({ ...c }));
    const valor = 'alimentacao';

    expect(resolverCategoriaRemota(valor, categorias)).toEqual({
      tipo: 'valida',
      id: 'uuid-alimentacao',
    });

    expect(valor).toBe('alimentacao');
    expect(categorias).toEqual(antes);
  });
});
