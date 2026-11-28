# Validação manual do UniCash

## Preparação e evidências

1. Anote o commit ou a versão do APK, o aparelho, a versão do sistema e a data. Para Expo Go, execute `npm ci` e `npm start` em `mobile/`. Veja a [configuração do app](../README.md#configurar-o-firebase) para o Firebase. Os cenários com e-mail real exigem o Firebase de desenvolvimento com o provedor E-mail/senha habilitado e as regras desta versão publicadas. Para UC16, também é possível usar o Emulator Suite conforme a [documentação técnica](RASTREABILIDADE.md#uc16--sincronizar-dados).
2. Comece pelo **UC15** e pelos estados de instalação limpa do **UC14**, do **UC03** e do **UC07**. Use bases e contas de teste. Na tela inicial de cadastro, toque em **Continuar sem conta** para executar os cenários locais. Para validar offline no Expo Go, abra o app e carregue o bundle antes de ativar o modo avião. Para reinstalação e restauração, use uma instalação dedicada a teste ou outro aparelho.
3. Por cenário, registre **Aprovado**, **Falhou**, **Bloqueado** ou **Não executado**, com resultado observado e evidência. Quando houver falha, anote os passos e os dados que você usou. Anexe as evidências à issue ou ao PR correspondente.

| UC e cenário | Resultado | Resultado observado / evidência |
| --- | --- | --- |
| | | |

## Índice

| Caso de uso | Origem dos passos |
| --- | --- |
| [UC01 — Gerenciar receitas](#uc01--gerenciar-receitas) | Roteiro existente |
| [UC02 — Gerenciar despesas](#uc02--gerenciar-despesas) | Roteiro existente |
| [UC03 — Consultar resumo financeiro](#uc03--consultar-resumo-financeiro) | Roteiro existente |
| [UC04 — Saldo mensal](#uc04--calcular-e-acompanhar-o-saldo-mensal) | Novo |
| [UC05 — Monitorar limites de gastos](#uc05--monitorar-limites-de-gastos) | Roteiro existente, ampliado |
| [UC06 — Gerenciar categorias](#uc06--gerenciar-categorias) | Novos passos a partir da evidência histórica |
| [UC07 — Consultar evolução mensal](#uc07--consultar-evolução-mensal) | Roteiro existente |
| [UC08 — Registrar saldo inicial](#uc08--registrar-saldo-inicial) | Novo |
| [UC09 — Indicadores de consumo](#uc09--consultar-indicadores-de-consumo-por-categoria) | Novo |
| [UC10 — Autenticar usuário](#uc10--autenticar-usuário) | Roteiro existente |
| [UC11 — Gerenciar perfil](#uc11--gerenciar-perfil) | Novo para consulta e edição |
| [UC12 — Gerenciar metas financeiras](#uc12--gerenciar-metas-financeiras) | Novo |
| [UC13 — Conquistas](#uc13--conquistas) | Aguardando implementação na develop |
| [UC14 — Configurar notificações](#uc14--configurar-notificações) | Roteiro existente, ampliado |
| [UC15 — Tutorial](#uc15--conhecer-o-aplicativo-pelo-tutorial) | Roteiro existente |
| [UC16 — Sincronizar dados](#uc16--sincronizar-dados) | Roteiro existente, ampliado |

## UC01 — Gerenciar receitas

### Fluxo principal

No Início, abra **Receitas**, cadastre uma receita avulsa de R$ 100,10 e abra o detalhe. Edite título, valor e data para outro mês. Confira a movimentação na lista e nos totais dos dois meses. Teste o filtro de data, rejeite um título vazio ou um valor zero e verifique os dois caminhos da exclusão, cancelar e confirmar.

### 1. Encerramento forçado durante a gravação (RNF35)
1. Registre uma receita **recorrente sem término** (gera ~13 ocorrências).
2. No instante em que tocar em "Salvar receita", force o fechamento do app (Android: deslizar o app nos recentes; iOS: fechar pelo seletor de apps). Repita algumas vezes, variando o instante.
3. Reabra o app. **Esperado:** a série está inteira (13 ocorrências) ou ausente; nunca com ocorrências faltando no meio nem sem a série.

### 2. Offline, reinício e nuvem
1. Com a conta conectada, ative o modo avião. Registre, edite e exclua receitas.
   **Esperado:** tudo funciona; registros mostram "Sincronização pendente" e o cabeçalho mostra "N pendentes".
2. Feche e reabra o app ainda offline. **Esperado:** os dados continuam lá e continuam pendentes.
3. Desative o modo avião e abra a lista. **Esperado:** pendências somem e os documentos aparecem em `usuarios/{uid}/receitas` no console do Firebase.
4. Exclua uma receita já sincronizada e deixe sincronizar. **Esperado:** a receita desaparece da lista e o documento do Firestore recebe o marcador `excluido_em`.
5. **Restauração da nuvem:** a função `restaurarDaNuvem()` (em `sync.ts`) já existe e é coberta por `service/receita/sync.test.ts`. Para validar no aparelho: com a conta conectada e dados sincronizados, desinstale/limpe o app, entre na mesma conta para iniciar a restauração automática. **Esperado:** receitas e séries voltam sem duplicar ocorrências, e a receita excluída **não** reaparece. Quem chama a função é o UC10: ao entrar com uma conta em aparelho vazio, a restauração é automática (cenário 6 do [UC10](#uc10--autenticar-usuário)).

### 3. RNF14 – o usuário identifica o motivo do erro (4 de 5)
- Recrute 5 pessoas. Para cada uma, mostre a tela de nova receita já com um erro provocado (um por pessoa, rodando os 5 primeiros): data vazia; título só com espaços; valor `0`; valor `10,999`; término anterior ao início.
- Pergunte: "O que precisa corrigir?" sem ajuda.
- **Passa** se pelo menos 4 de 5 apontarem o campo e o motivo corretos. Registre as respostas.

### 4. RNF27 – registro em até 3 etapas
Contagem (sem recorrência), a partir da lista: **(1)** tocar em "+"; **(2)** preencher título, valor e data (o botão "Hoje" ajuda); **(3)** tocar em "Salvar receita". Cronometre 5 pessoas e confirme que ninguém precisa de um passo extra.
**Com recorrência:** a contagem ainda está pendente de definição (abrir "Repetição", escolher "Repete", ajustar e "Concluir" somam etapas); anote o resultado para decidir o limite.

## UC02 — Gerenciar despesas

Rodar no Expo Go ou no APK. Registre prints ou um vídeo curto de cada roteiro.

### 1. Persistência após fechar e reabrir o app
1. Registre uma despesa avulsa (título, valor e data) e uma despesa recorrente com término.
2. Edite a avulsa (mude o valor e associe uma categoria) e exclua uma ocorrência da série.
3. Feche o app pelo seletor de apps e reabra.
4. **Esperado:** a despesa avulsa mostra o valor editado, a série mantém as ocorrências restantes e a
   excluída não reaparece; o total do período confere.

### 2. Precisão do total
1. Registre duas despesas no mesmo mês: R$ 0,10 e R$ 0,20. **Esperado:** total `− R$ 0,30`.
2. Registre uma despesa de R$ 10,99. **Esperado:** a lista e o detalhe mostram `10,99`, sem arredondamento.

### 3. Encerramento forçado durante a gravação (RNF35)
1. Registre uma despesa **recorrente sem término** (gera ocorrências para os próximos 12 meses).
2. No instante em que tocar em "Salvar despesa", force o fechamento do app. Repita variando o instante.
3. Reabra. **Esperado:** a série está inteira ou ausente; nunca com ocorrências faltando no meio.

### 4. Offline, sincronização e restauração
Use conta de teste confirmada com envio habilitado no [UC10](#uc10--autenticar-usuário).

1. Com a conta conectada, ative o modo avião. Registre, edite e exclua despesas.
   **Esperado:** tudo funciona; os itens mostram "Sincronização pendente" e a lista mostra "↻ N pendentes".
2. Desative o modo avião e abra a lista. **Esperado:** as pendências somem e os documentos aparecem em
   `usuarios/{uid}/despesas` no console do Firebase, sem campos nulos para despesa sem categoria.
3. Exclua uma despesa já sincronizada. **Esperado:** o documento recebe o campo `excluido_em` no console e a despesa sai da lista.
4. Limpe o app, entre na mesma conta para iniciar a restauração automática. **Esperado:** despesas e séries voltam (séries
   continuam sendo de despesa) e a despesa excluída não reaparece.

### 5. Mensagens de exceção
- **EX05:** abra uma despesa, exclua-a por outro caminho (ou por outro aparelho com a mesma conta) e tente
  editar ou salvar. **Esperado:** "Esta despesa não está mais disponível." na lista.
- **EX06:** coberto pelos testes automatizados com falha de acesso.

### 6. Registro simples em três etapas (RNF27)
1. Na tela inicial, acione "Despesas".
2. Na lista, acione "Nova despesa".
3. Preencha título, valor e data e acione "Salvar despesa".
   **Esperado:** a lista volta com a despesa registrada no mês correspondente e a confirmação de sucesso.

## UC03 — Consultar resumo financeiro

Abra o Resumo depois de entrar ou escolher **Continuar sem conta**. Se aparecer a oferta inicial, execute o [UC15](#uc15--conhecer-o-aplicativo-pelo-tutorial) antes.
Resultados em `tests/RASTREABILIDADE.md`, seção do UC03.

### 1. Fluxo principal e alternativos no aparelho
1. **FA02 – sem lançamentos:** com a base vazia (limpe os dados do Expo Go), abra o app.
   **Esperado:** "Nenhum lançamento ainda", com "Ver tutorial" (abre o tutorial inicial) e atalhos para registrar receita e despesa; os botões Receitas, Despesas e Categorias continuam no fim da tela (Categorias deve abrir mesmo sem lançamentos).
2. **Passos 3 e 4:** registre no mês atual duas receitas no mesmo dia (ex.: R$ 100,10 e R$ 50,20), uma em outro dia e duas despesas. Volte ao resumo.
   **Esperado:** saldo, total de receitas e total de despesas batem com a conta feita à mão; "Receitas por dia" mostra só os dias com lançamento, e o dia com duas receitas aparece somado (R$ 150,30).
3. **Passos 5 e 6 / FA04:** use as setas para ir a meses anteriores e futuros, passando pela virada do ano. Registre uma receita com data num mês futuro.
   **Esperado:** cada mês mostra os próprios totais; ao trocar de mês, aparece o carregamento e nunca os valores do mês anterior sob o título novo; a receita futura aparece no mês dela.
4. **FA01:** vá a um mês com despesas e sem receitas. **Esperado:** total de receitas R$ 0,00 e "Nenhuma receita neste mês."
5. **FA05:** edite o valor de uma receita, exclua uma despesa e volte ao resumo. **Esperado:** os totais e o saldo são recalculados.
6. **Pós-condição:** navegue por vários meses e confira as listas de receitas e despesas. **Esperado:** nada foi alterado.

### 2. FA03 – offline e sem conta (RN06, RF61)
Ative o modo avião, sem conta conectada, e repita os passos 2 a 5 do cenário 1. **Esperado:** o resumo funciona igual, calculado só com a base local.

### 3. RNF20 – diferentes tamanhos de celular
Abra o resumo num aparelho pequeno (≈ 360 dp de largura) e num grande, ou aumente o tamanho da fonte do sistema.
**Esperado:** nada cortado nem sobreposto; os cartões de receitas e despesas e os botões passam para uma coluna quando não cabem lado a lado; o nome do mês não empurra as setas; a tela rola até o fim.

### 4. RNF07 – precisão
Registre receitas de R$ 0,10 e R$ 0,20 no mesmo dia. **Esperado:** o dia e o total mostram exatamente R$ 0,30.

O EX01 (falha no cálculo) não é provocável no aparelho sem alterar o código; fica coberto pelos testes automatizados.

### 5. Geração de recorrências na abertura do resumo

1. Em um aparelho de teste, no primeiro dia de um mês, registre uma receita de R$ 100,10 e uma despesa de R$ 40,20, ambas com repetição mensal, sem término e com a data de início nesse dia. Nas listas de receitas e despesas, confirme que o mês 13 meses à frente ainda não tem ocorrências dessas séries.
2. Encerre o app, avance a data do aparelho para o primeiro dia do mês seguinte e reabra no Expo Go. **Sem tocar nas setas de mês**, assim que a camada "Preparando seus dados locais…" sumir, confira que o resumo do mês corrente já mostra receitas de R$ 100,10, despesas de R$ 40,20 e saldo de R$ 59,90 (e não o estado vazio nem a mensagem de falha). Só então navegue até o mês que estava vazio no passo anterior.
3. Confira nesse mês uma ocorrência de cada série, receitas de R$ 100,10, despesas de R$ 40,20 e saldo de R$ 59,90. Encerre e abra o app novamente e confirme que as ocorrências e os totais permanecem iguais. Restaure a data automática do aparelho após o teste.

## UC04 — Calcular e acompanhar o saldo mensal

1. **Resultado do mês.** Sem conta e em modo avião, registre no mês selecionado uma receita de R$ 100,10 e uma despesa de R$ 40,20. Confira **Saldo do mês** de R$ 59,90 e **59,8% da receita disponível**. No mês seguinte, registre uma receita de R$ 20,00 e uma despesa de R$ 5,00. Confira saldo de R$ 15,00 e **Saldo anterior** de R$ 59,90.
2. **Recálculo.** Edite a primeira despesa para R$ 50,20. Confira R$ 49,90 no primeiro mês e como saldo anterior no mês seguinte. Exclua essa despesa e confira R$ 100,10 nos dois campos correspondentes. Navegue entre os meses e reabra o app para conferir a persistência.
3. **Transição para saldo negativo.** Em um mês de teste vazio, registre uma despesa de R$ 25,50. Confira **Saldo do mês** de −R$ 25,50, **Sem receitas no mês** e o aviso de R$ 0,00 → −R$ 25,50. Toque em **Dispensar aviso**. Reabra o app e confirme que esse aviso não voltou. Registre receita de R$ 30,00 e depois outra despesa de R$ 10,00. Confira o novo aviso de R$ 4,50 → −R$ 5,50.
4. **Referência a partir do resumo.** Selecione um mês e use **Informar saldo inicial**. Salve −R$ 35,10. Nesse mês, **Saldo anterior** exibe −R$ 35,10 e **Saldo do mês** continua sendo a diferença entre as receitas e as despesas do mês. Confira a edição e a restauração pelo roteiro do [UC08](#uc08--registrar-saldo-inicial).

Os testes de [ResumoFinanceiro](screens/ResumoFinanceiro.test.tsx) cobrem falhas de leitura e gravação.

## UC05 — Monitorar limites de gastos

Use um Android ou iPhone com o aplicativo carregado e as notificações autorizadas no sistema. No Início, abra **Preferências de alertas** e habilite **Alertas de aproximação** e **Alertas de ultrapassagem** e use duas categorias sem despesas no mês, cada uma com limite fixo de R$ 100,00.

| Cenário | Passos | Resultado esperado | Evidência |
| --- | --- | --- | --- |
| Online e deduplicação | Na primeira categoria, registre R$ 80,00. Depois some R$ 20,00 e, por fim, R$ 0,01. Reabra o app. | Uma aproximação em R$ 80,00, nenhuma nova notificação em R$ 100,00 e uma ultrapassagem em R$ 100,01. Reabrir não repete os alertas. | Pendente |
| Offline e reconexão | Com o app já carregado, desligue Wi-Fi e dados móveis. Na segunda categoria, registre R$ 80,00 e depois R$ 20,01. Confira as despesas na lista e as notificações com a rede desligada. Religando a rede, volte ao app. | As despesas ficam salvas. As notificações de aproximação e ultrapassagem aparecem antes da reconexão, com categoria, gasto e limite. A reconexão não repete os alertas. | Pendente |

Anexe ao PR #118 um vídeo ou capturas de cada cenário. Registre modelo, versão do sistema, versão do app ou commit testado e data. Na gravação offline, mostre o estado da conexão antes do lançamento e na emissão. Se testar a sincronização, use uma conta de teste confirmada, iniciada antes de desligar a rede.

Para conferir um limite percentual, use uma terceira categoria com limite de 20% e renda mensal de R$ 500,00. Registre R$ 80,00 em despesas vinculadas para obter um alerta de aproximação. Edite para R$ 100,01 para obter o alerta de ultrapassagem. Confira o limite de R$ 100,00 no texto.

O app tem também o interruptor **Alertas de limite (80% e 100%)** em **Perfil → Notificações**. No código deste ZIP, a emissão do UC05 lê as preferências por tipo da tela **Preferências de alertas**. Registre separadamente no UC14 se desligar o interruptor do Perfil afeta os alertas na prática.

## UC06 — Gerenciar categorias

1. **Catálogo e estado vazio.** Abra **Categorias** no Início com uma base de teste recém-criada. Confira a lista de categorias padrão. Abra **Ver despesas** em uma categoria sem despesas e confirme o estado vazio. Saia e volte à lista de categorias. Confira que as padrão não foram duplicadas.
2. **Criar e validar.** Em modo avião, toque em **+** e crie a categoria **Transporte teste** com limite fixo de R$ 100,00. Tente criar outra com o mesmo nome e confirme a rejeição. Teste também nome em branco e limite percentual de 0,99% e de 100,01%. Confira que 1% e 100% são aceitos.
3. **Consultar.** Salve duas despesas na categoria de teste e outra em uma categoria diferente, no mesmo mês. Confira a contagem da categoria e abra **Ver despesas**. Confira que a lista mostra somente as duas despesas vinculadas.
4. **Editar.** Altere o nome e o limite da categoria própria, feche e reabra o app e confira os valores. Abra uma categoria padrão e confira que é possível editar ou remover seu limite, com o nome protegido e sem opção de exclusão.
5. **Excluir e preservar despesas.** Abra a categoria própria, inicie a exclusão e cancele. Confira que ela permanece com os vínculos. Repita e confirme. As duas despesas continuam na lista com os mesmos valores e aparecem como **Sem categoria**. Confira que o total do mês permanece igual.
6. **Sincronizar.** Com uma conta confirmada de teste e envio ativo, repita criação, edição e exclusão enquanto estiver offline. Reconecte e acompanhe o [UC16](#uc16--sincronizar-dados). Em outra instalação da mesma conta, confira que o catálogo atualizado e as despesas desvinculadas são recuperados, sem recriar a categoria excluída.

A [rastreabilidade do UC06](RASTREABILIDADE.md#441-testes-manuais--expo-go-em-dispositivo-android) registra a execução local de 20/11/2026.

## UC07 — Consultar evolução mensal

Rodar com `npx expo start` e abrir no Expo Go. O gráfico fica na tela do resumo (`src/app/index.tsx`), na seção "Evolução mensal".
Resultados em `tests/RASTREABILIDADE.md`, seção do UC07.

### 1. Fluxo principal e alternativos no aparelho
1. **FA02 – sem lançamentos:** com a base vazia, abra o app. **Esperado:** o resumo mostra "Nenhum lançamento ainda" com "Ver tutorial", e a seção "Evolução mensal" não aparece.
2. **Passos 2 a 4:** registre receitas e despesas em pelo menos 7 meses diferentes (inclua o mês atual) e volte ao resumo.
   **Esperado:** o gráfico mostra 6 meses, o atual e os 5 anteriores, com uma barra verde (receitas) e uma marinho (despesas) por mês; o mês atual aparece destacado, e o detalhe abaixo do gráfico mostra os totais dele, que batem com a conta feita à mão.
3. **Passos 5 e 6:** toque na barra de outro mês. **Esperado:** o seletor e o resumo passam para esse mês, a barra tocada fica destacada e o gráfico continua mostrando os mesmos 6 meses.
4. **FA05:** pelo seletor, avance para o mês seguinte ao atual e depois volte até 6 meses antes dele. **Esperado:** em cada vez que o mês escolhido sai dos 6 exibidos, o gráfico passa a terminar nele; enquanto o mês está dentro da janela, o gráfico não muda.
5. **FA01:** num mês só com despesas, a barra de receitas fica sem altura (e vice-versa).
6. **FA04:** registre uma receita com data num mês futuro e navegue até ele. **Esperado:** a barra do mês futuro mostra o valor.
7. **FA06:** edite o valor de uma receita, exclua uma despesa e volte ao resumo. **Esperado:** as barras e o detalhe são recalculados.
8. **Pós-condição:** navegue pelo gráfico e confira as listas de receitas e despesas. **Esperado:** nada foi alterado.

### 2. FA03 – offline e sem conta (RN06, RF61)
Ative o modo avião, sem conta conectada, e repita os passos 2 a 4 do cenário 1. **Esperado:** o gráfico funciona igual, calculado só com a base local.

### 3. RNF20 e RNF38 – tamanhos de tela e cores
Abra o resumo num aparelho pequeno (≈ 360 dp de largura) e num grande. **Esperado:** as 6 colunas cabem sem cortar, os rótulos dos meses e a legenda ficam legíveis, e as barras usam o verde e o marinho da paleta.

### 4. RNF07 – precisão
Registre receitas de R$ 0,10 e R$ 0,20 no mesmo mês. **Esperado:** o detalhe do mês mostra exatamente R$ 0,30.

O EX01 (falha no cálculo) não é provocável no aparelho sem alterar o código; fica coberto pelos testes automatizados.

## UC08 — Registrar saldo inicial

1. **Cadastro local.** Sem conta, abra **Configurações financeiras → Saldo inicial**. Confira o estado de referência ausente. Em modo avião, informe −R$ 125,50 e o mês corrente em AAAA-MM. Salve e confira **Saldo inicial salvo neste aparelho**. Feche e reabra o app e confira valor, mês e campos preenchidos.
2. **Validação.** Tente salvar `10,999` e um mês com sufixo `-13`. Confira as mensagens dos campos e que a referência anterior continua gravada ao reabrir a tela.
3. **Substituição e efeito no resumo.** Salve R$ 0,00 no mês anterior usando o seletor de mês. Confira que a configuração mostra apenas a nova referência. No mês escolhido, o **Saldo anterior** mostra R$ 0,00. No mês anterior à referência, confira **Saldo anterior · sem dados**. Cadastre receitas e despesas no mês da referência e confira que **Saldo do mês** é calculado pelos lançamentos.
4. **Envio e recuperação.** Com conta confirmada e envio ativo, salve uma referência offline e confira **Sincronização pendente**. Reconecte e aguarde ou use **Sincronizar agora**. Confira o valor e o mês em `usuarios/{uid}/saldo_inicial/atual`. Entre em outra instalação da mesma conta com base vazia. Confira se a referência voltou em **Configurações financeiras** e no **Saldo anterior** do mês de referência.

Anote o mês e o valor usados antes da edição e após a restauração.

## UC09 — Consultar indicadores de consumo por categoria

1. **Limite fixo e faixas.** Com limite fixo de R$ 100,00 em uma categoria sem gastos no mês, cadastre uma despesa de R$ 49,00 e edite sucessivamente para R$ 50,00, R$ 80,00, R$ 90,00, R$ 90,01 e R$ 110,00. Confira, na lista de **Categorias** e em **Consumo por categoria** no Resumo, os valores e as faixas verde, amarela, laranja, laranja, vermelha e vermelha, respectivamente. Confirme também o rótulo da faixa ao cruzar cada fronteira.
2. **Limite percentual.** Configure outra categoria com limite de 20%. No mesmo mês, registre renda de R$ 500,00 e despesa de R$ 60,00 nessa categoria. Confira limite efetivo de R$ 100,00 e 60% de consumo. Edite a renda para R$ 1.000,00 e confira limite de R$ 200,00 e 30%. Exclua a única receita e confira a indicação de limite indisponível. Remova o limite e confira que o indicador desaparece do Resumo e que a categoria segue na lista.
3. **Período e recálculo.** Cadastre gastos diferentes em dois meses. Alterne o mês no Resumo e, separadamente, na lista de Categorias. Confira os valores de cada mês. Mova uma despesa para outra categoria ou mês, exclua a despesa e confirme a atualização dos períodos e categorias afetados. Despesas sem categoria ficam fora desses indicadores.
4. **Offline e isolamento.** Repita uma edição com o app já carregado e em modo avião. As duas telas devem refletir os dados locais. Se houver duas contas de teste, troque de sessão e confirme que cada conta exibe apenas o consumo dos seus próprios lançamentos.

A [rastreabilidade de integração](RASTREABILIDADE.md#45-pendências-de-integração) aponta os testes de cálculo, troca de mês e isolamento.

## UC10 — Autenticar usuário

Antes de começar, cadastre alguns registros locais (receitas e despesas) para conferir que os dados do aparelho são preservados. Use três caixas de e-mail de teste (A, B e C) e bases separadas para repetir os cenários de primeiro envio. Anexe as evidências na issue.

### 1. Cadastro e confirmação do e-mail
1. Conta → Criar conta. Informe o e-mail A e a senha `Abcdef1!`. **Esperado:** a tela informa a finalidade dos dados e não pede CPF; chega o e-mail de confirmação. No Console, `usuarios/{uid}` existe (só `email`, `criado_em` e `nome`, se informado) e **não há** documentos em `usuarios/{uid}/receitas`, mesmo com registros locais e conexão: nada sobe antes de confirmar o e-mail.
2. Antes de confirmar, feche o app, abra e tente Entrar com o e-mail A. **Esperado:** "Este e-mail ainda não foi confirmado" e a tela de confirmação com "Reenviar". Não há sessão.
3. Toque em "Reenviar". **Esperado:** chega uma nova ligação. (A tela deve orientar o reenvio sem prometer uma validade em minutos. Se mostrar "5 minutos", registre na issue.)
4. Abra a ligação, volte ao app e toque "Já confirmei". **Esperado:** a sessão inicia e o app pergunta se envia os dados do aparelho.
5. Tente cadastrar de novo o e-mail A. **Esperado:** "Este e-mail já está em uso."
6. Tente cadastrar com `Abcde1!` (7 caracteres), `abcdef1!`, `ABCDEF1!` e `Abcdefg1`. **Esperado:** cada uma é recusada com a mensagem da política, o e-mail preservado e a senha limpa.

### 2. Entrar, reabrir o app e uso sem conta
1. Entre com o e-mail A. **Esperado:** vai à tela inicial.
2. Feche o app por completo e abra de novo. **Esperado:** a sessão continua ativa e os dados locais estão lá.
3. Em outro aparelho (ou após Sair), use "Continuar sem conta". **Esperado:** o app funciona normalmente só no aparelho (RF61).

### 3. Sair e dados locais (RN06, FA03)
1. Conta → Sair, sem pendências. **Esperado:** "Sessão encerrada" e os dados continuam no aparelho.
2. Entre de novo, ative o modo avião, registre uma receita e toque em Sair. **Esperado:** o app avisa da alteração pendente; "Sair mesmo assim" encerra; com conexão, "Sincronizar e sair" envia antes.
3. Reabra o app. **Esperado:** os dados locais continuam.

### 4. Sem conexão (EX03, EX05, FA04)
1. Com o modo avião, tente cadastrar, entrar e recuperar a senha. **Esperado:** cada operação mostra a mensagem de falta de conexão e nada é criado.
2. Com sessão ativa e modo avião, toque em Sair. **Esperado:** a sessão é encerrada sem exigir conexão.

### 5. Recuperar a senha
1. Entrar → Esqueci minha senha → e-mail A. **Esperado:** mensagem neutra ("Se existir uma conta com esse e-mail...") e chega o e-mail.
2. Abra a ligação e defina a nova senha na página do Firebase. **Esperado:** a senha antiga deixa de funcionar e a nova entra no app.
3. Informe um e-mail sem conta. **Esperado:** a mesma mensagem neutra, sem revelar se a conta existe.

### 6. Envio inicial e restauração

Use cadastros novos com dados preparados antes de confirmar o e-mail.
1. Confirme o e-mail A e escolha "Enviar meus dados". **Esperado:** os registros continuam no app e aparecem em `usuarios/{uid}/receitas`, `despesas` (se a UC02 já estiver integrada) e `recorrencias` no Console do Firebase; uma receita registrada depois disso sobe sem nova ação; o perfil `usuarios/{uid}` tem só `email`, `criado_em` e `nome` (se informado), sem CPF e sem senha.
2. **FA01 — recusar o envio.** Cadastre o e-mail B, confirme e escolha "Não enviar". **Esperado:** vai à tela inicial; os dados ficam só no aparelho e nada aparece na nuvem.
   1. Registre uma receita nova e abra a lista, com conexão. **Esperado:** continua "pendente" (cabeçalho com "N pendentes") e nada aparece no Console. Feche e reabra o app: a pausa continua.
   2. Conta → Sair → "Sincronizar e sair". **Esperado:** todos os pendentes (os do aparelho e os feitos depois da recusa) aparecem em `usuarios/{uid}/receitas` e a sessão é encerrada.
   3. Entre de novo com o e-mail B, registre outra receita e abra a lista. **Esperado:** ela sobe sozinha: o envio automático voltou depois do pedido da pessoa.
   4. Com outro e-mail (C), cadastre, confirme e **feche o app sem responder** à pergunta. Reabra e entre. **Esperado:** nada sobe até a pessoa pedir o envio (a pausa começa no cadastro).
   5. Troque de conta no mesmo aparelho e confirme que a pausa de uma não afeta a outra. Confira que as pendências de A não aparecem na fila de B nem são enviadas para o UID de B.
3. **Aparelho novo:** com os dados do passo 1 já enviados, limpe os dados do app (ou reinstale) e entre com o e-mail A. **Esperado:** receitas, despesas e séries voltam sem duplicar ocorrências, e a receita excluída não reaparece. Se aparecer mensagem de catálogo ausente, registre a falha na evidência antes de tentar abrir **Categorias** e entrar novamente.

### 7. Acessibilidade e identidade visual (RNF33, RNF38)
Percorra cadastro, entrada, confirmação, recuperação e conta com TalkBack (Android) ou VoiceOver (iOS), com a fonte ampliada e nos modos claro e escuro. **Esperado:** todo campo e botão tem rótulo lido pelo leitor de tela; o texto continua legível com fonte ampliada; os contrastes seguem a WCAG 2.1 AA; a paleta é a "Tesouraria Teal". Registre as respostas.

### 8. Verificações no Console do Firebase
- A conta aparece em Authentication com o e-mail confirmado.
- Séries (`recorrencias`): se alguma série ficar pendente com "permission-denied" (aviso de acesso negado na lista), registre na issue. Nos envios aceitos, confira o campo `tipo` no documento da série.
- Uma chamada direta à API com senha de 7 caracteres é recusada, se a política de senha do servidor estiver ativa.

## UC11 — Gerenciar perfil

Use uma conta de teste confirmada e uma segunda caixa de e-mail ainda não cadastrada. O atalho **Conta** no Início abre **Editar perfil** com sessão ativa.

1. **Consulta e cancelamento.** Confira o e-mail da conta. Abra **Editar perfil**, altere o e-mail no formulário e toque em **Cancelar**. Reabra e confirme que o e-mail anterior foi preservado.
2. **Troca de senha.** Mantenha o e-mail atual. Tente salvar com senha atual incorreta e, depois, com senha nova fora da política. Confira as mensagens e que a senha original ainda funciona. Com a senha atual correta, informe nova senha válida, salve, saia e confirme que só a nova senha permite entrar.
3. **Troca de e-mail.** Informe o novo e-mail e a senha atual. Salve, reabra **Editar perfil** e confirme que o e-mail anterior permanece ativo e há ações **Já confirmei** e **Reenviar**. Toque em **Já confirmei** antes de abrir o link e confira a mensagem de confirmação pendente. Reenvie e abra o link na caixa de teste. Volte ao app e toque em **Já confirmei**. Confira o novo e-mail no perfil, no Firestore e em um novo login. Depois, reabra offline com a sessão ativa e confira o e-mail confirmado no perfil.
4. **Validação e desconexão.** Tente alterar para um e-mail inválido ou já utilizado por outra conta de teste. Confira a mensagem e o e-mail atual preservado. Com o modo avião ativo, tente editar o perfil e confirme que o app pede conexão e que a alteração pode ser refeita ao reconectar.

### Exclusão de conta no plano Spark (fluxo C, RF05)

Use um projeto Firebase de teste com as regras atualizadas e uma conta confirmada descartável, com lançamentos já sincronizados. Anote o UID e, para testar o bloqueio de sincronização, mantenha a mesma conta ativa em uma segunda instalação.

1. **Cancelamento e senha incorreta.** Abra **Conta → Excluir conta** e cancele. Abra de novo e informe uma senha incorreta. Confira que a sessão e os lançamentos locais continuam disponíveis e que `pedidos_remocao/{uid}` ainda não existe.
2. **Sem conexão.** Ative o modo avião no aparelho que fará o pedido e tente confirmar com a senha correta. Confira a mensagem de conexão e a preservação da sessão e dos dados locais. Reconecte e confirme que nenhum pedido foi criado durante essa tentativa.
3. **Pedido recebido e limpeza local.** Confirme com a senha correta. Confira **Solicitação de exclusão recebida**, a saída da sessão e o status `pendente` no Firestore. Reabra o app e confira que os dados da conta removida ficaram indisponíveis no aparelho solicitante. Se havia dados de teste na base sem conta, confira que continuam disponíveis.
4. **Bloqueio em outro aparelho.** Antes de processar o pedido, crie uma receita na segunda instalação e tente sincronizar. Confira que a nova receita não aparece no Firestore. A segunda instalação pode conservar sua cópia local.
5. **Processamento administrativo.** Siga as [instruções do script](../../scripts/remocao-conta/README.md) para o UID de teste. Após executar, confira que `usuarios/{uid}` e suas subcoleções foram removidos, que o UID sumiu do Authentication e que o pedido ficou `concluido`. Execute novamente e confira que o script informa que o pedido já foi concluído.
6. **Retomada.** Em ambiente de teste, simule uma interrupção depois de apagar os dados do Firestore e antes de excluir o UID do Authentication. Confira que o pedido ainda bloqueia gravações. Após a expiração da reserva, execute o script para o mesmo UID e confirme a conclusão.

Registre as evidências por cenário. A política de backup de 60 dias e o prazo operacional de processamento continuam pendentes de definição.

## UC12 — Gerenciar metas financeiras

1. **Vazio, cadastro e validação.** Abra **Metas** em uma base sem metas. Confira o estado vazio e a ação de criação. Envie o formulário em branco e confira os campos obrigatórios. Crie uma **meta de investimento** de R$ 100,00, com prazo futuro e sem valor acumulado. No detalhe, confira que o realizado e o percentual estão indisponíveis até informar o acumulado.
2. **Investimento e persistência.** Edite o acumulado para R$ 0,00, depois R$ 40,00 e R$ 100,00. Confira respectivamente 0%, 40% e 100%, com R$ 100,00, R$ 60,00 e R$ 0,00 restantes. Aos 100%, confira a situação alcançada. Edite novamente para R$ 50,00 e confira o retorno a **Em andamento**. Feche e reabra e confira a persistência e o tipo protegido na edição.
3. **Meta de gasto.** Crie uma meta de R$ 100,00 para uma categoria própria sem gastos, com prazo futuro. Cadastre com a data de hoje uma despesa da categoria no valor de R$ 79,00. Edite para R$ 80,00, R$ 100,00 e R$ 100,01. No detalhe confira, respectivamente, **Dentro do limite**, **Próximo do limite**, **Limite atingido** e **Limite ultrapassado**. Uma despesa de outra categoria ou fora do período não compõe esse progresso. Confira o valor atualizado em **Metas do período** no Resumo.
4. **Cancelamento e exclusão.** Edite uma meta e cancele. Confira os dados anteriores. No detalhe, tente excluir e cancele a confirmação, depois repita e confirme. A meta sai da lista e os lançamentos continuam nas listas e nos totais. Em outra meta de gasto, exclua a categoria vinculada e confira a indicação de progresso indisponível e a ação de editar a categoria da meta.
5. **Offline e restauração.** Com conta confirmada e envio ativo, crie ou edite uma meta em modo avião. Confira a pendência e o progresso local após reabrir. Reconecte, aguarde o envio e confira a recuperação em outra instalação da mesma conta. Se testar concorrência, edite objetivo e valor alvo em aparelhos diferentes enquanto estiverem offline, reconecte ambos e confira a convergência das duas alterações.

As integrações de metas com o recálculo dos alertas/progresso de categorias (FA04 e FA07) e a mensagem de acesso negado no app (EX06) estão parciais nesta versão. Veja a [rastreabilidade do UC12](RASTREABILIDADE.md#8-uc12--gerenciar-metas-financeiras).

## UC13 — Conquistas

A validação em aparelho fica bloqueada até a implementação entrar na develop.

## UC14 — Configurar notificações

Aparelho físico ou emulador (o Expo Go serve: o UC14 usa só permissões, sem push remoto). Base: D25.

| # | Passos | Resultado esperado | Fluxo |
|---|---|---|---|
| 1 | Instalação limpa → Início → "Perfil" | Seção "Notificações" com "Alertas de limite (80% e 100%)" e "Conquistas", os dois desligados | Passos 1 e 2, D25 |
| 2 | Ligar "Conquistas" e permitir no diálogo, se a permissão ainda estiver sem decisão | Interruptor ligado, sem aviso | Passos 3 a 5 |
| 3 | Fechar e reabrir o app | "Conquistas" continua ligado | Pós-condição |
| 3b | Desligar "Conquistas", fechar e reabrir o app | "Conquistas" continua desligado. A emissão e a supressão de notificações de conquistas ficam pendentes até o UC13 | Pós-condição, FA02 |
| 4 | Em outra instalação com permissão ainda sem decisão, ligar "Alertas de limite" e negar | Interruptor ligado e aviso de bloqueio com "Abrir configurações" | FA06 |
| 5 | Ligar "Conquistas" | O diálogo do sistema não aparece de novo | FA07 |
| 6 | Tocar "Abrir configurações", liberar as notificações e voltar | Configurações do aparelho abrem; ao voltar, o aviso some | FA06 |
| 7 | Com a permissão negada, desligar os dois tipos | O aviso some | FA06 |
| 8 | Modo avião, alternar um tipo | A gravação funciona normalmente | FA05 |
| 9 | Abrir e sair do Perfil sem tocar em nada | Nada é gravado | FA08 |
| 10 | Conferir a lista | Não aparecem lembrete diário, mês sem movimentação, prazos de metas, atividade dos grupos nem saldo negativo | FA04, D25 |

Para conferir a integração com o UC05, mantenha a permissão do sistema e as preferências por tipo do UC05 habilitadas. Use duas categorias novas, com limite de R$ 100,00. Cruze 80% em uma categoria com o interruptor **Alertas de limite (80% e 100%)** do Perfil ligado e na outra com ele desligado. O comportamento esperado para a integração é suprimir a segunda notificação. Se ela aparecer, registre falha na integração e guarde a evidência dos dois estados.

## UC15 — Conhecer o aplicativo pelo tutorial

Use o Expo Go com `npm start` dentro de `mobile/`, ou um APK desta versão. Comece em um ambiente de teste com uma instalação limpa. Para o segundo acesso, feche e reabra o app usando a mesma instalação.

- [ x] **Primeiro acesso.** Confira a oferta antes do resumo. Toque em **Iniciar tutorial** e leia as cinco etapas na ordem informação, receita, despesa, meta e resumo.
- [ x] **Conclusão e segundo acesso.** Toque em **Concluir tutorial**. Confira que o app abre o resumo. Feche o app por completo e reabra. O resumo deve aparecer sem nova oferta automática.
- [ x] **Reabertura.** Toque em **Ajuda → Tutorial** e confirme que a primeira etapa aparece. Com o mês sem lançamentos, confira também **Ver tutorial** no estado vazio.
- [ ] **Pular e encerrar.** Em outra instalação de teste sem a preferência, toque em **Pular tutorial** e confirme que a oferta não se repete ao reabrir. Na reabertura manual, encerre em uma etapa intermediária e confira que o app volta ao resumo.
- [ x] **Destinos.** Abra receita e despesa, volte ao tutorial e confirme que ele mantém a etapa corrente. Confira o exemplo de meta. Avance sem salvar e confira que os totais permanecem iguais.
- [x ] **Resumo na última etapa.** Abra **Ver meu resumo** e confira os valores do UC03 em uma base vazia e em uma base com lançamentos no mês selecionado. Toque em **Voltar ao tutorial** e confirme que a etapa **Entenda o resumo** continua aberta.
- [x ] **Validação de formulário.** Tente salvar uma receita ou despesa sem os dados obrigatórios. Confira a mensagem do formulário e que nenhum lançamento foi criado. Se for feita injeção de falha de persistência em uma build de teste, confira a mensagem do UC correspondente e a opção **Voltar à etapa**.
- [ ] **RNF20 e uso offline.** Repita a navegação em retrato nas larguras de 320, 360, 393 e 430 dp. Confira títulos, leitura do glossário, rolagem e acesso aos botões. Com o bundle já carregado, verifique o tutorial em modo avião, sem conta.

Para a evidência do DoD, registre a versão testada, a plataforma, as larguras verificadas e o resultado de cada item. O atalho da etapa de meta abre o exemplo do tutorial. Use **Metas** no Início para conferir o cadastro real do UC12.

## UC16 — Sincronizar dados

Use uma conta confirmada de teste e dados fictícios. Com um aparelho físico e o Emulator Suite, configure o IP da máquina conforme o README do app.

1. Com conexão, abra o app e entre na conta com envio automático ativo. Em **Resumo financeiro → Sincronização**, confira a primeira conclusão e registre a hora exibida.
2. Com o app aberto, desligue Wi-Fi e dados móveis. Registre uma receita e uma despesa do mês atual. Confira **Sincronização pendente** nas duas listas e **Sem conexão** na tela de sincronização. Compare os dois lançamentos com as entradas correspondentes na fila.
3. Reconecte com a tela de sincronização aberta. Aguarde a fila esvaziar sem acionar **Sincronizar agora**. Confira a nova data, o estado **Sincronizado** e os rótulos nas listas.
4. Acione **Sincronizar agora** mais duas vezes. Confira que os lançamentos continuam com os mesmos valores e aparecem uma única vez. Com o app offline, edite a despesa já sincronizada, exclua a receita de teste e cadastre uma segunda receita. Confira as operações de edição, exclusão e criação na fila. Reconecte e confirme que a fila esvazia.
5. Reinstale o app de desenvolvimento ou abra a mesma versão em um aparelho de teste com base vazia. Entre na mesma conta. Confira que os registros ativos retornam, que a receita excluída continua fora da lista e que os totais correspondem aos lançamentos restaurados.
6. Confira as telas com 320 e 430 dp. Verifique a leitura da data, a quebra de títulos longos, a rolagem da fila e o acesso ao botão com leitor de tela.

Para a evidência do DoD, grave os passos 2–5 e anote as larguras verificadas. O contrato da fila, os códigos de erro e o escopo de conflitos estão na [documentação técnica do UC16](RASTREABILIDADE.md#uc16--sincronizar-dados).

## Testes automatizados

Dentro de `mobile/`, `npm test` roda a suíte Jest. O comando `npm run test:rules` usa o Firestore Emulator e a configuração da raiz. A [matriz geral](RASTREABILIDADE.md) registra a relação entre requisitos, testes e evidências.

### Mapa de testes do UC01

| Item do checklist | Onde |
|---|---|
| Registrar com campos válidos | `service/receita/registrar.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Data, título ou valor ausentes; valor ≤ 0, > 2 casas, acima do limite (RN09) | `unit/validation.test.ts`, `unit/money.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Título vazio, só espaços, > 80; descrição vazia aceita e > 255 rejeitada (RN10) | `unit/validation.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Data futura no mês correto; filtros (sem filtro, data única, período, invertido); ordenação; estado vazio | `service/receita/consulta.test.ts`, `screens/receita/FiltroReceitas.test.tsx`, `screens/receita/ListaReceitas.test.tsx` |
| Editar cada campo, inclusive mudança de mês, e recálculo dos dois meses | `service/receita/editar.test.ts`, `service/receita/serie.test.ts` |
| Recorrência em dias, meses e anos, com e sem término; intervalo zero e término anterior rejeitados | `service/receita/recorrencia.test.ts`, `unit/validation.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Série: editar e excluir nos três alcances, totais; geração sem término (12 meses) e conclusão ao abrir o app sem duplicidade | `service/receita/serie.test.ts`, `service/receita/recorrencia.test.ts`, `screens/receita/EditarReceita.test.tsx`, `screens/receita/DetalheReceita.test.tsx` |
| Excluir com confirmação, cancelar, falha em cada etapa da transação (RNF05) | `screens/receita/DetalheReceita.test.tsx`, `service/receita/atomicidade.test.ts` |
| EX06: receita já excluída | `service/receita/editar.test.ts`, `screens/receita/DetalheReceita.test.tsx`, `screens/receita/EditarReceita.test.tsx` |
| EX08: falha de leitura local | `service/receita/leitura.test.ts`, `screens/receita/ListaReceitas.test.tsx`, `screens/receita/DetalheReceita.test.tsx`, `screens/receita/EditarReceita.test.tsx` |
| Encerramento forçado durante a gravação (RNF35) | simulado em `service/receita/atomicidade.test.ts`; cenário 1 do UC01 |
| Offline com reinício; excluir, sincronizar e restaurar da nuvem; EX07 (acesso negado) | `service/receita/sync.test.ts`, `screens/receita/ListaReceitas.test.tsx`; cenário 2 do UC01 |
| Security Rules, inclusive outro usuário (RNF03) | `rules/firestore.rules.test.ts` |
| Usabilidade RNF14 e RNF27 | cenários 3 e 4 do UC01 |

### Mapa de testes do UC10

| Item do checklist | Onde |
|---|---|
| Cadastro com campos válidos; finalidade dos dados; sem CPF | `screens/CadastroConta.test.tsx`, `service/conta/auth-conta.test.ts` |
| E-mail ausente, inválido; senha com 7 e com 8 caracteres; sem maiúscula, sem minúscula, sem caractere especial | `unit/validation-conta.test.ts`, `screens/CadastroConta.test.tsx`, `screens/RedefinirSenha.test.tsx` |
| E-mail já em uso (EX02); falha ao criar conta ou perfil sem estado parcial (EX07, EX10) | `service/conta/auth-conta.test.ts`, `screens/CadastroConta.test.tsx`, `unit/firebase-erros-conta.test.ts` |
| Conta pendente de confirmação não inicia sessão; "Já confirmei"; reenvio (EX11, FA07) | `screens/ConfirmarEmail.test.tsx`, `screens/EntrarConta.test.tsx`, `service/conta/auth-conta.test.ts` |
| Entrada com credenciais corretas e rejeitadas; sem conexão (EX04, EX05) | `screens/EntrarConta.test.tsx`, `service/conta/auth-conta.test.ts`, `unit/erros-conta.test.ts` |
| Recuperar senha com resposta neutra; ligação inválida (EX06) | `screens/RecuperarSenha.test.tsx`, `screens/RedefinirSenha.test.tsx`, `service/conta/auth-conta.test.ts` |
| Encerrar sessão; pendências ao sair; falha ao sair (FA03, EX09) | `screens/Conta.test.tsx`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts` |
| Marcar dados do aparelho como pendentes e enviar; recusar o envio (E5, E6, FA01, EX08) | `screens/ConfirmarEmail.test.tsx`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts` |
| Sincronização só com e-mail confirmado (RF62, EX11) | `service/receita/sync.test.ts`, `service/receita/sync.segundoPlano.test.ts` |
| Envio automático pausado depois do cadastro; "Não enviar"; envio pedido pela pessoa libera o envio (FA01) | `service/receita/sync.test.ts`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts`, `screens/ConfirmarEmail.test.tsx` |
| Sair suspende a sincronização e mantém os dados locais (RF06, RN06) | `service/conta/servico-conta.test.ts`, `screens/Conta.test.tsx` |
| Restauração em aparelho novo (FA02, RNF40) | `service/conta/sync-app-conta.test.ts`, `service/conta/index-conta.test.ts` |
| Mensagens sem senha, token ou dados sensíveis (RNF14) | `unit/erros-conta.test.ts`, `unit/firebase-erros-conta.test.ts` |
| Security Rules: perfil de outro usuário negado; e-mail ausente recusado (RNF03, RNF04) | `rules/conta.rules.test.ts` |
| Dados locais continuam após sair e reabrir o app (RN06) | roteiros 2 e 3 |
| Acessibilidade e paleta (RNF33, RNF38) | roteiro 7 |
