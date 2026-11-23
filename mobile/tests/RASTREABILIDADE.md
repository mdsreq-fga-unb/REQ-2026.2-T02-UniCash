# Rastreabilidade do UC01 – Gerenciar receitas

Cadeia: **requisito → caso de uso (fluxo) → código → teste → resultado.**
Os caminhos são relativos a `mobile/`. As siglas de requisitos vêm dos comentários do código
(`src/**`) e do `tests/MANUAL.md`; os textos completos estão em `engenharia_de_requisitos`.

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

## UC03 – Consultar resumo financeiro

Mesma cadeia: **requisito → fluxo → código → teste → resultado.** Caminhos relativos a `mobile/`.

### Requisitos e regras

| Requisito | Fluxo do UC03 | Código | Teste automatizado | Teste manual |
|---|---|---|---|---|
| RF11 – total de receitas do mês e por dia | passos 3 e 4 | `src/features/resumo/service.ts` (`totalReceitasDoMes`, `receitasPorDia`, `calcularResumo`), `src/app/index.tsx` | `tests/service/resumo.test.ts` (bloco "RF11"), `tests/screens/Resumo.test.tsx` ("abre no mês corrente…") | 4.1 (passo 2) |
| RF40 – saldo, receitas, despesas e metas do período | passos 3 e 4 | `service.ts` (`totalDespesasDoMes`, `saldoDoMes`, `progressoMetasDoMes`, `calcularResumo`), `src/app/index.tsx` | `tests/service/resumo.test.ts` (bloco "RF40"), `tests/screens/Resumo.test.tsx` ("abre no mês corrente…", "mostra o progresso das metas…") | 4.1 (passo 2) |
| RF55 – atalho para o tutorial (placeholder) | FA02 | `src/app/index.tsx` (`EstadoVazio`), `src/app/tutorial.tsx` | `tests/screens/Resumo.test.tsx` ("FA02…"), `tests/screens/Tutorial.test.tsx` | 4.1 (passo 1) |
| RF61 – usar sem conta | FA03 | `service.ts` (só SQLite; não importa o Firebase) | `tests/service/resumo.test.ts` ("FA03…"; o Firebase é mockado para quebrar se for importado) | 4.2 |
| RN06 – base local | todos | `service.ts`, `src/db/schema.ts` | `tests/service/resumo.test.ts` (SQLite em memória) | 4.2 |
| RN07 – sem contadores persistidos; exclusão lógica | passos 3 e 6, FA05 | `service.ts` (`excluido_em IS NULL`, cálculo na hora) | `tests/service/resumo.test.ts` ("ignora receitas excluídas", "ignora despesas excluídas", "FA02: lançamentos só excluídos…", "pós-condição…") | 4.1 (passo 5) |
| RN12 – mês corrente como padrão; datas futuras no mês | passo 2, FA04 | `src/app/index.tsx` (`mesCorrente`), `service.ts` (`intervaloDoMes`) | `tests/screens/Resumo.test.tsx` ("abre no mês corrente…"), `tests/service/resumo.test.ts` ("intervalo do mês…", "FA04…") | 4.1 (passo 3) |
| RN15 – saldo do mês = receitas − despesas | passos 3 e 4 | `service.ts` (`saldoDoMes`, `calcularResumo`) | `tests/service/resumo.test.ts` ("total de despesas e saldo…", "saldo negativo…"), `tests/screens/Resumo.test.tsx` ("saldo negativo…") | 4.1 (passo 2) |
| RNF07 – inteiros em centavos, 2 casas na exibição | passos 3 e 4 | `service.ts` (`SUM(valor_centavos)`), `src/features/resumo/format.ts` | `tests/service/resumo.test.ts` ("RNF07…"), `tests/unit/resumo.format.test.ts` | 4.4 |
| RNF20 – telas adaptadas a tamanhos de celular | passo 4 | `src/app/index.tsx` (estilos com `flexWrap`/`flexBasis`, comentário RNF20) | – (layout não é renderizado no Jest) | 4.3 |
| RNF03 – Security Rules | – | não se aplica: o resumo não lê nem grava na nuvem | – | – |

### Fluxos e exceções

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

**Placeholders:** metas (RF12) e tutorial (RF55) ainda não existem. `progressoMetasDoMes` retorna vazio e
`/tutorial` mostra "Tutorial em breve"; ligar quando os casos de uso de metas e tutorial forem entregues.
A visão por dia está em lista, provisória até a escolha entre lista e calendário com a cliente.

### Resultados de validação

#### Automatizados (`npm test -- --ci --coverage`)

| Data | Suítes | Testes | `features/resumo` (statements / branches / funções / linhas) | `src/app/index.tsx` | Responsável |
|---|---|---|---|---|---|
| 2026-11-19 | 54 de 54 | 525 de 525 | 100% / 100% / 100% / 100% | 100% / 100% / 100% / 100% | dantescarpati |
| 2026-11-23 (resumo em consulta única) | 54 de 54 | 527 de 527 | 100% / 100% / 100% / 100% | 100% / 100% / 100% / 100% | dantescarpati |

Limites mínimos em `jest.config.js` para `src/**/resumo/**` e `src/app/index.tsx`: 90% statements, 70% branches, 85% funções, 90% linhas.

#### Manuais (`tests/MANUAL.md`, seção 4)

| Roteiro | Data | Aparelho / versão | Executado por | Resultado | Observações |
|---|---|---|---|---|---|
| 4.1 Fluxo principal e alternativos | | | | | |
| 4.2 Offline e sem conta | | | | | |
| 4.3 RNF20 – tamanhos de tela | | | | | |
| 4.4 RNF07 – precisão | | | | | |
