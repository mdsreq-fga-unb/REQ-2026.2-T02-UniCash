<div class="pagina-casos-de-uso" markdown="1">
## UC01 - Gerenciar receitas
 
- **Ator principal:** Usuário.
- **Valor:** manter o registro fiel das entradas de dinheiro, para que totais, saldo e indicadores reflitam a realidade.
- **Requisitos funcionais:** RF07, RF08 , RF09, RF10.
 
### Pré-condições
 
- A base local está disponível (RN06).
- O usuário abriu o aplicativo. A conexão só é necessária para sincronizar, não para operar localmente.
- Para editar ou excluir, existe ao menos uma receita registrada.
### Fluxo principal
 
1. O usuário acessa a área de receitas.
2. O sistema lista as receitas do mês corrente, da data mais recente para a mais antiga (RN12), mostrando data completa (dia, mês e ano), título e valor.
3. O usuário escolhe uma operação: **registrar** (A), **filtrar ou detalhar** (B), **editar** (C) ou **excluir** (D).
#### A - Registrar receita (RF07)
 
1. O usuário aciona "Nova receita".
2. O sistema apresenta o formulário com valor, data, título, descrição (opcional) e a opção de recorrência (RN19). Se o usuário indica recorrência, o sistema abre um formulário para informar o intervalo (um número) e a unidade (dias, meses ou anos) e, opcionalmente, a data de término (RN19).
3. O usuário preenche os campos e solicita o registro.
4. O sistema valida no cliente e no servidor: data, título e valor são obrigatórios (RN08); o valor respeita a RN09; título e descrição respeitam a RN10.
5. O sistema persiste a receita na base local e só então confirma o registro (RNF35). Se houver recorrência, as ocorrências são geradas conforme a periodicidade e cada uma é registrada individualmente (RN19).
6. O sistema recalcula totais, saldo e indicadores afetados.
7. Se houver conexão, o sistema sincroniza a receita com o servidor.
8. A nova receita aparece na lista.
#### B - Filtrar e detalhar (RF08)
 
1. O usuário informa uma data única ou um período.
2. O sistema valida o filtro (data inicial menor ou igual à final) e apresenta as receitas correspondentes (RN12).
3. O usuário seleciona uma receita e o sistema exibe todos os seus dados.
#### C - Editar receita (RF09)
 
1. O usuário seleciona a receita e aciona "Editar".
2. O sistema apresenta o formulário preenchido com os dados atuais.
3. O usuário altera um ou mais campos, qualquer um deles (RN20), inclusive a recorrência, e solicita o salvamento.
4. O sistema valida os dados (RN08, RN09, RN10).
5. O sistema persiste a alteração localmente e recalcula todos os totais afetados, inclusive o mês de origem e o de destino quando a data muda de mês (RN07, RN12).
6. Se houver conexão, o sistema sincroniza a alteração.
7. O sistema confirma a edição.
#### D - Excluir receita (RF10)
 
1. O usuário seleciona a receita e aciona "Excluir".
2. O sistema solicita confirmação explícita (RN11).
3. O usuário confirma.
4. O sistema exclui a receita e, na mesma operação, recalcula totais, saldo, indicadores e alertas (RN11).
5. Se houver conexão, o sistema sincroniza a exclusão.
6. O sistema informa que a receita foi excluída. A exclusão é definitiva (RN11).
### Fluxos alternativos
 
- **FA01 - Operação offline:** o sistema grava localmente, marca a alteração como pendente de sincronização e sincroniza quando a conexão voltar (RN06, RF62).
- **FA02 - Data futura:** o sistema aceita a data e contabiliza a receita no mês dessa data (RN12).
- **FA03 - Sem filtro:** o sistema mostra o mês corrente (RN12).
- **FA04 - Nenhum registro:** o sistema exibe "Nenhum registro" e sugere alterar o filtro.
- **FA05 - Cancelamento:** se o usuário desiste da edição ou não confirma a exclusão, nada é alterado.
- **FA06 - Edição que muda a data de mês:** o sistema recalcula o mês anterior e o novo mês (RN07, RN12).
- **FA07 - Receita recorrente:** o sistema gera as ocorrências conforme a periodicidade informada, respeitando a data de início e, quando informada, a de término; cada ocorrência entra individualmente nos totais, saldos e indicadores (RN19).
### Exceções
 
