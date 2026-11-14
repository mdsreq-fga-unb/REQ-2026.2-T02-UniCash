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
