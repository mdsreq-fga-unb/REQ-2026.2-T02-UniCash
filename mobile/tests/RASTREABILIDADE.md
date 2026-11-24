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
| RN06 — base local/offline | todos, FA01 | `src/db/schema.ts`, `src/db/database.ts`, `src/features/categorias/service.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts` | Local testado; envio à nuvem pendente |
| RN07 — conflito/tombstone | D, EX08 | `service.ts` (`excluirCategoria`), `types.ts` | `tests/service/categorias.test.ts` (“exclui própria com tombstone…”) | Tombstone testado; conflito de sincronização pendente |
| RN09 — valor monetário | B, C, EX03 | `validation.ts`, `src/features/receitas/money.ts`, `src/db/schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/db/schema.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado: 1 centavo, zero, teto e inteiros |
| RN11 — exclusão/atomicidade | C, D, EX04 | `service.ts` (`transacao`, `excluirCategoria`), `[id]/editar.tsx` | `tests/service/categorias.test.ts` (falha em criar/editar/excluir), `tests/screens/EditarCategoria.test.tsx` | Operação local testada; recálculo pendente |
| RN13 — nome, unicidade e padrões | A, B, C, D | `validation.ts`, `service.ts`, `src/db/schema.ts`, `useCategorias.ts` | `tests/service/categorias.test.ts`, `tests/db/schema.test.ts`, `tests/unit/validation-categorias.test.ts`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx` | Testado (30/31 caracteres, Unicode/emoji, duplicidade, padrões, tombstone); conflito isolado reportado |
| RN14 — limites por valor/percentual | B, C | `validation.ts`, `formato.ts`, `CategoriaForm.tsx`, `[id]/editar.tsx`, `src/db/schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx`, `tests/db/schema.test.ts`, `tests/db/migrations.test.ts` | Faixa provisória 0,01%–100% testada em formulário/domínio/serviço/SQLite; homologação da cliente e recálculo pendentes |
| RNF03 — isolamento por usuário | EX09, sincronização | Sem regras de categorias no Firestore | `tests/rules/firestore.rules.test.ts` cobre apenas UC01 | **Não aplicável nesta entrega**; pendente com Firebase |
| RNF04 — validação local | B, C | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado |
| RNF05 — evitar estado parcial | B, C, D | `service.ts` (`transacao`) | `tests/service/categorias.test.ts` (falha em criar/editar/excluir) | Testado no escopo local |
| RNF07 — precisão monetária | B, C | `money.ts`, `validation.ts`, `schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/db/schema.test.ts` | Testado com centavos/centésimos inteiros |
| RNF14 — mensagens de rejeição | B, C, EX01–EX07 | `validation.ts` (`MSG_CAT`), `CategoriaForm.tsx` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Testado nos fluxos implementados |
| RNF35 — Persistir localmente com durabilidade | todos | `schema.ts`, `service.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts` | SQLite testado; smoke anterior antes de `2445ee8`; diagnóstico manual v3 relatado pelo usuário (capturas pendentes); testes funcionais e persistência após encerramento completo pendentes |
| RNF36 — convergência da sincronização | sincronização | Sem sincronização de categorias | — | **Pendente**; `sync_status` preparado, sem Firebase |

### 4.2. Fluxos e exceções

