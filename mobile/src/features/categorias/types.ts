import type { SyncStatus } from '@/features/receitas/types';

export type LimiteTipo = 'valor' | 'percentual_renda';

/**
 * Estado local explícito da categoria:
 * - `semeadura`: padrão recém-criada, nunca editada;
 * - `editado`: alteração local ainda não confirmada pela nuvem;
 * - `sincronizado`: conteúdo local igual ao último estado remoto confirmado.
 */
export type EstadoLocalCategoria = 'semeadura' | 'editado' | 'sincronizado';

export interface Categoria {
  id: string;
  nome: string;
  nome_normalizado: string;
  padrao: number; // 0 ou 1
  limite_tipo: LimiteTipo | null;
  limite_centavos: number | null;
  limite_percentual_centesimos: number | null;
  sync_status: SyncStatus;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Presente nas leituras que fazem join com `categorias_estado`. */
  estado_local?: EstadoLocalCategoria;
  /** Quantidade de despesas ativas vinculadas; presente nas leituras de lista. */
  total_lancamentos?: number;
}

/** Dados já validados e normalizados, prontos para gravar. */
export interface CategoriaInput {
  nome: string;
  limite: {
    tipo: LimiteTipo;
    /** Centavos se tipo='valor'; centésimos de percentual se tipo='percentual_renda'. */
    valor: number;
  } | null;
}

/** Valores crus do formulário (texto digitado). */
export interface FormCategoriaValores {
  nome: string;
  comLimite: boolean;
  limiteTipo: LimiteTipo;
  limiteValor: string;
  limitePercentual: string;
}

export type CampoCategoriaForm = 'nome' | 'limiteValor' | 'limitePercentual';

/** Categorias padrão semeadas no primeiro uso (RN13). */
export const CATEGORIAS_PADRAO = [
  'Casa',
  'Alimentação',
  'Mobilidade',
  'Estudos',
  'Saúde',
  'Lazer',
  'Reserva financeira',
] as const;
