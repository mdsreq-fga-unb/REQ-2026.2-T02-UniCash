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
| B – Filtrar por dia, mês, período e categoria; detalhar | `src/components/despesas/FiltroDespesas.tsx`, `src/app/despesas/index.tsx` (filtro por categoria), `src/features/despesas/useDespesas.ts`, `service.ts` (`listarDespesas`), `src/app/despesas/[id]/index.tsx` | `tests/screens/FiltroDespesas.test.tsx`, `tests/unit/despesas.intervalo-filtro.test.ts`, `tests/features/despesas/useDespesas.test.tsx`, `tests/service/despesas.leitura.test.ts` (filtro por categoria), `tests/screens/TelaListaDespesas.test.tsx`, `tests/screens/DetalheDespesa.test.tsx` | ✅ catálogo UC06 (sete padrão + próprias) |
| C – Editar | `src/app/despesas/[id]/editar.tsx`, `service.ts` (`editarDespesa`) | `tests/screens/EditarDespesa.test.tsx`, `tests/service/despesas.editar-excluir.test.ts`, `tests/service/despesas.recorrencia-editar-excluir.test.ts` | ✅ |
| C4 – Sincronização após editar | `src/app/despesas/[id]/editar.tsx` | `tests/screens/EditarDespesa.test.tsx` | ✅ |
| D – Excluir | `src/components/despesas/useExclusaoDespesas.tsx` | `tests/components/useExclusaoDespesas.test.tsx`, `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| D4 – Sincronização após excluir | `src/components/despesas/useExclusaoDespesas.tsx` | `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| FA01 – Sem categoria | `service.ts`, `src/features/receitas/sync.ts` (payload sem campos nulos) | `tests/service/despesas.registrar.test.ts`, `tests/service/sync.test.ts` ("FA01…"), `tests/rules/firestore.rules.test.ts` | ✅ |
| FA02 – Offline | `src/features/receitas/sync.ts` | `tests/service/sync.test.ts` ("mantém despesa pendente quando não há conexão") | ✅ |
| FA03 – Data futura | `service.ts` (`listarDespesas`) | `tests/service/despesas.leitura.test.ts` ("FA03/RN12…") | ✅ |
| FA04 – Filtro por categoria sem resultados | `src/app/despesas/index.tsx` (estado vazio com categoria ativa) | `tests/screens/TelaListaDespesas.test.tsx` ("Nenhum registro" e sugestão de alterar o filtro), `tests/service/despesas.leitura.test.ts` | ✅ |
| FA05 – Cancelamento | `editar.tsx`, `useExclusaoDespesas.tsx`, `DespesaForm.tsx` | `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx`, `tests/screens/DespesaForm.test.tsx` | ✅ |
| FA06 – Mudança de categoria e recálculo | `service.ts` (`editarDespesa`, `listarDespesas`) | `tests/service/despesas.editar-excluir.test.ts` (totais da origem e do destino após edição e exclusão) | ⚠️ totais do UC02 cobertos. Saldo, limites e alertas dependem de UC04, UC05 e UC09. |
| FA07 – Recorrência | `service.ts` (`criarSerie`, `gerarOcorrencias`), `validation.ts` (`excedeLimiteOcorrencias`) | `tests/service/despesas.recorrencia.test.ts` (mês, dia e ano; com e sem término), `tests/unit/despesas.validation.test.ts` (limite de 3700 ocorrências) | ✅ |
| FA08 – Alcance em série | `service.ts`, `editar.tsx`, `useExclusaoDespesas.tsx` | `tests/service/despesas.recorrencia-editar-excluir.test.ts`, `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| EX01 – Dados inválidos | `validation.ts`, `DespesaForm.tsx` | `tests/unit/despesas.validation.test.ts` (texto literal das mensagens), `tests/screens/DespesaForm.test.tsx` | ✅ |
| EX02 – Falha na gravação | `service.ts` (`transacao`) | `tests/service/despesas.registrar.test.ts`, `tests/service/despesas.editar-excluir.test.ts` (inclui exclusão), `tests/service/despesas.recorrencia-editar-excluir.test.ts`, `tests/screens/NovaDespesa.test.tsx`, `tests/screens/EditarDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx` | ✅ |
| EX03 – Falha na sincronização | `sync.ts` (falha isolada por registro) | `tests/service/sync.test.ts` (offline, registro rejeitado não bloqueia os demais) | ✅ |
| EX04 – Conflito de sincronização | `sync.ts` | `tests/service/sync.test.ts` ("conflitos de despesas (EX04)") | ✅ |
| EX05 – Despesa indisponível | `editar.tsx`, `[id]/index.tsx`, `useExclusaoDespesas.tsx`, `service.ts` | `tests/screens/EditarDespesa.test.tsx` (mensagem ao abrir e ao salvar), `tests/screens/DetalheDespesa.test.tsx`, `tests/components/useExclusaoDespesas.test.tsx`, `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| EX06 – Acesso a dados de outro usuário | `src/app/despesas/index.tsx` (`consumirAcessoNegado`) | `tests/screens/TelaListaDespesas.test.tsx` (mensagem e dados locais intactos), `tests/rules/firestore.rules.test.ts` (nega na nuvem) | ✅ |
| EX07 – Período inválido | `FiltroDespesas.tsx` | `tests/screens/FiltroDespesas.test.tsx` | ✅ |
| EX08 – Categoria excluída na sincronização | `sync.ts` (`resolverCategoriaRemota`); o catálogo local do UC06 determina a categoria disponível | `tests/service/sync.test.ts` (EX08 em edição remota e restauração), `tests/unit/despesas.categorias.test.ts` | ✅ categorias próprias e exclusão integradas ao UC06 |
| EX09 – Falha na leitura local | `service.ts`, `useDespesas.ts`, telas | `tests/service/despesas.leitura.test.ts`, `tests/features/despesas/useDespesas.test.tsx`, `tests/screens/TelaListaDespesas.test.tsx` | ✅ |

