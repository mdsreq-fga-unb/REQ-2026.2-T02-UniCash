import type { SQLiteDatabase } from 'expo-sqlite';

/** UC13 (RF44, RF45, RF46): tipos do contrato em specs/002-uc13-conquistas-pontuacao/contracts. */
export type MarcoId = 'no-verde' | 'primeira-meta';

export interface MetaConcluida {
  id: string;
  titulo: string;
  /** AAAA-MM-DD */
  concluidaEm: string | null;
}

export interface FonteMetas {
  /** Lê da base do dono que está sendo avaliado (RNF03). */
  concluidas(db: SQLiteDatabase): Promise<MetaConcluida[]>;
}

/** Totais de um mês encerrado, no mesmo período do resumo mensal. */
export interface TotaisMes {
  /** AAAA-MM */
  mes: string;
  receitasCentavos: number;
  despesasCentavos: number;
}

export type ReferenciaSelo =
  | { tipo: 'mes'; mes: string; receitasCentavos: number; despesasCentavos: number; saldoCentavos: number }
  | { tipo: 'meta'; metaId: string; titulo: string };

export interface Selo {
  /** 'no-verde:AAAA-MM' | 'primeira-meta' */
  chave: string;
  marco: MarcoId;
  nome: string;
  descricao: string;
  /** AAAA-MM-DD */
  data: string | null;
  referencia: ReferenciaSelo;
}

export interface PontuacaoMeta {
  metaId: string;
  titulo: string;
  concluidaEm: string | null;
  pontos: number;
}

export interface ResumoConquistas {
  totalPontos: number;
  metasConcluidas: number;
  pontosPorMeta: number;
  /** Data decrescente. */
  selos: Selo[];
  /** concluidaEm decrescente. */
  pontuacoes: PontuacaoMeta[];
}

export interface EmissorNotificacao {
  emitir(n: { titulo: string; corpo: string; rota: '/conquistas' }): Promise<void>;
}
