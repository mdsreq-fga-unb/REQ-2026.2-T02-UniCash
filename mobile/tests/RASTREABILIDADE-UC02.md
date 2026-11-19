# Rastreabilidade do UC02 – Gerenciar despesas

Cadeia: **fluxo / regra de negócio → código → teste → situação.**
Os caminhos são relativos a `mobile/`. Esta tabela é a exigida pelo DoD (Nível 1): cada fluxo
(principal, alternativos e de exceção) e cada RN afetada aponta para o teste que a verifica.

Legenda: ✅ coberto · ⚠️ coberto em parte · ⏳ depende de outro caso de uso (declarado abaixo).

## 1. Fluxos e exceções

| Fluxo / exceção | Código | Teste que verifica | Situação |
|---|---|---|---|
| Principal – mês corrente, mais recente primeiro | `src/app/despesas/index.tsx`, `src/features/despesas/service.ts` (`listarDespesas`) | `tests/screens/TelaListaDespesas.test.tsx`, `tests/service/despesas.leitura.test.ts` | ✅ |
| A – Registrar | `src/app/despesas/nova.tsx`, `src/components/despesas/DespesaForm.tsx`, `service.ts` (`registrarDespesa`) | `tests/screens/NovaDespesa.test.tsx`, `tests/screens/DespesaForm.test.tsx`, `tests/service/despesas.registrar.test.ts` | ✅ |
| A7 – Sincronização após registrar | `src/app/despesas/nova.tsx` | `tests/screens/NovaDespesa.test.tsx` (dispara após gravar; não dispara se a gravação falha) | ✅ |
| B – Filtrar por dia, mês e período; detalhar | `src/components/despesas/FiltroDespesas.tsx`, `src/features/despesas/useDespesas.ts`, `src/app/despesas/[id]/index.tsx` | `tests/screens/FiltroDespesas.test.tsx`, `tests/unit/despesas.intervalo-filtro.test.ts`, `tests/features/despesas/useDespesas.test.tsx`, `tests/screens/DetalheDespesa.test.tsx` | ⚠️ filtro por categoria depende do UC06 |
| C – Editar | `src/app/despesas/[id]/editar.tsx`, `service.ts` (`editarDespesa`) | `tests/screens/EditarDespesa.test.tsx`, `tests/service/despesas.editar-excluir.test.ts`, `tests/service/despesas.recorrencia-editar-excluir.test.ts` | ✅ |
| C4 – Sincronização após editar | `src/app/despesas/[id]/editar.tsx` | `tests/screens/EditarDespesa.test.tsx` | ✅ |
| D – Excluir | `src/components/despesas/useExclusaoDespesas.tsx` | `tests/components/useExclusaoDespesas.test.tsx`, `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| D4 – Sincronização após excluir | `src/components/despesas/useExclusaoDespesas.tsx` | `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| FA01 – Sem categoria | `service.ts`, `src/features/receitas/sync.ts` (payload sem campos nulos) | `tests/service/despesas.registrar.test.ts`, `tests/service/sync.test.ts` ("FA01…"), `tests/rules/firestore.rules.test.ts` | ✅ |
| FA02 – Offline | `src/features/receitas/sync.ts` | `tests/service/sync.test.ts` ("mantém despesa pendente quando não há conexão") | ✅ |
| FA03 – Data futura | `service.ts` (`listarDespesas`) | `tests/service/despesas.leitura.test.ts` ("FA03/RN12…") | ✅ |
| FA04 – Filtro por categoria sem resultados | – | – | ⏳ UC06 (não há filtro por categoria) |
| FA05 – Cancelamento | `editar.tsx`, `useExclusaoDespesas.tsx`, `DespesaForm.tsx` | `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx`, `tests/screens/DespesaForm.test.tsx` | ✅ |
| FA06 – Mudança de categoria e recálculo | `service.ts` (`editarDespesa`) | `tests/service/despesas.editar-excluir.test.ts` (muda categoria) | ⏳ recálculo de saldo/limites: UC04, UC05, UC09 |
| FA07 – Recorrência | `service.ts` (`criarSerie`, `gerarOcorrencias`), `validation.ts` (`excedeLimiteOcorrencias`) | `tests/service/despesas.recorrencia.test.ts` (mês, dia e ano; com e sem término), `tests/unit/despesas.validation.test.ts` (limite de 3700 ocorrências) | ✅ |
| FA08 – Alcance em série | `service.ts`, `editar.tsx`, `useExclusaoDespesas.tsx` | `tests/service/despesas.recorrencia-editar-excluir.test.ts`, `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| EX01 – Dados inválidos | `validation.ts`, `DespesaForm.tsx` | `tests/unit/despesas.validation.test.ts` (texto literal das mensagens), `tests/screens/DespesaForm.test.tsx` | ✅ |
| EX02 – Falha na gravação | `service.ts` (`transacao`) | `tests/service/despesas.registrar.test.ts`, `tests/service/despesas.editar-excluir.test.ts` (inclui exclusão), `tests/service/despesas.recorrencia-editar-excluir.test.ts`, `tests/screens/NovaDespesa.test.tsx`, `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| EX03 – Falha na sincronização | `sync.ts` (falha isolada por registro) | `tests/service/sync.test.ts` (offline, registro rejeitado não bloqueia os demais) | ✅ |
| EX04 – Conflito de sincronização | `sync.ts` | `tests/service/sync.test.ts` ("conflitos de despesas (EX04)") | ⚠️ ver limitação 4 |
| EX05 – Despesa indisponível | `editar.tsx`, `[id]/index.tsx`, `useExclusaoDespesas.tsx`, `service.ts` | `tests/screens/EditarDespesa.test.tsx` (mensagem ao abrir e ao salvar), `tests/screens/DetalheDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx`, `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| EX06 – Acesso a dados de outro usuário | `src/app/despesas/index.tsx` (`consumirAcessoNegado`) | `tests/screens/TelaListaDespesas.test.tsx` (mensagem e dados locais intactos), `tests/rules/firestore.rules.test.ts` (nega na nuvem) | ✅ |
| EX07 – Período inválido | `FiltroDespesas.tsx` | `tests/screens/FiltroDespesas.test.tsx` | ✅ |
| EX08 – Categoria excluída na sincronização | `sync.ts` (`categoriaConhecida`, ponto de integração) | – | ⏳ UC06 |
| EX09 – Falha na leitura local | `service.ts`, `useDespesas.ts`, telas | `tests/service/despesas.leitura.test.ts`, `tests/features/despesas/useDespesas.test.tsx`, `tests/screens/TelaListaDespesas.test.tsx` | ✅ |

## 2. Regras de negócio

| Regra | Código | Teste que verifica | Situação |
|---|---|---|---|
| RN06 – Base local | `src/db/schema.ts` | `tests/service/despesas.registrar.test.ts`, `tests/service/sync.test.ts` | ✅ |
| RN07 – Exclusão e conflito | `sync.ts`, `service.ts` | `tests/service/sync.test.ts` (exclusão, restauração sem reaparecer, conflitos) | ⚠️ limitação 4 |
| RN08 – Obrigatórios | `validation.ts` | `tests/unit/despesas.validation.test.ts` | ✅ |
| RN09 – Valor (válido, inválido, valor-limite) | `validation.ts`, `src/features/receitas/money.ts` | `tests/unit/despesas.validation.test.ts` (0,01 · 0,10 · 10,5 · 10,99 · 999.999.999,99 · 1.000.000.000,00), `tests/unit/money.test.ts`, `tests/service/despesas.leitura.test.ts` (0,10 + 0,20 = 30 centavos exatos) | ✅ |
| RN10 – Título e descrição | `validation.ts` | `tests/unit/despesas.validation.test.ts` (80/81 e 255/256 caracteres) | ✅ |
| RN11 – Transação única | `service.ts` (`transacao`) | `tests/service/despesas.registrar.test.ts`, `tests/service/despesas.editar-excluir.test.ts`, `tests/service/despesas.recorrencia-editar-excluir.test.ts` (falha induzida na exclusão por alcance) | ✅ |
| RN12 – Ordem e período | `service.ts` (`listarDespesas`) | `tests/service/despesas.leitura.test.ts` (ordem, data futura no mês da própria data), `tests/unit/despesas.intervalo-filtro.test.ts` | ✅ |
| RN13 – Categorias padrão | `service.ts`, `DespesaForm.tsx` | `tests/service/despesas.registrar.test.ts` (as 7 categorias padrão) | ⚠️ cadastro/seletor completo depende do UC06 |
| RN19 – Recorrência | `validation.ts`, `service.ts` | `tests/unit/despesas.validation.test.ts`, `tests/service/despesas.recorrencia.test.ts` | ✅ |
| RN20 – Editar qualquer campo | `service.ts` (`editarDespesa`) | `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| RNF03 – Security Rules | `firestore.rules` | `tests/rules/firestore.rules.test.ts` (`npm run test:rules`), incluindo série de despesa | ✅ |