- **EX01 - Dados inválidos:** o sistema rejeita o salvamento e informa o motivo por campo (RN08, RNF04, RNF14).
- **EX02 - Período inválido:** data inicial posterior à final; o sistema informa o erro.
- **EX03 - Falha na persistência local ou no recálculo:** o sistema não confirma a operação e nenhum registro ou saldo permanece parcialmente alterado (RN11, RNF05).
- **EX04 - Falha na sincronização:** a alteração permanece local e pendente.
- **EX05 - Conflito de sincronização:** aplica-se a RN07; em edição contra exclusão, a exclusão prevalece.
- **EX06 - Receita inexistente ou já excluída:** o sistema informa que o registro não está mais disponível.
- **EX07 - Acesso a receita de outro usuário:** o sistema nega (RNF03).
- **EX08 - Falha na leitura local:** o sistema informa que não foi possível recuperar os dados.
### Requisitos e regras associados
 
- **Funcionais:** RF07, RF08, RF09, RF10. Relacionados: RF11, RF34, RF39 (recálculo), RF59, RF62.
- **Não funcionais específicos:** RNF04, RNF05 , RNF06 , RNF07, RNF08 , RNF16, RNF26 e RNF35, RNF27, RNF33, RNF36.
- **Regras de negócio:** RN06, RN07, RN08, RN09, RN10, RN11, RN12, RN13, RN19, RN20.
----

## UC02 - Gerenciar despesas e categorias
 
- **Ator principal:** Usuário.
- **Valor:** registrar e classificar os gastos, base de todos os totais, limites e alertas.
- **Requisitos funcionais:** RF15, RF16, RF17, RF18, RF19, RF65, RF66, RF67.
 
### Pré-condições
 
- A base local está disponível (RN06).
- As categorias padrão existem: Casa, Alimentação, Mobilidade, Estudos, Saúde, Lazer e Reserva financeira (RN13).
- Para editar ou excluir uma despesa, existe ao menos uma despesa registrada.
- Para renomear ou excluir uma categoria, existe ao menos uma categoria própria. As padrão não podem ser renomeadas nem excluídas, mas permitem definir limite (RN13, RN14).
### Fluxo principal
 
1. O usuário acessa a área de despesas.
2. O sistema lista as despesas do mês corrente, da mais recente para a mais antiga (RN12), em tabela com data, título, valor e categoria.
3. O usuário escolhe uma operação: **registrar** (A), **filtrar ou detalhar** (B), **editar** (C), **excluir** (D) ou **gerenciar categorias** (E).
#### A - Registrar despesa (RF15)
 
1. O usuário aciona "Nova despesa".
2. O sistema apresenta o formulário com valor, data, título, descrição (opcional), categoria (opcional) e classificações opcionais (fixa ou variável, essencial ou não essencial, RN13) e a opção de recorrência. Se o usuário indica recorrência, o sistema abre um formulário para informar o intervalo (um número) e a unidade (dias, meses ou anos) e, opcionalmente, a data de término (RN19).
3. O usuário preenche os campos e solicita o registro.
4. O sistema valida no cliente e no servidor (RN08, RN09, RN10).
5. O sistema persiste a despesa localmente e só então confirma (RNF35). Se houver recorrência, as ocorrências são geradas conforme a periodicidade e cada uma é registrada individualmente (RN19).
6. O sistema recalcula totais, saldo, indicadores de limite e alertas afetados (UC04 e UC05).
7. Se houver conexão, o sistema sincroniza a despesa.
#### B - Filtrar e detalhar (RF16)
 
1. O usuário filtra por data única, período e/ou categoria.
2. O sistema valida o filtro e mostra os resultados ordenados (RN12).
3. O usuário seleciona uma despesa e o sistema exibe seus detalhes.
#### C - Editar despesa (RF17)
 
1. O usuário seleciona a despesa e aciona "Editar".
2. O sistema apresenta o formulário preenchido; o usuário altera os campos, qualquer um deles (RN20), e salva.
3. O sistema valida (RN08, RN09, RN10), persiste localmente e recalcula saldo, totais, limites e alertas dos meses e categorias de origem e destino (RN07, RN12).
4. Se houver conexão, sincroniza; o sistema confirma a edição.
#### D - Excluir despesa (RF18)
 