## 2. Regras de negócio

| Regra | Código | Teste que verifica | Situação |
|---|---|---|---|
| RN06 – Base local | `src/db/schema.ts` | `tests/service/despesas.registrar.test.ts`, `tests/service/sync.test.ts` | ✅ |
| RN07 – Exclusão e conflito | `sync.ts`, `service.ts` | `tests/service/sync.test.ts` (exclusão, restauração sem reaparecer, conflitos) | ✅ |
| RN08 – Obrigatórios | `validation.ts` | `tests/unit/despesas.validation.test.ts` | ✅ |
| RN09 – Valor (válido, inválido, valor-limite) | `validation.ts`, `src/features/receitas/money.ts` | `tests/unit/despesas.validation.test.ts` (0,01 · 0,10 · 10,5 · 10,99 · 999.999.999,99 · 1.000.000.000,00), `tests/unit/money.test.ts`, `tests/service/despesas.leitura.test.ts` (0,10 + 0,20 = 30 centavos exatos) | ✅ |
| RN10 – Título e descrição | `validation.ts` | `tests/unit/despesas.validation.test.ts` (80/81 e 255/256 caracteres) | ✅ |
| RN11 – Transação única | `service.ts` (`transacao`) | `tests/service/despesas.registrar.test.ts`, `tests/service/despesas.editar-excluir.test.ts`, `tests/service/despesas.recorrencia-editar-excluir.test.ts` (falha induzida na exclusão por alcance) | ✅ |
| RN12 – Ordem e período | `service.ts` (`listarDespesas`) | `tests/service/despesas.leitura.test.ts` (ordem, data futura no mês da própria data), `tests/unit/despesas.intervalo-filtro.test.ts` | ✅ |
| RN13 – Categorias padrão e próprias | `src/features/despesas/categorias.ts`, `useCategoriasAtivas.ts`, `DespesaForm.tsx` (seletor), `DespesaItem.tsx` e `[id]/index.tsx` (rótulo) | `tests/unit/despesas.categorias.test.ts`, `tests/unit/useCategoriasAtivas.test.ts`, `tests/screens/DespesaForm.test.tsx`, `tests/service/despesas.registrar.test.ts`, `tests/components/DespesaItem.test.tsx` | ✅ catálogo do UC06 integrado (sete padrão + próprias) |
| RN19 – Recorrência | `validation.ts`, `service.ts` | `tests/unit/despesas.validation.test.ts`, `tests/service/despesas.recorrencia.test.ts` | ✅ |
| RN20 – Editar qualquer campo | `service.ts` (`editarDespesa`) | `tests/service/despesas.editar-excluir.test.ts` | ✅ |
| RNF27 – Registro simples em três etapas | `src/app/index.tsx` → `src/app/despesas/index.tsx` → `src/app/despesas/nova.tsx` | `tests/screens/HomeDespesas.test.tsx`, `tests/screens/TelaListaDespesas.test.tsx`, `tests/screens/NovaDespesa.test.tsx` | ✅ |
| RNF03 – Security Rules | `firestore.rules` | `tests/rules/firestore.rules.test.ts` (`npm run test:rules`), incluindo série de despesa | ✅ |

## 3. Sincronização, restauração e tombstones

| Comportamento | Código | Teste |
|---|---|---|
| Envio de despesas e séries (tipo e classificações) | `sync.ts` (`sincronizarPendentes`) | `tests/service/sync.test.ts` |
| Restauração de despesas, séries com tipo preservado, idempotência e exclusões | `sync.ts` (`restaurarDaNuvem`) | `tests/service/sync.test.ts` ("restauração da nuvem › despesas") |
| Exclusão remota de despesa prevalece sobre edição local atrasada | `sync.ts` (`runTransaction`, `aplicarLapideRemota`) | `tests/service/sync.test.ts` (tombstones persistentes) |
| Tombstone local é publicado e nunca substituído por documento ativo | `sync.ts` (`payloadTombstone`, `tx.set`) | `tests/service/sync.test.ts` (tombstones persistentes) |
| Série excluída bloqueia ocorrências ativas e não gera novas | `service.ts` (`excluirSerie`, filtros `excluido_em IS NULL`), `sync.ts` (`seriesExcluidas`) | `tests/service/serie.test.ts`, `tests/service/despesas.recorrencia-editar-excluir.test.ts`, `tests/service/sync.test.ts` |
| Falha entre confirmação remota e SQLite reconcilia no retry | `sync.ts` | `tests/service/sync.test.ts` (falha após confirmação remota) |
| Indicador de pendências e disparo no foco da lista | `pendencias.ts`, `src/app/despesas/index.tsx` | `tests/screens/TelaListaDespesas.test.tsx` |

