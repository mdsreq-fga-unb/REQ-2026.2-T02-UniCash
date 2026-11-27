# Feature Specification: UC14 - Configurar notificações

**Feature Branch**: `feat/uc14-configurar-notificacoes`
**Created**: 2026-11-26
**Status**: Draft
**Input**: UC14 (casos_de_uso.md, versão 1.16), RF58 e decisão D25; protótipo "06 · Perfil e configurações" (Figma, node 2:2552).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ligar e desligar tipos de alerta (Priority: P1)

Na tela de Perfil, o usuário vê a seção "Notificações" com dois interruptores, "Alertas de limite (80% e 100%)" e "Conquistas", e liga ou desliga cada um. A escolha fica gravada no aparelho.

**Why this priority**: é o núcleo do RF58; UC05 e UC13 dependem dessa escolha.

**Independent Test**: abrir o Perfil, ligar "Conquistas", fechar e reabrir o app; o interruptor continua ligado.

**Acceptance Scenarios**:

1. **Given** primeiro uso, **When** o usuário abre o Perfil, **Then** os dois interruptores aparecem desligados (D25).
2. **Given** um tipo desligado e permissão concedida, **When** o usuário o liga, **Then** a escolha é gravada e só então o interruptor fica ligado.
3. **Given** um tipo ligado, **When** o usuário o desliga, **Then** a escolha é gravada e `isEnabled(tipo)` passa a retornar `false`.

---

### User Story 2 - Pedir permissão do aparelho na primeira ativação (Priority: P1)

Na primeira vez que o usuário liga um tipo, o app pede a permissão de notificações do sistema. Se negada, a escolha fica gravada e a seção mostra aviso com atalho para as configurações do aparelho.

**Why this priority**: sem permissão o alerta não aparece; o UC14 define esse fluxo (passo 4, FA06, FA07).

**Independent Test**: com permissão não decidida, ligar um tipo e negar no diálogo do sistema; o aviso aparece e o interruptor continua ligado.

**Acceptance Scenarios**:

1. **Given** permissão não decidida, **When** o usuário liga um tipo, **Then** o diálogo do sistema é exibido uma única vez.
2. **Given** permissão negada, **When** há tipo ligado, **Then** a seção mostra "As notificações estão bloqueadas neste aparelho. Libere nas configurações do aparelho para receber os alertas." e o botão "Abrir configurações".
3. **Given** permissão já concedida ou negada, **When** o usuário liga outro tipo, **Then** o diálogo não é exibido de novo (FA07).
4. **Given** todos os tipos desligados, **Then** o aviso de bloqueio não aparece.

---

### User Story 3 - Falhas de leitura e gravação (Priority: P2)

Se a base local falhar, a seção informa o problema sem perder dados.

**Independent Test**: simular falha de gravação; o interruptor volta ao estado anterior e a mensagem do EX01 aparece.

**Acceptance Scenarios**:

1. **Given** falha ao gravar, **When** o usuário alterna um interruptor, **Then** o interruptor volta ao estado anterior e aparece "Não foi possível salvar a configuração. Nenhuma alteração foi feita. Tente novamente." (EX01).
2. **Given** falha ao ler, **When** a seção carrega, **Then** aparece "Não foi possível carregar as notificações. Tente novamente." com a ação "Tentar novamente" (EX02).

### Edge Cases

- Toques rápidos e repetidos no mesmo interruptor: só uma gravação por vez; o interruptor fica desabilitado enquanto grava.
- Usuário libera a permissão nas configurações do aparelho e volta ao app: o aviso some ao retornar ao primeiro plano.
- Sair do Perfil sem alterar nada não grava nada (FA08).
- Sem conexão: a gravação local funciona normalmente (FA05).
- Usuário sem conta: as preferências funcionam só no aparelho.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir na tela de Perfil a seção "Notificações" com os tipos `limite` e `conquistas`, cada um com interruptor no estado atual.
- **FR-002**: O estado inicial de cada tipo DEVE ser desligado, definido em uma constante única (D25).
- **FR-003**: O sistema DEVE gravar a escolha na base local antes de refletir a mudança no interruptor (passo 5).
- **FR-004**: Ao ligar um tipo com permissão não decidida, o sistema DEVE solicitar a permissão de notificações do aparelho, no máximo uma vez por decisão do sistema operacional.
- **FR-005**: Com permissão negada e ao menos um tipo ligado, o sistema DEVE mostrar aviso de bloqueio e ação para abrir as configurações do aparelho (FA06).
- **FR-006**: A negação da permissão NÃO DEVE desfazer a escolha gravada.
- **FR-007**: O sistema DEVE expor `NotificationPreferences.isEnabled(tipo)` para UC05 (`limite`) e UC13 (`conquistas`).
- **FR-008**: Em falha de gravação, o sistema DEVE manter a escolha anterior e exibir a mensagem do EX01.
- **FR-009**: Em falha de leitura, o sistema DEVE exibir a mensagem do EX02 com "Tentar novamente".
- **FR-010**: O alerta de saldo negativo (RN18) NÃO DEVE aparecer na lista.
- **FR-011**: Os itens do protótipo sem requisito (lembrete diário, mês sem movimentação, prazos de metas, atividade dos grupos) NÃO DEVEM aparecer.
- **FR-012**: A preferência DEVE registrar o estado de sincronização (`pendente` quando houver conta), para integração posterior com o UC16; o envio real ao servidor fica fora deste escopo.

### Key Entities

- **PreferenciaNotificacao**: tipo (`limite` | `conquistas`), ativo, atualizadoEm, estadoSync.
- **EstadoPermissao**: `nao-decidida` | `concedida` | `negada`, lido do sistema operacional, não gravado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário altera um tipo de alerta em até 2 toques a partir da tela de Perfil.
- **SC-002**: A escolha persiste em 100% dos reinícios do app nos testes.
- **SC-003**: O diálogo de permissão do sistema aparece no máximo uma vez por instalação nos testes com a interface simulada.
- **SC-004**: Lint, typecheck e testes passam no CI.

## Assumptions

- A tela de Perfil ainda não existe; esta entrega cria a rota `perfil` com o cabeçalho do usuário e a seção "Notificações". As demais seções do protótipo (Sincronização, Geral, Conta) apontam para telas existentes ou ficam para outras entregas.
- Push remoto (FCM/APNs) e o envio efetivo de notificações ficam fora; UC05 e UC13 apenas consultam `isEnabled`.
- Sincronização real da preferência com o Firestore é integração posterior (DoR do UC14).
