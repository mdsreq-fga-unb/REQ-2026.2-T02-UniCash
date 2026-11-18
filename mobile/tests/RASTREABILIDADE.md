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
| RNF35 – encerramento forçado | A | `src/features/receitas/service.ts`, `src/app/receitas/nova.tsx` | `tests/service/atomicidade.test.ts` (simulado) | 3.1 |

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
| RN14 — limites por valor/percentual | B, C | `validation.ts`, `formato.ts`, `CategoriaForm.tsx`, `[id]/editar.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Limites testados; 100,01% aceito sem máximo aprovado; máximo percentual e recálculo pendentes |
| RNF03 — isolamento por usuário | EX09, sincronização | Sem regras de categorias no Firestore | `tests/rules/firestore.rules.test.ts` cobre apenas UC01 | **Não aplicável nesta entrega**; pendente com Firebase |
| RNF04 — validação local | B, C | `validation.ts`, `CategoriaForm.tsx` | `tests/unit/validation-categorias.test.ts`, `tests/screens/CategoriaForm.test.tsx` | Testado |
| RNF05 — evitar estado parcial | B, C, D | `service.ts` (`transacao`) | `tests/service/categorias.test.ts` (falha em criar/editar/excluir) | Testado no escopo local |
| RNF07 — precisão monetária | B, C | `money.ts`, `validation.ts`, `schema.ts` | `tests/unit/validation-categorias.test.ts`, `tests/unit/formato-categorias.test.ts`, `tests/db/schema.test.ts` | Testado com centavos/centésimos inteiros |
| RNF14 — mensagens de rejeição | B, C, EX01–EX07 | `validation.ts` (`MSG_CAT`), `CategoriaForm.tsx` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/NovaCategoria.test.tsx`, `tests/screens/EditarCategoria.test.tsx` | Testado nos fluxos implementados |
| RNF35 - persistência local | todos | `schema.ts`, `service.ts` | `tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts` | SQLite testado; smoke pós-merge dos fluxos principais executado; persistência após fechar/reabrir pendente |
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
| FA04 — categoria sem limite | `CategoriaForm.tsx`, `EditarCategoria.test.tsx`, `service.ts` | `tests/screens/CategoriaForm.test.tsx`, `tests/screens/EditarCategoria.test.tsx`, `tests/service/categorias.test.ts` | Local testado; recálculo pendente UC05/UC09 |
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

### 4.3. Evidências do DoD Nível 1

- **Precisão:** `tests/db/schema.test.ts` verifica centavos inteiros, mínimo de 1 centavo e teto de R$ 999.999.999,99; `tests/unit/validation-categorias.test.ts` verifica o parser exato (BigInt), 1 centavo e 30 caracteres; `tests/unit/formato-categorias.test.ts` verifica a formatação exata de percentuais. **Executado.**
- **Semeadura:** `tests/service/categorias.test.ts` cobre banco vazio, repetição sem duplicar, conflito com categoria própria ativa, criação das demais padrão, preservação da própria e do limite, rollback total em falha de persistência, `PRAGMA integrity_check` e o ciclo conflito → exclusão da própria → criação da padrão sem duplicação; `tests/unit/useCategorias.test.ts` cobre conflito, a não repetição por foco e a reavaliação única após a exclusão; `tests/unit/semeaduraPendente.test.ts` cobre o sinal; `tests/screens/ListaCategorias.test.tsx` cobre o aviso de conflito e a falha de persistência. **Executado.**
- **Mensagens:** o conflito de nomes reservados usa `mensagemConflitoSemeadura` com os nomes não criados; falha de persistência usa `MSG_CAT.falhaSemeadura`; o fallback de tipo inválido usa `MSG_CAT.dadosInvalidos`; nenhum texto técnico (`db fechado`, “Semeadura abortada”, “Tipo de limite desconhecido”) é renderizado. Os testes de tela e unitários verificam as mensagens e a ausência do detalhe técnico.
- **Isolamento:** **não aplicável nesta entrega**. Categorias são locais e ainda não têm sincronização nem Security Rules; `tests/rules/firestore.rules.test.ts` cobre apenas receitas/recorrências. Não há resultado de `test:rules` para categorias a apresentar.
- **Persistência:** testes automatizados de SQLite em memória, schema e migrações (`tests/db/schema.test.ts`, `tests/db/migrations.test.ts`, `tests/service/categorias.test.ts`). A prova manual no Expo Go registrada no PR #58 foi feita **antes** do merge da develop. O smoke pós-merge dos fluxos principais foi executado; a persistência após fechar e reabrir **não foi confirmada** e permanece pendente.
- **Sincronização:** **não implementada**. O campo `sync_status` está preparado, mas não há envio, restauração nem Security Rules de categorias; EX05, EX08, EX09 e RNF03/RNF36 permanecem pendentes.
- **Cobertura de código (informativa, não é critério do DoD):** núcleo de 13 arquivos com 98,88% de statements, 94,53% de branches, 100% de funções e 99,36% de linhas. O DoD Nível 1 não exige 100% de cobertura de código; exige a matriz fluxo/RN → teste e os casos válido/inválido/limite.

### 4.4. Resultados

| Data | Comando | Suítes | Testes | Resultado |
|---|---|---|---|---|
| 18/11/2026 | `npm test -- --ci --coverage --runInBand` | 44 | 579 | **579 aprovados** |

- **CI:** Mobile CI #28, no commit `1bb753c`, com 2/2 checks aprovados. Uma nova execução após as alterações locais ainda não ocorreu (sem commit/push).
- **Manual:** smoke pós-merge dos fluxos principais executado, sem falha relatada; persistência após fechar/reabrir pendente.
- **Security Rules:** não aplicável à UC06 nesta entrega; `npm run test:rules` cobre o UC01.

