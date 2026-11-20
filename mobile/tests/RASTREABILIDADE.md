# Rastreabilidade dos casos de uso

Cadeia: **requisito → caso de uso (fluxo) → código → teste → resultado.**
Os caminhos são relativos a `mobile/`. As siglas de requisitos vêm dos comentários do código
(`src/**`) e do `tests/MANUAL.md`; os textos completos estão em `engenharia_de_requisitos`.

As seções 1–3 registram o **UC01 — Gerenciar receitas**; a seção 4 registra o **UC06 — Gerenciar categorias**.

## 1. Regras de negócio e requisitos não funcionais

| Requisito | Fluxo do UC01 | Código | Teste automatizado | Teste manual |
|---|---|---|---|---|
| RN06 – base local | todos | `src/db/schema.ts`, `src/db/database.ts` | `tests/service/*` (SQLite em memória, `helpers/fakeDb.ts`) | 3.2 |
| RN07 – exclusão e conflito na nuvem (RN07) | D, sincronização | `src/features/receitas/service.ts` (`excluirReceita`), `src/features/receitas/sync.ts` | `tests/service/sync.test.ts`, `tests/service/serie.test.ts` | 3.2 |
| RN08 – data, título e valor obrigatórios | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/screens/ReceitaForm.test.tsx` | 3.3 |
| RN09 – valor | A, C | `src/features/receitas/validation.ts`, `src/features/receitas/money.ts` | `tests/unit/validation.test.ts`, `tests/unit/money.test.ts`, `tests/screens/ReceitaForm.test.tsx` | 3.3 |
| RN10 – título e descrição | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/screens/ReceitaForm.test.tsx` | 3.3 |
| RN11 – operação composta em uma transação | A, C, D | `src/features/receitas/service.ts` (`transacao`) | `tests/service/atomicidade.test.ts` | 3.1 |
| RN12 – listagem por período, mais recente primeiro, sem excluídas | B | `src/features/receitas/service.ts` (`listarReceitas`), `src/features/receitas/useReceitas.ts` | `tests/service/consulta.test.ts`, `tests/screens/ListaReceitas.test.tsx`, `tests/screens/FiltroReceitas.test.tsx`, `tests/screens/FiltroReceitas.extras.test.tsx` | – |
| RN19 – recorrência válida | A, C | `src/features/receitas/validation.ts` | `tests/unit/validation.test.ts`, `tests/service/recorrencia.test.ts`, `tests/screens/ReceitaForm.test.tsx` | – |
| RN20 – editar qualquer campo | C | `src/features/receitas/service.ts` (`editarReceita`), `src/app/receitas/[id]/editar.tsx` | `tests/service/editar.test.ts`, `tests/service/serie.test.ts`, `tests/service/edicaoSerie.extras.test.ts`, `tests/screens/EditarReceita.test.tsx` | – |
| RNF03 – Security Rules | sincronização | `firestore.rules` | `tests/rules/firestore.rules.test.ts` (`npm run test:rules`) | – |
| RNF05 – atomicidade | A, C, D | `src/features/receitas/service.ts` | `tests/service/atomicidade.test.ts` | – |
| RNF14 – usuário identifica o motivo do erro | A | `src/components/receitas/ReceitaForm.tsx`, `src/features/receitas/validation.ts` | `tests/screens/ReceitaForm.test.tsx` (mensagens) | 3.3 |
| RNF26 – sem duplicidade na geração de séries | A, abertura do app | `src/features/receitas/service.ts` (`completarRecorrencias`), `src/app/_layout.tsx` | `tests/service/recorrencia.test.ts`, `tests/screens/Layout.test.tsx`, `tests/service/sync.test.ts` | – |
| RNF27 – registro em até 3 etapas | A | `src/app/receitas/nova.tsx`, `src/components/receitas/ReceitaForm.tsx` | `tests/screens/NovaReceita.test.tsx` | 3.4 |
| RNF34 – base local principal | todos | `src/db/database.ts` | `tests/setup.ts`, `tests/helpers/fakeDb.ts` | – |
| RNF35 — Persistir localmente com durabilidade | A | `src/features/receitas/service.ts`, `src/app/receitas/nova.tsx` | `tests/service/atomicidade.test.ts` (simulado) | 3.1 |

## 2. Fluxos e exceções do caso de uso

