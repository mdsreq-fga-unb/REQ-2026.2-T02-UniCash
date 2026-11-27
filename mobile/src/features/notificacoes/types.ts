/** UC14 (RF58, D25): tipos de alerta configuráveis. "limite" cobre aproximação (80%) e ultrapassagem (100%) da RN03. */
export type TipoAlerta = 'limite' | 'conquistas';

export const TIPOS_ALERTA: readonly TipoAlerta[] = ['limite', 'conquistas'];

export type EstadoPermissao = 'nao-decidida' | 'concedida' | 'negada';

export type EstadoSyncPreferencia = 'local' | 'pendente' | 'sincronizado' | 'erro';

/** Dono de uma operação (RNF03): uid da conta com sessão ativa, ou 'local' sem conta. */
export interface DonoPreferencias {
  uid: string;
}

/**
 * Cada operação usa o dono recebido, ou o da sessão no momento da chamada, e o resolve
 * antes de abrir a base. Assim uma troca de conta no meio da operação não mistura donos.
 */
export interface NotificationPreferences {
  /** Dono da sessão atual, para capturar no início de uma interação. */
  donoAtual(): DonoPreferencias;
  /** Linha ausente retorna ESTADO_INICIAL[tipo]. Nunca lança: falha de leitura retorna false. */
  isEnabled(tipo: TipoAlerta, dono?: DonoPreferencias): Promise<boolean>;
  /** Lança em falha de leitura (EX02). */
  listar(dono?: DonoPreferencias): Promise<Record<TipoAlerta, boolean>>;
  /** Grava e só então resolve; lança em falha (EX01) sem alterar o estado anterior. */
  definir(tipo: TipoAlerta, ativo: boolean, dono?: DonoPreferencias): Promise<void>;
}

export interface NotificationPermission {
  consultar(): Promise<EstadoPermissao>;
  /** Só abre o diálogo do sistema quando 'nao-decidida'; senão devolve o estado atual (FA07). */
  solicitar(): Promise<EstadoPermissao>;
  abrirConfiguracoes(): Promise<void>;
}
