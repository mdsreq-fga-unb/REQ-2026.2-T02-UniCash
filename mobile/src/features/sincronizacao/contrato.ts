/** Mensagens públicas do UC16. Dados vindos do SDK e do SQLite ficam fora da interface. */
export const mensagensSincronizacao = {
  EX01: 'Entre com uma conta confirmada para sincronizar. Seus dados locais continuam disponíveis.',
  EX02: 'Sem conexão. As alterações ficam neste aparelho e o envio será retomado ao reconectar.',
  EX03: 'A nuvem recusou o acesso. Confira sua sessão e tente novamente.',
  EX04: 'Algumas alterações continuam na fila. Revise os registros pendentes e tente novamente.',
  EX05: 'Não foi possível consultar a fila no aparelho. Tente novamente.',
  EX06: 'O envio foi interrompido. As alterações pendentes continuam neste aparelho.',
  EX07: 'Não foi possível concluir a restauração da nuvem. Tente novamente.',
  EX08: 'A conta mudou durante a sincronização. Use a conta atual para tentar novamente.',
} as const;

export type CodigoSincronizacao = keyof typeof mensagensSincronizacao;

export interface EstadoSincronizacao {
  status: 'sincronizado' | 'pendente' | 'sem-conexao' | 'erro';
  ultimaSincronizacao: string | null;
  quantidadePendencias: number;
  sincronizando: boolean;
  codigo: CodigoSincronizacao | null;
}

export interface AlteracaoPendente {
  tipo: 'Receita' | 'Despesa' | 'Categoria' | 'Recorrência' | 'Alerta de saldo';
  id: string;
  titulo: string;
  alteracao: 'Envio' | 'Exclusão';
  estado: 'pendente';
}

export interface SyncService {
  consultar(): Promise<{ estado: EstadoSincronizacao; pendencias: AlteracaoPendente[] }>;
  sincronizarAgora(): Promise<void>;
  assinar(ouvinte: () => void): () => void;
}
