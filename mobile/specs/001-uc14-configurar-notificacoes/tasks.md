---
description: "Task list for UC14 - Configurar notificações"
---

# Tasks: UC14 - Configurar notificações

**Input**: `specs/001-uc14-configurar-notificacoes/` (plan.md, spec.md, research.md, data-model.md, contracts/notificacoes.ts.md, quickstart.md)

**Tests**: incluídos. O projeto mantém testes Jest por tela e por serviço, e o quickstart.md os exige.

**Paths**: relativos a `mobile/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3 (spec.md)

---

## Phase 1: Setup

- [X] T001 Instalar `expo-notifications` com `npx expo install expo-notifications` (atualiza `package.json` e `package-lock.json`)
- [X] T002 Adicionar `"expo-notifications"` ao array `plugins` de `app.json`, com `enableRemoteNotifications: false` (push remoto fora do escopo, research.md R1)
- [X] T003 [P] Adicionar mock de `expo-notifications` em `tests/setup.ts` (`getPermissionsAsync`, `requestPermissionsAsync`, `setNotificationChannelAsync`, `AndroidImportance`) para que testes existentes continuem verdes

---

## Phase 2: Foundational

**⚠️ Bloqueia todas as histórias.**

- [X] T004 [P] Criar `src/features/notificacoes/types.ts` com `TipoAlerta = 'limite' | 'conquistas'`, `TIPOS_ALERTA` (array ordenado: limite, conquistas), `EstadoPermissao = 'nao-decidida' | 'concedida' | 'negada'`, `EstadoSyncPreferencia = 'local' | 'pendente' | 'sincronizado' | 'erro'` e as interfaces `NotificationPreferences` e `NotificationPermission` exatamente como em `contracts/notificacoes.ts.md`
- [X] T005 [P] Criar `src/features/notificacoes/padroes.ts` com `ESTADO_INICIAL: Record<TipoAlerta, boolean> = { limite: false, conquistas: false }` e comentário citando D25 (constante única, FR-002)
- [X] T006 [P] Criar `src/features/notificacoes/mensagens.ts` com os textos de EX01, EX02, o aviso FA06, os rótulos "Alertas de limite (80% e 100%)" e "Conquistas", e os botões "Abrir configurações" e "Tentar novamente", copiados de `contracts/notificacoes.ts.md`
- [X] T007 Adicionar `DDL_PREFERENCIAS_NOTIFICACAO` em `src/db/schema.ts`: tabela `preferencias_notificacao` com `uid TEXT NOT NULL`, `tipo TEXT NOT NULL CHECK (tipo IN ('limite','conquistas'))`, `ativo INTEGER NOT NULL CHECK (ativo IN (0,1))`, `atualizado_em TEXT NOT NULL`, `estado_sync TEXT NOT NULL CHECK (estado_sync IN ('local','pendente','sincronizado','erro'))`, `PRIMARY KEY (uid, tipo)`, com `CREATE TABLE IF NOT EXISTS` (data-model.md)
- [X] T008 Em `src/db/migrations.ts`: subir `VERSAO_ESQUEMA` para 11, criar `migrar011` no molde de `migrar010` (transação exclusiva, aplica `DDL_PREFERENCIAS_NOTIFICACAO`, grava `user_version`), registrar no despacho de migrações e aplicar a DDL também no caminho de criação do zero, onde hoje é aplicado `DDL_PREFERENCIAS_LOCAIS`
- [X] T009 Adicionar casos em `tests/db/migrations.test.ts` (schema.test.ts não precisou: a migração cobre instalação nova e v10→v11): banco v10 migra para v11 com a tabela nova; reexecutar é idempotente; instalação nova já nasce na v11 com a tabela

**Checkpoint**: tipos, constantes e tabela prontos.

---

## Phase 3: User Story 1 - Ligar e desligar tipos de alerta (P1) 🎯 MVP

**Goal**: Perfil com a seção "Notificações", dois interruptores persistidos, desligados no primeiro uso, e `isEnabled` disponível para UC05 e UC13.

**Independent Test**: abrir o Perfil, ligar "Conquistas", reiniciar; o interruptor continua ligado. Neste incremento, a permissão simulada retorna `concedida`.

### Tests (escrever antes e ver falhar)

- [X] T010 [P] [US1] Criar `tests/features/notificacoes/preferencias.test.ts` com `tests/helpers/fakeDb.ts`: `listar()` sem linhas retorna `ESTADO_INICIAL`; `definir('conquistas', true)` grava e `isEnabled('conquistas')` retorna `true`; com sessão `{status:'ativa', uid:'u1'}` grava `uid='u1'` e `estado_sync='pendente'`; sem sessão grava `uid='local'` e `estado_sync='local'`; um uid não lê linhas de outro (RNF03); `isEnabled` retorna `false` quando o banco lança
- [X] T011 [P] [US1] Criar `tests/screens/Perfil.test.tsx`: renderiza o título "Notificações" e os dois interruptores desligados; tocar em "Conquistas" chama `definir('conquistas', true)` e o switch fica com `accessibilityState.checked=true` só depois de a promessa resolver; o switch fica desabilitado durante a gravação; não aparecem "Lembrete diário de registro", "Aviso de mês sem movimentação", "Prazos de metas", "Atividade dos grupos" nem saldo negativo (FR-010, FR-011)

### Implementation

- [X] T012 [US1] Criar `src/features/notificacoes/preferencias.ts` com `criarPreferencias(obterDb = getDb, obterSessao = obterSessaoAtual)`, que implementa `NotificationPreferences`. `uid` = sessão ativa ? `sessao.uid` : `'local'`; `estado_sync` = sessão ativa ? `'pendente'` : `'local'`; `definir` usa `INSERT ... ON CONFLICT(uid, tipo) DO UPDATE` com `atualizado_em = new Date().toISOString()`; `listar` mescla as linhas com `ESTADO_INICIAL`; `isEnabled` captura erro e retorna `false`. Exportar a instância `notificationPreferences`. Ler a sessão pela mesma API que `src/features/conta/sessao.ts` usa
- [X] T013 [P] [US1] Criar `src/components/perfil/ItemInterruptor.tsx`: linha com rótulo à esquerda e `Switch` do React Native à direita, props `rotulo`, `valor`, `desabilitado`, `onAlternar`, `accessibilityRole="switch"`, `accessibilityLabel={rotulo}`, cores de `src/lib/theme.ts`
- [X] T014 [US1] Criar `src/features/notificacoes/useNotificacoes.ts`: carrega `listar()` ao montar e expõe `{ estado: 'carregando' | 'pronto' | 'erro', valores, gravando: TipoAlerta | null, alternar(tipo) }`; `alternar` grava primeiro e só atualiza `valores` depois de resolver (FR-003); ignora novos toques enquanto `gravando` não for nulo. Receber `preferencias` e `permissao` por parâmetro (padrão: instâncias reais) para os testes
- [X] T015 [US1] Criar `src/components/perfil/SecaoNotificacoes.tsx`: título "Notificações" e um `ItemInterruptor` por item de `TIPOS_ALERTA`, com rótulos de `mensagens.ts`, usando `useNotificacoes`
- [X] T016 [US1] Criar a rota `src/app/perfil.tsx`: tela com voltar (`router.back()`), cartão do usuário (e-mail da sessão ativa ou "Usando sem conta") e `<SecaoNotificacoes />`; layout no padrão de `src/app/sincronizacao.tsx`
- [X] T017 [US1] Adicionar o botão "Perfil" em `src/app/index.tsx` com `router.push('/perfil')`, ao lado dos botões de Sincronização e Conta, e ajustar `tests/screens/Home.test.tsx` se ele contar botões

**Checkpoint**: US1 funciona sozinha (permissão simulada sempre `concedida`).

---

## Phase 4: User Story 2 - Permissão do aparelho na primeira ativação (P1)

**Goal**: pedir a permissão do SO só quando ainda não houver decisão; com permissão negada, manter a escolha e mostrar o aviso com atalho para as configurações.

**Independent Test**: com a permissão simulada `nao-decidida`, ligar um tipo e responder `negada`; o switch continua ligado e o aviso aparece.

### Tests

- [X] T018 [P] [US2] Criar `tests/features/notificacoes/permissao.test.ts` com o mock de `expo-notifications`: `undetermined` + `canAskAgain=true` vira `nao-decidida`; `granted` vira `concedida`; `denied` ou `canAskAgain=false` vira `negada`; iOS `ios.status` PROVISIONAL ou EPHEMERAL vira `concedida`; `solicitar()` só chama `requestPermissionsAsync` quando `nao-decidida`; no Android, `setNotificationChannelAsync('alertas', …)` é chamado antes de `requestPermissionsAsync`
- [X] T019 [P] [US2] Ampliar `tests/screens/Perfil.test.tsx`: ligar com `nao-decidida` chama `solicitar` uma vez; ligar o segundo tipo depois não chama de novo (FA07); com `negada` e um tipo ligado, aparece o aviso FA06 e "Abrir configurações" chama `abrirConfiguracoes`; com os dois desligados, não há aviso; desligar não pede permissão; `AppState` mudando para `active` relê a permissão e esconde o aviso quando vira `concedida`

### Implementation

- [X] T020 [US2] Criar `src/features/notificacoes/permissao.ts` com `NotificationPermission` sobre `expo-notifications`: `consultar()` mapeia `getPermissionsAsync()` conforme research.md R1; `solicitar()` chama `consultar()`, só pede quando `nao-decidida` e, se `Platform.OS === 'android'`, antes chama `setNotificationChannelAsync('alertas', { name: 'Alertas', importance: AndroidImportance.DEFAULT })` (R2); `abrirConfiguracoes()` chama `Linking.openSettings()` de `react-native` (R4). Exportar a instância `notificationPermission`
- [X] T021 [P] [US2] Criar `src/features/notificacoes/permissao.simulada.ts`: `criarPermissaoSimulada(inicial: EstadoPermissao, respostaAoSolicitar: EstadoPermissao)`, que registra as chamadas a `solicitar` e `abrirConfiguracoes` e é usada nos testes
- [X] T022 [US2] Ampliar `useNotificacoes.ts`: ler `permissao.consultar()` ao montar e no listener de `AppState` `active` (R7); em `alternar`, quando o novo valor for `true`, chamar `permissao.solicitar()` antes de gravar; gravar a escolha mesmo se o resultado for `negada` (FR-006); expor `permissao` e `mostrarAvisoBloqueio = permissao === 'negada' && algum tipo ligado`
- [X] T023 [US2] Em `SecaoNotificacoes.tsx`, renderizar o aviso FA06 quando `mostrarAvisoBloqueio`, com o botão "Abrir configurações" ligado a `permissao.abrirConfiguracoes()`, usando a cor de aviso de `src/lib/theme.ts`

**Checkpoint**: US1 + US2 cobrem o fluxo principal, FA06 e FA07.

---

## Phase 5: User Story 3 - Falhas de leitura e gravação (P2)

**Goal**: EX01 e EX02 sem perder dados.

**Independent Test**: com `definir` rejeitando, o switch volta ao estado anterior e a mensagem do EX01 aparece.

### Tests

- [X] T024 [P] [US3] Ampliar `tests/screens/Perfil.test.tsx`: `definir` rejeitando mantém o switch no valor anterior e mostra o texto EX01; o próximo toque com sucesso limpa a mensagem; `listar` rejeitando mostra o texto EX02 e "Tentar novamente"; tocar em "Tentar novamente" chama `listar` de novo e, com sucesso, mostra os interruptores

### Implementation

- [X] T025 [US3] Em `useNotificacoes.ts`, capturar erro de `definir` (manter `valores`, expor `erroGravacao = MSG.EX01`, limpar no próximo `alternar` bem-sucedido) e de `listar` (`estado='erro'`), e expor `recarregar()`
- [X] T026 [US3] Em `SecaoNotificacoes.tsx`, mostrar `erroGravacao` abaixo dos itens e, com `estado==='erro'`, trocar a lista pela mensagem EX02 com o botão "Tentar novamente" ligado a `recarregar()`

**Checkpoint**: todas as histórias funcionam.

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Criar `tests/MANUAL-UC14.md` com o roteiro manual do `quickstart.md` e os resultados esperados
- [X] T028 [P] Atualizar `tests/RASTREABILIDADE.md` com UC14: passos, FA, EX e FR ligados aos testes de T010, T011, T018, T019 e T024
- [X] T029 Rodar `npx expo lint`, `npx tsc --noEmit` e `npx jest` e corrigir até tudo passar
- [X] T030 Rodar `npx expo-doctor` para confirmar a compatibilidade de `expo-notifications` com a SDK 58

---

## Dependencies & Execution Order

- **Setup (T001 a T003)** → **Foundational (T004 a T009)** → US1 → US2 → US3 → Polish.
- US2 e US3 alteram `useNotificacoes.ts` e `SecaoNotificacoes.tsx`, criados em US1; por isso são sequenciais.
- Dentro de cada história: testes antes, depois serviço, depois hook, depois UI.

### Parallel Opportunities

- T003 em paralelo com T001 e T002 depois da instalação.
- T004, T005 e T006 juntos; T007 → T008 → T009 em sequência.
- US1: T010, T011 e T013 juntos.
- US2: T018, T019 e T021 juntos.
- Polish: T027 e T028 juntos.

```text
# Exemplo, US1:
Task: T010 tests/features/notificacoes/preferencias.test.ts
Task: T011 tests/screens/Perfil.test.tsx
Task: T013 src/components/perfil/ItemInterruptor.tsx
```

## Implementation Strategy

1. **MVP** = Phases 1 a 3 (US1): preferências gravadas e `isEnabled` pronto para UC05 e UC13.
2. Somar US2 (permissão): necessária antes de qualquer notificação real aparecer.
3. Somar US3 (falhas) e Polish.
4. Fora do escopo: push remoto e o envio da preferência ao Firestore (integração com o UC16).
