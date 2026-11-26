# UC05 — Monitorar limites de gastos

[Issue #32](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/32) · [PR #118](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/118)

## Escopo e integrações

- O UC05 monitora limites mensais das categorias do UC06, em valor fixo ou percentual da renda. O SQLite calcula o gasto a partir das despesas da categoria e, para limites percentuais, das receitas do mesmo mês. Os limiares provisórios da RN03 são aproximação de 80% a 100% e ultrapassagem acima de 100%.
- A notificação é local e respeita as preferências por tipo. A chave por tipo, categoria e mês evita repetir um alerta emitido. A sincronização trata os alertas emitidos como dados da conta.
- O [UC09 (#46)](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/46) exibe indicadores de consumo. O UC05 desta branch tem consulta SQLite própria sobre os mesmos lançamentos e limites. Substituir essa consulta pela função compartilhada do UC09 e validar os dois fluxos juntos continua pendente após a integração das branches.
- As metas de gasto do RF12 têm armazenamento e ciclo de vida próprios. Esta entrega monitora apenas categorias. Incluir referências a metas no cálculo e nas notificações fica para a integração com o RF12.

## EX02 — Revalidação antes da emissão

[alertas-uc05.test.ts](service/alertas-uc05.test.ts) cobre a edição de uma despesa com alerta pendente em 80% e falha na consulta de consumo. A despesa é salva e o alerta fica pendente enquanto a consulta estiver indisponível. Quando a consulta volta, o alerta é descartado se o gasto caiu para 50% e é emitido com os valores atuais se o gasto está em 90%. A revalidação usa a mesma transação SQLite da emissão.

## Validação em aparelho

Use um Android ou iPhone com o aplicativo carregado e as notificações autorizadas no sistema. Habilite as duas preferências de alerta e use duas categorias sem despesas no mês, cada uma com limite fixo de R$ 100,00.

| Cenário | Passos | Resultado esperado | Evidência |
| --- | --- | --- | --- |
| Online e deduplicação | Na primeira categoria, registre R$ 80,00. Depois some R$ 20,00 e, por fim, R$ 0,01. Reabra o app. | Uma aproximação em R$ 80,00, nenhuma nova notificação em R$ 100,00 e uma ultrapassagem em R$ 100,01. Reabrir não repete os alertas. | Pendente |
| Offline e reconexão | Com o app já carregado, desligue Wi-Fi e dados móveis. Na segunda categoria, registre R$ 80,00 e depois R$ 20,01. Confira as despesas na lista e as notificações com a rede desligada. Religando a rede, volte ao app. | As despesas ficam salvas. As notificações de aproximação e ultrapassagem aparecem antes da reconexão, com categoria, gasto e limite. A reconexão não repete os alertas. | Pendente |

Anexe ao PR #118 um vídeo ou capturas de cada cenário. Registre modelo, versão do sistema, versão do app ou commit testado e data. Na gravação offline, mostre o estado da conexão antes do lançamento e na emissão. Se testar a sincronização, use uma conta de teste confirmada, iniciada antes de desligar a rede.
