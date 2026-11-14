export type SyncStatus = 'pendente' | 'sincronizado';

export type ClassificacaoDespesa = 'fixa' | 'variavel';

export type ImportanciaDespesa = 'essencial' | 'nao_essencial';

export type EscopoSerie = 'esta' | 'proximas' | 'todas';

export type UnidadeRecorrencia = 'dia' | 'mes' | 'ano';

export interface Despesa {
  id: string;
  valor_centavos: number;
  data: string;
  titulo: string;
  descricao: string | null;
  categoria_id: string | null;
  fixa_ou_variavel: ClassificacaoDespesa | null;
  essencial: 0 | 1 | null;
  recorrencia_id: string | null;
  sync_status: SyncStatus;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DespesaInput {
  data: string;
  titulo: string;
  valorCentavos: number;
  descricao: string | null;
  categoriaId: string | null;
  fixaOuVariavel: ClassificacaoDespesa | null;
  essencial: 0 | 1 | null;
  recorrencia: {
    intervalo: number;
    unidade: UnidadeRecorrencia;
    termino: string | null;
  } | null;
}

export interface FormValoresDespesa {
  valor: string;
  data: string;
  titulo: string;
  descricao: string;
  categoriaId: string;
  fixaOuVariavel: ClassificacaoDespesa | '';
  essencial: 'essencial' | 'nao_essencial' | '';
  recorrente: boolean;
  intervalo: string;
  unidade: UnidadeRecorrencia;
  termino: string;
}

export type CampoFormDespesa =
  | 'valor'
  | 'data'
  | 'titulo'
  | 'descricao'
  | 'intervalo'
  | 'termino';

export type FiltroDespesa =
  | { modo: 'mes'; ano: number; mes: number }
  | { modo: 'data'; data: string }
  | { modo: 'periodo'; de: string; ate: string };