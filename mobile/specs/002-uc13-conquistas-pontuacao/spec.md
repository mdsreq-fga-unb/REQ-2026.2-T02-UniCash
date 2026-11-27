# Feature Specification: UC13 - Acompanhar conquistas e pontuação

**Feature Branch**: `feat/uc13-conquistas-pontuacao`
**Created**: 2026-11-26
**Status**: Draft
**Input**: UC13 (casos_de_uso, RF44, RF45, RF46, RF58, RN06, RN07, RNF03); protótipo "07 · Conquistas e pontuação" (Figma, node 127:509, telas CQ1 a CQ6 e notas do UC13).

## Clarifications

### Session 2026-11-26

- Q: Se o usuário editar ou excluir o lançamento ou a meta que garantiu um selo ou pontos, esse selo ou esses pontos devem sumir? (FA08) → A: Sim. Selo e pontos acompanham os dados atuais: somem se o marco deixar de valer e voltam se voltar a valer.
- Q: Para o selo "No verde em <mês>", o mês termina no último dia do calendário ou no dia de início do mês financeiro configurado? → A: Mesmo período usado no resumo mensal do app (respeita a configuração financeira).
- Q: Na primeira avaliação, com histórico de vários meses no verde e metas concluídas, o app deve notificar cada selo antigo? → A: Não. Selos do histórico são registrados sem notificação; só selos novos notificam.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar conquistas e pontuação (Priority: P1)

Pelo ícone de selo no cabeçalho do Perfil, o usuário abre a área "Conquistas" [CQ1]. Vê o total de pontos com a explicação ("3 metas concluídas · 100 pontos cada"), a lista "Selos conquistados (N)" com nome, descrição do marco e data, e a lista "Pontos por meta concluída" com data, nome da meta e pontos ganhos.

**Why this priority**: é o ponto de contato do usuário com o reconhecimento do progresso (fluxo B); sem ele, selos e pontos não têm valor visível.

**Independent Test**: com dados de exemplo contendo um mês fechado no verde e uma meta concluída, abrir o Perfil, tocar no ícone de selo e conferir total, selos e pontos.

**Acceptance Scenarios**:

1. **Given** o usuário no Perfil, **When** toca no ícone de selo do cabeçalho, **Then** abre a área "Conquistas".
2. **Given** selos e metas pontuadas, **When** a área abre, **Then** exibe o total de pontos, a quantidade de metas concluídas e o valor por meta, os selos do mais recente para o mais antigo e as metas pontuadas com data e "+pontos".
3. **Given** nenhum selo e nenhuma meta concluída, **When** a área abre, **Then** exibe total 0, "Nenhuma meta concluída", "Nenhuma conquista ainda." e o texto de incentivo, com o botão "Ver metas" [CQ3] (FA01).

---

### User Story 2 - Receber selos e pontos automaticamente (Priority: P1)

Quando o usuário registra, edita ou exclui lançamentos ou metas, ou quando um mês termina, o app avalia os marcos e concede os selos e pontos correspondentes, sem ação do usuário.

**Why this priority**: é o núcleo de RF44 e RF45 (fluxo A); a consulta só mostra o que esta avaliação produz.

**Independent Test**: com um mês anterior de receitas maiores que despesas, abrir o app; o selo "No verde em <mês>" aparece em Conquistas uma única vez, mesmo após reabrir o app várias vezes.

**Acceptance Scenarios**:

1. **Given** um mês encerrado com receitas maiores que despesas, **When** a avaliação roda, **Then** o selo "No verde em <mês>" é registrado com a data do último dia do mês.
2. **Given** a primeira meta concluída, **When** a avaliação roda, **Then** o selo "Primeira meta concluída" é registrado com a data da conclusão.
3. **Given** uma meta concluída ainda não pontuada, **When** a avaliação roda, **Then** soma os pontos por meta ao total.
4. **Given** um selo já concedido ou uma meta já pontuada, **When** a avaliação roda de novo, **Then** nada é duplicado (FA02, FA03).
5. **Given** vários marcos cumpridos na mesma operação, **When** a avaliação roda, **Then** cada marco gera um selo (FA05).
6. **Given** o aparelho sem conexão, **When** a avaliação roda, **Then** selos e pontos são concedidos normalmente (FA06).

---

### User Story 3 - Ver detalhe do selo (Priority: P2)

Ao tocar em um selo, o usuário vê o detalhe [CQ2]: nome, data da conquista, marco atingido e os dados que comprovam o marco (para "No verde": mês de referência, receitas, despesas e saldo do mês), mensagem de incentivo e o atalho "Ver resumo do mês".