| Fluxo / exceção | Código | Teste automatizado | Teste manual |
|---|---|---|---|
| A – registrar receita | `src/app/receitas/nova.tsx`, `src/components/receitas/ReceitaForm.tsx`, `service.ts` (`registrarReceita`) | `tests/screens/NovaReceita.test.tsx`, `tests/screens/ReceitaForm.test.tsx`, `tests/service/registrar.test.ts` | 3.1, 3.4 |
| B – consultar e filtrar | `src/app/receitas/index.tsx`, `src/components/receitas/FiltroReceitas.tsx`, `src/components/receitas/ReceitaItem.tsx` | `tests/screens/ListaReceitas.test.tsx`, `tests/screens/ListaReceitas.sincronizacao.test.tsx`, `tests/screens/FiltroReceitas*.test.tsx`, `tests/screens/ReceitaItem.test.tsx` | – |
| B3 – detalhe | `src/app/receitas/[id]/index.tsx` | `tests/screens/DetalheReceita.test.tsx`, `tests/screens/Voltar.test.tsx` | – |
| C – editar | `src/app/receitas/[id]/editar.tsx` | `tests/screens/EditarReceita.test.tsx`, `tests/screens/Voltar.test.tsx` | – |
| D – excluir | `src/components/receitas/useExclusao.tsx`, `src/components/receitas/OpcoesModal.tsx` | `tests/screens/DetalheReceita.test.tsx`, `tests/screens/useExclusao.test.tsx` | – |
| FA08 – alcance em série (esta / próximas / todas) | `src/components/receitas/useExclusao.tsx`, `src/app/receitas/[id]/editar.tsx`, `service.ts` | `tests/service/serie.test.ts`, `tests/service/edicaoSerie.extras.test.ts`, `tests/screens/EditarReceita.test.tsx`, `tests/screens/DetalheReceita.test.tsx` | – |
| EX01 – dados inválidos | `src/features/receitas/validation.ts`, `src/components/receitas/ReceitaForm.tsx` | `tests/unit/validation.test.ts`, `tests/screens/ReceitaForm.test.tsx`, `tests/screens/NovaReceita.test.tsx` | 3.3 |
| EX02 – período invertido | `src/components/receitas/FiltroReceitas.tsx` | `tests/screens/FiltroReceitas.test.tsx` | – |
| EX03 – falha ao gravar | `nova.tsx`, `[id]/editar.tsx`, `useExclusao.tsx`, `service.ts` | `tests/screens/NovaReceita.test.tsx`, `tests/screens/EditarReceita.test.tsx`, `tests/screens/DetalheReceita.test.tsx`, `tests/service/atomicidade.test.ts` | 3.1 |
| EX04 – sem conexão | `src/features/receitas/sync.ts`, `src/app/receitas/nova.tsx` | `tests/service/sync.test.ts` | 3.2 |
| EX05 – atualização vinda da nuvem | `src/features/receitas/sync.ts`, `src/app/receitas/index.tsx` | `tests/service/sync.test.ts`, `tests/screens/ListaReceitas.sincronizacao.test.tsx` | 3.2 |
| EX06 – receita já excluída | `service.ts`, `[id]/index.tsx`, `[id]/editar.tsx`, `useExclusao.tsx` | `tests/service/editar.test.ts`, `tests/screens/DetalheReceita.test.tsx`, `tests/screens/EditarReceita.test.tsx` | – |
| EX07 – acesso negado | `src/features/receitas/sync.ts` (`consumirAcessoNegado`), `src/app/receitas/index.tsx`, `validation.ts` (`MSG.acessoNegado`) | `tests/service/sync.test.ts`, `tests/screens/ListaReceitas.test.tsx` | – |
| EX08 – falha de leitura local | `service.ts`, `src/features/receitas/useReceitas.ts`, `[id]/index.tsx`, `[id]/editar.tsx` | `tests/service/leitura.test.ts`, `tests/screens/ListaReceitas.test.tsx`, `tests/screens/DetalheReceita.test.tsx`, `tests/screens/EditarReceita.test.tsx` | – |
| Restauração da nuvem | `src/features/receitas/sync.ts` (`restaurarDaNuvem`) | `tests/service/sync.test.ts` | 3.2 (passo 5) |

A tela de login/cadastro, que chamaria `restaurarDaNuvem()` e faria a pergunta sobre enviar os dados locais,
ainda não existe no código.

## 3. Resultados de validação

### 3.1 Automatizados (`npm test -- --coverage`)

| Data | Suítes | Testes | Statements | Branches | Funções | Linhas | Responsável |
|---|---|---|---|---|---|---|---|
| 2026-11-13 (antes dos testes de cobertura final) | 19 de 19 | 255 de 255 | 96,72% | 91,87% | 96,42% | 98,32% | |
| | | | | | | | |

Escopo da cobertura: `src/**/*.{ts,tsx}`, exceto `src/lib/firebase.ts`, `src/db/database.ts`,
`src/features/receitas/types.ts` (só tipos) e `src/app/index.tsx` (tela inicial sem regra de negócio).
Métricas: statements, branches, funções e linhas.

### 3.2 Security Rules (`npm run test:rules`)

| Data | Suítes | Testes | Resultado | Responsável |
|---|---|---|---|---|
| | | | | |

### 3.3 Manuais (`tests/MANUAL.md`, seção 3)

