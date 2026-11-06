export type SyncStatus = 'pendente' | 'sincronizado';
export type UnidadeRecorrencia = 'dia' | 'mes' | 'ano';
export type EscopoSerie = 'esta' | 'proximas' | 'todas';

export interface Receita {
  id: string;
  valor_centavos: number;
  data: string; // AAAA-MM-DD
  titulo: string;
  descricao: string | null;
  recorrencia_id: string | null;
  sync_status: SyncStatus;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Recorrencia {
  id: string;
  intervalo: number;
  unidade: UnidadeRecorrencia;
  inicio: string;
  termino: string | null;
  ativa: number;
  valor_centavos: number;
  titulo: string;
  descricao: string | null;
  sync_status: SyncStatus;
  atualizado_em: string;
}

/** Dados já validados e normalizados, prontos para gravar. */
export interface ReceitaInput {
  data: string;
  titulo: string;
  valorCentavos: number;
  descricao: string | null;
  recorrencia: { intervalo: number; unidade: UnidadeRecorrencia; termino: string | null } | null;
}

/** Valores crus do formulário (texto digitado). */
export interface FormValores {
  valor: string;
  data: string; // DD/MM/AAAA
  titulo: string;
  descricao: string;
  recorrente: boolean;
  intervalo: string;
  unidade: UnidadeRecorrencia;
  termino: string; // DD/MM/AAAA ou vazio
}

export type CampoForm = 'valor' | 'data' | 'titulo' | 'descricao' | 'intervalo' | 'termino';

export type Filtro =
  | { modo: 'mes'; ano: number; mes: number } // mes 1-12
  | { modo: 'data'; data: string }
  | { modo: 'periodo'; de: string; ate: string };