### 4.5. Pendências de integração

- **UC02:** despesas, contagem/atalho de lançamentos, exclusão com desvinculação de `despesas.categoria_id` e `recorrencias.categoria_id` (migração **003**, após a 002 de limite técnico; ver 4.9).
- **UC05/UC09:** recálculo de indicadores e alertas após criar/editar/excluir categoria.
- **Firebase:** sincronização de categorias, conflito RN07 (EX08), isolamento por usuário (EX09/RNF03) e Security Rules/test:rules.
- **Cliente:** faixa máxima do limite percentual; contradição RF66 × RN13 sobre limite de categoria padrão.
- **Revisão:** smoke dos fluxos principais executado; confirmar persistência após fechar/reabrir e demais apontamentos da revisão do PR #58.
- **Semeadura:** conflitos são reportados uma vez por instância e a semeadura não é repetida a cada foco. Após excluir uma categoria própria com nome reservado, um sinal único faz a lista tentar a semeadura no próximo foco; não há conversão automática da categoria própria. Se a tentativa posterior falhar, a exclusão já confirmada permanece e o erro é exibido como falha de preparação das padrão, não como falha da exclusão.

### 4.6. Limite percentual — política e risco

**Política atual:** não há máximo de negócio aprovado. Formulário, validação e serviço aceitam qualquer percentual positivo com até duas casas; 100,01%, 101% e 999999% são aceitos e formatados exatamente. O máximo de 100% proposto no checklist não foi imposto por falta de validação da cliente (RN14 e issue #43).

**Limite técnico:** o parser e a validação exigem inteiro seguro (`Number.isSafeInteger`) em centésimos, até `Number.MAX_SAFE_INTEGER` (90071992547409,91%); a conversão e a formatação usam BigInt, sem float nem arredondamento. O schema SQLite aceita `INTEGER > 0`, mas **não** limita a `MAX_SAFE_INTEGER`. Uma escrita direta por SQL/importação com inteiro acima do que o JavaScript representa com segurança pode ser lida como Number impreciso e fazer `centesimosParaTextoPercentual` lançar `RangeError`; o caminho do app é protegido pelo parser e pelo serviço.

**Correção técnica aplicada:** o CHECK do schema agora exige `limite_percentual_centesimos <= 9007199254740991`, e a migração **002** reconstrói bancos v1 com o DDL novo, preservando registros, tombstones e índices. Bancos v1 com valor acima do limite técnico **abortam sem alteração** (`DadosLegadosInvalidos`, versão e dados preservados). O caminho de instalação nova já usa o DDL novo. Isso não altera o máximo de negócio.

**Risco de negócio:** aceitar percentuais acima de 100% pode criar limites e alertas sem sentido; se a cliente aprovar a faixa 0,01%–100%, será necessário definir limpeza ou migração dos dados fora da faixa. A decisão permanece pendente.

**Testes de limite percentual:** `tests/unit/validation-categorias.test.ts` (0,01%, 100%, 100,01%, 101%, 999999%, `MAX_SAFE_INTEGER` e overflow), `tests/unit/formato-categorias.test.ts` (100,01%, 101%, 999999% e `MAX_SAFE_INTEGER`), `tests/db/schema.test.ts` (100,01%, `MAX_SAFE_INTEGER` e rejeição de 2^53) e `tests/screens/CategoriaForm.test.tsx` (100,01%); `tests/service/categorias.test.ts` confirma a persistência de 100,01%. A migração 002 é coberta em `tests/db/migrations.test.ts` (v1 válido, v1 com valor inseguro, DDL novo com versão 1 e instalação nova).

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

### 4.9. Integração UC02, migração 003 e proposta de issue

Não existe issue dedicada para a desvinculação `despesas.categoria_id`/`recorrencias.categoria_id` na exclusão de categoria. A issue #29 e o PR #55 tratam da UC02, mas não desse fluxo; a issue #43 registra a pendência do UC06.

**Proposta de issue técnica (não publicada):**
- **Título:** UC02/UC06 — integrar despesas e recorrências às categorias (migração 003 e desvinculação na exclusão).
- **Escopo:** criar migração **003** para `despesas` e novas colunas de `recorrencias` (`tipo`, `categoria_id`, `fixa_ou_variavel`, `essencial`), atualizar `ESTRUTURAS_ESPERADAS`/DDL e preservar dados; na exclusão de categoria, na mesma transação, definir `categoria_id = NULL` em `despesas` e `recorrencias` ativas, mantendo os lançamentos e recalculando limites/alertas quando UC05/UC09 existirem; cobrir restauração de despesa com categoria excluída.
- **Testes:** migração v2→v3 com dados e rollback; exclusão com despesas e séries; despesa mantida como “Sem categoria”; atomicidade; banco novo; nenhuma duplicação.
- **Dependências:** UC06 (PR #58), UC02 (issue #29/PR #55), UC05/UC09 e Firebase.

**Risco de colisão de migração:** a versão **002** já pertence ao UC06 (limite técnico percentual). A integração UC02 deve usar **003** e incrementar `VERSAO_ESQUEMA` para 3. A branch UC02/PR #55 ainda não tem `migrations.ts`; usa alteração não versionada em `database.ts`. Se a UC02 for integrada antes, `prepararInstalacaoNova` pode rejeitar `recorrencias` com colunas extras, pois `ESTRUTURAS_ESPERADAS` exige a estrutura canônica. A ordem recomendada é integrar o UC06 primeiro e rebasear a UC02 sobre a migração 003, ou coordenar a atualização das estruturas esperadas.
