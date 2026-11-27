# Contrato: módulo `features/notificacoes`

Consumido por UC05 (alertas de limite), UC13 (conquistas) e pela seção do Perfil.

```ts
export type TipoAlerta = 'limite' | 'conquistas';
export type EstadoPermissao = 'nao-decidida' | 'concedida' | 'negada';

/** Dono de uma operação (RNF03): uid da conta com sessão ativa, ou 'local' sem conta. */
export interface DonoPreferencias { uid: string }

export interface NotificationPreferences {
  /** Dono da sessão atual, para capturar no início de uma interação. */
  donoAtual(): DonoPreferencias;
  /** Linha ausente retorna ESTADO_INICIAL[tipo] (false). Nunca lança: falha de leitura retorna false. */
  isEnabled(tipo: TipoAlerta, dono?: DonoPreferencias): Promise<boolean>;
  /** Lança em falha de leitura (EX02). */
  listar(dono?: DonoPreferencias): Promise<Record<TipoAlerta, boolean>>;
  /** Grava e só então resolve; lança em falha (EX01), sem alterar o estado anterior. */
  definir(tipo: TipoAlerta, ativo: boolean, dono?: DonoPreferencias): Promise<void>;
}

export interface NotificationPermission {
  consultar(): Promise<EstadoPermissao>;
  /** Só abre o diálogo do SO quando 'nao-decidida'; caso contrário devolve o estado atual. */
  solicitar(): Promise<EstadoPermissao>;
  abrirConfiguracoes(): Promise<void>;
}
```

**Dono da operação (RNF03)**: cada operação resolve o dono antes de abrir a base, recebendo-o por parâmetro ou lendo a sessão no momento da chamada. A seção do Perfil captura o dono ao abrir e, depois do diálogo de permissão, só grava se a sessão ainda for do mesmo dono.

**Consumidores**: o UC05 (alertas de limite) e o UC13 (conquistas) ainda não chamam `isEnabled`. A integração e o teste de supressão do alerta ficam nos PRs de cada um. A forma de integrar o UC05 depende da decisão registrada no PR #127, porque o UC05 já tem preferências próprias.

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
