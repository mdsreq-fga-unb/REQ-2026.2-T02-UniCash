# UC16 — Sincronizar dados

## Aplicação

Na raiz do repositório, na branch da UC16:

```sh
cd mobile
npm ci
npm run typecheck
npm run lint
npm test -- --runInBand --coverage
npm run test:rules
```

Use o Firebase de desenvolvimento ou o Emulator Suite com as regras desta branch. A versão que grava a exclusão lógica de receita requer as regras novas. Exclusões físicas feitas por versões antigas não deixam um marcador que outro aparelho possa receber.

## Contrato e rastreabilidade

| Item | Implementação |
| --- | --- |
| Estado e fila | `features/sincronizacao/contrato.ts`, `service.ts` e `fila.ts`. A consulta SQLite inclui receitas, despesas, categorias, recorrências, alertas e exclusões lógicas. Contagem e lista vêm da mesma consulta. |
| Envio, repetição e retomada | `features/receitas/sync.ts` usa o SDK do Firestore e IDs estáveis. A confirmação remota precede a baixa da pendência. O envio manual aguarda o envio em curso. Login, reconexão e retorno ao primeiro plano acionam um ciclo automático. |
| Sessão e acesso local | O ciclo exige UID e e-mail confirmado. A consulta local permanece disponível sem sessão. A última conclusão é registrada por conta no aparelho. |
| Combinação e restauração | O ciclo lê os snapshots do servidor, reaproveita o tratamento de categorias e importa séries, lançamentos e alertas em transação SQLite. Edições mais recentes são aplicadas aos registros ativos. Marcadores de exclusão prevalecem sobre edições. Ao concluir, a atualização da base aciona o recálculo do resumo e a releitura das listas. |
| RF59, RNF20 e RNF38 | A tela `Sincronização` fica no resumo financeiro, usa a paleta do app e apresenta a fila em uma coluna rolável. Receitas e despesas usam rótulos de estado em texto. A conferência física em 320 e 430 dp consta no roteiro abaixo. |
| RNF03 e RNF04 | `firestore.rules` e `tests/rules/firestore.rules.test.ts` verificam acesso por UID, campos obrigatórios e a proteção de marcadores de exclusão. |

A data da tela representa o último ciclo UC16 que concluiu o envio e a leitura do servidor com a fila resolvida. O SQLite mantém os estados de envio `pendente` e `sincronizado`. O estado geral informa também falta de conexão e erros.

### Códigos do UC16

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

A evidência em aparelho de reconexão, restauração e conferência em 320 e 430 dp permanece pendente.

## Roteiro de prova manual no Expo Go ou APK

Use uma conta confirmada de teste e dados fictícios. Com um aparelho físico e o Emulator Suite, configure o IP da máquina conforme o README do app.

1. Com conexão, abra o app e entre na conta. Em **Resumo financeiro → Sincronização**, confira a primeira conclusão e registre a hora exibida.
2. Com o app aberto, desligue Wi-Fi e dados móveis. Registre uma receita e uma despesa do mês atual. Confira **Sincronização pendente** nas duas listas e **Sem conexão** na tela de sincronização. Compare os dois lançamentos com as entradas correspondentes na fila.
3. Reconecte com a tela de sincronização aberta. Aguarde a fila esvaziar sem acionar **Sincronizar agora**. Confira a nova data, o estado **Sincronizado** e os rótulos nas listas.
4. Acione **Sincronizar agora** mais duas vezes. Confira que os lançamentos continuam com os mesmos valores e aparecem uma única vez. Exclua uma receita de teste e sincronize.
5. Reinstale o app de desenvolvimento ou abra a mesma versão em um aparelho de teste com base vazia. Entre na mesma conta. Confira que os registros ativos retornam, que a receita excluída continua fora da lista e que os totais correspondem aos lançamentos restaurados.
6. Confira as telas com 320 e 430 dp. Verifique a leitura da data, a quebra de títulos longos, a rolagem da fila e o acesso ao botão com leitor de tela.

Para a evidência do DoD, grave os passos 2–5 e anote as larguras verificadas. O roteiro não registra uma execução em aparelho.

## Integrações pendentes

A branch inclui a restauração do saldo inicial do UC08. A sincronização recalcula os totais disponíveis no Resumo e restaura os alertas de saldo. A integração com o recálculo de metas, pontos e selos permanece pendente.
