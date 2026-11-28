/** Mensagens públicas do UC16. Dados vindos do SDK e do SQLite ficam fora da interface. */
export const mensagensSincronizacao = {
  EX01: 'Sem conexão. Suas alterações continuam guardadas no aparelho e serão enviadas quando a conexão voltar.',
  EX02: 'Sua sessão expirou. Entre novamente para sincronizar.',
  EX03: 'Não foi possível sincronizar. Suas alterações continuam guardadas no aparelho.',
  EX04: 'As regras de acesso do servidor recusaram este registro. Confira os dados e tente de novo.',
  EX05: 'O envio foi interrompido. Os registros pendentes serão reenviados na próxima tentativa.',
  EX06: 'Há alterações conflitantes para este registro.',
  EX07: 'Não foi possível carregar o estado da sincronização. Tente novamente.',
  EX08: 'Não foi possível acessar dados de outra conta.',
} as const;

export type CodigoSincronizacao = keyof typeof mensagensSincronizacao;

export interface EstadoSincronizacao {
  status: 'sincronizado' | 'pendente' | 'sem-conexao' | 'erro';
  ultimaSincronizacao: string | null;
  quantidadePendencias: number;
  sincronizando: boolean;
  sincronizacaoAutomatica?: boolean;
  codigo: CodigoSincronizacao | null;
}

export interface AlteracaoPendente {
  tipo: 'Receita' | 'Despesa' | 'Categoria' | 'Recorrência' | 'Alerta de saldo';
  id: string;
  titulo: string;
  alteracao: 'Criação' | 'Edição' | 'Exclusão';
  estado: 'pendente' | 'erro';
}

export interface SyncService {
  consultar(): Promise<{ estado: EstadoSincronizacao; pendencias: AlteracaoPendente[] }>;
  sincronizarAgora(): Promise<void>;
  assinar(ouvinte: () => void): () => void;
}
