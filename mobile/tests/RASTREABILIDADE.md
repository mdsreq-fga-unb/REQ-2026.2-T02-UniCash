# Rastreabilidade dos casos de uso

Cadeia: **requisito → caso de uso (fluxo) → código → teste → resultado.**
Os caminhos são relativos a `mobile/`. As siglas de requisitos vêm dos comentários do código
(`src/**`) e do `tests/MANUAL.md`; os textos completos estão em `engenharia_de_requisitos`.

As seções 1–3 registram o **UC01 — Gerenciar receitas**; a seção 4 registra o **UC06 — Gerenciar categorias**; a seção 5 registra o **UC10 — Conta e sessão**.

A seção 6 registra o **UC03 — Consultar resumo financeiro**.

A seção 7 registra o **UC07 — Consultar evolução mensal**.

## 1. Regras de negócio e requisitos não funcionais

| Requisito | Fluxo do UC01 | Código | Teste automatizado | Teste manual |
|---|---|---|---|---|
| RN06 – base local | todos | `src/db/schema.ts`, `src/db/database.ts` | `tests/service/receita/*` (SQLite em memória, `helpers/fakeDb.ts`) | 3.2 |
| RN07 – exclusão e conflito na nuvem (RN07) | D, sincronização | `src/features/receitas/service.ts` (`excluirReceita`), `src/features/receitas/sync.ts` | `tests/service/receita/sync.test.ts`, `tests/service/receita/serie.test.ts` | 3.2 |
| RN08 – data, título e valor obrigatórios | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/screens/receita/ReceitaForm.test.tsx` | 3.3 |
| RN09 – valor | A, C | `src/features/receitas/validation.ts`, `src/features/receitas/money.ts` | `tests/unit/validation.test.ts`, `tests/unit/money.test.ts`, `tests/screens/receita/ReceitaForm.test.tsx` | 3.3 |
| RN10 – título e descrição | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/screens/receita/ReceitaForm.test.tsx` | 3.3 |
| RN11 – operação composta em uma transação | A, C, D | `src/features/receitas/service.ts` (`transacao`) | `tests/service/receita/atomicidade.test.ts` | 3.1 |
| RN12 – listagem por período, mais recente primeiro, sem excluídas | B | `src/features/receitas/service.ts` (`listarReceitas`), `src/features/receitas/useReceitas.ts` | `tests/service/receita/consulta.test.ts`, `tests/screens/receita/ListaReceitas.test.tsx`, `tests/screens/receita/FiltroReceitas.test.tsx`, `tests/screens/receita/FiltroReceitas.extras.test.tsx` | – |
| RN19 – recorrência válida | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/service/receita/recorrencia.test.ts`, `tests/screens/receita/ReceitaForm.test.tsx` | – |
| RN20 – editar qualquer campo | C | `src/features/receitas/service.ts` (`editarReceita`), `src/app/receitas/[id]/editar.tsx` | `tests/service/receita/editar.test.ts`, `tests/service/receita/serie.test.ts`, `tests/service/receita/edicaoSerie.extras.test.ts`, `tests/screens/receita/EditarReceita.test.tsx` | – |
| RNF03 – Security Rules | sincronização | `firestore.rules` | `tests/rules/firestore.rules.test.ts` (`npm run test:rules`) | – |
| RNF05 – atomicidade | A, C, D | `src/features/receitas/service.ts` | `tests/service/receita/atomicidade.test.ts` | – |
| RNF14 – usuário identifica o motivo do erro | A | `src/components/receitas/ReceitaForm.tsx`, `src/features/receitas/validation.ts` | `tests/screens/receita/ReceitaForm.test.tsx` (mensagens) | 3.3 |
| RNF26 – sem duplicidade na geração de séries | A, abertura do app | `src/features/receitas/service.ts` (`completarRecorrencias`), `src/app/_layout.tsx` | `tests/service/receita/recorrencia.test.ts`, `tests/screens/receita/Layout.test.tsx`, `tests/service/receita/sync.test.ts` | – |
| RNF27 – registro em até 3 etapas | A | `src/app/receitas/nova.tsx`, `src/components/receitas/ReceitaForm.tsx` | `tests/screens/receita/NovaReceita.test.tsx` | 3.4 |
| RNF34 – base local principal | todos | `src/db/database.ts` | `tests/setup.ts`, `tests/helpers/fakeDb.ts` | – |
| RNF35 — Persistir localmente com durabilidade | A | `src/features/receitas/service.ts`, `src/app/receitas/nova.tsx` | `tests/service/receita/atomicidade.test.ts` (simulado) | 3.1 |

## 2. Fluxos e exceções do caso de uso

| Fluxo / exceção | Código | Teste automatizado | Teste manual |
|---|---|---|---|
| A – registrar receita | `src/app/receitas/nova.tsx`, `src/components/receitas/ReceitaForm.tsx`, `service.ts` (`registrarReceita`) | `tests/screens/receita/NovaReceita.test.tsx`, `tests/screens/receita/ReceitaForm.test.tsx`, `tests/service/receita/registrar.test.ts` | 3.1, 3.4 |
| B – consultar e filtrar | `src/app/receitas/index.tsx`, `src/components/receitas/FiltroReceitas.tsx`, `src/components/receitas/ReceitaItem.tsx` | `tests/screens/receita/ListaReceitas.test.tsx`, `tests/screens/receita/ListaReceitas.sincronizacao.test.tsx`, `tests/screens/receita/FiltroReceitas*.test.tsx`, `tests/screens/receita/ReceitaItem.test.tsx` | – |
| B3 – detalhe | `src/app/receitas/[id]/index.tsx` | `tests/screens/receita/DetalheReceita.test.tsx`, `tests/screens/receita/Voltar.test.tsx` | – |
| C – editar | `src/app/receitas/[id]/editar.tsx` | `tests/screens/receita/EditarReceita.test.tsx`, `tests/screens/receita/Voltar.test.tsx` | – |
| D – excluir | `src/components/receitas/useExclusao.tsx`, `src/components/receitas/OpcoesModal.tsx` | `tests/screens/receita/DetalheReceita.test.tsx`, `tests/screens/receita/useExclusao.test.tsx` | – |
| FA08 – alcance em série (esta / próximas / todas) | `src/components/receitas/useExclusao.tsx`, `src/app/receitas/[id]/editar.tsx`, `service.ts` | `tests/service/receita/serie.test.ts`, `tests/service/receita/edicaoSerie.extras.test.ts`, `tests/screens/receita/EditarReceita.test.tsx`, `tests/screens/receita/DetalheReceita.test.tsx` | – |
| EX01 – dados inválidos | `src/features/receitas/validation.ts`, `src/components/receitas/ReceitaForm.tsx` | `tests/unit/validation.test.ts`, `tests/screens/receita/ReceitaForm.test.tsx`, `tests/screens/receita/NovaReceita.test.tsx` | 3.3 |
| EX02 – período invertido | `src/components/receitas/FiltroReceitas.tsx` | `tests/screens/receita/FiltroReceitas.test.tsx` | – |
| EX03 – falha ao gravar | `nova.tsx`, `[id]/editar.tsx`, `useExclusao.tsx`, `service.ts` | `tests/screens/receita/NovaReceita.test.tsx`, `tests/screens/receita/EditarReceita.test.tsx`, `tests/screens/receita/DetalheReceita.test.tsx`, `tests/service/receita/atomicidade.test.ts` | 3.1 |
| EX04 – sem conexão | `src/features/receitas/sync.ts`, `src/app/receitas/nova.tsx` | `tests/service/receita/sync.test.ts` | 3.2 |
| EX05 – atualização vinda da nuvem | `src/features/receitas/sync.ts`, `src/app/receitas/index.tsx` | `tests/service/receita/sync.test.ts`, `tests/screens/receita/ListaReceitas.sincronizacao.test.tsx` | 3.2 |
| EX06 – receita já excluída | `service.ts`, `[id]/index.tsx`, `[id]/editar.tsx`, `useExclusao.tsx` | `tests/service/receita/editar.test.ts`, `tests/screens/receita/DetalheReceita.test.tsx`, `tests/screens/receita/EditarReceita.test.tsx` | – |
| EX07 – acesso negado | `src/features/receitas/sync.ts` (`consumirAcessoNegado`), `src/app/receitas/index.tsx`, `validation.ts` (`MSG.acessoNegado`) | `tests/service/receita/sync.test.ts`, `tests/screens/receita/ListaReceitas.test.tsx` | – |
| EX08 – falha de leitura local | `service.ts`, `src/features/receitas/useReceitas.ts`, `[id]/index.tsx`, `[id]/editar.tsx` | `tests/service/receita/leitura.test.ts`, `tests/screens/receita/ListaReceitas.test.tsx`, `tests/screens/receita/DetalheReceita.test.tsx`, `tests/screens/receita/EditarReceita.test.tsx` | – |
| Restauração da nuvem | `src/features/receitas/sync.ts` (`restaurarDaNuvem`) | `tests/service/receita/sync.test.ts` | 3.2 (passo 5) |

A tela de conta (UC10) já existe: a restauração em aparelho novo é chamada por `src/features/conta/sync.app.ts`
(`restaurarSeAparelhoVazio`) e a pergunta sobre enviar os dados locais está em `src/app/conta/confirmar-email.tsx`.
Os testes e as decisões estão na seção 5. Como a sincronização passou a exigir e-mail confirmado e a poder ser pausada
(UC10, FA01), `sincronizarPendentes()` tem hoje duas condições a mais; a seção 5.1 registra os testes.

## 3. Resultados de validação

### 3.1 Automatizados (`npm test -- --ci --coverage`)

| Data | Suítes | Testes | Statements | Branches | Funções | Linhas | Responsável |
|---|---|---|---|---|---|---|---|
| 2026-11-13 (antes dos testes de cobertura final) | 19 de 19 | 255 de 255 | 96,72% | 91,87% | 96,42% | 98,32% | |
| 2026-11-23 (UC01, UC06 e UC10 juntos; `npx jest --ci --coverage`) | 48 de 48 | 573 de 573 | 99,08% | 97,92% | 96,46% | 99,27% | |

Escopo da cobertura: `src/**/*.{ts,tsx}`, exceto `src/lib/firebase.ts`, `src/db/database.ts`,
`src/features/receitas/types.ts` (só tipos) e `src/app/index.tsx` (tela inicial sem regra de negócio).
Métricas: statements, branches, funções e linhas.

### 3.2 Security Rules (`npm run test:rules`)

| Data | Suítes | Testes | Resultado | Responsável |
|---|---|---|---|---|
| 2026-11-23 | 2 de 2 | 63 (57 aprovados, 6 ignorados) | Aprovado. Os 6 ignorados são o grupo `perfil: alteração (UC11)` (`describe.skip`) | |

### 3.3 Manuais ([roteiro do UC01](MANUAL.md#uc01--gerenciar-receitas))

| Roteiro | Data | Aparelho / versão | Executado por | Resultado | Observações |
|---|---|---|---|---|---|
| 1. Encerramento forçado (RNF35) | | | | | |
| 2. Offline, reinício e nuvem | | | | | |
| 3. RNF14 (4 de 5 identificam o erro) | | | | | |
| 4. RNF27 (registro em até 3 etapas) | | | | | |

### 3.4 CI

| Data | Workflow | Link da execução | Resultado |
|---|---|---|---|
| | `mobile-ci.yml` (lint, typecheck, testes, build, rules) | | |

---

## 4. UC06 — Gerenciar categorias

Fonte: `unicash/docs/casos_de_uso.md` (branch `docs`), seção **UC06 — Gerenciar categorias**.
Escopo desta entrega: operações locais (SQLite). UC02 (lançamentos/despesas), UC05/UC09
(indicadores e alertas) e Firebase (sincronização e Security Rules) permanecem como
integrações posteriores. Itens dependentes dessas integrações estão marcados como
**pendentes**, sem teste que os declare concluídos.

### 4.1. Regras de negócio e requisitos não funcionais

| Requisito | Fluxo do UC06 | Código | Teste automatizado | Situação |
|---|---|---|---|---|
| RN06 — base local/offline | todos, FA01 | `src/db/schema.ts`, `src/db/database.ts`, `src/features/categorias/service.ts`, `categorias/sync.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts`, `tests/service/sync.test.ts` | Local e sincronização testados |
| RN07 — conflito/tombstone | D, EX08 | `service.ts` (`excluirCategoria`), `categorias/sync.ts`, `categorias/estado.ts` | `tests/service/categorias.test.ts`, `tests/service/sync.test.ts`, `tests/service/categorias.sync.test.ts`, `tests/rules/firestore.rules.test.ts` | Tombstone, conflito e anti-ressurreição testados |
| RN09 — valor monetário | B, C, EX03 | `validation.ts`, `src/features/receitas/money.ts`, `src/db/schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/db/schema.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado: 1 centavo, zero, teto e inteiros |
| RN11 — exclusão/atomicidade | C, D, EX04 | `service.ts` (`transacao`, `excluirCategoria`), `[id]/editar.tsx` | `tests/service/categorias.test.ts` (falha em criar/editar/excluir), `tests/screens/EditarCategoria.test.tsx` | Operação local, desvinculação e rollback testados; recálculo pendente |
| RN13 — nome, unicidade e padrões | A, B, C, D | `validation.ts`, `service.ts`, `src/db/schema.ts`, `useCategorias.ts`, `firestore.rules` | `tests/service/categorias.test.ts`, `tests/db/schema.test.ts`, `tests/unit/validation-categorias.test.ts`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx`, `tests/rules/firestore.rules.test.ts` | Testado (30/31 caracteres, Unicode/emoji, duplicidade, padrões, tombstone); padrão sem renomear/excluir e com limite editável |
| RN14 — limites por valor/percentual | B, C | `validation.ts`, `limites.ts`, `formato.ts`, `CategoriaForm.tsx`, `[id]/editar.tsx`, `src/db/schema.ts`, `categorias/sync.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/categorias.sync.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx`, `tests/db/schema.test.ts`, `tests/db/migrations.test.ts` | Faixa definitiva 1%–100% testada em formulário/domínio/serviço/SQLite/Firestore; recálculo de consumo validado no UC09; alertas do UC05 seguem externos |
| RNF03 — isolamento por usuário | EX09, sincronização | `firestore.rules` | `tests/rules/firestore.rules.test.ts` | Isolamento por UID testado nas Rules de categorias |
| RNF04 — validação local | B, C | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado |
| RNF05 — evitar estado parcial | B, C, D | `service.ts` (`transacao`) | `tests/service/categorias.test.ts` (falha em criar/editar/excluir) | Testado no escopo local |
| RNF07 — precisão monetária | B, C | `money.ts`, `validation.ts`, `schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/db/schema.test.ts` | Testado com centavos/centésimos inteiros |
| RNF14 — mensagens de rejeição | B, C, EX01–EX07 | `validation.ts` (`MSG_CAT`), `CategoriaForm.tsx` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Testado nos fluxos implementados |
| RNF35 — Persistir localmente com durabilidade | todos | `schema.ts`, `service.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts` | SQLite testado; persistência após encerramento e reabertura **aprovada no Expo Go/Android em 20/11/2026** |
| RNF36 — convergência da sincronização | sincronização | `categorias/sync.ts`, `receitas/sync.ts`, `db/restauracaoPendente.ts`, `firestore.rules` | `tests/service/sync.test.ts`, `tests/service/categorias.sync.test.ts`, `tests/unit/categorias.sync.test.ts`, `tests/rules/firestore.rules.test.ts` | Sincronização, aliases, conflitos, pendências e tombstones testados no emulador; sincronização real pendente de UC10 |

### 4.2. Fluxos e exceções

| Fluxo / exceção | Código | Teste automatizado | Situação |
|---|---|---|---|
| Semeadura inicial (pré-condição RN13) | `service.ts` (`semearCategoriasPadrao`), `useCategorias.ts`, `semeaduraPendente.ts`, `index.tsx` | `tests/service/categorias.test.ts` (vazia, repetida, conflito, rollback, exclusão+recriação), `tests/unit/useCategorias.test.ts`, `tests/unit/semeaduraPendente.test.ts`, `tests/screens/ListaCategorias.test.tsx` | Cria as ausentes; conflito isolado não bloqueia; própria preservada; conflito reportado; após excluir reservado, reavalia uma vez no próximo foco |
| A — listar/consultar categorias | `src/app/categorias/index.tsx`, `useCategorias.ts`, `service.ts` (`listarCategorias`) | `tests/screens/ListaCategorias.test.tsx`, `tests/unit/useCategorias.test.ts`, `tests/service/categorias.test.ts` | Implementado/testado, com contagem real de lançamentos |
| A (passo 2) — abrir lançamentos da categoria | `src/app/categorias/index.tsx` (atalho “Ver despesas”), `src/app/despesas/index.tsx` (parâmetro `categoriaId`) | `tests/screens/ListaCategorias.test.tsx`, `tests/screens/TelaListaDespesas.test.tsx`, `tests/service/despesas.leitura.test.ts` | Implementado/testado com o filtro da UC02, somente leitura |
| B — criar categoria | `src/app/categorias/nova.tsx`, `CategoriaForm.tsx`, `service.ts` (`criarCategoria`) | `tests/screens/NovaCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado |
| C — editar categoria | `src/app/categorias/[id]/editar.tsx`, `CategoriaForm.tsx`, `service.ts` (`editarCategoria`) | `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado; padrão só altera/remove limite |
| D — excluir categoria própria | `src/app/categorias/[id]/editar.tsx`, `service.ts` (`excluirCategoria`) | `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado (local), com desvinculação e rollback |
| FA01 — operação offline | `service.ts`, `schema.ts` | `tests/service/categorias.test.ts` (grava `sync_status='pendente'`) | Local testado; sincronização testada |
| FA02 — categoria sem lançamentos | `src/app/categorias/index.tsx`, `src/app/despesas/index.tsx` | `tests/screens/ListaCategorias.test.tsx`, `tests/screens/TelaListaDespesas.test.tsx`, `tests/service/despesas.leitura.test.ts` | Implementado/testado: “Nenhum lançamento” e “Nenhum registro” |
| FA03 — exclusão com lançamentos | `service.ts` (`marcarCategoriaExcluidaNaTransacao`) | `tests/service/categorias.test.ts` (despesa avulsa, série ativa/inativa, tombstones) | Implementado/testado: despesas mantidas e “Sem categoria” |
| FA04 — categoria sem limite | `CategoriaForm.tsx`, `EditarCategoria.test.tsx`, `service.ts` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts`, `tests/service/consumo.test.ts`, `tests/screens/IndicadoresConsumo.test.tsx` | Local testado; o UC09 omite o indicador de categorias sem limite |
| FA05 — cancelar edição/exclusão | `NovaCategoria.tsx`, `EditarCategoria.tsx`, `CategoriaForm.tsx` | `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX01 — nome duplicado | `service.ts` (`NomeDuplicado`), `validation.ts` | `tests/service/categorias.test.ts`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |
| EX02 — categoria padrão protegida | `service.ts` (`CategoriaPadraoProtegida`), `EditarCategoria.tsx` | `tests/service/categorias.test.ts`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX03 — limite inválido | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX04 — falha na gravação/recálculo | `service.ts` (`transacao`), telas | `tests/service/categorias.test.ts` (falha em criar/editar/excluir), `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Gravação testada; recálculo pendente |
| EX05 — falha de sincronização | `categorias/sync.ts`, `receitas/sync.ts` | `tests/service/sync.test.ts` (rede/permissão) | Implementado/testado: permanece pendente |
| EX06 — categoria inexistente/excluída | `service.ts`, `EditarCategoria.tsx` | `tests/service/categorias.test.ts`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |
| EX07 — nome inválido | `validation.ts`, `CategoriaForm.tsx`, `service.ts` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado |
| EX08 — conflito de sincronização | `categorias/sync.ts`, `receitas/sync.ts` | `tests/service/sync.test.ts`, `tests/unit/categorias.sync.test.ts` | Implementado/testado: exclusão prevalece, empate determinístico |
| EX09 — dados de outro usuário | `firestore.rules` | `tests/rules/firestore.rules.test.ts` | Implementado/testado: isolamento por UID |
| EX10 — falha de leitura local | `service.ts`, `useCategorias.ts`, `ListaCategorias`, `EditarCategoria` | `tests/service/categorias.test.ts`, `tests/screens/ListaCategorias.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |

### 4.3. Localização das evidências do DoD

As evidências do DoD Nível 1 são preenchidas e acompanhadas na **issue #43** — https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/43. Este arquivo mantém a matriz de rastreabilidade das seções 4.1 e 4.2 e os resultados de execução da seção 4.4.

### 4.4. Resultados

| Data | Comando | Suítes | Testes | Resultado |
|---|---|---|---|---|
| 18/11/2026 | `npm test -- --ci --coverage` | 44 | 619 | **619 aprovados** |
| 20/11/2026 | Baseline histórico PR #73: `npm test -- --ci --coverage` | 63 | 1.153 | **1.153 aprovados**; 90 testes de migrations e 57 de Firestore Rules. Não representa a suíte atual da UC06. |
| 20/11/2026 | `npm test -- --ci --coverage --runInBand` | 68 | 1.242 | **1.242 aprovados**; cobertura 95,23% statements, 89,73% branches, 98% functions, 96,93% lines |
| 20/11/2026 | `npm run test:rules` | 1 | 70 | **70 aprovados** no Firestore Emulator |
| 20/11/2026 | `npx expo export --platform android` | — | — | **Export Android concluído** (bundle Hermes) |
| 20/11/2026 | Expo Go em dispositivo Android (modo local) | — | — | **RF19, RF65, RF66, RF67 e persistência aprovados**; sincronização real não executada |

- **CI — execução 31:** PR #58, `feat(uc06): gerenciar categorias (listagem, cadastro, edição e exclusão)`, commit `2445ee8` (código) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44390887769
- **CI — execução 32:** PR #58, commit `aa84979` (documentação) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44418286085
- **CI — PR #73:** execução [44703149839](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44703149839), 2/2 jobs aprovados (`Lint, typecheck, testes e build` e `Security Rules`).
- **CI — develop pós-merge do PR #73:** execução [44704829462](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44704829462), 2/2 jobs aprovados.
- **Manual histórico:** antes do commit `2445ee8`, o diagnóstico da migração 003 no Android foi relatado como bem-sucedido (`user_version = 3`, triggers e categorias preservadas). Esse registro não cobre as migrações 006/007 nem a versão atual.
- **Manual atual — Expo Go/Android (20/11/2026):** execução local, sem autenticação Firebase; resultados detalhados em 4.4.1.
- **Firestore Emulator:** `npm run test:rules` cobre as Rules de categorias; não houve publicação em projeto Firebase real nem teste de sincronização real.

### 4.4.1. Testes manuais — Expo Go em dispositivo Android

Executados em **20/11/2026**, em dispositivo Android via **Expo Go**, no modo offline/local, sem autenticação Firebase.

| Item | Resultado |
|---|---|
| RF19 — criação de categoria | **Aprovado** |
| RF65 — consulta, contagem e navegação para despesas filtradas | **Aprovado** |
| RF66 — edição de categoria própria e limite de padrão | **Aprovado** |
| RF67 — exclusão de categoria com preservação das despesas | **Aprovado** |
| Persistência após encerrar e reabrir o aplicativo | **Aprovado** |

**Escopo e limitações:** este smoke foi funcional, em Expo Go, e não uma build nativa/APK. Não houve inspeção de `user_version` nem repetição do upgrade nativo a partir de banco antigo; as migrações 006/007 permanecem cobertas pelos testes automatizados. A sincronização e a restauração Firebase reais não foram executadas por ausência de autenticação/UC10.

### 4.4.2. Baseline histórico da integração UC02 (PR #73)

Os números e links abaixo são **históricos** da integração UC02 + UC06 no merge `9e373e9` e não substituem os resultados atuais da UC06 em 4.4.

| Evidência histórica | Resultado |
|---|---|
| Suíte no PR #73 | 63 suítes, 1.153 testes aprovados |
| Testes de migrations | 90 aprovados |
| Testes de Firestore Rules naquele baseline | 57 aprovados |
| CI do PR #73 | [44703149839](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44703149839) — 2/2 jobs |
| CI da `develop` pós-merge | [44704829462](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44704829462) — 2/2 jobs |

**Checklist histórico da integração UC02:** detalhado em 4.9, incluindo migrations 004/005, slugs históricos, desvinculação, FK e verificação de integridade. A issue #70 registra o encerramento da integração.

**Pendências naquele baseline, superadas ou ainda externas:** RF65, sincronização de categorias e Rules de categorias foram concluídos no PR #76. Permanecem externos os alertas do UC05, a publicação das Rules no projeto real, a sincronização real e a validação de upgrade nativo a partir de banco antigo.

### 4.5. Pendências de integração