**Why this priority**: complementa a consulta (B3), mas a área já entrega valor sem ele.

**Independent Test**: tocar no selo "No verde em outubro"; o detalhe mostra receitas, despesas e saldo de outubro iguais aos do resumo mensal.

**Acceptance Scenarios**:

1. **Given** a lista de selos, **When** o usuário toca em um selo, **Then** abre o detalhe com nome, "Conquistado em <data>" e o marco atingido.
2. **Given** um selo de saldo positivo, **When** o detalhe abre, **Then** mostra mês de referência, receitas, despesas e saldo daquele mês, e "Ver resumo do mês" leva ao resumo desse mês.
3. **Given** um selo "Primeira meta concluída", **When** o detalhe abre, **Then** mostra a meta concluída e a data de conclusão.

---

### User Story 4 - Ser avisado de um novo selo (Priority: P2)

Se o tipo de alerta "Conquistas" estiver ligado no Perfil (UC14), o usuário recebe uma notificação por selo concedido: "Novo selo: <nome>" com o marco [CQ5]. Tocar na notificação abre a área Conquistas.

**Why this priority**: RF46 depende de UC14 já entregue; selos e pontos funcionam sem ela.

**Independent Test**: ligar "Conquistas" no Perfil, provocar um novo selo; a notificação aparece uma vez. Desligar e repetir; o selo é registrado sem notificação.

**Acceptance Scenarios**:

1. **Given** "Conquistas" ligado e permissão concedida, **When** um selo é concedido, **Then** uma notificação é exibida com o nome do selo e a frase do marco, e a emissão é registrada.
2. **Given** "Conquistas" desligado, **When** um selo é concedido, **Then** nenhuma notificação é exibida e o selo e os pontos continuam registrados (FA04).
3. **Given** dois selos na mesma operação, **When** a avaliação roda, **Then** são exibidas duas notificações (FA05).
4. **Given** falha ao emitir a notificação, **When** a próxima avaliação roda, **Then** a emissão é tentada de novo, sem duplicar o selo (EX02).
5. **Given** a notificação exibida, **When** o usuário toca nela, **Then** o app abre a área Conquistas.

---

### User Story 5 - Falhas e acesso negado (Priority: P3)

A área informa falhas sem deixar dados parciais e só mostra conquistas do próprio usuário.

**Independent Test**: simular falha de leitura; a tela [CQ4] aparece e "Tentar novamente" recarrega.

**Acceptance Scenarios**:

1. **Given** falha de leitura, **When** a área carrega, **Then** exibe "Não foi possível carregar as conquistas. Tente novamente." com "Tentar novamente" (EX03).
2. **Given** falha durante a avaliação ou o registro, **When** ela ocorre, **Then** nenhum selo ou ponto parcial é gravado e a avaliação é refeita na próxima operação (EX01).
3. **Given** tentativa de abrir conquistas de outro usuário, **When** a área carrega, **Then** exibe "Você não tem acesso a estas conquistas." e "Ir para minhas conquistas" [CQ6] (EX04).

### Edge Cases

