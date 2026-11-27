---
description: "Task list for UC13 - Acompanhar conquistas e pontuação"
---

# Tasks: UC13 - Acompanhar conquistas e pontuação

**Input**: `specs/002-uc13-conquistas-pontuacao/` (plan.md, spec.md, research.md, data-model.md, contracts/conquistas.ts.md, quickstart.md)

**Tests**: incluídos. O projeto mantém testes Jest por tela e por serviço, e o quickstart.md os exige. Escrever cada teste antes da implementação e vê-lo falhar.

**Paths**: relativos a `mobile/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 a US5 (spec.md)

---

## Phase 1: Setup

- [X] T001 Conferir na doc v58 de `expo-notifications` (https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) as assinaturas de `scheduleNotificationAsync` (trigger `null`), `addNotificationResponseReceivedListener`, `getLastNotificationResponseAsync` e `setNotificationHandler`; anotar desvios em `specs/002-uc13-conquistas-pontuacao/research.md` R6
- [X] T002 [P] Estender o mock de `expo-notifications` em `tests/setup.ts` com `scheduleNotificationAsync`, `addNotificationResponseReceivedListener` (retorna `{ remove }`), `getLastNotificationResponseAsync` (resolve `null`) e `setNotificationHandler`
- [ ] T003 [P] Registrar em `../docs/decisoes.md` (ou arquivo de decisões do projeto) a pendência: marcos e pontos por meta do UC13 são valores de teste (100 pontos; "no verde no mês", "primeira meta concluída"), a validar com as clientes (ata R07); e a decisão do FA08 (selo e pontos acompanham os dados)

---

## Phase 2: Foundational

**⚠️ Bloqueia todas as histórias.**

- [X] T004 [P] Criar tipos do contrato (`MarcoId`, `MetaConcluida`, `FonteMetas`, `TotaisMes`, `Selo`, `PontuacaoMeta`, `ResumoConquistas`, `EmissorNotificacao`) em `src/features/conquistas/types.ts`, conforme `contracts/conquistas.ts.md`
- [X] T005 [P] Criar `src/features/conquistas/config.ts` com `PONTOS_POR_META = 100` e `MARCOS` (`no-verde`: nome `No verde em <mês minúsculo>`, descrição "Fechou o mês com saldo positivo", frase "Você fechou <mês> com saldo positivo. Toque para ver."; `primeira-meta`: "Primeira meta concluída", "Concluiu a primeira meta financeira"), usando `NOMES_MES` de `src/features/receitas/dates.ts`
- [X] T006 [P] Criar `src/features/conquistas/mensagens.ts` com os textos da tabela de mensagens do contrato
- [X] T007 [P] Criar `src/features/conquistas/metas.ts` com `fonteMetasVazia` (produção, retorna `[]` até o UC12) e `fonteMetasExemplo` (Reserva de emergência 2026-10-15, Celular novo 2026-10-02, Viagem de julho 2026-09-12), e `obterFonteMetas()` que devolve a vazia por padrão
- [X] T008 Escrever teste de migração em `tests/db/migrations.test.ts`: base nova e base na versão 11 chegam à 12 com a tabela `conquistas_emitidas(chave PK, status, criado_em, atualizado_em)`
- [X] T009 Adicionar `DDL_CONQUISTAS_EMITIDAS` em `src/db/schema.ts` e a migração 016 no registro `MIGRACOES` de `src/db/migrations.ts`, subindo `VERSAO_ESQUEMA` para 16 (respeitar a regra de equipe do topo do arquivo; incluir a tabela em `prepararInstalacaoNova`)

**Checkpoint**: tipos, configuração e tabela prontos.

---

## Phase 3: User Story 2 - Receber selos e pontos automaticamente (Priority: P1) 🎯 MVP (núcleo)

**Goal**: derivar selos e pontos a partir de lançamentos e metas, sem duplicar, acompanhando edições e exclusões (FR-004 a FR-007a).

**Independent Test**: com setembro e outubro no verde e as 3 metas de exemplo, `consultarConquistas(fonteMetasExemplo)` retorna total 300, 3 selos e 3 pontuações; chamar de novo dá o mesmo resultado.

> Vem antes da US1 porque a tela de consulta só exibe o que esta avaliação produz.

### Tests

- [X] T010 [P] [US2] Teste puro em `tests/features/conquistas/avaliacao.test.ts`: mês com receitas > despesas gera `no-verde:AAAA-MM` com data no último dia; saldo zero, negativo e mês sem lançamentos não geram; 0 metas não gera `primeira-meta`; 1 e 3 metas geram um único `primeira-meta` com a data da mais antiga; total = metas × 100; selos em data decrescente; pontuações em `concluidaEm` decrescente; entrada repetida não duplica (FA02, FA03, FA05)
- [X] T011 [P] [US2] Teste em `tests/features/conquistas/consulta.test.ts` com `tests/helpers/fakeDb.ts`: mês corrente não entra; lançamentos com `excluido_em` não contam; FA08 (excluir a receita que deixava outubro no verde remove o selo; recriar devolve); erro do banco vira `FalhaLeituraConquistas`

### Implementation

- [X] T012 [US2] Implementar `avaliar({ meses, metas })` puro em `src/features/conquistas/avaliacao.ts`
- [X] T013 [US2] Implementar em `src/features/conquistas/consulta.ts`: `lerTotaisMensais(db)` (uma consulta agrupada por `substr(data,1,7)` em receitas e despesas com `excluido_em IS NULL`, só meses `< ` início do mês corrente via `intervaloDoMes`), `consultarConquistas(fonte = obterFonteMetas())`, `consultarSelo(chave, fonte)` e a classe `FalhaLeituraConquistas`; usar `getDb()` (banco do dono, RNF03)

**Checkpoint**: selos e pontos derivados e testados.

---

## Phase 4: User Story 1 - Consultar conquistas e pontuação (Priority: P1) 🎯 MVP

**Goal**: área "Conquistas" acessível pelo ícone de selo do Perfil, com total, selos e pontos [CQ1] e estado vazio [CQ3].

**Independent Test**: abrir Perfil, tocar no ícone "Conquistas" e ver total, selos e pontuações; com base vazia, ver "Nenhuma conquista ainda." e "Ver metas".

### Tests

- [X] T014 [P] [US1] Teste de tela em `tests/screens/Conquistas.test.tsx`: estado cheio (total "300", "3 metas concluídas · 100 pontos cada", "Selos conquistados (3)", itens com data dd/mm, pontuações "Reserva de emergência · +100"); estado vazio (total "0", "Nenhuma meta concluída", "Nenhuma conquista ainda.", texto de incentivo, botão "Ver metas")
- [X] T015 [P] [US1] Teste em `tests/screens/Perfil.test.tsx`: botão com `accessibilityLabel="Conquistas"` no cabeçalho navega para `/conquistas`

### Implementation

- [X] T016 [P] [US1] Criar `src/features/conquistas/useConquistas.ts` (estados `carregando | pronto | erro`, recarrega no foco com `useFocusEffect`, ação `recarregar`)
- [X] T017 [P] [US1] Criar componentes `src/components/conquistas/CartaoPontos.tsx`, `src/components/conquistas/ItemSelo.tsx` (Pressable que leva a `/conquistas/[chave]`) e `src/components/conquistas/ItemPontuacao.tsx`, com cores de `src/lib/theme.ts`
- [X] T018 [US1] Criar rota `src/app/conquistas/index.tsx` com cabeçalho "Conquistas", `CartaoPontos`, "Selos conquistados (N)", "Pontos por meta concluída" e o estado vazio [CQ3]; "Ver metas" navega para a área de metas existente ou, sem ela, fica oculto com comentário apontando o UC12
- [X] T019 [US1] Adicionar o ícone de selo (`award`) com `accessibilityLabel="Conquistas"` no cabeçalho de `src/app/perfil.tsx`, navegando com `router.push('/conquistas')`

**Checkpoint**: MVP consultável (US2 + US1).

---

## Phase 5: User Story 3 - Ver detalhe do selo (Priority: P2)

**Goal**: detalhe do selo [CQ2] com os dados que comprovam o marco (FR-008).

**Independent Test**: tocar em "No verde em outubro" mostra receitas, despesas e saldo de outubro iguais aos do resumo mensal.

- [X] T020 [P] [US3] Teste em `tests/screens/Conquistas.test.tsx` (bloco "detalhe"): selo `no-verde` mostra "Conquistado em 31/10/2026", "Saldo positivo no mês", "Outubro/2026", receitas, despesas e saldo formatados e "Ver resumo do mês"; selo `primeira-meta` mostra título e data da meta; chave inexistente (selo sumiu, FA08) mostra mensagem e volta à lista
- [X] T021 [US3] Criar rota `src/app/conquistas/[chave].tsx` usando `consultarSelo`; formatar valores com `src/features/resumo/format.ts`; "Ver resumo do mês" navega para a rota de resumo com `ano` e `mes` do selo (conferir parâmetros em `lerMesDeParametros`)

---

## Phase 6: User Story 4 - Ser avisado de um novo selo (Priority: P2)

**Goal**: uma notificação por selo novo quando "Conquistas" está ligado (RF46, FA04, FA05, EX02, FR-009a, FR-007a).

**Independent Test**: com emissor simulado, ligar o alerta e provocar um selo novo gera exatamente uma emissão; desligado, nenhuma; primeira avaliação com histórico, nenhuma.

### Tests

- [X] T022 [P] [US4] Teste em `tests/features/conquistas/emissao.test.ts` com preferências, permissão e emissor simulados (`src/features/notificacoes/permissao.simulada.ts` como modelo): primeira avaliação grava tudo `emitida` sem emitir e cria a linha de base; selo novo com alerta ligado e permissão concedida emite "Novo selo: No verde em outubro" uma vez; segunda chamada não emite; alerta desligado grava `emitida` sem emitir; 2 selos novos → 2 emissões; emissor lança → `pendente` e a chamada seguinte emite e marca `emitida`; permissão negada → `pendente`; selo que some e volta não emite de novo; chamadas concorrentes não duplicam; falha do banco não lança (EX01)

### Implementation

- [X] T023 [P] [US4] Criar `src/features/conquistas/emissor.ts` com `emissorExpo` (`scheduleNotificationAsync`, `trigger: null`, canal `alertas` do UC14, `data: { rota: '/conquistas' }`) e `criarEmissorSimulado()` para testes
- [X] T024 [US4] Implementar `avaliarEEmitir(deps)` em `src/features/conquistas/emissao.ts`: lê selos via `consultarConquistas`, lê/grava `conquistas_emitidas` e a marca `conquistas_linha_base` em `preferencias_locais`, segue as transições de `data-model.md`, serializa execuções com uma promessa em andamento, nunca lança
- [X] T025 [US4] Criar `src/features/conquistas/gatilhos.ts` com `aoMudarLancamentos(cb)` / `avisarMudancaLancamentos()` e chamar `avisarMudancaLancamentos()` após gravações bem-sucedidas em `src/features/receitas/service.ts` e `src/features/despesas/service.ts`
- [X] T026 [US4] Em `src/app/_layout.tsx`: rodar `avaliarEEmitir()` na montagem, no `AppState` `active` e em `aoMudarLancamentos`; tratar toque na notificação (`addNotificationResponseReceivedListener` e `getLastNotificationResponseAsync`) navegando para `data.rota`; remover assinaturas ao desmontar
- [X] T027 [US4] Chamar `avaliarEEmitir()` também no foco de `src/app/conquistas/index.tsx` (sem bloquear a renderização)

---

## Phase 7: User Story 5 - Falhas e acesso negado (Priority: P3)

**Goal**: erro de leitura [CQ4] e acesso negado [CQ6] (EX03, EX04, FR-012, FR-013).

**Independent Test**: simular falha de leitura e ver "Não foi possível carregar as conquistas. Tente novamente." com "Tentar novamente" que recarrega.

- [X] T028 [P] [US5] Testes em `tests/screens/Conquistas.test.tsx` (bloco "falhas"): falha de leitura mostra EX03 e "Tentar novamente" chama nova leitura e exibe os dados; parâmetro `uid` diferente do usuário da sessão mostra "Você não tem acesso a estas conquistas.", o detalhe e "Ir para minhas conquistas", que navega para `/conquistas` sem parâmetro
- [X] T029 [US5] Implementar em `src/app/conquistas/index.tsx` o estado de erro [CQ4] com `recarregar` e a verificação do parâmetro `uid` contra `useSessao()` [CQ6]

---

## Phase 8: Polish & Cross-Cutting

- [X] T030 [P] Criar roteiro manual `tests/MANUAL-UC13.md` com os passos 1 a 7 do `quickstart.md` (seguir o formato de `tests/MANUAL-UC14.md`), incluindo como ligar `fonteMetasExemplo` em desenvolvimento
- [X] T031 [P] Adicionar as linhas do UC13 (RF44, RF45, RF46, FA01 a FA08, EX01 a EX05) com os testes correspondentes em `tests/RASTREABILIDADE.md`
- [X] T032 Rodar `npx jest`, `npx expo lint` e `npx tsc --noEmit` em `mobile/` e corrigir o que falhar
- [ ] T033 Validar manualmente no aparelho ou emulador seguindo `tests/MANUAL-UC13.md` (notificação real e toque abrindo Conquistas)

---

## Dependencies & Execution Order

- **Setup (T001 a T003)**: sem dependências.
- **Foundational (T004 a T009)**: depois do Setup; bloqueia todas as histórias. T008 antes de T009.
- **US2 (T010 a T013)**: depois da Foundational. Núcleo de todas as outras.
- **US1 (T014 a T019)**: depende de US2 (T013).
- **US3 (T020, T021)**: depende de US1 (lista com `ItemSelo`).
- **US4 (T022 a T027)**: depende de US2; T027 depende de T018. Independe de US1 e US3 para os testes de serviço.
- **US5 (T028, T029)**: depende de US1 (T018).
- **Polish**: depois das histórias desejadas.

Ordem sugerida: Setup → Foundational → US2 → US1 → (US3 ∥ US4) → US5 → Polish.

## Parallel Examples

- Foundational: T004, T005, T006, T007 juntos; depois T008 → T009.
- US2: T010 e T011 juntos; depois T012 → T013.
- US1: T014, T015, T016, T017 juntos; depois T018 → T019.
- Após US1: US3 (T020, T021) em paralelo com US4 (T022, T023).
- Polish: T030 e T031 juntos.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US2 + US1. Entrega a área Conquistas com selos derivados; validar pelo Independent Test da US1 e parar para revisão.
2. **Incremento 2**: US3 (detalhe) e US4 (notificação), em paralelo.
3. **Incremento 3**: US5 (falhas e acesso negado) e Polish.
4. Commits por fase, no padrão `feat(uc13): ...`, `test(uc13): ...`, `docs(uc13): ...`.