- **UC02 / issue #70:** integração concluída pelo PR #73 no merge `9e373e9`; evidências históricas em 4.4.2 e 4.9. RF65, sincronização de categorias e Rules de categorias foram concluídos no PR #76.
- **UC09 / issue #46:** recálculo de consumo por período integrado à lista e ao Resumo Financeiro, com rastreabilidade abaixo.
- **UC05:** integração dos alertas permanece sob responsabilidade desse caso de uso. O contrato de leitura das tabelas está em 4.10.
- **UC10:** a restauração no startup aguarda `authStateReady` e usa `auth.currentUser`, mas o app ainda não possui tela de login própria. Sem sessão, a operação permanece offline-first.
- **Validação nativa:** o smoke funcional da UC06 foi concluído via **Expo Go em dispositivo Android** em 20/11/2026, cobrindo RF19/RF65/RF66/RF67 e persistência. Não houve build nativa/APK, inspeção de `user_version` ou repetição do upgrade nativo a partir de banco antigo; as migrações 006/007 seguem cobertas por testes automatizados.
- **Firebase não configurado:** `src/lib/firebase.ts` abre em modo offline quando as variáveis `EXPO_PUBLIC_FIREBASE_*` estão ausentes; `auth.currentUser` fica nulo e sincronização/restauração não executam. Teste: `tests/unit/firebase.offline.test.ts`.
- **Semeadura:** conflitos são reportados uma vez por instância e a semeadura não é repetida a cada foco. Após excluir uma categoria própria com nome reservado, um sinal único faz a lista tentar a semeadura no próximo foco; não há conversão automática da categoria própria. Se a tentativa posterior falhar, a exclusão já confirmada permanece e o erro é exibido como falha de preparação das padrão, não como falha da exclusão.

| Fluxo do UC09 | Implementação | Testes |
| --- | --- | --- |
| RF39, FA06, EX01 e EX02 — exibir consumo e trocar o mês na lista | `src/app/categorias/index.tsx`, `src/features/consumo/useConsumoMensal.ts` | `tests/screens/ListaCategorias.test.tsx` |
| RF39 e FA06 — seguir o seletor de mês do Resumo Financeiro | `src/app/index.tsx`, `src/features/consumo/useConsumoMensal.ts` | `tests/screens/Resumo.test.tsx` |
| EX03 — consultar somente a base da conta ativa | `src/db/database.ts`, `src/features/consumo/sqlite.ts` | `tests/db/proprietario-uc10.test.ts` |
| RN06, RN07 e RN14 — cálculo local após alterações de despesas, receitas e categorias | `src/features/consumo/sqlite.ts`, `src/features/consumo/calculo.ts` | `tests/service/consumo.test.ts`, `tests/unit/consumo.test.ts` |

### 4.6. Limite percentual — faixa definitiva 1%–100%

**Política definitiva:** formulário, domínio, serviço, SQLite e Firestore aceitam percentuais de **1% a 100,00%** (100 a 10.000 centésimos), com até duas casas. A mensagem literal é **“O percentual deve ser de 1% a 100%.”** Valores abaixo de 1% e acima de 100% são rejeitados em novas entradas. A RN09 permanece inalterada: o limite monetário continua de R$ 0,01 a R$ 999.999.999,99.

**Normalização de dados antigos (migração 007):** percentuais locais abaixo de 1% viram 100 centésimos e acima de 100% viram 10.000 centésimos; casas excedentes são arredondadas ao centésimo mais próximo. A migração é transacional e idempotente, marca apenas as categorias corrigidas como `sync_status='pendente'`/`estado_local='editado'` e não altera despesas, receitas, séries ou referências financeiras. Os triggers provisórios são substituídos pelos definitivos.

**Firestore:** a restauração normaliza os documentos que consegue aplicar e, em seguida, `normalizarCategoriasRemotas` varre toda a coleção `usuarios/{uid}/categorias`, inclusive padrões, próprias, tombstones e categorias sem uso. Para cada documento, a função relê em transação e atualiza somente os campos de limite necessários; documentos inválidos em outros campos são ignorados para não aplicar correções inseguras. As Security Rules exigem inteiro entre 100 e 10.000 centésimos e permitem a limpeza one-way dos limites de um tombstone legado, sem alterar `excluido_em`, identidade ou timestamps, impedindo ressurreição.

**Limite técnico preservado:** o CHECK da migração 002 continua exigindo inteiro seguro em centésimos até `Number.MAX_SAFE_INTEGER`; a faixa de negócio é aplicada por triggers e pelo domínio.

**Testes:** `tests/unit/validation-categorias.test.ts` cobre 0%/0,99%/1%/50%/99,99%/100%/100,01%/101%/200000% e a mensagem literal; `tests/db/schema.test.ts` cobre INSERT/UPDATE dos triggers definitivos (99, 100, 9.999, 10.000, 10.001 e `MAX_SAFE_INTEGER`); `tests/service/categorias.test.ts` confirma a rejeição de 99/10.001 e a persistência de 100/10.000; `tests/unit/categorias.sync.test.ts` cobre arredondamento e normalização remota; `tests/service/sync.test.ts` cobre restauração, reenvio e a varredura remota em massa (padrão, própria, tombstone, categoria sem uso, idempotência e falhas de rede/permissão); `tests/db/migrations.test.ts` cobre v1→v7, v2→v7, v6→v7, normalização, idempotência e preservação financeira; `tests/rules/firestore.rules.test.ts` cobre a faixa e a limpeza one-way de limite de tombstone nas Rules.

### 4.7. Contagem de caracteres (RN13)

`contarCaracteres` usa `Array.from(texto).length`, que conta **code points** e tem a mesma semântica de `length()` do SQLite. O `.length` anterior do JavaScript contava unidades UTF-16 e rejeitava emojis antes do limite de 30. O limite de negócio permanece **30 caracteres**.

- Cobertura: nome comum 30/31, acentos 30/31, emoji 30/31 no domínio, schema, serviço e formulário.
- Limitação documentada: sequências ZWJ/combining são contadas por code point, não por *grapheme cluster*; é o comportamento consistente com o SQLite atual.

### 4.8. Proteção das categorias padrão

- **Serviço:** `editarCategoria` rejeita renomear padrão e permite definir, alterar e remover o limite; `excluirCategoria` rejeita exclusão de padrão.
- **Interface:** o formulário de padrão deixa o nome não editável, esconde a exclusão e explica que o limite pode ser definido, alterado ou removido; a tela de edição só oferece exclusão para categoria própria.
- **SQLite:** há `CHECK` de `padrao IN (0,1)` e índice único de nome ativo, mas **não há trigger/CHECK** que impeça UPDATE/DELETE direto, renomear uma padrão ou alterar `padrao`. Escrita direta/importação pode furar a proteção; o serviço e a UI são a defesa local.
- **Firestore Rules:** limitam ao próprio `uid`, validam o documento canônico da padrão (`padrao_casa` etc.), mantêm nome/`nome_normalizado`/`chave`/`criado_em` imutáveis, permitem alterar ou remover somente o limite e impedem tombstone de padrão. Aliases só podem ser adicionados, nunca removidos. Categorias próprias podem ser renomeadas e receber tombstone uma única vez, sem ressurreição.
- **Estado:** sincronização e `test:rules` de categorias implementados e testados.

### 4.9. Integração UC02 e migrações

A UC02 já está integrada nas migrações 004/005 (`despesas` e tombstone de `recorrencias`). A UC06 usa a migração 006 para estado local/fila de restauração e a 007 para a faixa percentual definitiva; a versão atual do banco é **7**.

A exclusão de categoria própria desvincula, na mesma transação, despesas não excluídas e séries de despesa, preservando os lançamentos e tombstones. A restauração de despesa/série com categoria ausente usa a fila `restauracao_pendente` e não converte o vínculo em `NULL` silenciosamente. Permanecem fora do escopo da UC06 o recálculo de indicadores/alertas (UC05/UC09) e a tela de login (UC10).