## 4. Migrations e integração UC06

| Item | Implementação | Evidência |
|---|---|---|
| Migrations versionadas | `src/db/migrations.ts`, `PRAGMA user_version`, migrations 001–005 | `tests/db/migrations.test.ts` (90 testes) |
| Migration 005 | `excluido_em TEXT NULL` em `recorrencias`, instalação nova em v5 e rollback | `tests/db/migrations.test.ts` (v4→v5, rollback, idempotência) |
| Categorias próprias | `useCategoriasAtivas.ts`, `listarCategorias`, seletor e rótulos | `tests/unit/useCategoriasAtivas.test.ts`, telas de despesas |
| Slugs históricos da UC02 | `semearCategoriasPadrao` migra `casa`, `alimentacao` etc. para IDs reais | `tests/service/categorias.test.ts`, `tests/service/sync.test.ts` |
| Exclusão de categoria | desvincula despesas e séries de despesa na mesma transação, sem excluir lançamentos | `tests/service/categorias.test.ts` |
| Firestore Rules | tombstone não reativa, delete físico negado para despesas/recorrências | `tests/rules/firestore.rules.test.ts` (`npm run test:rules`, 57 testes) |


## 5. Limitações e dependências declaradas

1. **Autenticação:** o app não tem fluxo de login, então `sincronizarPendentes` retorna sem enviar e
   `restaurarDaNuvem` não é chamada por nenhuma tela. A sincronização é validada só por testes
   automatizados (SQLite em memória e Firebase mockado); a prova manual fica pendente do caso de uso de
   autenticação.
2. **Categorias (UC06):** a integração está implementada. `useCategoriasAtivas` lê o catálogo
   ativo (sete categorias padrão e categorias próprias) para seletor, rótulos e filtros.
   `semearCategoriasPadrao` converte os slugs históricos da UC02 (`casa`, `saude`…) para os IDs
   reais das categorias padrão. A sincronização cross-device de categorias não faz parte desta
   entrega: IDs de outro dispositivo sem correspondência local são tratados como indisponíveis
   (EX08). A exclusão de categoria desvincula despesas e séries de despesa na mesma transação,
   preservando os lançamentos.
3. **Recálculo (A6, C3, D3, FA06):** o UC02 calcula o total a partir das despesas retornadas na mesma
   consulta e testa edição com mudança de mês e categoria. Ao integrar UC04, UC05 e UC09, as leituras
   devem usar `despesas` com `excluido_em IS NULL` e somar `valor_centavos` por intervalo de `data`.
   Cada ocorrência conta individualmente. Limites por categoria devem considerar apenas registros da
   categoria correspondente. No [PR #68](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/68),
   alinhar as consultas ao filtro de exclusão lógica e delegar gravações aos serviços da UC02,
   que usam IDs textuais e exigem título.
4. **Exclusões antigas:** despesas removidas fisicamente do Firestore por versões anteriores não
   têm marcador remoto. A garantia de restauração se aplica aos marcadores gravados pela versão atual.

5. **Alteração da periodicidade em toda a série (FA08):** a regra implementada no UC01 também se aplica
   ao UC02. Ao escolher “Todas” e mudar a periodicidade, a nova série parte da data de início original.
   As ocorrências antigas recebem marcadores de exclusão, e as novas são geradas pela periodicidade
   escolhida. O teste de serviço verifica as novas datas. Essa decisão foi confirmada na revisão do PR #55.

6. **EX01:** data e término inválidos recebem instruções de formato para diferenciar ausência de data
   de data inexistente. A mensagem de excesso de ocorrências explica como ajustar a série antes de
   gravar. Essas mensagens complementam as previstas no caso de uso e os testes comparam textos literais.
7. **Marcador de exclusão (RN07):** o documento da despesa no Firestore mantém `excluido_em` e
   `atualizado_em`. No SQLite, a linha local preserva valores, título, data, descrição,
   classificação, categoria e vínculo histórico; a exclusão lógica altera apenas `excluido_em`,
   `sync_status` e `atualizado_em`. Despesas excluídas ficam fora das consultas. Marcadores
   anteriores, que ainda contêm dados completos na nuvem, são reconhecidos na restauração.

8. **Validação em Android:** a migration 005 e os fluxos integrados foram validados em SQLite real,
   suíte automatizada e Firestore Emulator, mas **não** foram executados em dispositivo físico ou
   emulador Android nesta entrega. A validação manual permanece pendente.