1. O usuário seleciona a despesa e aciona "Excluir".
2. O sistema solicita confirmação explícita (RN11); o usuário confirma.
3. O sistema exclui e recalcula saldo, totais, indicadores e alertas na mesma operação (RN11).
4. Se houver conexão, sincroniza; o sistema informa a exclusão, que é definitiva.
#### E - Gerenciar categorias (RF19, RF65, RF66, RF67)
 
**E1 - Consultar categorias (RF65)**
 
1. O usuário acessa a lista de categorias.
2. O sistema exibe as categorias padrão e próprias, identificando as padrão e mostrando o limite de gasto de cada uma, quando definido.
3. O usuário pode abrir uma categoria para ver os lançamentos classificados nela; o sistema exibe a consulta de despesas já filtrada por essa categoria (fluxo B).
**E2 - Criar categoria própria (RF19)**
 
1. O usuário aciona "Nova categoria" e informa o nome e, opcionalmente, um limite de gasto (valor em R$ ou percentual da renda mensal, RN14).
2. O sistema valida a unicidade do nome por usuário, sem diferenciar maiúsculas e minúsculas, e o tamanho máximo de 30 caracteres (RN13), persiste e confirma.
**E3 - Editar categoria (RF66)**
 
1. O usuário seleciona uma categoria e altera o limite; em categoria própria, também o nome. Em categoria padrão, só o limite pode ser alterado (RN13, RN14).
2. O sistema valida o nome, se alterado (unicidade e máximo de 30 caracteres, RN13), e o limite, e persiste a alteração.
3. O sistema recalcula, na mesma operação, os indicadores de consumo e os alertas de limite afetados (RN14, UC05).
4. O sistema confirma a edição.
**E4 - Excluir categoria própria (RF67)**
 
1. O usuário seleciona uma categoria própria e aciona "Excluir".
2. O sistema solicita confirmação explícita (RN11) e informa que as despesas da categoria serão mantidas como "Sem categoria" e que o histórico da categoria (limite e alertas) será perdido (RN13).
3. O usuário confirma.
4. O sistema exclui a categoria com todo o seu histórico (limite, indicadores e alertas); as despesas associadas não são excluídas e passam a constar como "Sem categoria" (RN13).
5. O sistema recalcula, na mesma operação, os indicadores e alertas dependentes (RN13, RN14).
6. Se houver conexão, sincroniza; o sistema informa a exclusão, que é definitiva (RN11).
### Fluxos alternativos
 
- **FA01 - Sem categoria:** a despesa é registrada como "Sem categoria" e fica fora dos limites por categoria (RN13).
- **FA02 - Operação offline:** grava localmente e fica pendente de sincronização (RN06).
- **FA03 - Data futura:** contabilizada no mês da própria data (RN12).
- **FA04 - Filtro por categoria sem resultados:** o sistema exibe "Nenhum registro" e sugere alterar o filtro.
- **FA05 - Cancelamento:** edição descartada ou exclusão não confirmada não alteram nada.
- **FA06 - Mudança de categoria na edição:** o sistema recalcula o consumo da categoria antiga e da nova.
- **FA07 - Categoria sem lançamentos:** o sistema mostra a categoria com zero lançamentos e a consulta filtrada exibe "Nenhum registro".
- **FA08 - Exclusão de categoria com lançamentos:** as despesas continuam registradas e passam a aparecer como "Sem categoria", fora dos limites por categoria (RN13).
- **FA09 - Categoria sem limite:** a edição ou exclusão não gera recálculo de indicadores nem de alertas.
- **FA10 - Cancelamento de edição ou de exclusão de categoria:** nada é alterado.
- **FA11 - Despesa recorrente:** o sistema gera as ocorrências conforme a periodicidade informada, respeitando a data de início e, quando informada, a de término; cada ocorrência entra individualmente nos totais, saldos, limites e alertas (RN19).
### Exceções
 
