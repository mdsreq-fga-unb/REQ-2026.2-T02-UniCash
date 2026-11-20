import type { Categoria } from '@/features/categorias/types';

/** Linha de categoria com todos os campos do schema, para testes de tela. */
export function categoriaLinha(extra: Partial<Categoria> = {}): Categoria {
  return {
    id: 'x',
    nome: 'Casa',
    nome_normalizado: 'casa',
    padrao: 1,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'sincronizado',
    estado_local: 'sincronizado',
    excluido_em: null,
    criado_em: 't',
    atualizado_em: 't',
    total_lancamentos: 0,
    ...extra,
  } as Categoria;
}
