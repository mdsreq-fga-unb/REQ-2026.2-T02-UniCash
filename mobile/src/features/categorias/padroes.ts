import type { Categoria } from './types';
import { normalizarNome } from './validation';

export const PREFIXO_DOC_PADRAO = 'padrao_';

/** Identidade remota estável das sete categorias padrão (RN13). */
export const CATEGORIAS_PADRAO_REMOTAS = [
  { slug: 'casa', nome: 'Casa' },
  { slug: 'alimentacao', nome: 'Alimentação' },
  { slug: 'mobilidade', nome: 'Mobilidade' },
  { slug: 'estudos', nome: 'Estudos' },
  { slug: 'saude', nome: 'Saúde' },
  { slug: 'lazer', nome: 'Lazer' },
  { slug: 'reserva_financeira', nome: 'Reserva financeira' },
] as const;

export type SlugCategoriaPadrao = (typeof CATEGORIAS_PADRAO_REMOTAS)[number]['slug'];

const POR_SLUG = new Map(CATEGORIAS_PADRAO_REMOTAS.map((c) => [c.slug, c]));
const SLUG_POR_NOME_NORMALIZADO = new Map(
  CATEGORIAS_PADRAO_REMOTAS.map((c) => [normalizarNome(c.nome), c.slug]),
);

/**
 * Slug estável de uma categoria padrão ativa. Categoria própria retorna null,
 * mesmo que use um nome reservado.
 */
export function slugCategoriaPadrao(
  categoria: Pick<Categoria, 'padrao' | 'nome_normalizado'>,
): SlugCategoriaPadrao | null {
  if (categoria.padrao !== 1) return null;
  return (
    (SLUG_POR_NOME_NORMALIZADO.get(categoria.nome_normalizado) as
      | SlugCategoriaPadrao
      | undefined) ?? null
  );
}

/** Documento canônico da padrão; UUID local preservado para a própria. */
export function docIdCategoriaRemota(categoria: Pick<Categoria, 'id' | 'padrao' | 'nome_normalizado'>): string {
  const slug = slugCategoriaPadrao(categoria);
  return slug ? `${PREFIXO_DOC_PADRAO}${slug}` : categoria.id;
}

export function nomeCategoriaPadraoPorSlug(slug: string): string | null {
  return POR_SLUG.get(slug as SlugCategoriaPadrao)?.nome ?? null;
}

export function nomeNormalizadoCategoriaPadraoPorSlug(slug: string): string | null {
  const nome = nomeCategoriaPadraoPorSlug(slug);
  return nome ? normalizarNome(nome) : null;
}

export function slugDoDocIdPadrao(docId: string): SlugCategoriaPadrao | null {
  if (!docId.startsWith(PREFIXO_DOC_PADRAO)) return null;
  return POR_SLUG.has(docId.slice(PREFIXO_DOC_PADRAO.length) as SlugCategoriaPadrao)
    ? (docId.slice(PREFIXO_DOC_PADRAO.length) as SlugCategoriaPadrao)
    : null;
}