- **EX01 - Campos inválidos:** rejeição com motivo por campo (RN08, RNF04, RNF14).
- **EX02 - Nome de categoria duplicado:** o sistema rejeita a criação ou edição.
- **EX03 - Categoria padrão:** o sistema impede renomear ou excluir categorias padrão; só o limite pode ser alterado (RN13, RN14, RF66, RF67).
- **EX04 - Limite inválido:** valor em R$ fora do permitido pela RN09 ou formato incorreto; o sistema informa o motivo.
- **EX05 - Falha em qualquer etapa de gravação ou recálculo:** nenhuma alteração parcial permanece (RN11, RNF05).
- **EX06 - Falha na sincronização:** o registro permanece local e pendente.
- **EX07 - Conflito de sincronização:** aplica-se a RN07; a exclusão prevalece sobre a edição.
- **EX08 - Despesa inexistente ou já excluída:** o sistema informa que o registro não está disponível.
- **EX09 - Acesso a dados de outro usuário:** o sistema nega (RNF03).
- **EX10 - Período inválido ou falha na leitura local:** o sistema informa o erro.
- **EX11 - Categoria inexistente ou já excluída:** o sistema informa que o registro não está disponível.
- **EX12 - Despesa registrada em outro dispositivo com categoria já excluída:** na sincronização a despesa é mantida e passa a constar como "Sem categoria" (RN07, RN13).
- **EX13 - Falha ao editar ou excluir categoria:** nenhuma alteração parcial permanece, nem na categoria, nem nos indicadores e alertas (RN11, RNF05).
- **EX14 - Nome de categoria inválido:** vazio ou com mais de 30 caracteres (RN13); o sistema informa o motivo.
### Requisitos e regras associados
 
- **Funcionais:** RF15, RF16, RF17, RF18, RF19, RF65, RF66, RF67. Relacionados: RF34, RF37, RF38, RF39, RF59, RF62.
- **Não funcionais específicos:** RNF04, RNF05 , RNF06, RNF08, RNF16, RNF26, RNF27, RNF33, RNF35, RNF36.
- **Regras de negócio:** RN06, RN07, RN08, RN09, RN10, RN11, RN12, RN13, RN14, RN19, RN20.
---

## UC03 - Consultar resumo financeiro e evolução mensal
 
- **Ator principal:** Usuário.
- **Valor:** dar uma visão rápida de quanto entrou em cada dia e mês e de como os meses se comparam.
- **Requisitos funcionais:** RF11.
 
### Pré-condições
 
- Existem dados locais disponíveis (lançamentos registrados).
- O usuário abriu a área de resumo.
### Fluxo principal
 
1. O usuário acessa o resumo financeiro.
2. O sistema assume o mês corrente como período padrão (RN12).
3. O sistema calcula, a partir dos lançamentos, o total de receitas **por dia** e o total **do mês**, com base na data de cada lançamento (RF11).
4. O sistema apresenta os totais do período selecionado.
5. O sistema apresenta o gráfico de evolução mensal, com receitas e despesas por mês. O gráfico mostra no máximo 6 meses (RN12).
6. O usuário seleciona outro mês, pelo seletor ou tocando em uma barra do gráfico.
7. O sistema recalcula e apresenta os totais do mês escolhido.
### Fluxos alternativos
 
- **FA01 - Mês sem receitas:** o sistema apresenta total igual a zero.
- **FA02 - Sem nenhum lançamento:** o sistema exibe estado vazio com orientação para registrar a primeira receita ou despesa.
- **FA03 - Consulta offline:** o sistema calcula com os lançamentos locais (RN06).
- **FA04 - Mês futuro:** o sistema inclui lançamentos de data futura no mês correspondente (RN12).
- **FA05 - Lançamento alterado ou excluído:** o resumo é recalculado ao reabrir ou voltar à tela (UC01, UC02).
### Exceções
 
- **EX01 - Falha no cálculo:** o sistema informa que não foi possível calcular os totais.
- **EX02 - Dados inconsistentes:** o sistema recalcula a partir dos lançamentos e descarta contadores sincronizados (RN07).
- **EX03 - Acesso a dados de outro usuário:** o sistema nega (RNF03).
### Requisitos e regras associados
 