- Mês corrente ainda aberto: não gera selo "No verde"; só meses encerrados contam. O período do mês é o mesmo do resumo mensal do app, inclusive quando o usuário configurou outro dia de início.
- Mês sem nenhum lançamento: não gera selo.
- Mês com receitas iguais às despesas (saldo zero): não gera selo; o marco exige saldo positivo.
- Lançamento editado ou excluído depois de concedido o selo: se o marco deixar de valer, o selo é retirado; se voltar a valer, o selo volta, sem duplicar (FA07, FA08).
- Meta excluída ou deixando de estar concluída depois de pontuada: os pontos dela saem do total (FA08).
- Reinstalação ou novo aparelho: selos e pontos são recalculados a partir de lançamentos e metas, nunca sincronizados como contador (FA07, RN07).
- Primeira avaliação após instalar ou atualizar o app com histórico: os selos do histórico aparecem em Conquistas sem notificação; só selos conquistados depois disso notificam.
- Alerta "Conquistas" ligado com permissão negada: o selo é registrado; a notificação não é exibida e a emissão fica pendente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE oferecer a área "Conquistas", acessível pelo ícone de selo no cabeçalho do Perfil.
- **FR-002**: A área DEVE exibir o total de pontos, a quantidade de metas concluídas com o valor por meta, a lista de selos (nome, descrição do marco, data) e a lista de metas pontuadas (data, nome, pontos). Exibir datas apenas quando determináveis.
- **FR-003**: Sem selos nem metas concluídas, a área DEVE exibir o estado vazio com "Nenhuma conquista ainda." e o atalho "Ver metas" (FA01).
- **FR-004**: O sistema DEVE avaliar os marcos ao abrir o app, na virada do mês e após registrar, editar ou excluir lançamentos ou metas, usando só dados locais (RF44, FA06).
- **FR-005**: O catálogo inicial de marcos DEVE conter "No verde em <mês>" (mês encerrado com receitas maiores que despesas, um selo por mês, usando o mesmo período e os mesmos totais do resumo mensal do app) e "Primeira meta concluída" (um único selo), definidos em configuração única, substituível sem mudar o restante da funcionalidade.
- **FR-006**: O sistema DEVE somar 100 pontos por ID de meta de investimento no estado `alcancada` do UC12, inclusive com data indeterminável. Metas de gasto ficam fora da contagem (RF45, D28).
- **FR-007**: Selos e pontos DEVEM ser derivados de lançamentos e metas, sem duplicidade por marco ou por meta (FA02, FA03, FA07, RN07).
- **FR-007a**: Quando um marco deixar de valer ou uma meta deixar de estar concluída após edição ou exclusão, o selo ou os pontos correspondentes DEVEM ser retirados; se voltarem a valer, são concedidos de novo. O selo volta com a data conhecida mais antiga, preservando o histórico e o controle do primeiro aviso (FA08, D28).
- **FR-008**: Ao tocar em um selo, o sistema DEVE exibir seu detalhe com os dados que comprovam o marco (B3).
- **FR-009**: Para cada selo novo, se `isEnabled('conquistas')` for verdadeiro, o sistema DEVE emitir uma notificação com o nome do selo e a frase do marco e registrar a emissão; caso contrário, não emite (RF46, FA04).
- **FR-009a**: Selos concedidos na primeira avaliação, a partir do histórico existente, DEVEM ser registrados como já emitidos, sem notificação.
- **FR-010**: Uma emissão que falhar NÃO DEVE ser marcada como feita e DEVE ser tentada de novo na próxima avaliação (EX02).
- **FR-011**: Falha na avaliação ou no registro NÃO DEVE gravar selo ou ponto parcial nem alterar lançamentos, metas ou saldo (EX01).
- **FR-012**: Falha de leitura DEVE exibir a mensagem do EX03 com "Tentar novamente".
- **FR-013**: O sistema DEVE exibir somente conquistas do usuário atual; outro usuário recebe a tela do EX04.
- **FR-014**: O sistema DEVE usar as metas reais do UC12 para calcular a pontuação. A fonte de exemplo fica disponível para demonstração.
- **FR-015**: A classificação do grupo (RF30) NÃO DEVE fazer parte desta entrega (D09).

### Key Entities

- **Marco**: identificador, nome-modelo, descrição, regra de cumprimento; vem da configuração.
- **Selo**: marco, período ou referência (ex.: mês), data da conquista, emissão da notificação (pendente | emitida). Único por marco e referência.
- **PontuacaoMeta**: meta, data de conclusão, pontos. Única por meta.
- **ResumoConquistas**: total de pontos, metas concluídas, pontos por meta, selos; valor derivado, não gravado como contador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário chega à área Conquistas em até 2 toques a partir da tela inicial.
- **SC-002**: Em 100% das reavaliações repetidas nos testes, nenhum selo ou ponto é duplicado.
- **SC-003**: Com o alerta desligado, 0 notificações são emitidas e 100% dos selos continuam registrados.
- **SC-004**: Um selo novo aparece em Conquistas na mesma sessão em que o marco é cumprido.
- **SC-005**: Lint, typecheck e testes passam no CI.

## Assumptions

- Marcos e pontos são valores de teste do protótipo (100 pontos por meta; marcos "saldo positivo no mês" e "primeira meta concluída"), pendentes de validação com as clientes (ata R07); a pendência vai para `decisoes.md`.
- "Meta concluída" usa o contrato de metas do UC12; até lá, metas de exemplo. O critério real é integração posterior.
- Texto da notificação ("Novo selo: <nome>" + frase do marco) segue o protótipo [CQ5] e fica a validar.
- O envio da notificação é local no aparelho; push remoto fica fora. Usa a preferência e a permissão já entregues no UC14.
- A sincronização com a nuvem (RF62) inclui o histórico de desbloqueio da própria conta. O merge mantém a menor data conhecida de cada selo e preserva desbloqueios sem data. Selos vigentes e pontos são recalculados em cada aparelho (D28).
- A tela de detalhe para "Primeira meta concluída" não tem protótipo; segue o layout de [CQ2] com os dados da meta.
