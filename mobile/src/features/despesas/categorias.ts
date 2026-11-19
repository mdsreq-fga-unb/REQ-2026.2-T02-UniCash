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