- **Funcionais:** RF11. Relacionados: RF07, RF15, RF34, RF40, RF41, RF42.
- **Não funcionais específicos:** RNF07, RNF08, RNF29.
- **Regras de negócio:** RN06, RN07, RN09, RN12.
---

## UC04 - Gerenciar saldo mensal e saldo inicial
 
- **Ator principal:** Usuário.
- **Valor:** saber quanto dinheiro sobra em cada mês e corrigir o ponto de partida do cálculo.
- **Requisitos funcionais:** RF34 (calcular saldo mensal), RF35 (exibir saldo do mês anterior e permitir definir o saldo inicial).
 
### Pré-condições
 
- O usuário abriu a área de resumo ou a de configurações financeiras.
- Para o saldo do mês: existem lançamentos e/ou um saldo inicial.
### Fluxo principal
 
1. O usuário acessa o resumo financeiro.
2. O sistema identifica o mês de referência (mês corrente por padrão).
3. O sistema obtém o **saldo anterior** (RN16): o saldo do mês anterior (RN15) ou, no mês do saldo inicial, o valor informado; sem dado disponível, o sistema informa que não há dados.
4. O sistema soma as receitas e as despesas do mês.
5. O sistema calcula o saldo do mês: total de receitas − total de despesas (RN15); o saldo anterior não entra nesse cálculo.
6. O sistema apresenta o saldo do mês, o saldo anterior como referência (RF35) e o indicador de cor com texto (RN17).
7. O sistema verifica se o saldo passou de maior ou igual a zero para negativo e, se sim, emite o alerta de saldo negativo (RN18).
#### Subfluxo - Definir ou alterar o saldo inicial
 
1. O usuário acessa "Saldo inicial".
2. O sistema mostra o saldo inicial atual, se existir.
3. O usuário informa o valor, que pode ser negativo, e o mês de referência.
4. O sistema valida o valor e o mês de referência (RN16).
5. O sistema persiste o saldo inicial localmente, recalcula os saldos dos meses seguintes (RN16) e confirma.
6. Se houver conexão, sincroniza.
### Fluxos alternativos
 
- **FA01 - Mês sem lançamentos:** o saldo do mês é R$ 0,00 e o saldo anterior continua exibido como referência (RN15).
- **FA02 - Mês anterior ao mês de referência do saldo inicial:** o sistema informa que não há dados de saldo anterior e ignora lançamentos anteriores àquele mês (RN16).
- **FA03 - Sem saldo inicial e sem mês anterior com dados:** o sistema informa que não há dados de saldo anterior (RN16).
- **FA04 - Saldo inicial negativo:** o sistema aceita (RN16).
- **FA05 - Alteração do saldo inicial:** substitui o valor anterior e recalcula os meses seguintes (RN16).
- **FA06 - Consulta offline:** o saldo é calculado localmente (RN06).
- **FA07 - Lançamento criado, editado ou excluído:** o saldo é recalculado (UC01, UC02).
- **FA08 - Saldo volta a zero ou positivo e fica negativo de novo:** um novo alerta é emitido (RN18).
- **FA09 - Mês sem receitas:** o indicador de cor é preto (RN17).
- **FA10 - Preferências de notificação:** o alerta de saldo negativo permanece sempre ativo, pois o RF58 não o prevê, até validação (RN18).
### Exceções
 
- **EX01 - Valor ou mês de referência inválido:** o sistema rejeita e informa o motivo (RNF14).
- **EX02 - Falha ao salvar o saldo inicial:** o sistema não confirma e nenhum saldo fica parcialmente atualizado (RNF05).
- **EX03 - Falha de cálculo:** o sistema informa que não foi possível calcular o saldo.
- **EX04 - Dados inconsistentes:** o sistema recalcula a partir dos lançamentos e do saldo inicial (RN07).
- **EX05 - Falha ao emitir o alerta:** o sistema trata a falha sem corromper saldo nem lançamentos.
### Requisitos e regras associados
 
- **Funcionais:** RF34, RF35. Relacionados: RF07, RF15, RF11, RF17, RF18.
- **Não funcionais específicos:** RNF05, RNF07, RNF08, RNF29, RNF35.
- **Regras de negócio:** RN06, RN07, RN15, RN16, RN17, RN18.
</div>