| Fluxo / exceção | Código | Teste automatizado | Situação |
|---|---|---|---|
| Semeadura inicial (pré-condição RN13) | `service.ts` (`semearCategoriasPadrao`), `useCategorias.ts`, `semeaduraPendente.ts`, `index.tsx` | `tests/service/categorias.test.ts` (vazia, repetida, conflito, rollback, exclusão+recriação), `tests/unit/useCategorias.test.ts`, `tests/unit/semeaduraPendente.test.ts`, `tests/screens/ListaCategorias.test.tsx` | Cria as ausentes; conflito isolado não bloqueia; própria preservada; conflito reportado; após excluir reservado, reavalia uma vez no próximo foco |
| A — listar/consultar categorias | `src/app/categorias/index.tsx`, `useCategorias.ts`, `service.ts` (`listarCategorias`) | `tests/screens/ListaCategorias.test.tsx`, `tests/unit/useCategorias.test.ts`, `tests/service/categorias.test.ts` | Implementado/testado |
| A (passo 2) — abrir lançamentos da categoria | `src/app/categorias/index.tsx` (abre edição) | — | **Pendente UC02** (atalho de despesas) |
| B — criar categoria | `src/app/categorias/nova.tsx`, `CategoriaForm.tsx`, `service.ts` (`criarCategoria`) | `tests/screens/NovaCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado |
| C — editar categoria | `src/app/categorias/[id]/editar.tsx`, `CategoriaForm.tsx`, `service.ts` (`editarCategoria`) | `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado |
| D — excluir categoria própria | `src/app/categorias/[id]/editar.tsx`, `service.ts` (`excluirCategoria`) | `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado (local) |
| FA01 — operação offline | `service.ts`, `schema.ts` | `tests/service/categorias.test.ts` (grava `sync_status='pendente'`) | Local testado; sincronização pendente |
| FA02 — categoria sem lançamentos | `src/app/categorias/index.tsx` | — | **Pendente UC02** |
| FA03 — exclusão com lançamentos | `service.ts` (TODO UC02) | — | **Pendente UC02**; não afirma desvinculação |
| FA04 — categoria sem limite | `CategoriaForm.tsx`, `EditarCategoria.test.tsx`, `service.ts` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts` | Local testado; o UC09 trata o estado sem limite na lista de categorias (ver `mobile/docs/UC09-DoD.md`); integração do UC05 pendente |
| FA05 — cancelar edição/exclusão | `NovaCategoria.tsx`, `EditarCategoria.tsx`, `CategoriaForm.tsx` | `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX01 — nome duplicado | `service.ts` (`NomeDuplicado`), `validation.ts` | `tests/service/categorias.test.ts`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |
| EX02 — categoria padrão protegida | `service.ts` (`CategoriaPadraoProtegida`), `EditarCategoria.tsx` | `tests/service/categorias.test.ts`, `tests/screens/EditarCategoria.test.tsx`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX03 — limite inválido | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Implementado/testado |
| EX04 — falha na gravação/recálculo | `service.ts` (`transacao`), telas | `tests/service/categorias.test.ts` (falha em criar/editar/excluir), `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Gravação testada; recálculo pendente |
| EX05 — falha de sincronização | Sem sincronização de categorias | — | **Pendente Firebase** |
| EX06 — categoria inexistente/excluída | `service.ts`, `EditarCategoria.tsx` | `tests/service/categorias.test.ts`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |
| EX07 — nome inválido | `validation.ts`, `CategoriaForm.tsx`, `service.ts` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx`, `tests/service/categorias.test.ts` | Implementado/testado |
| EX08 — conflito de sincronização | Sem sincronização de categorias | — | **Pendente Firebase/RN07** |
| EX09 — dados de outro usuário | Sem Security Rules de categorias | — | **Pendente Firebase/RNF03** |
| EX10 — falha de leitura local | `service.ts`, `useCategorias.ts`, `ListaCategorias`, `EditarCategoria` | `tests/service/categorias.test.ts`, `tests/screens/ListaCategorias.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Implementado/testado |

### 4.3. Localização das evidências do DoD

As evidências do DoD Nível 1 são preenchidas e acompanhadas na **issue #43** — https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/43. Este arquivo mantém a matriz de rastreabilidade das seções 4.1 e 4.2 e os resultados de execução da seção 4.4.

### 4.4. Resultados

| Data | Comando | Suítes | Testes | Resultado |
|---|---|---|---|---|
| 18/11/2026 | `npm test -- --ci --coverage` | 44 | 619 | **619 aprovados** |

- **CI — execução 31:** PR #58, `feat(uc06): gerenciar categorias (listagem, cadastro, edição e exclusão)`, commit `2445ee8` (código) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44390887769
- **CI — execução 32:** PR #58, commit `aa84979` (documentação) — 2/2 checks aprovados: https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44418286085
- **Manual:** o smoke anterior foi executado antes do commit `2445ee8`. O diagnóstico manual da migração 003 no Android foi **relatado pelo usuário como bem-sucedido**: `unicash.db`, `user_version = 3`, os dois triggers e as três categorias preservadas (`Normal` 5000, `Legado` 20000000, `Excluir` 10000, ativas). As capturas serão anexadas posteriormente e ainda não foram revisadas; o instante exato da migração não foi observado. O full reload carregou o bundle v3, mas o encerramento completo do Expo Go, os testes funcionais posteriores (editar `Normal` 50→80, excluir `Excluir`, rejeitar 100,01%, corrigir/renomear o legado) e a persistência final após reabrir **seguem pendentes**.
- **Security Rules:** não aplicável à UC06 nesta entrega; `npm run test:rules` cobre a UC01.