## 3. Sincronização e restauração

| Comportamento | Código | Teste |
|---|---|---|
| Envio de despesas e séries (tipo e classificações) | `sync.ts` (`sincronizarPendentes`) | `tests/service/sync.test.ts` |
| Restauração de despesas, séries com tipo preservado, idempotência e exclusões | `sync.ts` (`restaurarDaNuvem`) | `tests/service/sync.test.ts` ("restauração da nuvem › despesas") |
| Indicador de pendências e disparo no foco da lista | `pendencias.ts`, `src/app/despesas/index.tsx` | `tests/screens/TelaListaDespesas.test.tsx` |

## 4. Limitações e dependências declaradas

1. **Autenticação:** o app não tem fluxo de login, então `sincronizarPendentes` retorna sem enviar e
   `restaurarDaNuvem` não é chamada por nenhuma tela. A sincronização é validada só por testes
   automatizados (SQLite em memória e Firebase mockado); a prova manual fica pendente do caso de uso de
   autenticação.
2. **Categorias (UC06):** seletor de categorias, rótulo na lista, filtro por categoria (B, FA04) e a
   regra de categoria excluída na restauração (EX08) dependem do UC06. O ponto de integração é
   `categoriaConhecida()` em `sync.ts`.
3. **Recálculo de saldo, totais, limites e alertas (A6, C3, D3, FA06):** dependem de UC04, UC05 e UC09.
4. **Conflito de exclusão remota (EX04):** a exclusão é enviada com `deleteDoc`, sem marcador na nuvem.
   Se outra instalação excluir a despesa e houver edição local pendente, a edição recria o documento; do
   mesmo modo, restaurar e completar uma série pode regerar uma ocorrência excluída em outro aparelho.
   O escopo atual considera um aparelho por conta.
