import type { SyncStatus } from '@/features/receitas/types';

/** Tipos previstos na UC12. O tipo é imutável depois da criação. */
export type MetaTipo = 'gasto' | 'investimento';

/**
 * Situação do progresso, independente da situação do prazo.
 *
 * Metas de gasto representam consumo de um limite mensal; metas de
 * investimento representam um valor acumulado declarado pelo usuário.
 */
export type SituacaoProgresso =
  | 'indisponivel'
  | 'dentro_do_limite'
  | 'proximo_do_limite'
  | 'limite_atingido'
  | 'limite_ultrapassado'
  | 'em_andamento'
  | 'alcancada';

/** Situação do prazo da meta. O prazo final é inclusivo. */
export type SituacaoPrazo = 'em_vigor' | 'vencida';

export interface Meta {
  id: string;
  objetivo: string;
  tipo: MetaTipo;
  valor_alvo_centavos: number;
  /** Data ISO AAAA-MM-DD. */
  prazo: string;
  /**
   * Início explícito da vigência (data ISO). Registros legados sem data de
   * criação válida permanecem nulos e têm o progresso indisponível.
   */
  inicio: string | null;
  /** Categoria obrigatória para novas metas de gasto; nula em legados/investimentos. */
  categoria_id: string | null;
  /** Valor acumulado declarado pelo usuário; nulo significa "não informado". */
  valor_acumulado_centavos: number | null;
  /** Data/hora do último informe do valor acumulado. */
  valor_acumulado_atualizado_em: string | null;
  sync_status: SyncStatus;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Presentes nas leituras que fazem join com o catálogo de categorias. */
  categoria_nome?: string | null;
  categoria_excluida_em?: string | null;
}

/** Dados já validados e normalizados, prontos para gravar. */
export interface MetaInput {
  objetivo: string;
  tipo: MetaTipo;
  valorAlvoCentavos: number;
  /** Data ISO AAAA-MM-DD. */
  prazo: string;
  /** Obrigatória para meta de gasto; deve ser nula para investimento. */
  categoriaId?: string | null;
  /** Opcional para investimento; zero é válido e nulo significa não informado. */
  valorAcumuladoCentavos?: number | null;
}

/** Valores crus do formulário. */
export interface FormMetaValores {
  objetivo: string;
  tipo: MetaTipo;
  valorAlvo: string;
  /** Data no formato DD/MM/AAAA. */
  prazo: string;
  /** Identificador da categoria selecionada para meta de gasto. */
  categoriaId: string;
  /** Texto do valor acumulado de investimento; vazio significa não informado. */
  valorAcumulado: string;
}

export type CampoMetaForm =
  | 'objetivo'
  | 'tipo'
  | 'valorAlvo'
  | 'prazo'
  | 'categoriaId'
  | 'valorAcumulado';

export type ErrosMetaForm = Partial<Record<CampoMetaForm, string>>;