### 4.5. Pendências de integração

- **UC02:** despesas, contagem/atalho de lançamentos, exclusão com desvinculação de `despesas.categoria_id` e `recorrencias.categoria_id` (migração **004**, após a 003 da faixa percentual; ver 4.9).
- **UC05/UC09:** recálculo de indicadores e alertas após criar/editar/excluir categoria.
- **Firebase:** sincronização de categorias, conflito RN07 (EX08), isolamento por usuário (EX09/RNF03) e Security Rules/test:rules.
- **Cliente:** homologação da faixa percentual provisória 0,01%–100%; contradição RF66 × RN13 sobre limite de categoria padrão.
- **Revisão:** diagnóstico manual v3 relatado pelo usuário; anexar as capturas e revisá-las. Executar os testes funcionais posteriores (editar `Normal` 50→80, excluir `Excluir`, rejeitar 100,01%, corrigir/renomear o legado) e confirmar a persistência após encerramento completo do Expo Go. Tratar os demais apontamentos da revisão do PR #58.
- **Semeadura:** conflitos são reportados uma vez por instância e a semeadura não é repetida a cada foco. Após excluir uma categoria própria com nome reservado, um sinal único faz a lista tentar a semeadura no próximo foco; não há conversão automática da categoria própria. Se a tentativa posterior falhar, a exclusão já confirmada permanece e o erro é exibido como falha de preparação das padrão, não como falha da exclusão.

### 4.6. Limite percentual — faixa provisória 0,01%–100%

**Política provisória:** formulário, domínio, serviço e SQLite aceitam percentuais de **0,01% a 100,00%** (1 a 10.000 centésimos), com até duas casas. A mensagem literal é **“O percentual deve ser maior que 0% e até 100%.”** O teto de 100% é **provisório e pendente de homologação da cliente**; 100,01%, 101% e 200000% são rejeitados. A RN09 permanece inalterada: o limite monetário continua de R$ 0,01 a R$ 999.999.999,99.

**Limite técnico preservado:** o CHECK da migração 002 continua exigindo inteiro seguro em centésimos até `Number.MAX_SAFE_INTEGER` (90071992547409,91%). A conversão e a formatação seguem em BigInt, sem float nem arredondamento.

**Migração 003 (aditiva):** cria os triggers `trg_categorias_percentual_insert` e `trg_categorias_percentual_update`, que rejeitam INSERT/UPDATE de limite percentual inteiro acima de 10.000 centésimos. Nenhuma tabela é reconstruída e nenhum dado é apagado, reduzido, convertido ou alterado. Bancos novos, v1 e v2 terminam na versão 3; a versão é gravada na mesma transação dos triggers. Um trigger preexistente com o mesmo nome e definição divergente aborta a migração sem alterar dados, trigger ou versão.

**Dados legados acima de 100%:** permanecem armazenados e visíveis. Novas escritas/edições de limite fora da faixa são rejeitadas; atualizações de `excluido_em`/`sync_status` não são bloqueadas. O usuário pode reduzir o limite para até 100%, removê-lo ou excluir a categoria própria. Para **renomear** uma categoria própria com limite legado acima de 100%, é necessário primeiro reduzir o limite para até 100% ou removê-lo; a edição regrava as colunas de limite e a validação/trigger rejeitam o valor fora da faixa. O valor legado não é alterado automaticamente. Não há cap automático nem migração destrutiva; esses registros não impedem a abertura do aplicativo.

**Testes:** `tests/unit/validation-categorias.test.ts` cobre a tabela vazio/0%/0,001%/0,01%/50%/99,99%/100%/100,00%/100,01%/101%/200000%, o domínio e a mensagem literal; `tests/db/schema.test.ts` cobre INSERT/UPDATE do trigger (9.999, 10.000, 10.001, 20.000.000 e `MAX_SAFE_INTEGER`); `tests/service/categorias.test.ts` confirma a rejeição de 10.001 e a persistência de 10.000; `tests/screens/CategoriaForm.test.tsx` cobre a rejeição de 100,01% e a orientação da faixa; `tests/unit/formato-categorias.test.ts` mantém a formatação de valores legados; `tests/db/migrations.test.ts` cobre instalação nova v3, v1→v3, v2→v3, v2 com 200000% preservado, trigger divergente e rollback.