| Roteiro | Data | Aparelho / versão | Executado por | Resultado | Observações |
|---|---|---|---|---|---|
| 3.1 Encerramento forçado (RNF35) | | | | | |
| 3.2 Offline, reinício e nuvem | | | | | |
| 3.3 RNF14 (4 de 5 identificam o erro) | | | | | |
| 3.4 RNF27 (registro em até 3 etapas) | | | | | |

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
| RN14 — limites por valor/percentual | B, C | `validation.ts`, `limites.ts`, `formato.ts`, `CategoriaForm.tsx`, `[id]/editar.tsx`, `src/db/schema.ts`, `categorias/sync.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/categorias.sync.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx`, `tests/db/schema.test.ts`, `tests/db/migrations.test.ts` | Faixa definitiva 1%–100% testada em formulário/domínio/serviço/SQLite/Firestore; recálculo UC05/UC09 pendente |
| RNF03 — isolamento por usuário | EX09, sincronização | `firestore.rules` | `tests/rules/firestore.rules.test.ts` | Isolamento por UID testado nas Rules de categorias |
| RNF04 — validação local | B, C | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado |
| RNF05 — evitar estado parcial | B, C, D | `service.ts` (`transacao`) | `tests/service/categorias.test.ts` (falha em criar/editar/excluir) | Testado no escopo local |
| RNF07 — precisão monetária | B, C | `money.ts`, `validation.ts`, `schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/db/schema.test.ts` | Testado com centavos/centésimos inteiros |
| RNF14 — mensagens de rejeição | B, C, EX01–EX07 | `validation.ts` (`MSG_CAT`), `CategoriaForm.tsx` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Testado nos fluxos implementados |
| RNF35 — Persistir localmente com durabilidade | todos | `schema.ts`, `service.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts` | SQLite testado; smoke anterior antes de `2445ee8`; diagnóstico manual v3 relatado pelo usuário (capturas pendentes); persistência após encerramento completo pendente |
| RNF36 — convergência da sincronização | sincronização | `categorias/sync.ts`, `receitas/sync.ts`, `db/restauracaoPendente.ts`, `firestore.rules` | `tests/service/sync.test.ts`, `tests/service/categorias.sync.test.ts`, `tests/unit/categorias.sync.test.ts`, `tests/rules/firestore.rules.test.ts` | Sincronização, aliases, conflitos, pendências e tombstones testados |

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
| FA04 — categoria sem limite | `CategoriaForm.tsx`, `EditarCategoria.test.tsx`, `service.ts` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts` | Local testado; recálculo pendente UC05/UC09 |
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
| 20/11/2026 | `npm test -- --ci --coverage --runInBand` | 67 | 1.241 | **1.241 aprovados**; cobertura 95,23% statements, 89,73% branches, 98% functions, 96,93% lines |
| 20/11/2026 | `npm run test:rules` | 1 | 70 | **70 aprovados** no Firestore Emulator |
| 20/11/2026 | `npx expo export --platform android` | — | — | **Export Android concluído** (bundle Hermes) |

- **CI — execução 31:** PR #58, `feat(uc06): gerenciar categorias (listagem, cadastro, edição e exclusão)`, commit `2445ee8` (código) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44390887769
- **CI — execução 32:** PR #58, commit `aa84979` (documentação) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44418286085
- **Manual:** o smoke anterior foi executado antes do commit `2445ee8`. O diagnóstico manual da migração 003 no Android foi **relatado pelo usuário como bem-sucedido**: `unicash.db`, `user_version = 3`, os dois triggers e as três categorias preservadas (`Normal` 5000, `Legado` 20000000, `Excluir` 10000, ativas). As capturas serão anexadas posteriormente e ainda não foram revisadas; o instante exato da migração não foi observado. O full reload carregou o bundle v3, mas o encerramento completo do Expo Go, os testes funcionais posteriores (editar `Normal` 50→80, excluir `Excluir`, rejeitar 100,01%, corrigir/renomear o legado) e a persistência final após reabrir **seguem pendentes**.
- **Security Rules:** não aplicável à UC06 nesta entrega; `npm run test:rules` cobre a UC01.

### 4.5. Pendências de integração

- **UC05/UC09:** recálculo de indicadores e alertas após criar/editar/excluir categoria. A UC06 deixa o estado consistente no SQLite (`categorias`, limites, tombstones) e a UC02 mantém as `despesas`; a interface prevista é a leitura dessas tabelas por período após cada operação (contrato em 4.10). Não há evento de domínio nem chamada direta implementada nesta etapa; o cálculo continua sob responsabilidade dessas UCs.
- **UC10:** a restauração no startup aguarda `authStateReady` e usa `auth.currentUser`, mas o app ainda não possui tela de login própria. Sem sessão, a operação permanece offline-first.
- **Validação nativa:** a migração 007 e a desvinculação transacional foram validadas em SQLite/better-sqlite3 e no emulador, mas não há `adb`, Android SDK, emulador ou dispositivo para um smoke nativo nesta máquina.
- **Semeadura:** conflitos são reportados uma vez por instância e a semeadura não é repetida a cada foco. Após excluir uma categoria própria com nome reservado, um sinal único faz a lista tentar a semeadura no próximo foco; não há conversão automática da categoria própria. Se a tentativa posterior falhar, a exclusão já confirmada permanece e o erro é exibido como falha de preparação das padrão, não como falha da exclusão.

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
