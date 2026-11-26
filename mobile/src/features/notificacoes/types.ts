/** UC14 (RF58, D25): tipos de alerta configuráveis. "limite" cobre aproximação (80%) e ultrapassagem (100%) da RN03. */
export type TipoAlerta = 'limite' | 'conquistas';

export const TIPOS_ALERTA: readonly TipoAlerta[] = ['limite', 'conquistas'];

export type EstadoPermissao = 'nao-decidida' | 'concedida' | 'negada';

export type EstadoSyncPreferencia = 'local' | 'pendente' | 'sincronizado' | 'erro';

export interface NotificationPreferences {
  /** Linha ausente retorna ESTADO_INICIAL[tipo]. Nunca lança: falha de leitura retorna false. */
  isEnabled(tipo: TipoAlerta): Promise<boolean>;
  /** Lança em falha de leitura (EX02). */
  listar(): Promise<Record<TipoAlerta, boolean>>;
  /** Grava e só então resolve; lança em falha (EX01) sem alterar o estado anterior. */
  definir(tipo: TipoAlerta, ativo: boolean): Promise<void>;
}

export interface NotificationPermission {
  consultar(): Promise<EstadoPermissao>;
  /** Só abre o diálogo do sistema quando 'nao-decidida'; senão devolve o estado atual (FA07). */
  solicitar(): Promise<EstadoPermissao>;
  abrirConfiguracoes(): Promise<void>;
}
