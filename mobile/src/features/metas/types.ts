import type { SyncStatus } from '@/features/receitas/types';

/** Tipos previstos na UC12. */
export type MetaTipo = 'gasto' | 'investimento';

/**
 * Situação exibida para a meta.
 *
 * `indefinida` é usada enquanto o valor realizado não pode ser calculado por
 * falta de decisão de negócio (issue #106). As demais situações são
 * provisórias e derivadas apenas do percentual/prazo; não representam um
 * critério de conclusão aprovado.
 */
export type SituacaoMeta =
  | 'indefinida'
  | 'em_andamento'
  | 'atencao'
  | 'atingida'
  | 'ultrapassada'
  | 'vencida';

export interface Meta {
  id: string;
  objetivo: string;
  tipo: MetaTipo;
  valor_alvo_centavos: number;
  /** Data ISO AAAA-MM-DD. */
  prazo: string;
  sync_status: SyncStatus;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

/** Dados já validados e normalizados, prontos para gravar. */
export interface MetaInput {
  objetivo: string;
  tipo: MetaTipo;
  valorAlvoCentavos: number;
  /** Data ISO AAAA-MM-DD. */
  prazo: string;
}

/** Valores crus do formulário. */
export interface FormMetaValores {
  objetivo: string;
  tipo: MetaTipo;
  valorAlvo: string;
  /** Data no formato DD/MM/AAAA. */
  prazo: string;
}

export type CampoMetaForm = 'objetivo' | 'tipo' | 'valorAlvo' | 'prazo';

export type ErrosMetaForm = Partial<Record<CampoMetaForm, string>>;