**Baseline histórico da integração UC02 (PR #73 / merge `9e373e9` / issue #70):**

- [x] Migração 004 adiciona `despesas` e as colunas `tipo`, `categoria_id`, `fixa_ou_variavel` e `essencial` em `recorrencias`.
- [x] Migração 005 adiciona `excluido_em` em `recorrencias`; instalação nova terminava em `user_version = 5` naquele baseline.
- [x] Bancos v0–v4 migram para v5 preservando dados, com validação estrutural, rollback e idempotência.
- [x] O esquema canônico é validado por assinaturas normalizadas; a migração ad hoc de recorrências foi removida de `database.ts`.
- [x] Slugs históricos da UC02 são convertidos para IDs reais; referências não resolvidas permanecem tratáveis.
- [x] Exclusão de categoria desvincula `despesas.categoria_id` e `recorrencias.categoria_id` na mesma transação.
- [x] `despesas.recorrencia_id` mantém FK para `recorrencias`; `categoria_id` permanece sem FK, com desvinculação no serviço.
- [x] `PRAGMA integrity_check` e `PRAGMA foreign_key_check` são verificados; 90 testes de migrations aprovados.
- [x] Issue #70 encerrada com as evidências da integração UC02: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/70
- [x] CI do PR #73 e da `develop` pós-merge registrados em 4.4.2.

**Superado pelo PR #76:** RF65, sincronização de categorias, Rules de categorias, migrações 006/007 e normalização percentual. **Ainda externo:** UC05/UC09, UC10, publicação das Rules no projeto real, sincronização real e upgrade nativo a partir de banco antigo.

### 4.10. Contrato de integração com UC05/UC09

A UC06 **não calcula** indicadores de consumo nem alertas de limite. O contrato mínimo para as UCs responsáveis é a leitura consistente do estado após o commit da operação:

- **Pré-condição:** a operação da UC06 só retorna depois do commit local; em falha, categoria, despesas, séries e limites permanecem como antes.
- **Estado publicado:** `categorias` (id, `padrao`, `limite_tipo`, `limite_centavos`, `limite_percentual_centesimos`, `excluido_em`, `atualizado_em`), `despesas` (`categoria_id`, `data`, `valor_centavos`, `excluido_em`) e `recorrencias` (`tipo`, `categoria_id`, estado/tombstone).
- **Leitura esperada:** UC05/UC09 recalculam o período afetado a partir dessas tabelas após criar, editar ou excluir categoria. Não há evento de domínio nem callback implementado nesta etapa.
- **Pós-condição relevante:** exclusão de própria mantém as despesas e séries, grava `categoria_id = NULL` e preserva os tombstones; edição de limite atualiza `atualizado_em`; categoria padrão não muda de nome nem é excluída.
- **Fora do escopo:** fórmulas de consumo, limite efetivo, faixas de alerta e persistência de indicadores continuam sob responsabilidade de UC05/UC09.

### 4.11. B3 — foreign keys e impacto na UC06

O problema B3 conhecido é que `PRAGMA foreign_keys = ON` não é herdado pela conexão separada usada por `withExclusiveTransactionAsync`. A UC06 **não é afetada** por ele:

- as únicas foreign keys do schema são `despesas.recorrencia_id` e `receitas.recorrencia_id`, ambas referenciando `recorrencias(id)`;
- `categoria_id` em `despesas` e `recorrencias` não possui foreign key;
- a UC06 cria/edita/ tombstoneia apenas `categorias` e atualiza `categoria_id` para `NULL` em despesas/séries; não insere nem exclui `recorrencias` e não altera `recorrencia_id`.

Portanto, não há impacto demonstrado na funcionalidade da UC06 e nenhuma correção de arquitetura foi feita nesta etapa.

---

## 5. UC10 — Conta e sessão

Fonte: caso de uso **UC10 — Conta e sessão** (RF01, RF02, RF06, RF31). Escopo desta entrega: cadastro, entrada, recuperação de senha, encerramento de sessão e confirmação do e-mail sobre o Firebase Authentication, perfil em `usuarios/{uid}` e ligação com a sincronização existente (`src/features/receitas/sync.ts`). Todos os testes abaixo foram **escritos**; os resultados de execução estão na seção 5.3.

Atualização de 23/11/2026: a seção registra as quatro decisões técnicas da seção 5.4 (sincronização só com e-mail confirmado, prazo das ligações do Firebase, página padrão de redefinição, regra do FA01) e o que a branch implementa para elas.

### 5.1. Requisitos funcionais, regras de negócio e requisitos não funcionais

| Requisito | Fluxo do UC10 | Código | Teste automatizado | Situação |
|---|---|---|---|---|
| RF01 — cadastrar usuário | A, E | `src/app/conta/cadastro.tsx`, `src/app/conta/confirmar-email.tsx`, `src/features/conta/auth.firebase.ts` (`signUp`, `checkEmailVerified`, `resendVerification`), `src/features/conta/service.firebase.ts` (`cadastrar`), `validation.ts` | `tests/screens/CadastroConta.test.tsx`, `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts`, `tests/unit/validation-conta.test.ts`, `tests/rules/conta.rules.test.ts` | Testado. Prazo da ligação: o do Firebase (decisão 5.4); a interface ainda cita 5 minutos — ajuste pendente (5.5) |
| RF02 — autenticar | B | `src/app/conta/entrar.tsx`, `auth.firebase.ts` (`signIn`, observador de sessão), `service.firebase.ts` (`entrar`) | `tests/screens/EntrarConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts`, `tests/service/conta/simulado-conta.test.ts` | Testado. `entrar` só autentica; quem retoma a sincronização é o observador de sessão (`index.ts`) |
| RF06 — encerrar sessão | D | `src/app/conta/index.tsx`, `auth.firebase.ts` (`signOut`), `service.firebase.ts` (`sair`: suspende a sincronização e depois invalida a sessão) | `tests/screens/Conta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` | Testado |
| RF31 — recuperar senha | C | `src/app/conta/recuperar-senha.tsx`, `src/app/conta/redefinir-senha.tsx`, `auth.firebase.ts` (`sendPasswordReset`, `confirmPasswordReset`) | `tests/screens/RecuperarSenha.test.tsx`, `tests/screens/RedefinirSenha.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Testado. Decisão: a redefinição acontece na página padrão do Firebase; a rota `redefinir-senha` fica no código sem uso no fluxo atual (5.4). Texto de prazo na interface: ver 5.5 |
| RF61 — uso sem conta | todos | `src/app/conta/cadastro.tsx`, `entrar.tsx` ("Continuar sem conta") | `tests/screens/CadastroConta.test.tsx`, `tests/screens/EntrarConta.test.tsx` | Testado; cenário 2 do UC10 |
| RF62 — sincronização (contrato) | B4, E6, FA01 | `src/features/conta/sync.ts` (porta), `sync.app.ts` (adaptador sobre `features/receitas/sync.ts`), `index.ts` | `tests/service/conta/sync-app-conta.test.ts`, `tests/service/conta/index-conta.test.ts`, `tests/unit/sync-conta.test.ts` | Testado com o sync da UC01 simulado por mock |
| RF62 — sincronizar só com e-mail confirmado (decisão 5.4, item 1) | B4, E, EX11 | `src/features/receitas/sync.ts` (`sincronizarPendentes`: sem `user.emailVerified` não envia, nem em envio manual) | `tests/service/receita/sync.test.ts` ("e-mail não confirmado…", "e-mail confirmado depois…"), `tests/service/receita/sync.segundoPlano.test.ts` ("com e-mail não confirmado…"), mocks com `emailVerified: true` em `sync.extras.test.ts` e `sync.restauracaoRede.extras.test.ts` | Implementado/testado. `restaurarDaNuvem()` continua conferindo só `currentUser`: só é chamada com sessão ativa (e-mail confirmado) |
| RF62 — envio automático pausado (FA01, decisão 5.4, item 4) | A, E5-E6, FA01 | `service.firebase.ts` (`cadastrar` pausa depois de criar a conta; `enviarDadosDoAparelho` e `sincronizarAgora` exigem sessão ativa), `sync.app.ts` (`pausarEnvioAutomatico`, `sincronizar` como envio manual), `features/receitas/sync.ts` (`definirEnvioAutomatico`, `sincronizarPendentes({ manual })`), `src/db/schema.ts` (tabela `preferencias`) | `tests/service/conta/servico-conta.test.ts` ("envio automático (FA01)"), `tests/service/conta/sync-app-conta.test.ts` ("pausar o envio automático (FA01)"), `tests/service/receita/sync.test.ts` ("envio automático pausado (FA01)"), `tests/screens/ConfirmarEmail.test.tsx` | Implementado/testado. Limitações em 5.4 (sem botão dedicado) |
| Política de senha — regra a incluir no catálogo (A4) | A, C | `src/features/conta/validation.ts` (`senhaNaPolitica`, `validarCadastro`, `validarSenhaNova`), `firebase-erros.ts` | `tests/unit/validation-conta.test.ts` (7 e 8 caracteres e cada classe ausente), `tests/screens/CadastroConta.test.tsx`, `tests/screens/RedefinirSenha.test.tsx`, `tests/unit/firebase-erros-conta.test.ts` | Cliente testado; no servidor depende de configuração no Console (5.5). Número da regra: definir no catálogo |
| Confirmação do e-mail — regra a incluir no catálogo (A6, E, EX11) | A, B, E | `auth.firebase.ts` (`sessaoDe`, `signIn`, `checkEmailVerified`), `confirmar-email.tsx` | `tests/service/conta/auth-conta.test.ts`, `tests/screens/EntrarConta.test.tsx`, `tests/screens/ConfirmarEmail.test.tsx` | Testado. Número da regra: definir no catálogo |
| RN06 — conta opcional, base local | todos | `sync.app.ts` (`suspender` não altera dados), `service.firebase.ts` (`sair`), `index.ts` | `tests/screens/Conta.test.tsx`, `tests/service/conta/sync-app-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` | Testado; cenários 3 e 4 |
| RNF01 — senha protegida | A, C | Firebase Authentication (hash); `auth.firebase.ts` nunca grava senha | `tests/service/conta/auth-conta.test.ts` (perfil sem senha), `tests/rules/conta.rules.test.ts` (senha recusada no perfil) | Testado no que cabe ao app |
| RNF02 — serviço de autenticação e sessão | B, D | `auth.firebase.ts`, `sessao.ts` | `tests/service/conta/auth-conta.test.ts`, `tests/unit/sessao-conta.test.ts` | Testado |
| RNF03 — acesso só ao próprio perfil | A, EX10 | `firestore.rules` (`match /usuarios/{uid}`) | `tests/rules/conta.rules.test.ts` (`npm run test:rules`) | Leitura e criação testadas no Emulator; **atualização do perfil pendente** (UC11, ver 5.5) |
| RNF04 — validação no cliente e no servidor | A, C | `validation.ts`, `firebase-erros.ts`, `firestore.rules` | `tests/unit/validation-conta.test.ts`, `tests/unit/firebase-erros-conta.test.ts`, `tests/rules/conta.rules.test.ts` | Cliente e e-mail testados; política de senha no servidor depende do Console (5.5) |
| RNF14 — mensagens sem dados sensíveis | todos | `erros.ts`, `firebase-erros.ts` | `tests/unit/erros-conta.test.ts`, `tests/unit/firebase-erros-conta.test.ts`, `tests/service/conta/auth-conta.test.ts` | Testado |
| RNF26, RNF36 — pendências e reenvio | E6, EX08 | `sync.app.ts`, `features/receitas/sync.ts` | `tests/service/conta/sync-app-conta.test.ts`, `tests/screens/ConfirmarEmail.test.tsx` | Testado. `sync.app.ts` só consulta as tabelas que existem no esquema (receitas, recorrências e, após o merge com a UC02, despesas) |
| RNF30 — Emulator Suite | — | `src/lib/firebase.ts` (`EXPO_PUBLIC_USE_EMULATOR`) | `tests/rules/conta.rules.test.ts` | Testado |
| RNF32 — finalidade do tratamento de dados | A2 | `src/app/conta/cadastro.tsx` | `tests/screens/CadastroConta.test.tsx` | Testado; texto a ajustar após a validação da mudança da D12 (5.5) |
| RNF33 — acessibilidade WCAG 2.1 AA | A, B | `src/components/conta/*` | — | **Manual** (cenário 7 do UC10) |
| RNF34 — operação sem conexão | D, FA04 | `auth.firebase.ts` (`signOut`) | `tests/service/conta/simulado-conta.test.ts`, `tests/screens/Conta.test.tsx` | Testado; cenário 4 |
| RNF38 — paleta "Tesouraria Teal" | todos | `src/components/conta/*`, `src/lib/theme` | — | **Manual** (cenário 7) |
| RNF40 — restauração em aparelho novo | FA02 | `sync.app.ts` (`restaurarSeAparelhoVazio`), `features/receitas/sync.ts` (`restaurarDaNuvem`) | `tests/service/conta/sync-app-conta.test.ts`, `tests/service/conta/index-conta.test.ts` | Testado com mock; cenário 6 |

### 5.2. Fluxos e exceções

| Fluxo / exceção | Código | Teste automatizado | Situação |
|---|---|---|---|
| A — cadastrar | `cadastro.tsx`, `auth.firebase.ts` (`signUp`), `service.firebase.ts` (`cadastrar`) | `tests/screens/CadastroConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts`, `tests/rules/conta.rules.test.ts` | Implementado/testado |
| B — autenticar | `entrar.tsx`, `auth.firebase.ts` (`signIn`) | `tests/screens/EntrarConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` | Implementado/testado |
| C — recuperar senha | `recuperar-senha.tsx`, `redefinir-senha.tsx` | `tests/screens/RecuperarSenha.test.tsx`, `tests/screens/RedefinirSenha.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado; redefinição pela página do Firebase (5.4) |
| D — encerrar sessão | `index.tsx`, `auth.firebase.ts`, `service.firebase.ts` (`sair`) | `tests/screens/Conta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` | Implementado/testado |
| E — confirmar e-mail | `confirmar-email.tsx`, `auth.firebase.ts` (`checkEmailVerified`) | `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` | Implementado/testado |
| E6 — enviar os dados do aparelho | `confirmar-email.tsx`, `service.firebase.ts` (`enviarDadosDoAparelho`: exige sessão ativa, marca como pendentes e envia como pedido da pessoa), `sync.app.ts` | `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/servico-conta.test.ts`, `tests/service/conta/sync-app-conta.test.ts` | Implementado/testado; libera o envio automático pausado |
| FA01 — dados do aparelho não enviados | `confirmar-email.tsx` ("Não enviar"), `service.firebase.ts` (`cadastrar` já deixa o envio pausado), `sync.app.ts`, `features/receitas/sync.ts` | `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/servico-conta.test.ts`, `tests/service/conta/sync-app-conta.test.ts`, `tests/service/receita/sync.test.ts` | Implementado/testado. Regra decidida em 5.4: os registros seguintes só sincronizam se a pessoa pedir a sincronização |
| FA02 — aparelho novo ou reinstalado | `sync.app.ts`, `index.ts` | `tests/service/conta/sync-app-conta.test.ts`, `tests/service/conta/index-conta.test.ts` | Testado com mock |
| FA03 — alterações pendentes ao sair | `index.tsx`, `sync.app.ts` (`contarPendentes`) | `tests/screens/Conta.test.tsx`, `tests/service/conta/sync-app-conta.test.ts` | Implementado/testado. "Sincronizar e sair" é um envio pedido pela pessoa (libera o envio automático) |
| FA04 — sair sem conexão | `auth.firebase.ts` | `tests/service/conta/simulado-conta.test.ts`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado |
| FA05 — cancelamento | `cadastro.tsx`, `entrar.tsx`, `recuperar-senha.tsx` | `tests/screens/CadastroConta.test.tsx`, `tests/screens/EntrarConta.test.tsx`, `tests/screens/RecuperarSenha.test.tsx` | Implementado/testado |
| FA06 — conta já com sessão ativa | `index.tsx` | `tests/screens/Conta.test.tsx` | Implementado/testado |
| FA07 — reenvio da confirmação | `confirmar-email.tsx`, `auth.firebase.ts` (`resendVerification`) | `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado |
| EX01 — dados do cadastro inválidos | `validation.ts`, `cadastro.tsx` | `tests/unit/validation-conta.test.ts`, `tests/screens/CadastroConta.test.tsx` | Implementado/testado |
| EX02 — e-mail já utilizado | `firebase-erros.ts`, `cadastro.tsx` | `tests/screens/CadastroConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/conta/simulado-conta.test.ts`, `tests/service/conta/servico-conta.test.ts` (cadastro que falha não pausa nada) | Implementado/testado |
| EX03 — sem conexão (cadastro, confirmação, recuperação) | `firebase-erros.ts`, telas | `tests/screens/CadastroConta.test.tsx`, `tests/screens/ConfirmarEmail.test.tsx`, `tests/screens/RecuperarSenha.test.tsx`, `tests/screens/RedefinirSenha.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado |
| EX04 — credenciais rejeitadas | `entrar.tsx`, `erros.ts` | `tests/screens/EntrarConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/unit/erros-conta.test.ts` | Implementado/testado |
| EX05 — sem conexão na entrada | `entrar.tsx`, `erros.ts` | `tests/screens/EntrarConta.test.tsx`, `tests/unit/erros-conta.test.ts` | Implementado/testado |
| EX06 — ligação temporária inválida | `confirmar-email.tsx`, `redefinir-senha.tsx` | `tests/screens/ConfirmarEmail.test.tsx`, `tests/screens/RedefinirSenha.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado |
| EX07 — falha ao criar conta ou perfil | `auth.firebase.ts` (desfaz a conta) | `tests/screens/CadastroConta.test.tsx`, `tests/service/conta/auth-conta.test.ts` | Implementado/testado |
| EX08 — falha na sincronização inicial | `confirmar-email.tsx`, `sync.app.ts` | `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/servico-conta.test.ts`, `tests/service/conta/sync-app-conta.test.ts` | Implementado/testado |
| EX09 — falha ao invalidar a sessão | `index.tsx`, `auth.firebase.ts`, `service.firebase.ts` | `tests/screens/Conta.test.tsx`, `tests/service/conta/servico-conta.test.ts` | Implementado/testado |
| EX10 — dados recusados pelas Security Rules | `firebase-erros.ts`, `firestore.rules` | `tests/screens/CadastroConta.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/unit/firebase-erros-conta.test.ts`, `tests/rules/conta.rules.test.ts` | Implementado/testado |
| EX11 — e-mail ainda não confirmado | `entrar.tsx`, `confirmar-email.tsx`, `receitas/sync.ts` (não sincroniza) | `tests/screens/EntrarConta.test.tsx`, `tests/screens/ConfirmarEmail.test.tsx`, `tests/service/conta/auth-conta.test.ts`, `tests/service/receita/sync.test.ts` | Implementado/testado |

### 5.3. Resultados

Preencher com a data e os números de cada execução (data, responsável e link do CI na seção 3.4).

| Data | Comando | Suítes | Testes | Statements | Branches | Funções | Linhas | Resultado |
|---|---|---|---|---|---|---|---|---|
| 2026-11-23 | `npx jest --ci --coverage` | 48 de 48 | 573 de 573 | 99,08% | 97,92% | 96,46% | 99,27% | **Aprovado** |
| 2026-11-23 | `npm run test:rules` | 2 de 2 | 57 aprovados, 6 ignorados (de 63) | – | – | – | – | **Aprovado.** Os 6 ignorados são o grupo `perfil: alteração (UC11)`; as 4 falhas de recorrências do UC01 não apareceram |
| 2026-11-23 | `npm run typecheck` | – | – | – | – | – | – | **Sem apontamentos** |
| 2026-11-23 | `npm run lint` | – | – | – | – | – | – | **Sem apontamentos** |

Responsável e link do CI: preencher. Cobertura dos arquivos do UC10 abaixo de 100%: `app/conta/confirmar-email.tsx` (97,22% das instruções, 81,81% dos ramos), `app/conta/index.tsx` (94,87%), `recuperar-senha.tsx` (95%), `redefinir-senha.tsx` (95,65%), `components/conta/CampoSenha.tsx` (60%), `features/conta/auth.firebase.ts` (98,64%; 86,95% dos ramos), `service.simulado.ts` (95,34%) e `sync.app.ts` (80% dos ramos). O restante de `src/` está em 100%.

Prova manual (ainda não executada): cenários 1 a 8 do [UC10](MANUAL.md#uc10--autenticar-usuário). Registro das execuções e evidências na issue do UC10 (data, responsável, aparelho e casos aprovados).

### 5.4. Decisões técnicas (23/11/2026)

Texto das decisões para o `decisoes.md`: `DECISOES.uc10.md`.

| # | Decisão | Escolha | Efeito na branch |
|---|---|---|---|
| 1 | Impedir a sincronização antes de confirmar o e-mail | **Fazer**: `sincronizarPendentes()` só roda com `user.emailVerified` | Implementado em `features/receitas/sync.ts`. Vale também para o envio manual. Mocks de `tests/service/receita/sync.test.ts`, `sync.segundoPlano.test.ts`, `sync.extras.test.ts` e `sync.restauracaoRede.extras.test.ts` ajustados |
| 2 | Prazo de 5 minutos das ligações (RF01, RF31) | **Aceitar o prazo do Firebase** (o Authentication não permite configurá-lo) | RF01, RF31 e o texto da regra deixam de fixar 5 minutos. **O código e os testes ainda citam 5 minutos** (5.5) |
| 3 | Link de redefinição de senha | **Aceitar a página padrão do Firebase** | Nenhuma página de redirecionamento. `redefinir-senha.tsx` permanece no código, sem uso no fluxo. `EXPO_PUBLIC_AUTH_CONTINUE_URL` segue opcional. Roteiro 3.5 já descreve esse caminho |
| 4 | FA01: os registros feitos depois de recusar o envio sincronizam? | **Só se a pessoa pedir a sincronização** | Ver abaixo |

**Como o FA01 funciona na branch**

- `cadastrar` pausa o envio automático logo depois de criar a conta, antes de qualquer pergunta. Se a pessoa fechar o app sem responder, nada sobe. A pausa fica no AsyncStorage (chave `envio_automatico_pausado:<uid>`) e vale depois de reiniciar o app.
- "Não enviar" só segue para a tela inicial: os registros atuais e os futuros ficam pendentes no aparelho.
- A pessoa libera o envio pedindo a sincronização: "Enviar meus dados" (pergunta pós-confirmação) ou "Sincronizar e sair" (Conta → Sair, quando há pendências). Esse envio é `manual`, sobe tudo o que está pendente e religa o envio automático dali em diante.
- `retomar()` (observador de sessão) não libera a pausa.
- `enviarDadosDoAparelho` e `sincronizarAgora` exigem sessão ativa e não chamam `retomar()` antes, porque ele ocupa a trava do envio em segundo plano e faria o envio manual ser descartado.

**Limitações conhecidas do FA01**

- A pausa é armazenada por UID no AsyncStorage; validação integrada pendente.
- Não existe botão "Sincronizar agora" na tela Conta. Depois de "Não enviar", o único caminho de interface é Conta → Sair → "Sincronizar e sair", que também encerra a sessão.

### 5.5. Pendências e decisões em aberto

- **Interface e testes ainda citam 5 minutos** (consequência da decisão 2): `confirmar-email.tsx` (subtítulo e aviso de reenvio), `recuperar-senha.tsx`, `validation.ts` (`PRAZO_LIGACAO_MINUTOS`) e os testes `tests/screens/ConfirmarEmail.test.tsx`, `tests/screens/RecuperarSenha.test.tsx`, `tests/unit/validation-conta.test.ts`. O texto deve dizer apenas que a ligação tem prazo de validade e pode ser reenviada.
- **Regra de atualização do perfil (UC11):** no Emulator, a regra `allow update` de `usuarios/{uid}` dá erro de avaliação para toda atualização feita pelo próprio dono (a criação, usada no cadastro do UC10, passa). Já foram descartadas a comparação do `criado_em` e o valor do Timestamp usado na preparação do teste. Causa não identificada. O grupo `perfil: alteração (UC11)` de `tests/rules/conta.rules.test.ts` está em `describe.skip` e deve ser reativado quando a regra for corrigida, antes de o UC11 gravar o e-mail novo no perfil (`confirmEmailChange`).
- **Testes de recorrência de `tests/rules/firestore.rules.test.ts` (UC01):** as 4 falhas registradas antes (`RNF03 › o mesmo vale para as recorrências` e três de `recorrências (RN19)`) não apareceram na execução de 23/11/2026 (`test:rules`: 57 aprovados, 6 ignorados). Resolvido; o job de rules não deve ficar vermelho por elas.
- **Campo `tipo` no envio das séries (a verificar):** o `firestore.rules` exige `tipo` nas recorrências e o `sincronizarPendentes()` desta branch envia a série sem `tipo`. Os testes de rules passam porque montam o próprio documento; o envio real não foi coberto por eles. Se o merge com a `develop` não trouxer o `tipo` no envio, as séries seriam negadas no Firebase real e, como o envio das séries vem antes das receitas, as receitas pendentes também não subiriam. Conferir no cenário 8 do UC10.
- **Política de senha no servidor (RNF04):** as Security Rules não veem a senha. Vale no cliente; no servidor depende de Authentication → Settings → Password policy (pode exigir o Identity Platform).
- **Mudança em relação à D12/R07:** o cadastro passa a pedir e-mail e senha. Registrar em `decisoes.md` (`DECISOES.uc10.md`), validar com a cliente e as representantes e ajustar RF01, RF31 e RNF32; a política de senha e a confirmação do e-mail entram no catálogo como regras de negócio (texto proposto no mesmo arquivo; os números das regras dependem do catálogo).
- **Autenticação sem conexão, dados locais ao sair, limite de tentativas:** assumidos no caso de uso (primeira entrada exige conexão; a base local permanece; sem limite próprio).
- **Restauração em aparelho novo:** `restaurarDaNuvem()` falha se a nuvem tem despesas com categoria e o aparelho ainda não tem categorias ativas (`MENSAGEM_RESTAURACAO_SEM_CATALOGO`). A semeadura das categorias padrão precisa ocorrer antes; se falhar, a tentativa seguinte ocorre na próxima entrada.
- **Categorias:** ainda não sincronizam (UC06); por isso `sync.app.ts` não as inclui ao marcar pendentes.
- **Resíduo de teste:** `tests/service/conta/index-conta.test.ts` cria o mock `liberarEnvioAutomatico`, que não existe na porta `SincronizacaoPort`. Inofensivo; pode ser removido.
- **Execução e fechamento:** rodar a seção 5.3, os roteiros manuais, abrir o PR e atualizar o DoD Nível 1 na issue. Anexar o resultado do CI na seção 3.4.

Conferido na branch: `src/app/_layout.tsx` chama `iniciarConta()` e `tests/screens/receita/Layout.test.tsx` mocka `@/features/conta`; o `@ts-expect-error` do `getReactNativePersistence` está em `src/lib/firebase.ts`.

## 6. UC03 — Consultar resumo financeiro

Mesma cadeia: **requisito → fluxo → código → teste → resultado.** Caminhos relativos a `mobile/`.

### 6.1. Requisitos e regras

| Requisito | Fluxo do UC03 | Código | Teste automatizado | Teste manual |
|---|---|---|---|---|
| RF11 – total de receitas do mês e por dia | passos 3 e 4 | `src/features/resumo/service.ts` (`totalReceitasDoMes`, `receitasPorDia`, `calcularResumo`), `src/app/index.tsx` | `tests/service/resumo.test.ts` (bloco "RF11"), `tests/screens/Resumo.test.tsx` ("abre no mês corrente…") | 4.1 (passo 2) |
| RF40 – saldo, receitas, despesas e metas do período | passos 3 e 4 | `service.ts` (`totalDespesasDoMes`, `saldoDoMes`, `progressoMetasDoMes`, `calcularResumo`), `src/app/index.tsx` | `tests/service/resumo.test.ts` (bloco "RF40"), `tests/screens/Resumo.test.tsx` ("abre no mês corrente…", "mostra o progresso das metas…") | 4.1 (passo 2) |
| RF55 – atalho para o tutorial | FA02 | `src/app/index.tsx` (`EstadoVazio`), `src/app/tutorial.tsx` | `tests/screens/Resumo.test.tsx` ("FA02…"), `tests/screens/Tutorial.test.tsx` | 4.1 (passo 1) |
| RF61 – usar sem conta | FA03 | `service.ts` (só SQLite; não importa o Firebase) | `tests/service/resumo.test.ts` ("FA03…"; o Firebase é mockado para quebrar se for importado) | 4.2 |
| RN06 – base local | todos | `service.ts`, `src/db/schema.ts` | `tests/service/resumo.test.ts` (SQLite em memória) | 4.2 |
| RN07 – sem contadores persistidos; exclusão lógica | passos 3 e 6, FA05 | `service.ts` (`excluido_em IS NULL`, cálculo na hora) | `tests/service/resumo.test.ts` ("ignora receitas excluídas", "ignora despesas excluídas", "FA02: lançamentos só excluídos…", "pós-condição…") | 4.1 (passo 5) |
| RN12 – mês corrente como padrão; datas futuras no mês | passo 2, FA04 | `src/app/index.tsx` (`mesCorrente`), `service.ts` (`intervaloDoMes`) | `tests/screens/Resumo.test.tsx` ("abre no mês corrente…"), `tests/service/resumo.test.ts` ("intervalo do mês…", "FA04…") | 4.1 (passo 3) |
| RN15 – saldo do mês = receitas − despesas | passos 3 e 4 | `service.ts` (`saldoDoMes`, `calcularResumo`) | `tests/service/resumo.test.ts` ("total de despesas e saldo…", "saldo negativo…"), `tests/screens/Resumo.test.tsx` ("saldo negativo…") | 4.1 (passo 2) |
| RNF07 – inteiros em centavos, 2 casas na exibição | passos 3 e 4 | `service.ts` (`SUM(valor_centavos)`), `src/features/resumo/format.ts` | `tests/service/resumo.test.ts` ("RNF07…"), `tests/unit/resumo.format.test.ts` | 4.4 |
| RNF20 – telas adaptadas a tamanhos de celular | passo 4 | `src/app/index.tsx` (estilos com `flexWrap`/`flexBasis`, comentário RNF20) | – (layout não é renderizado no Jest) | 4.3 |
| RNF03 – Security Rules | – | não se aplica: o resumo não lê nem grava na nuvem | – | – |

### 6.2. Fluxos e exceções

| Fluxo / exceção | Código | Teste automatizado | Teste manual |
|---|---|---|---|
| Passos 1–4 – abrir e calcular o mês corrente | `src/app/index.tsx`, `src/features/resumo/useResumo.ts`, `service.ts` (`calcularResumo`, numa única consulta SQL) | `tests/screens/Resumo.test.tsx` ("abre no mês corrente…"), `tests/service/resumo.test.ts` ("calcularResumo reúne…", "lê todos os totais numa única consulta…", "gravações durante a abertura do app…") | 4.1 (passo 2) |
| Passos 5–6 – seletor de mês e recálculo | `src/app/index.tsx`, `useResumo.ts` (descarta respostas atrasadas) | `tests/screens/Resumo.test.tsx` ("seletor navega…", "ao trocar de mês, não mostra os valores do mês anterior…"), `tests/unit/useResumo.test.ts` | 4.1 (passo 3) |
| FA01 – mês sem receitas | `service.ts`, `src/app/index.tsx` | `tests/service/resumo.test.ts` ("FA01…"), `tests/screens/Resumo.test.tsx` ("FA01…") | 4.1 (passo 4) |
| FA02 – sem nenhum lançamento | `service.ts` (`existeLancamento`), `src/app/index.tsx` (`EstadoVazio`) | `tests/service/resumo.test.ts` ("FA02…", "mês vazio com lançamentos em outros meses…"), `tests/screens/Resumo.test.tsx` ("FA02…") | 4.1 (passo 1) |
| FA03 – consulta offline | `service.ts` | `tests/service/resumo.test.ts` ("FA03…") | 4.2 |
| FA04 – mês futuro | `service.ts` (`intervaloDoMes`) | `tests/service/resumo.test.ts` ("FA04…") | 4.1 (passo 3) |
| FA05 – lançamento alterado ou excluído | `src/app/index.tsx` (`useFocusEffect`), `service.ts` | `tests/service/resumo.test.ts` ("FA05…") | 4.1 (passo 5) |
| EX01 – falha na leitura ou no cálculo | `service.ts` (`FalhaCalculo`, `MSG_FALHA_CALCULO`), `useResumo.ts`, `src/app/index.tsx` | `tests/service/resumo.test.ts` (bloco "EX01"), `tests/screens/Resumo.test.tsx` ("EX01…"), `tests/unit/useResumo.test.ts` ("EX01…") | – |
| Pós-condição – nenhum dado alterado | `service.ts` (somente leitura) | `tests/service/resumo.test.ts` ("pós-condição…") | 4.1 (passo 6) |
| Abertura com recorrências a completar | `src/app/_layout.tsx` (geração de receitas e despesas), `service.ts` (`calcularResumo`) | `tests/service/resumo.test.ts` ("gravações durante a abertura do app…") | 4.5 |
| Abertura: recálculo depois da preparação e da restauração da nuvem | `src/lib/baseAtualizada.ts`, `src/app/_layout.tsx` (sinal ao liberar o guard e ao terminar as rotinas), `useResumo.ts` (recalcula ao receber o sinal) | `tests/screens/Layout.test.tsx` (bloco "sinal de base atualizada"), `tests/screens/Resumo.test.tsx` (bloco "recálculo quando a base muda por fora da tela") | 4.5 (passo 2) |
| Atalhos Receitas, Despesas e Categorias em todos os estados | `src/app/index.tsx` (`Atalhos`; Receitas e Despesas abrem no mês selecionado) | `tests/screens/Resumo.test.tsx` (bloco "atalhos em todos os estados", "atalhos abrem as listas no mês selecionado…"), `tests/screens/Home.test.tsx`, `tests/screens/HomeDespesas.test.tsx` | 4.1 (passo 1) |
| Registro direto da tela inicial ("+ Nova receita" e "+ Nova despesa", RNF27) | `src/app/index.tsx` (`Atalhos`; escondidos no estado vazio, que já tem "Registrar receita" e "Registrar despesa") | `tests/screens/Resumo.test.tsx` (bloco "registro direto da tela inicial") | – |

**Placeholder de metas (RF12):** `progressoMetasDoMes` retorna vazio enquanto o caso de uso de metas estiver pendente.
A visão por dia está em lista, provisória até a escolha entre lista e calendário com a cliente.

### 6.3. Resultados de validação

#### 6.3.1. Automatizados (`npm test -- --ci --coverage`)

| Data | Suítes | Testes | `features/resumo` (statements / branches / funções / linhas) | `src/app/index.tsx` | Responsável |
|---|---|---|---|---|---|
| 2026-11-19 | 54 de 54 | 525 de 525 | 100% / 100% / 100% / 100% | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-23 (resumo em consulta única) | 54 de 54 | 527 de 527 | 100% / 100% / 100% / 100% | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-23 (após integrar a `develop` com UC02 e UC06) | 73 de 73 | 1295 de 1295 | 100% / 100% / 100% / 100% | 100% / 100% / 100% / 100% | dantescarpati |

Limites mínimos em `jest.config.js` para `src/**/resumo/**` e `src/app/index.tsx`: 90% statements, 70% branches, 85% funções, 90% linhas.

#### 6.3.2. Manuais ([roteiro do UC03](MANUAL.md#uc03--consultar-resumo-financeiro))

| Roteiro | Data | Aparelho / versão | Executado por | Resultado | Observações |
|---|---|---|---|---|---|
| 1. Fluxo principal e alternativos | | | | | |
| 2. Offline e sem conta | | | | | |
| 3. RNF20 – tamanhos de tela | | | | | |
| 4. RNF07 – precisão | | | | | |
| 5. Geração de recorrências na abertura | 2026-11-24 | Android, Expo Go | dantescarpati | Passou | Resumo do mês corrente com R$ 100,10, R$ 40,20 e saldo R$ 59,90 logo após abrir, sem navegar entre meses; ocorrências do mês seguinte geradas, sem duplicidade ao reabrir. |

## 7. UC07 — Consultar evolução mensal

Mesma cadeia: **requisito → fluxo → código → teste → resultado.** Caminhos relativos a `mobile/`.
O gráfico fica na tela do resumo (UC03) e compartilha com ele o mês selecionado.

### 7.1. Requisitos e regras

| Requisito | Fluxo do UC07 | Código | Teste automatizado | Teste manual |
|---|---|---|---|---|
| RF68 – gráfico de barras com receitas e despesas de cada mês | passos 3 e 4 | `src/features/evolucao/service.ts` (`calcularEvolucao`), `src/components/resumo/GraficoEvolucao.tsx`, `src/app/index.tsx` (`SecaoEvolucao`) | `tests/service/evolucao.test.ts` (bloco "RF68"), `tests/screens/Evolucao.test.tsx` ("passos 1 a 4…", "barras proporcionais…") | 5.1 (passo 2) |
| RN12 – mês corrente como padrão; janela de 6 meses (o selecionado e os 5 anteriores); datas futuras no mês | passo 2, passo 4, FA04, FA05 | `service.ts` (`mesesDaJanela`, `ajustarFimDaJanela`, `MESES_NO_GRAFICO`), `src/app/index.tsx` (`fimJanela`, `escolherMes`) | `tests/service/evolucao.test.ts` (bloco "janela do gráfico", "com mais de 6 meses…", "FA04…"), `tests/screens/Evolucao.test.tsx` ("FA05…") | 5.1 (passos 2, 4 e 6) |
| RN06 / RF61 – base local, sem conta e sem conexão | FA03 | `service.ts` (só SQLite; não importa o Firebase) | `tests/service/evolucao.test.ts` ("FA03…"; o Firebase é mockado para quebrar se for importado) | 5.2 |
| RN07 – sem contadores persistidos; exclusão lógica | passos 3 e 6, FA06 | `service.ts` (`excluido_em IS NULL`, cálculo na hora) | `tests/service/evolucao.test.ts` ("ignora lançamentos excluídos", "FA06…", "pós-condição…") | 5.1 (passo 7) |
| RNF07 – inteiros em centavos, 2 casas na exibição | passos 3 e 4 | `service.ts` (`SUM(valor_centavos) … GROUP BY` mês), `GraficoEvolucao.tsx` (`formatarBRL`) | `tests/service/evolucao.test.ts` ("RNF07…") | 5.4 |
| RNF20 – telas adaptadas a tamanhos de celular | passo 4 | `GraficoEvolucao.tsx` (6 colunas com `flex: 1`) | – (layout não é renderizado no Jest) | 5.3 |
| RNF38 – barras na paleta | passo 4 | `src/lib/theme.ts` (`graficoReceita`, `graficoDespesa`), `GraficoEvolucao.tsx` | – | 5.3 |
| RF55 – atalho para o tutorial | FA02 | `src/app/index.tsx` (`EstadoVazio` do resumo; a seção do gráfico some) | `tests/screens/Evolucao.test.tsx` ("FA02…") | 5.1 (passo 1) |
| RNF03 – Security Rules | – | não se aplica: o gráfico não lê nem grava na nuvem | – | – |

### 7.2. Fluxos e exceções

| Fluxo / exceção | Código | Teste automatizado | Teste manual |
|---|---|---|---|
| Passos 1–4 – abrir e calcular a janela do mês corrente | `src/app/index.tsx`, `src/features/evolucao/useEvolucao.ts`, `service.ts` (numa única consulta SQL) | `tests/screens/Evolucao.test.tsx` ("passos 1 a 4…"), `tests/service/evolucao.test.ts` ("lê tudo numa única consulta…") | 5.1 (passo 2) |
| Passos 5–6 – selecionar o mês pela barra ou pelo seletor (mês compartilhado com o UC03) | `GraficoEvolucao.tsx` (cada mês é um botão), `src/app/index.tsx` (`escolherMes`) | `tests/screens/Evolucao.test.tsx` ("passos 5 e 6…", "seletor dentro da janela…") | 5.1 (passo 3) |
| FA01 – mês sem receitas ou sem despesas | `service.ts` (meses sem lançamento entram com zero), `GraficoEvolucao.tsx` (`altura`) | `tests/service/evolucao.test.ts` ("FA01…"), `tests/screens/Evolucao.test.tsx` ("FA01…") | 5.1 (passo 5) |
| FA02 – sem nenhum lançamento | `service.ts` (`semLancamentos`), `src/app/index.tsx` (`SecaoEvolucao`) | `tests/service/evolucao.test.ts` ("FA02…"), `tests/screens/Evolucao.test.tsx` ("FA02…") | 5.1 (passo 1) |
| FA03 – consulta offline | `service.ts` | `tests/service/evolucao.test.ts` ("FA03…") | 5.2 |
| FA04 – mês futuro | `service.ts` | `tests/service/evolucao.test.ts` ("FA04…") | 5.1 (passo 6) |
| FA05 – mês fora da janela | `service.ts` (`ajustarFimDaJanela`), `src/app/index.tsx` | `tests/service/evolucao.test.ts` ("FA05…"), `tests/screens/Evolucao.test.tsx` ("FA05…") | 5.1 (passo 4) |
| FA06 – lançamento alterado ou excluído | `src/app/index.tsx` (`useFocusEffect`), `service.ts` | `tests/service/evolucao.test.ts` ("FA06…") | 5.1 (passo 7) |
| Abertura: recálculo depois da preparação e da restauração | `src/lib/baseAtualizada.ts`, `useEvolucao.ts` | `tests/screens/Evolucao.test.tsx` ("recalcula quando a preparação…") | – |
| EX01 – falha na leitura ou no cálculo | `service.ts` (`FalhaEvolucao`, `MSG_FALHA_EVOLUCAO`), `useEvolucao.ts`, `src/app/index.tsx` | `tests/service/evolucao.test.ts` (bloco "EX01"), `tests/screens/Evolucao.test.tsx` ("EX01…", "a falha da evolução não esconde o resumo…"), `tests/unit/useEvolucao.test.ts` | – |
| Pós-condição – nenhum dado alterado | `service.ts` (somente leitura) | `tests/service/evolucao.test.ts` ("pós-condição…") | 5.1 (passo 8) |

**Biblioteca de gráficos:** nenhuma. As barras são `View` do React Native, sem dependência nova (funciona no Expo Go),
e cada mês é um botão com rótulo de acessibilidade que informa os valores.

### 7.3. Resultados de validação

#### 7.3.1. Automatizados (`npm test -- --ci --coverage`)

| Data | Suítes | Testes | `features/evolucao` (statements / branches / funções / linhas) | Responsável |
|---|---|---|---|---|
| 2026-11-24 | 77 de 77 | 1358 de 1358 | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-26 (após integrar a `develop` com UC03, UC04, UC10 e UC16) | 106 de 106 | 1765 de 1765 | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-26 (revisão: séries e integração com UC09 e UC15) | 110 de 110 | 1815 de 1815 | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-26 (após integrar o UC05) | 111 de 111 | 1837 de 1837 | 100% / 100% / 100% / 100% | dantescarpati |

Limites mínimos em `jest.config.js` para `src/**/evolucao/**` (e `src/**/resumo/**`, que inclui o gráfico): 90% statements, 70% branches, 85% funções, 90% linhas.

#### 7.3.2. Manuais ([roteiro do UC07](MANUAL.md#uc07--consultar-evolução-mensal))

| Roteiro | Data | Aparelho / versão | Executado por | Resultado | Observações |
|---|---|---|---|---|---|
| 1. Fluxo principal e alternativos | | | | | |
| 2. Offline e sem conta | | | | | |
| 3. RNF20 e RNF38 – tamanhos de tela e cores | | | | | |
| 4. RNF07 – precisão | | | | | |

## UC05 — Monitorar limites de gastos

A [issue #32](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/32) e o [roteiro do UC05](MANUAL.md#uc05--monitorar-limites-de-gastos) registram o escopo entregue, a integração com UC09 e RF12 e os cenários de notificação em aparelho, incluindo offline. A cobertura automatizada da EX02 está em [alertas-uc05.test.ts](service/alertas-uc05.test.ts).

### Escopo e integrações

- O UC05 monitora limites mensais das categorias do UC06, em valor fixo ou percentual da renda. O SQLite calcula o gasto a partir das despesas da categoria e, para limites percentuais, das receitas do mesmo mês. Os limiares provisórios da RN03 são aproximação de 80% a 100% e ultrapassagem acima de 100%.
- A notificação é local e respeita as preferências por tipo. A chave por tipo, categoria e mês evita repetir um alerta emitido. A sincronização trata os alertas emitidos como dados da conta.
- O [UC09 (#46)](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/46) exibe indicadores de consumo. O UC05 desta branch tem consulta SQLite própria sobre os mesmos lançamentos e limites. Substituir essa consulta pela função compartilhada do UC09 e validar os dois fluxos juntos continua pendente após a integração das branches.
- As metas de gasto do RF12 têm armazenamento e ciclo de vida próprios. Esta entrega monitora apenas categorias. Incluir referências a metas no cálculo e nas notificações fica para a integração com o RF12.

### EX02 — Revalidação antes da emissão

[alertas-uc05.test.ts](service/alertas-uc05.test.ts) cobre a edição de uma despesa com alerta pendente em 80% e falha na consulta de consumo. A despesa é salva e o alerta fica pendente enquanto a consulta estiver indisponível. Quando a consulta volta, o alerta é descartado se o gasto caiu para 50% e é emitido com os valores atuais se o gasto está em 90%. A revalidação usa a mesma transação SQLite da emissão.

## UC14 — Configurar notificações (D25)

| Requisito / fluxo | Código | Teste automatizado | Teste manual |
|---|---|---|---|
| RF58, passos 1 e 2, D25 (estado inicial desligado) | `src/app/perfil.tsx`, `src/components/perfil/SecaoNotificacoes.tsx`, `src/features/notificacoes/padroes.ts` | `tests/screens/Perfil.test.tsx` (US1), `tests/features/notificacoes/preferencias.test.ts` | 1, 10 |
| Passos 3 e 5 (grava antes de confirmar), FA01 | `src/features/notificacoes/useNotificacoes.ts`, `src/features/notificacoes/preferencias.ts` | `tests/screens/Perfil.test.tsx` ("grava antes de ligar o interruptor") | 2, 3 |
| Passo 4, FA06, FA07 (permissão do aparelho) | `src/features/notificacoes/permissao.ts` | `tests/features/notificacoes/permissao.test.ts`, `tests/screens/Perfil.test.tsx` (US2) | 4 a 7 |
| FA05, RN06 (pendente de sincronização com conta) | `src/features/notificacoes/preferencias.ts`, `src/db/migrations.ts` (`migrar012`) | `tests/features/notificacoes/preferencias.test.ts`, `tests/db/migrations.test.ts` | 8 |
| RNF03 (isolamento por dono), EX05 | `src/features/notificacoes/preferencias.ts` | `tests/features/notificacoes/preferencias.test.ts` | — |
| EX01, EX02 | `src/features/notificacoes/useNotificacoes.ts`, `src/features/notificacoes/mensagens.ts` | `tests/screens/Perfil.test.tsx` (US3) | — |
| Contrato `isEnabled('limite' \| 'conquistas')` para UC05 e UC13 | `src/features/notificacoes/preferencias.ts` | `tests/features/notificacoes/preferencias.test.ts` | — |

## UC11 — Gerenciar perfil (entrega parcial: edição do perfil)

Mesma cadeia: **requisito → fluxo → código → teste → resultado.** Caminhos relativos a `mobile/`.

**Escopo desta entrega.** Seguindo a sugestão da revisão do PR #135, a entrega foi separada: este PR cobre a consulta e a
edição do perfil (troca de senha e de e-mail, fluxos A e B). A exclusão de conta (fluxo C, RF05, RN04, EX06 a EX08) saiu do
PR e continua pendente no UC11 até a equipe validar um fluxo compatível com o plano Spark do Firebase (pedido no Firestore
processado por um script administrativo, responsável e frequência de processamento, envio do pedido feito offline depois
do logout e política de backup de 60 dias). As Cloud Functions, a regra `pedidos_remocao` e a fila local de remoção foram
retiradas e podem ser recuperadas do histórico do PR quando o fluxo for aprovado.

### Requisitos e regras

| Requisito | Fluxo do UC11 | Código | Teste automatizado |
|---|---|---|---|
| RF03 – consultar e editar o perfil | principal, A | `src/app/conta/index.tsx` ("Editar perfil"), `src/components/conta/EditarPerfil.tsx` | `tests/screens/Conta.test.tsx` (bloco "Perfil (UC11)") |
| RF03 – e-mail confirmado aparece no perfil offline e é reconciliado no Firestore | B | `src/features/conta/auth.firebase.ts` (`confirmEmailChange` marca a gravação pendente e publica o e-mail na sessão mesmo se o Firestore falhar; o sucesso limpa marcas antigas), `src/features/conta/perfil.ts` (`reconciliarEmailDoPerfil` renova o token e descarta marca que não bate com o e-mail do Auth), `src/features/conta/index.ts` (reconcilia ao ativar a sessão) | `tests/service/conta/auth-conta.test.ts` (bloco "RF03: e-mail confirmado no Auth com falha no Firestore") |
| RF04 – troca de e-mail só vale após a confirmação | A, B | `auth.firebase.ts` (`requestEmailChange`, `confirmEmailChange`) | `tests/service/conta/auth-conta.test.ts` ("verifica a confirmação feita no navegador…", "preserva o perfil enquanto o novo e-mail não foi confirmado") |
| RNF04 – política de senha (8 caracteres, maiúscula, minúscula e caractere especial) | A | `src/features/conta/validation.ts` (`validarSenhaNova`) | `tests/screens/Conta.test.tsx` ("valida a política de senha para …": 7 caracteres, 8 válida, sem maiúscula, sem minúscula, sem caractere especial) |
| RNF03 – o dono só altera o próprio perfil e não remove o e-mail | A | `firestore.rules` | `tests/rules/conta.rules.test.ts` (bloco "perfil: alteração (UC11)", incluindo "recusa remover o e-mail obrigatório") |

### Exceções

| Exceção | Mensagem | Código | Teste automatizado |
|---|---|---|---|
| EX01 – dados inválidos | "Informe o e-mail.", "Informe um e-mail válido.", "Este e-mail já está em uso.", política de senha | `EditarPerfil.tsx`, `validation.ts` | `Conta.test.tsx` ("EX01: e-mail em formato inválido…", "EX01: e-mail já usado em outra conta", "valida a política de senha…") |
| EX02 – falha na gravação | "Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente." | `EditarPerfil.tsx` | `Conta.test.tsx` ("EX02: falha na gravação…") |
| EX03 – sem conexão na edição | "Sem conexão. Conecte-se à internet para alterar o perfil." | `EditarPerfil.tsx` | `Conta.test.tsx` ("EX03: sem conexão…") |
| EX04 – ligação inválida | "Esta ligação expirou ou já foi usada. Solicite uma nova." | `EditarPerfil.tsx`, `auth.firebase.ts` | `Conta.test.tsx` ("EX04: ligação expirada…"), `auth-conta.test.ts` ("código expirado não altera o perfil") |
| EX05 – novo e-mail não confirmado | "Este e-mail ainda não foi confirmado. Abra a ligação enviada ao novo e-mail ou peça um reenvio." | `EditarPerfil.tsx`, `auth.firebase.ts` | `Conta.test.tsx` ("EX05: novo e-mail ainda não confirmado"), `auth-conta.test.ts` ("preserva o perfil enquanto…") |
| EX06 a EX08 – exclusão de conta | – | fora desta entrega (fluxo C pendente) | – |
| EX09 – acesso a perfil de outro usuário | "Você não tem acesso a este perfil." | `firestore.rules` (o app só abre o perfil da sessão ativa) | `tests/rules/conta.rules.test.ts` (bloqueio entre contas); a mensagem no app segue pendente |
| EX10 – falha na leitura local | "Não foi possível carregar o perfil. Tente novamente." com "Tentar novamente" | `EditarPerfil.tsx` (salvar fica bloqueado até recarregar) | `Conta.test.tsx` ("EX10: falha na leitura local…") |

### Pendências do UC11

- Fluxo C (exclusão de conta) no plano Spark, conforme o item 1 da revisão do PR #135.
- Expiração de 5 minutos da ligação de troca de e-mail: depende de validar com o responsável pelo RF04 uma solução no ponto de confirmação ou a adoção formal da validade do Firebase.
- Evidência no Expo Go ou APK: troca de senha seguida de novo login e confirmação do e-mail pelo link.

## 8. UC12 — Gerenciar metas financeiras

Mesma cadeia: **requisito → fluxo → código → teste → resultado.** Caminhos relativos a `mobile/`.

### 8.1. Requisitos e regras

| Requisito | Fluxo do UC12 | Código | Teste automatizado |
|---|---|---|---|
| RF12 – registrar meta | A | `src/features/metas/validation.ts`, `service.ts` (`criarMeta`), `src/app/metas/nova.tsx`, `src/components/metas/MetaForm.tsx` | `tests/service/metas.test.ts` (bloco "criarMeta"), `tests/screens/NovaMeta.test.tsx`, `tests/screens/MetaForm.test.tsx` |
| RF13 – editar meta | C | `service.ts` (`editarMeta`), `src/app/metas/[id]/editar.tsx` | `tests/service/metas.test.ts` (bloco "editarMeta"), `tests/screens/EditarMeta.test.tsx` |
| RF14 – excluir meta | D | `service.ts` (`excluirMeta`, tombstone), `src/app/metas/[id]/index.tsx` | `tests/service/metas.test.ts` (bloco "excluirMeta"), `tests/screens/DetalheMeta.test.tsx` ("confirma a exclusão…") |
| RF20 – listar e acompanhar | passos 2 e B | `useMetas.ts`, `progresso.ts`, `src/app/metas/index.tsx`, `src/app/metas/[id]/index.tsx` | `tests/screens/ListaMetas.test.tsx`, `tests/screens/DetalheMeta.test.tsx`, `tests/unit/metas.progresso.test.ts` |
| RF36 – progresso percentual e restante | B | `progresso.ts` (`calcularProgresso`, `rotuloSituacaoProgresso`), `formato.ts` | `tests/unit/metas.progresso.test.ts`, `tests/screens/DetalheMeta.test.tsx` |
| RN07 – sincronização e conflitos | A7, C6, D5, EX04 | `src/features/metas/merge.ts`, `sync.ts`, migração 015 | `tests/unit/metas.merge.test.ts`, `tests/service/metas.sync.test.ts` (blocos "decisão de conflito", "merge por campo entre dois dispositivos") |
| RN09 – valor alvo em centavos | A4, C4 | `validation.ts` (`validarDadosMeta`), `src/features/receitas/money.ts` | `tests/unit/metas.validation.test.ts`, `tests/service/metas.test.ts` |
| RN10 – objetivo de 1 a 80 caracteres | A4, C4 | `validation.ts` (`contarCaracteres`) | `tests/unit/metas.validation.test.ts` ("conta caracteres por code point…"), `tests/db/metas.schema.test.ts` |
| RN11 – falha sem alteração parcial; exclusão mantém lançamentos | A5/A6, C5, D4 | `service.ts` (`transacao`, `excluirMeta`) | `tests/service/metas.test.ts` ("falha de gravação…", "faz exclusão lógica…") |
| RNF03 – isolamento por usuário | EX06 | `firestore.rules`, `src/db/database.ts` (banco por UID) | `tests/rules/firestore.rules.test.ts` (bloco "metas"), `tests/db/metas.proprietario-uc10.test.ts` |
| RNF04 – validação antes da gravação | A4, C4 | `validation.ts`, `MetaForm.tsx` | `tests/unit/metas.validation.test.ts`, `tests/screens/MetaForm.test.tsx` |
| RNF05 – falha não deixa estado parcial | EX02 | `service.ts` (transações exclusivas) | `tests/service/metas.test.ts` ("falha de gravação não deixa estado parcial", "falha de gravação mantém os dados anteriores", "falha de gravação não exclui parcialmente") |
| RNF14 – mensagens de rejeição | EX01 | `validation.ts` (`MSG_META`) | `tests/unit/metas.validation.test.ts`, `tests/screens/MetaForm.test.tsx` |

### 8.2. Fluxos e exceções

| Código | Condição de disparo | Mensagem exibida | Tela / serviço responsável | Teste automatizado | Status |
|---|---|---|---|---|---|
| EX01 | Dados inválidos em A4 ou C4 (objetivo, valor, prazo, tipo, categoria ou acumulado) | Mensagens literais de `MSG_META` (objetivo vazio/longo, valor vazio/inválido/limite, prazo vazio/inválido, tipo, categoria e acumulado) | `src/components/metas/MetaForm.tsx`, `validation.ts` (`validarFormularioMeta`, `validarDadosMeta`) | `tests/unit/metas.validation.test.ts`, `tests/screens/MetaForm.test.tsx` ("bloqueia envio vazio…", "rejeita…"), `tests/screens/NovaMeta.test.tsx`, `tests/screens/EditarMeta.test.tsx` | Implementado/testado |
| EX02 | Falha ao gravar ou recalcular em A5/A6, C5 ou D4 | "Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente."; na exclusão, "Não foi possível excluir. Tente novamente." | `service.ts` (`transacao`, `FalhaPersistenciaMeta`), `src/app/metas/nova.tsx`, `src/app/metas/[id]/editar.tsx`, `src/app/metas/[id]/index.tsx` | `tests/service/metas.test.ts` ("falha de gravação…"), `tests/screens/NovaMeta.test.tsx`, `tests/screens/EditarMeta.test.tsx` | Implementado/testado. O recálculo UC05/UC09 é apenas notificação (`integracoes.ts`), não transação real — integração parcial. |
| EX03 | Falha de rede em A7, C6 ou D5 | Sem texto próprio no UC; a lista mostra o estado pendente de sincronização | `src/features/metas/sync.ts` (`sincronizarMetasPendentes`), `src/app/metas/index.tsx` | `tests/service/metas.sync.test.ts` ("falha de rede mantém a meta pendente e a nova tentativa envia", "envia meta ativa…", "envia tombstone local"), `tests/screens/ListaMetas.test.tsx` ("estado de sincronização") | Implementado/testado |
| EX04 | Conflito de sincronização após A7, C6 ou D5 | Sem texto próprio no UC; ao concluir, a lista reflete o estado convergido | `merge.ts` (`mergeMetaRemota`), `sync.ts` (`aplicarMetaRemota`, `sincronizarMetasPendentes`), `src/app/metas/index.tsx` | `tests/unit/metas.merge.test.ts`, `tests/service/metas.sync.test.ts` (dois dispositivos nas duas ordens, mesmo campo, timestamps iguais, tombstone concorrente) | Implementado/testado no serviço. A atualização visual depende de sincronizar/recarregar a lista; não há teste de tela dedicado ao retorno da sincronização. |
| EX05 | Meta inexistente ou já excluída em B1, C1 ou D1 | "Esta meta não está mais disponível." | `service.ts` (`MetaIndisponivel`), `src/app/metas/[id]/index.tsx`, `src/app/metas/[id]/editar.tsx` | `tests/service/metas.test.ts` ("meta inexistente → MetaIndisponivel"), `tests/screens/DetalheMeta.test.tsx` ("meta inexistente volta…"), `tests/screens/EditarMeta.test.tsx` ("meta inexistente volta…") | Implementado/testado |
| EX06 | Acesso a meta de outro usuário em B1, C1 ou D1 | "Você não tem acesso a esta meta." | `firestore.rules` (nega leitura/escrita por UID), `src/db/database.ts` (banco local separado por UID) | `tests/rules/firestore.rules.test.ts` (bloco "metas: acesso e validação"), `tests/db/metas.proprietario-uc10.test.ts` | **Parcial.** O isolamento e a negação na nuvem existem, mas a mensagem literal no app não está implementada; não há teste de tela para esse texto. |
| EX07 | Falha na leitura local ou no cálculo do progresso (passo 2, B2) | "Não foi possível carregar as metas. Tente novamente." + ação "Tentar novamente" | `service.ts` (`FalhaLeituraMeta`), `useMetas.ts`, `src/app/metas/index.tsx`, `src/app/metas/[id]/index.tsx`, `src/app/metas/[id]/editar.tsx` | `tests/service/metas.test.ts` ("falha de leitura é explícita"), `tests/screens/ListaMetas.test.tsx` ("exibe falha de leitura…"), `tests/screens/DetalheMeta.test.tsx`, `tests/screens/EditarMeta.test.tsx` | Implementado/testado |

Fluxos alternativos cobertos: FA01 (offline/pendente), FA02 ("Nenhuma meta"), FA03 (cancelamento), FA05 (investimento sem alerta), FA06 (restante zero), FA08 (prazo vencido). FA04 e FA07 dependem do recálculo real de UC05/UC09 e permanecem como integração parcial.

### 8.3. RN07 — merge por campo

A estratégia usa três metadados persistidos pela migração **015** (aditiva, depois da 013 e da 014):

- `revisao`: relógio lógico local/remoto, incrementado a cada edição efetiva;
- `campos_revisao`: JSON com a revisão lógica de cada campo alterado;
- `base_sincronizacao`: snapshot JSON da última versão remota aplicada, usado como ancestral do merge de três vias.

O merge (`src/features/metas/merge.ts`, `mergeMetaRemota`) segue esta ordem:

1. **Exclusão lógica tem precedência**: tombstone local ou remoto não é ressuscitado; em tombstone contra tombstone, vence o `excluido_em` mais recente (comparação determinística).
2. **Campos independentes**: `objetivo`, `valor_alvo_centavos`, `prazo`, `inicio`, `categoria_id` e o par `valor_acumulado_centavos` + `valor_acumulado_atualizado_em` são resolvidos separadamente contra a base.
3. **Alteração efetiva**: se só um lado mudou em relação à base, ele vence; se nenhum mudou, mantém o local.
4. **Mesmo campo**: vence a maior revisão lógica do campo. Em empate, documentos legados sem metadados usam `atualizado_em` apenas como fallback; persistindo o empate, uma comparação canônica do valor garante a mesma escolha nas duas ordens de sincronização. Relógios de aparelhos não são autoridade global.
5. **Registro inválido não é combinado**: `tipo` e `criado_em` são imutáveis; `inicio` é ajustado para não ultrapassar o prazo; categoria só existe em gasto e acumulado só em investimento; valor e data do acumulado permanecem juntos.
6. **Legado**: sem `base_sincronizacao` confiável, mantém-se o fallback por registro; a primeira sincronização grava a base para permitir o merge por campo nas rodadas seguintes. Documentos remotos sem os campos novos são normalizados sem apagar valores locais conhecidos.

Testes de convergência em `tests/service/metas.sync.test.ts`: dois bancos/dispositivos partindo da mesma versão, A e B alterando campos diferentes, com A sincronizando primeiro e depois com B; o mesmo campo em conflito; tombstone concorrente; timestamps iguais; edição durante a aplicação remota; ACK de versão ultrapassada; documento legado; falha de rede e nova tentativa. Testes puros complementares em `tests/unit/metas.merge.test.ts`. Migração e rollback em `tests/db/metas.migrations.test.ts`.

### 8.4. Valor acumulado inicial

| Entrada na criação | Coluna `valor_acumulado_centavos` | Data do informe | Evidência |
|---|---|---|---|
| Omitida | `NULL` | `NULL` | `tests/service/metas.test.ts` ("cria investimento com início explícito e campos de acumulado nulos"), `tests/screens/MetaForm.test.tsx` ("investimento sem valor acumulado envia nulo, não zero") |
| Zero explícito | `0` | data da criação | `tests/service/metas.test.ts` ("aceita investimento com valor zero e registra a data do informe"), `tests/screens/MetaForm.test.tsx` ("permite escolher investimento com valor acumulado zero") |
| Positivo | valor informado | data da criação/edição | `tests/service/metas.test.ts` ("atualiza valor acumulado para zero, aumenta e reduz"), `tests/db/metas.schema.test.ts` |

“Nulo quando omitido” descreve apenas a ausência de informe; zero explícito é um valor real e não é convertido em `NULL`.

### 8.5. Resultados de validação

| Data | Escopo | Comando | Resultado |
|---|---|---|---|
| 2026-11-25 | Suíte completa | `npm test -- --ci --runInBand` | 113 de 113 suítes, 1.885 de 1.885 testes |
| 2026-11-25 | RN07, concorrência e dois dispositivos | `npx jest tests/unit/metas.merge.test.ts tests/service/metas.sync.test.ts --runInBand` | 56 de 56 testes |
| 2026-11-25 | Migrações 008–011 e schema | `npx jest tests/db/metas.migrations.test.ts tests/db/metas.schema.test.ts tests/db/migrations.test.ts --runInBand` | 132 de 132 testes |
| 2026-11-25 | Tipos e lint | `npm run typecheck`, `npm run lint` | Sem erros |
| 2026-11-25 | Rules | `npm run test:rules` | **Não executado neste ambiente**: `firebase` não está instalado e não há Java para o emulador. Pendente de execução no CI/ambiente com Firebase CLI. |

### 8.6. Pendências

- **EX06**: falta a mensagem literal no app e um caminho de tela que a exiba; o isolamento por UID e as Rules já negam o acesso.
- **UC05/UC09**: `notificarAlteracaoMeta` avisa consumidores, mas não há recálculo transacional real de indicadores/alertas. Não declarar integração concluída.
- **UC13**: fora do escopo.
- **RN07 global**: a solução desta UC usa relógio lógico e base por registro; um contrato compartilhado para todas as UCs ainda depende de decisão da equipe.
- **Rules**: precisam ser executadas no emulador/CI antes de publicar o PR.

## UC16 — Sincronizar dados

### Comandos de teste

Na raiz do repositório:

```sh
cd mobile
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand --coverage
npm run test:rules
```

Use o Firebase de desenvolvimento ou o Emulator Suite com as regras desta branch. A versão que grava a exclusão lógica de receita requer as regras novas. Exclusões físicas feitas por versões antigas não deixam um marcador que outro aparelho possa receber.

### Contrato e rastreabilidade

| Item | Implementação |
| --- | --- |
| Estado e fila | `features/sincronizacao/contrato.ts`, `service.ts` e `fila.ts`. A consulta SQLite inclui receitas, despesas, categorias, recorrências, alertas e exclusões lógicas. Contagem e lista vêm da mesma consulta. |
| Envio, repetição e retomada | `features/receitas/sync.ts` usa o SDK do Firestore e IDs estáveis. A confirmação remota precede a baixa da pendência. O envio manual aguarda o envio em curso. Login, reconexão e retorno ao primeiro plano acionam um ciclo automático. |
| Sessão e acesso local | O ciclo exige UID e e-mail confirmado. A consulta local permanece disponível sem sessão. A última conclusão é registrada por conta no aparelho. |
| Combinação e restauração | O ciclo lê os snapshots do servidor, reaproveita o tratamento de categorias e importa séries, lançamentos e alertas em transação SQLite. Edições mais recentes são aplicadas aos registros ativos. Marcadores de exclusão prevalecem sobre edições. Ao concluir, a atualização da base aciona o recálculo do resumo e a releitura das listas. |
| RF59, RNF20 e RNF38 | A tela `Sincronização` fica no resumo financeiro, usa a paleta do app e apresenta a fila em uma coluna rolável. Receitas e despesas usam rótulos de estado em texto. As larguras de 320 e 430 dp fazem parte da validação em aparelho. |
| RNF03 e RNF04 | `firestore.rules` e `tests/rules/firestore.rules.test.ts` verificam acesso por UID, campos obrigatórios e a proteção de marcadores de exclusão. |

A data da tela representa o último ciclo UC16 que concluiu o envio e a leitura do servidor com a fila resolvida. O SQLite mantém os estados de envio `pendente` e `sincronizado`. O estado geral informa também falta de conexão e erros.

#### Códigos do UC16

| Código | Condição |
| --- | --- |
| EX01 | Sem conexão ao sincronizar |
| EX02 | Sessão inválida ou expirada |
| EX03 | Falha no envio ou na conclusão do ciclo |
| EX04 | Registro recusado pelas regras do servidor |
| EX05 | Envio interrompido, com reenvio na próxima tentativa |
| EX06 | Conflito entre alterações locais e remotas |
| EX07 | Falha na leitura local do estado ou da fila |
| EX08 | Acesso rejeitado ou mudança de conta durante a operação |

A fila diferencia criação, edição e exclusão lógica. A recusa é associada à versão do item e persistida localmente por conta. O botão de retry inicia um novo ciclo da fila. Alterações feitas durante o envio continuam pendentes para o próximo ciclo.

A combinação por campo com ordem lógica (RN07/EX06) fica como integração posterior, a alinhar com o time. A versão atual mantém a escolha por registro via `atualizado_em` e a precedência da exclusão.

Registre as evidências de reconexão, restauração e conferência em 320 e 430 dp conforme o [roteiro do UC16](MANUAL.md#uc16--sincronizar-dados).

### Integrações pendentes

A branch inclui a restauração do saldo inicial do UC08. A sincronização recalcula os totais disponíveis no Resumo e restaura os alertas de saldo. A integração com o recálculo de metas, pontos e selos permanece pendente.
