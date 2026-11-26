# Contrato: módulo `features/notificacoes`

Consumido por UC05 (alertas de limite), UC13 (conquistas) e pela seção do Perfil.

```ts
export type TipoAlerta = 'limite' | 'conquistas';
export type EstadoPermissao = 'nao-decidida' | 'concedida' | 'negada';

export interface NotificationPreferences {
  /** Linha ausente retorna ESTADO_INICIAL[tipo] (false). Nunca lança: falha de leitura retorna false. */
  isEnabled(tipo: TipoAlerta): Promise<boolean>;
  /** Lança em falha de leitura (EX02). */
  listar(): Promise<Record<TipoAlerta, boolean>>;
  /** Grava e só então resolve; lança em falha (EX01), sem alterar o estado anterior. */
  definir(tipo: TipoAlerta, ativo: boolean): Promise<void>;
}

export interface NotificationPermission {
  consultar(): Promise<EstadoPermissao>;
  /** Só abre o diálogo do SO quando 'nao-decidida'; caso contrário devolve o estado atual. */
  solicitar(): Promise<EstadoPermissao>;
  abrirConfiguracoes(): Promise<void>;
}
```

**Mudança de contrato**: os tipos antigos `aproximacao` e `ultrapassagem` viram `limite` (D25). O UC05 deve chamar `isEnabled('limite')` para os dois disparos da RN03.

## Contrato de UI (seção "Notificações")

| Elemento | Texto |
|---|---|
| Título | Notificações |
| Item 1 | Alertas de limite (80% e 100%) |
| Item 2 | Conquistas |
| Aviso FA06 | As notificações estão bloqueadas neste aparelho. Libere nas configurações do aparelho para receber os alertas. · botão "Abrir configurações" |
| EX01 | Não foi possível salvar a configuração. Nenhuma alteração foi feita. Tente novamente. |
| EX02 | Não foi possível carregar as notificações. Tente novamente. · botão "Tentar novamente" |

Interruptores com `accessibilityRole="switch"` e `accessibilityState.checked`.
