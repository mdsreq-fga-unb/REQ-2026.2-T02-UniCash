import type { Categoria } from '@/features/categorias/types';

/**
 * Categorias padrão de despesa (RN13), usadas como seletor, rótulo e filtro do UC02.
 *
 * PROVISÓRIO: enquanto o UC06 (gerenciar categorias) não é integrado, as sete categorias padrão
 * ficam aqui como constantes. Os ids são slugs fixos e NÃO correspondem a linhas da tabela
 * `categorias` do UC06 (que usa ids gerados). Ao integrar o UC06, este módulo é o único ponto a
 * trocar (lista, rótulo e validação) e as despesas existentes precisam de migração de categoria_id.
 */
export interface CategoriaDespesa {
  id: string;
  nome: string;
}

export const CATEGORIAS_PADRAO_DESPESA: readonly CategoriaDespesa[] = [
  { id: 'casa', nome: 'Casa' },
  { id: 'alimentacao', nome: 'Alimentação' },
  { id: 'mobilidade', nome: 'Mobilidade' },
  { id: 'estudos', nome: 'Estudos' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'lazer', nome: 'Lazer' },
  { id: 'reserva_financeira', nome: 'Reserva financeira' },
];

export const ROTULO_SEM_CATEGORIA = 'Sem categoria';

export function categoriaConhecida(id: string | null | undefined): boolean {
  return CATEGORIAS_PADRAO_DESPESA.some((c) => c.id === id);
}

/** Nome para exibição; id nulo ou desconhecido (ex.: categoria removida) aparece como "Sem categoria". */
export function rotuloCategoria(id: string | null | undefined): string {
  return CATEGORIAS_PADRAO_DESPESA.find((c) => c.id === id)?.nome ?? ROTULO_SEM_CATEGORIA;
}

/**
 * Resolve o nome de exibição a partir de uma lista de categorias ativas do UC06.
 * Não consulta o banco, não altera o id recebido e não usa os slugs históricos.
 * NULL, slug em quarentena ou id sem correspondência exibem "Sem categoria".
 */
export function nomeCategoriaPorId(
  categoriaId: string | null,
  categorias: readonly Categoria[],
): string {
  if (!categoriaId) return ROTULO_SEM_CATEGORIA;

  return (
    categorias.find(
      (c) => c.id === categoriaId && c.excluido_em === null,
    )?.nome ?? ROTULO_SEM_CATEGORIA
  );
}

export type CategoriaRemotaResultado =
  | { tipo: 'valida'; id: string }
  | { tipo: 'sem_categoria' }
  | { tipo: 'invalida' };

/**
 * Mapa dos slugs históricos da UC02 para o nome normalizado da categoria padrão
 * correspondente. Não comparar slug com `nome_normalizado` diretamente:
 * "alimentacao" ≠ "alimentação" e "reserva_financeira" ≠ "reserva financeira".
 */
const NOME_NORMALIZADO_POR_SLUG = new Map(
  CATEGORIAS_PADRAO_DESPESA.map(({ id, nome }) => [
    id,
    nome.trim().toLowerCase(),
  ]),
);

/**
 * Resolve uma referência de categoria recebida da nuvem.
 *
 * Função pura: não consulta o banco, não cria nem altera categorias.
 * - null/undefined seguem o contrato remoto atual: sem categoria;
 * - ID real precisa existir e estar ativo na lista local;
 * - slug histórico só é aceito quando existe a categoria padrão local
 *   correspondente; o retorno é o ID real dela, nunca o slug;
 * - slug sem padrão, ID desconhecido, categoria excluída ou tipo inesperado
 *   são inválidos.
 */
export function resolverCategoriaRemota(
  valorRemoto: unknown,
  categorias: readonly Categoria[],
): CategoriaRemotaResultado {
  if (valorRemoto == null) return { tipo: 'sem_categoria' };
  if (typeof valorRemoto !== 'string') return { tipo: 'invalida' };

  const nomeNormalizadoPadrao = NOME_NORMALIZADO_POR_SLUG.get(valorRemoto);

  if (nomeNormalizadoPadrao) {
    const padrao = categorias.find(
      (c) =>
        c.padrao === 1 &&
        c.excluido_em === null &&
        c.nome_normalizado === nomeNormalizadoPadrao,
    );

    return padrao
      ? { tipo: 'valida', id: padrao.id }
      : { tipo: 'invalida' };
  }

  const categoria = categorias.find((c) => c.id === valorRemoto);

  if (!categoria || categoria.excluido_em !== null) {
    return { tipo: 'invalida' };
  }

  return { tipo: 'valida', id: categoria.id };
}
