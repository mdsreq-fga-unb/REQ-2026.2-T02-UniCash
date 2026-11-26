# Research: UC13 - Acompanhar conquistas e pontuação

## R1. Selos e pontos: gravados ou derivados
- **Decision**: derivar selos e pontos a cada leitura, com uma função pura `avaliar(entrada)` sobre os totais mensais e as metas concluídas. Gravar só o registro de emissão da notificação (`conquistas_emitidas`).
- **Rationale**: FA07 e RN07 proíbem contador sincronizado; a clarificação do FA08 exige que o selo some e volte com os dados. Derivar resolve FA02, FA03, FA07 e FA08 sem lógica de revogação, e reinstalação ou novo aparelho recalculam tudo.
- **Alternatives**: tabela `selos` com inserção e revogação (precisa reconciliar a cada edição e sincronizar; contraria RN07).

## R2. Período do mês
- **Decision**: usar `intervaloDoMes(ano, mes)` de `src/features/resumo/service.ts`, o mesmo do resumo mensal (clarificação 2).
- **Rationale**: o app não tem dia de início configurável hoje; reutilizar a função garante que o detalhe do selo mostre os mesmos totais do resumo. Se um dia de início for criado, o selo acompanha sem mudança.
- **Alternatives**: calcular o mês do calendário dentro do UC13 (duplicação, risco de divergir).

## R3. Totais mensais em uma leitura
- **Decision**: uma consulta agrupada por `substr(data, 1, 7)` em receitas e despesas não excluídas, como `saldosPorMes` em `src/features/saldo/alertas.ts`, mas com receitas e despesas separadas e só meses anteriores ao corrente.
- **Rationale**: uma instrução SQL dá retrato consistente (mesmo argumento de `calcularResumo`) e evita N consultas por mês.

## R4. Metas concluídas (UC12 ainda não existe)
- **Decision**: interface `FonteMetas.concluidas(): Promise<MetaConcluida[]>`. Produção: `fonteMetasVazia` (lista vazia) até o UC12; testes e roteiro manual: `fonteMetasExemplo` com as 3 metas do protótipo.
- **Rationale**: DoR do UC13 ("metas de exemplo até o UC12"); `ProgressoMeta` em `resumo/service.ts` também é placeholder. Trocar a fonte é integração posterior.
- **Alternatives**: criar a tabela de metas agora (escopo do UC12).

## R5. Quando avaliar
- **Decision**: `avaliarEEmitir()` roda (a) na montagem do layout raiz, (b) no `AppState` `active`, (c) no foco da tela Conquistas e (d) após gravações de receitas e despesas, via um emissor simples `aoMudarLancamentos` chamado nos services existentes.
- **Rationale**: como selos são derivados, a tela sempre mostra o estado correto ao abrir; os gatilhos só servem para a notificação sair na mesma sessão (SC-004). Virada de mês é coberta por (a) e (b).
- **Alternatives**: tarefa em segundo plano (`expo-background-task`): não garante execução e é desnecessária para notificação local.

## R6. Notificação local
- **Decision**: `Notifications.scheduleNotificationAsync({ content: { title, body, data: { rota: '/conquistas' } }, trigger: null })` no canal `alertas` criado no UC14, atrás da interface `EmissorNotificacao` (simulada nos testes). Toque tratado com `addNotificationResponseReceivedListener` + `getLastNotificationResponseAsync` no layout raiz, navegando para `/conquistas`.
- **Rationale**: notificação local funciona offline e no Expo Go; push remoto fica fora.
- **Conferido na v58 (T001)**: `trigger: { channelId: 'alertas' }` (`ChannelAwareTriggerInput`) mostra na hora e usa o canal Android; `getLastNotificationResponseAsync` está `@deprecated`, usar `getLastNotificationResponse()` (síncrona); `setNotificationHandler` exige `shouldShowBanner`, `shouldShowList`, `shouldPlaySound`, `shouldSetBadge` (`shouldShowAlert` é deprecated). Sem handler, a notificação não aparece com o app aberto.
- **Alternatives**: banner dentro do app (não cumpre RF46 com o app fechado).

## R7. Emissão uma vez, primeira avaliação e retentativa
- **Decision**: tabela `conquistas_emitidas(chave PK, status 'emitida'|'pendente', criado_em, atualizado_em)` mais a marca `conquistas_linha_base` em `preferencias_locais`.
  - Primeira avaliação (sem linha de base): grava todos os selos atuais como `emitida` sem notificar e cria a linha de base (FR-009a).
  - Selo novo sem linha: se `isEnabled('conquistas')` e permissão concedida, emite e grava `emitida`; se a emissão falhar ou a permissão estiver negada, grava `pendente` (EX02).
  - Alerta desligado: grava `emitida` sem notificar (FA04: só a notificação some; não acumula avisos atrasados para quando ligar).
  - Selo que some e volta: a linha fica; não notifica de novo (FR-007a).
- **Rationale**: a chave do selo (`no-verde:2026-10`, `primeira-meta`) é estável, então a tabela é idempotente.

## R8. Isolamento por usuário (RNF03, EX04)
- **Decision**: usar `getDb()`, que já abre o banco do dono da sessão. A rota `/conquistas` aceita o parâmetro opcional `uid`; se diferente do usuário da sessão, mostra a tela [CQ6].
- **Rationale**: o isolamento de dados já existe por banco; o EX04 só precisa da tela para links vindos de fora (ex.: notificação de outra conta no mesmo aparelho).

## R9. Configuração de marcos e pontos
- **Decision**: `src/features/conquistas/config.ts` com `PONTOS_POR_META = 100` e o catálogo `MARCOS` (`no-verde`, `primeira-meta`), cada marco com nome, descrição e frase da notificação.
- **Rationale**: DoR pede `MARCOS` e `PONTOS_POR_META` com valores de teste; pendência registrada em `decisoes.md`.