### 4.7. Contagem de caracteres (RN13)

`contarCaracteres` usa `Array.from(texto).length`, que conta **code points** e tem a mesma semântica de `length()` do SQLite. O `.length` anterior do JavaScript contava unidades UTF-16 e rejeitava emojis antes do limite de 30. O limite de negócio permanece **30 caracteres**.

- Cobertura: nome comum 30/31, acentos 30/31, emoji 30/31 no domínio, schema, serviço e formulário.
- Limitação documentada: sequências ZWJ/combining são contadas por code point, não por *grapheme cluster*; é o comportamento consistente com o SQLite atual.

### 4.8. Proteção das categorias padrão

- **Serviço:** `editarCategoria` rejeita renomear padrão e permite apenas alterar o limite; `excluirCategoria` rejeita exclusão de padrão.
- **Interface:** o formulário de padrão deixa o nome não editável, esconde a exclusão e explica a regra; a tela de edição só oferece exclusão para categoria própria.
- **SQLite:** há `CHECK` de `padrao IN (0,1)` e índice único de nome ativo, mas **não há trigger/CHECK** que impeça UPDATE/DELETE direto, renomear uma padrão ou alterar `padrao`. Escrita direta/importação pode furar a proteção; o serviço e a UI são a defesa atual.
- **Firebase futuro (não implementado):** as Security Rules deverão (a) limitar ao próprio `uid`; (b) impedir criar/alterar `padrao` para verdadeiro; (c) em categoria padrão, permitir somente campos de limite, mantendo nome, `nome_normalizado`, `padrao` e `excluido_em` imutáveis; (d) impedir tombstone/exclusão de padrão; (e) validar nome de 1 a 30 code points e limites coerentes, incluindo o teto técnico. Unicidade por usuário não é verificável apenas por Rules; exigirá chave determinística ou validação transacional no cliente.
- **Estado:** categorias ainda não sincronizam; não há `test:rules` de categorias nem evidência de isolamento Firebase.

### 4.9. Integração UC02, migração 004 e proposta de issue

Não existe issue dedicada para a desvinculação `despesas.categoria_id`/`recorrencias.categoria_id` na exclusão de categoria. A issue #29 e o PR #55 tratam da UC02, mas não desse fluxo; a issue #43 registra a pendência do UC06.

**Proposta de issue técnica (não publicada):**
- **Título:** UC02/UC06 — integrar despesas e recorrências às categorias (migração 004 e desvinculação na exclusão).
- **Escopo:** criar migração **004** para `despesas` e novas colunas de `recorrencias` (`tipo`, `categoria_id`, `fixa_ou_variavel`, `essencial`), atualizar `ESTRUTURAS_ESPERADAS`/DDL e preservar dados; na exclusão de categoria, na mesma transação, definir `categoria_id = NULL` em `despesas` e `recorrencias` ativas, mantendo os lançamentos e recalculando limites/alertas quando UC05/UC09 existirem; cobrir restauração de despesa com categoria excluída.
- **Testes:** migração v3→v4 com dados e rollback; exclusão com despesas e séries; despesa mantida como “Sem categoria”; atomicidade; banco novo; nenhuma duplicação.
- **Dependências:** UC06 (PR #58), UC02 (issue #29/PR #55), UC05/UC09 e Firebase.

**Risco de colisão de migração:** a versão **003** agora pertence ao UC06 (faixa percentual provisória por triggers). A integração UC02 deve usar **004** e incrementar `VERSAO_ESQUEMA` para 4. A branch UC02/PR #55 ainda não tem `migrations.ts`; usa alteração não versionada em `database.ts`. Se a UC02 for integrada antes, `prepararInstalacaoNova` pode rejeitar `recorrencias` com colunas extras, pois `ESTRUTURAS_ESPERADAS` exige a estrutura canônica. A ordem recomendada é integrar o UC06 primeiro e rebasear a UC02 sobre a migração 004. Se a UC02 reconstruir `categorias`, deverá preservar ou recriar os triggers da 003.
