# Requisitos Funcionais

Os requisitos funcionais descrevem os comportamentos e funcionalidades que o usuário poderá executar ou observar no sistema.

**Premissa de escopo:** os lançamentos são inseridos de forma declarativa pelo usuário, manualmente. Não há integração por API com bancos ou cartões de crédito.

## Características de Produto

| Código | Característica |
|---|---|
| CP1 | Gestão de movimentações financeiras |
| CP2 | Organização e análise dos gastos |
| CP3 | Planejamento financeiro pessoal |
| CP4 | Visualização da situação financeira |
| CP5 | Gestão da identidade do usuário |
| CP6 | Suporte ao uso e operação |
| CP7 | Colaboração em grupo de amigos ou família |
| CP8 | Engajamento e incentivo ao cumprimento de metas |

## Situação dos requisitos { #situacao-dos-requisitos }

A coluna **Origem** aponta a ata em que o requisito surgiu ou foi alterado e a decisão que o motivou, registrada no [Registro de decisões](decisoes.md). [R04](atas/posts/r04.md) indica a primeira versão consolidada pela equipe, quando não houve reunião específica de origem.

A coluna **Situação** separa o que está valendo do que ainda é proposta:

| Situação | Significado |
|---|---|
| **Proposto** | Incluído pela equipe e ainda não confirmado com a cliente. Consta em [Pontos para validação](#pontos-para-validacao). |
| **Vigente** | Integra o escopo atual e não tem pendência de confirmação. |
| **Entregue** | Implementado no aplicativo e aceito conforme a [Definition of Done](dor_dod.md). Nenhum requisito está nesta situação ainda. |
| **Retirado** | Fundido a outro requisito ou removido do escopo. O código não é reutilizado e fica na tabela de requisitos retirados. |

A inclusão no MVP é uma informação à parte, registrada no [Escopo do MVP](mvp.md).

## Requisitos Funcionais

A tabela está ordenada por Característica de Produto.

| Código | Nome e descrição | Característica de Produto | Origem | Situação |
|---|---|---|---|---|
| <span id="rf07"></span>**RF07** | **Registrar receita:** Permitir informar valor, data, título, descrição opcional e recorrência opcional para uma receita (RN08, RN10, RN19); validar e salvar o lançamento. | CP1 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf08"></span>**RF08** | **Consultar receitas:** Exibir as receitas registradas pelo usuário, com consulta por período e detalhe de cada lançamento. | CP1 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf09"></span>**RF09** | **Editar receita:** Permitir alterar os dados de uma receita existente e recalcular os totais afetados após salvar. | CP1 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf10"></span>**RF10** | **Excluir receita:** Permitir remover uma receita mediante confirmação e atualizar os totais relacionados. | CP1 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf15"></span>**RF15** | **Registrar despesa:** Permitir informar valor, data, descrição e categoria de uma despesa; validar e salvar o lançamento. | CP1 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf16"></span>**RF16** | **Consultar despesas:** Exibir as despesas registradas pelo usuário, com consulta por período, categoria e detalhe. | CP1 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf17"></span>**RF17** | **Editar despesa:** Permitir alterar os dados de uma despesa existente e salvar as mudanças após a validação. | CP1 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf18"></span>**RF18** | **Excluir despesa:** Permitir remover uma despesa mediante confirmação e atualizar os cálculos dependentes. | CP1 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf21"></span>**RF21** | **Importar extrato bancário:** Permitir selecionar um arquivo de extrato em um dos formatos aceitos (RN05), apresentar prévia dos lançamentos reconhecidos, solicitar revisão quando a leitura for ambígua e confirmar sua incorporação aos dados financeiros. | CP1 | [R03](atas/posts/r03.md) | Retirado |
| <span id="rf32"></span>**RF32** | **Definir lançamento recorrente:** Permitir marcar receita ou despesa como fixa ou recorrente e informar sua periodicidade para gerar lançamentos nos meses seguintes. | CP1 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf33"></span>**RF33** | **Editar ocorrência de lançamento recorrente:** Permitir alterar apenas o lançamento de um mês específico sem modificar as demais ocorrências da série. | CP1 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf48"></span>**RF48** | **Identificar lançamento duplicado:** Comparar cada registro importado com os lançamentos já registrados e considerar possível duplicidade quando o valor for idêntico e a data diferir em até 1 dia; para cada possível duplicidade, exibir os dois registros lado a lado e pedir ao usuário que escolha entre descartar o importado ou mantê-lo como lançamento distinto, antes de consolidar. | CP1 | [R03](atas/posts/r03.md), [D23](decisoes.md#d23) | Retirado |
| <span id="rf50"></span>**RF50** | **Registrar despesa por comprovante:** Permitir fotografar ou selecionar um comprovante, anexá-lo ao lançamento e confirmar ou informar os dados da despesa antes de salvar. | CP1 | [R03](atas/posts/r03.md), [D23](decisoes.md#d23) | Retirado |
| <span id="rf59"></span>**RF59** | **Registrar lançamento sem conexão:** Permitir registrar receita ou despesa na base local sem conexão à internet; quando o usuário possuir conta e a sincronização em nuvem estiver habilitada, registrar a pendência e enviar os dados ao Cloud Firestore assim que a conexão for restabelecida. | CP1 | [R07](atas/posts/r07.md), [D07](decisoes.md#d07), [D10](decisoes.md#d10), [D20](decisoes.md#d20), [D21](decisoes.md#d21) | Vigente |
| <span id="rf60"></span>**RF60** | **Extrair dados de comprovante:** Ler a imagem do comprovante indicado no RF50 e sugerir valor, data e descrição da despesa para confirmação ou correção pelo usuário. | CP1 | [R03](atas/posts/r03.md), [D07](decisoes.md#d07), [D23](decisoes.md#d23) | Retirado |
| <span id="rf19"></span>**RF19** | **Criar categoria de despesas:** Permitir cadastrar uma categoria para classificar despesas e, quando aplicável, definir seu limite de gasto. | CP2 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf47"></span>**RF47** | **Classificar lançamentos importados:** Sugerir a categoria de cada registro importado a partir de palavras-chave da descrição associadas às categorias do usuário e de lançamentos anteriores com a mesma descrição, permitindo revisão antes da confirmação; quando não houver correspondência, deixar o registro sem categoria sugerida. | CP2 | [R03](atas/posts/r03.md), [D23](decisoes.md#d23) | Retirado |
| <span id="rf65"></span>**RF65** | **Consultar categorias:** Exibir ao usuário a lista de categorias disponíveis (padrão e próprias), identificando as categorias padrão e o limite de gasto de cada uma, quando definido, com a opção de ver os lançamentos classificados em cada categoria. | CP2 | [D16](decisoes.md#d16) | Proposto |
| <span id="rf66"></span>**RF66** | **Editar categoria:** Permitir alterar o nome e o limite de gasto de uma categoria própria, validar a unicidade do nome (RN13), salvar as mudanças e recalcular os indicadores e alertas de limite afetados (RF37, RF38 e RF39). As categorias padrão não podem ser editadas (RN13). | CP2 | [D16](decisoes.md#d16) | Proposto |
| <span id="rf67"></span>**RF67** | **Excluir categoria:** Permitir remover uma categoria própria mediante confirmação (RN11), mantendo os lançamentos associados, que passam a constar como “Sem categoria” (RN13), e atualizar os indicadores e alertas dependentes. As categorias padrão não podem ser excluídas (RN13). | CP2 | [D16](decisoes.md#d16) | Proposto |
| <span id="rf12"></span>**RF12** | **Criar meta financeira:** Permitir definir objetivo, valor alvo, prazo e tipo de meta (gasto por categoria ou reserva financeira pessoal estipulada pelo usuário, sem recomendação de investimentos, conforme D01). | CP3 | [R05](atas/posts/r05.md), [D01](decisoes.md#d01) | Vigente |
| <span id="rf13"></span>**RF13** | **Editar meta financeira:** Permitir alterar os parâmetros de uma meta existente e salvar as mudanças após a validação. | CP3 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf14"></span>**RF14** | **Excluir meta financeira:** Permitir remover uma meta mediante confirmação, sem excluir os lançamentos financeiros associados. | CP3 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf20"></span>**RF20** | **Visualizar metas financeiras:** Exibir as metas do usuário com valor alvo, prazo, valor realizado e situação atual. | CP3 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf36"></span>**RF36** | **Acompanhar progresso da meta:** Comparar o valor realizado com o valor alvo e apresentar progresso e valor restante da meta. | CP3 | [R05](atas/posts/r05.md) | Vigente |
| <span id="rf37"></span>**RF37** | **Notificar aproximação do limite:** Emitir alerta quando o gasto atingir o limiar de aproximação definido na RN03 para a meta de gasto ou categoria, apresentando apenas os valores envolvidos (gasto, limite e categoria ou meta), sem termos de julgamento, e respeitando as preferências do RF58. | CP3 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf38"></span>**RF38** | **Notificar ultrapassagem do limite:** Emitir alerta quando o gasto superar o limite definido na RN03 para a meta de gasto ou categoria, apresentando apenas os valores envolvidos (gasto, limite e categoria ou meta), sem termos de julgamento, e respeitando as preferências do RF58. | CP3 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf39"></span>**RF39** | **Exibir indicador de consumo do limite da categoria:** Apresentar, para cada categoria com limite definido, um indicador visual do consumo do limite no período selecionado, conforme as faixas da RN02. | CP3 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf11"></span>**RF11** | **Calcular total de receitas:** Exibir ao usuário a soma das receitas do período selecionado como valor de entrada correspondente. | CP4 | [R03](atas/posts/r03.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf34"></span>**RF34** | **Calcular saldo mensal:** Exibir ao usuário o saldo do mês, calculado a partir do saldo inicial, das receitas e das despesas registradas no período. | CP4 | [R03](atas/posts/r03.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf35"></span>**RF35** | **Exibir saldo do mês anterior:** Exibir ao usuário o saldo remanescente do mês anterior como referência na apresentação do mês atual. | CP4 | [R03](atas/posts/r03.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf40"></span>**RF40** | **Gerar resumo financeiro inicial:** Ao abrir o aplicativo, exibir ao usuário o saldo, o total de receitas, o total de despesas e o progresso das metas do período selecionado, sendo o mês corrente o período padrão; quando não houver lançamentos, exibir estado vazio com atalho para o tutorial (RF55). | CP4 | [R04](atas/posts/r04.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf41"></span>**RF41** | **Exibir gráfico de despesas:** Exibir ao usuário um gráfico de barras com o total de despesas por categoria no período selecionado, com o valor de cada barra apresentado como rótulo e a categoria identificada na legenda. | CP4 | [R01](atas/posts/r01.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf42"></span>**RF42** | **Exibir percentual por categoria:** Exibir ao usuário o percentual do total de despesas do período que cada categoria representa; quando não houver despesas no período, não apresentar percentual. | CP4 | [R04](atas/posts/r04.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf43"></span>**RF43** | **Exibir previsão de despesas recorrentes:** Exibir ao usuário as despesas recorrentes já cadastradas (RF32) previstas para os próximos 30 dias, identificadas como valores previstos. | CP4 | [R03](atas/posts/r03.md), [D21](decisoes.md#d21) | Vigente |
| <span id="rf49"></span>**RF49** | **Consolidar extratos de contas:** Exibir ao usuário, em uma visão única, os lançamentos confirmados de diferentes extratos importados, identificando em cada um a instituição de origem informada na importação. | CP4 | [R03](atas/posts/r03.md), [D23](decisoes.md#d23) | Retirado |
| <span id="rf01"></span>**RF01** | **Cadastrar usuário:** Permitir que uma pessoa crie uma conta ao informar nome, e-mail e uma senha; após a validação dos dados (RN08), registrar o perfil e confirmar o cadastro. | CP5 | [R03](atas/posts/r03.md), [R07](atas/posts/r07.md), [D12](decisoes.md#d12) | Vigente |
| <span id="rf02"></span>**RF02** | **Autenticar usuário:** Permitir o acesso com credenciais válidas, iniciar a sessão e informar o motivo quando a autenticação for rejeitada. | CP5 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf03"></span>**RF03** | **Visualizar perfil de usuário:** Exibir ao usuário autenticado os dados do próprio perfil. | CP5 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf04"></span>**RF04** | **Editar perfil de usuário:** Permitir ao usuário autenticado alterar seus dados de perfil e salvar as mudanças após a validação. | CP5 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf05"></span>**RF05** | **Excluir perfil de usuário:** Solicitar confirmação antes da exclusão da conta e executar a remoção dos dados associados conforme a política de retenção da RN04. | CP5 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf06"></span>**RF06** | **Encerrar sessão:** Permitir ao usuário sair da conta e invalidar a sessão ativa no aplicativo. | CP5 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf31"></span>**RF31** | **Recuperar senha:** Permitir solicitar redefinição por um canal verificado e cadastrar uma nova senha por meio de ligação temporária de uso único. | CP5 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf61"></span>**RF61** | **Usar sem conta:** Permitir utilizar todas as funcionalidades financeiras individuais (lançamentos de CP1, categorias de CP2, metas de CP3, consultas e resumos de CP4, tutorial de CP6 e conquistas pessoais de CP8) sem cadastro ou autenticação, mantendo os dados exclusivamente no dispositivo; a conta é necessária apenas para sincronização em nuvem e colaboração em grupos (CP7 e ranking do RF30). | CP5 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D12](decisoes.md#d12), [D20](decisoes.md#d20) | Vigente |
| <span id="rf55"></span>**RF55** | **Apresentar tutorial inicial:** No primeiro acesso, oferecer tutorial interativo que informe o que o aplicativo faz e o que não faz (organiza e apresenta as informações financeiras, sem aumentar a renda nem garantir a redução de dívidas) e guie o usuário por registrar receita (RF07), registrar despesa (RF15), criar meta financeira (RF12) e ler o resumo inicial (RF40), explicando em linguagem simples os termos financeiros usados e com opção de avançar ou encerrar a qualquer etapa; permitir reabrir o tutorial pelo menu de ajuda. | CP6 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf56"></span>**RF56** | **Avisar manutenção programada:** Exibir aos usuários, ao abrir o aplicativo, aviso prévio com período e impacto previsto de uma manutenção programada, informada pela equipe de operação por configuração do sistema, sem tela de cadastro no produto. | CP6 | [R04](atas/posts/r04.md) | Vigente |
| <span id="rf58"></span>**RF58** | **Configurar notificações:** Permitir ao usuário ativar ou desativar cada tipo de alerta (aproximação do limite, ultrapassagem do limite e conquistas) e alterar a escolha a qualquer momento. | CP6 | [D07](decisoes.md#d07) | Vigente |
| <span id="rf62"></span>**RF62** | **Acompanhar sincronização:** Exibir o estado (sincronizado, pendente, sem conexão, erro), a última sincronização e as alterações pendentes, com opção de sincronizar na hora; generaliza o “estado de envio” do RF59. | CP6 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20) | Vigente |
| <span id="rf63"></span>**RF63** | **Gerar backup:** Criar um arquivo completo e restaurável dos dados do usuário, sem exigir conexão, e permitir salvá-lo fora do aplicativo. | CP6 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20), [D21](decisoes.md#d21), [D23](decisoes.md#d23) | Retirado |
| <span id="rf64"></span>**RF64** | **Restaurar backup:** Validar o arquivo, mostrar prévia e permitir substituir ou mesclar com os dados atuais. | CP6 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20), [D23](decisoes.md#d23) | Retirado |
| <span id="rf22"></span>**RF22** | **Criar grupo de amigos ou família:** Permitir ao usuário criar um grupo, definir seu nome e assumir o papel inicial de administração. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf23"></span>**RF23** | **Entrar em grupo de amigos ou família:** Permitir ao usuário aceitar um convite válido para integrar um grupo e passar a acessar o conteúdo permitido ao seu papel (RN01). | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf24"></span>**RF24** | **Convidar membro para grupo:** Permitir ao Administrador do grupo (RN01) enviar convite e acompanhar sua situação até o aceite ou cancelamento. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf25"></span>**RF25** | **Sair de grupo de amigos ou família:** Permitir ao membro sair do grupo, com confirmação e atualização de suas permissões de acesso. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf26"></span>**RF26** | **Tornar controle financeiro privado:** Permitir ao usuário marcar seus dados financeiros como privados para impedir sua visualização pelos demais integrantes do grupo. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf27"></span>**RF27** | **Visualizar metas de membros do grupo:** Exibir aos integrantes do grupo as metas compartilhadas pelos membros, conforme o papel de quem consulta (RN01) e a privacidade definida no RF26. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf28"></span>**RF28** | **Criar meta do grupo:** Permitir ao Administrador do grupo (RN01) definir objetivo, valor alvo e prazo para uma meta coletiva. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf29"></span>**RF29** | **Visualizar metas do grupo:** Exibir as metas coletivas com seu progresso e prazo aos integrantes do grupo (RN01). | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf51"></span>**RF51** | **Definir papel de membro:** Permitir ao administrador do grupo atribuir ou alterar o papel de cada integrante (Administrador ou Membro) e aplicar as permissões do papel, conforme a RN01. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf52"></span>**RF52** | **Consolidar dados do grupo:** Exibir aos integrantes do grupo o total de receitas, o total de despesas e o saldo dos lançamentos que cada integrante tornou compartilhados, respeitando a privacidade definida no RF26; a comparação entre membros é tratada no RF53. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf53"></span>**RF53** | **Comparar gastos do grupo:** Exibir aos integrantes do grupo, no período selecionado, um gráfico de barras com o total de despesas compartilhadas e o percentual de participação nas despesas do grupo dos membros que optaram por participar da comparação, de acordo com a escolha registrada no RF57. | CP7 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf57"></span>**RF57** | **Configurar participação em comparações do grupo:** Permitir ao usuário escolher se seus dados aparecem na classificação do grupo (RF30) e na comparação de gastos do grupo (RF53), mantendo a participação desativada por padrão e permitindo alterar a escolha a qualquer momento. | CP7 | [D07](decisoes.md#d07) | Proposto |
| <span id="rf30"></span>**RF30** | **Classificar usuários do grupo:** Ordenar os membros que optaram por participar da classificação, conforme a pontuação acumulada, e exibir sua posição no grupo, de acordo com a escolha registrada no RF57. | CP8 | [R03](atas/posts/r03.md) | Vigente |
| <span id="rf44"></span>**RF44** | **Conceder conquistas financeiras:** Identificar o cumprimento dos marcos financeiros definidos e registrar localmente no perfil do usuário os selos correspondentes. | CP8 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf45"></span>**RF45** | **Atribuir pontuação por metas:** Somar ao usuário os pontos definidos para cada meta concluída, atualizando e exibindo seu total acumulado. | CP8 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |
| <span id="rf46"></span>**RF46** | **Notificar conquista obtida:** Informar ao usuário quando um selo ou conquista for concedido, com identificação do marco atingido, respeitando as preferências do RF58. | CP8 | [R01](atas/posts/r01.md), [R03](atas/posts/r03.md) | Vigente |

### Requisitos retirados

Os códigos retirados não são reutilizados.

| Código | Situação | Destino | Decisão |
|---|---|---|---|
| <span id="rf54"></span>RF54 | Retirado | Fundido ao RF21; os formatos aceitos passaram para a RN05. | [D07](decisoes.md#d07) |

## Feedback do grupo Cybersetor

Esta planilha reúne os feedbacks e as contribuições do grupo Cybersetor sobre os requisitos funcionais do UniCash.

<!-- markdownlint-disable MD033 -->
<iframe src="https://docs.google.com/spreadsheets/d/1i8MpzD3WsmCZDgpqmq5NLsuR3ytNymDENCd4NgwdNRg/edit?usp=sharing&rm=minimal" width="100%" height="600" frameborder="0" title="Feedback do grupo Cybersetor sobre os requisitos funcionais"></iframe>
<!-- markdownlint-enable MD033 -->

[Abrir o feedback do grupo Cybersetor em uma nova página](https://docs.google.com/spreadsheets/d/1i8MpzD3WsmCZDgpqmq5NLsuR3ytNymDENCd4NgwdNRg/edit?usp=sharing).

## Regras de Negócio

### RN01: Papéis e permissões do grupo

| Ação | Administrador | Membro |
|---|---|---|
| Atribuir ou alterar papéis (RF51) | Sim | Não |
| Convidar membro (RF24) | Sim | Não |
| Criar meta do grupo (RF28) | Sim | Não |
| Visualizar metas do grupo (RF29) e metas de membros (RF27, conforme privacidade do RF26) | Sim | Sim |
| Ver consolidado e comparação (RF52, RF53) | Sim | Sim |

O criador do grupo começa como Administrador, e o grupo deve ter sempre ao menos um Administrador.

### RN02: Faixas do indicador de consumo do limite (RF39)

| Consumo do limite da categoria | Indicador |
|---|---|
| Abaixo de 50% | Verde |
| De 50% a 79% | Amarelo |
| De 80% a 90% | Laranja |
| Acima de 90% | Vermelho |

### RN03: Disparo dos alertas de limite (RF37 e RF38)

Os alertas se aplicam a categorias com limite e a metas de gasto, usando os mesmos percentuais da RN02:

- **Aproximação (RF37):** o gasto atinge 80% do limite da categoria ou do valor alvo da meta de gasto;
- **Ultrapassagem (RF38):** o gasto supera 100% do limite da categoria ou do valor alvo da meta de gasto;
- **Salto entre faixas:** se uma única operação fizer o gasto passar de abaixo de 80% para acima de 100%, emite-se apenas um alerta (o de ultrapassagem).

Cada alerta é emitido uma vez por mês em que a condição ocorre.

### RN04: Política de retenção na exclusão de perfil (RF05)

- **Removidos:** dados de perfil, lançamentos, categorias, metas, conquistas, pontuação e preferências do usuário, e sua participação em grupos;
- **Anonimizados:** registros da trilha de auditoria (RNF16), que mantêm a operação, a data e o horário sem identificar o usuário;
- **Dados no aparelho:** a base local é apagada no momento da confirmação; os backups por arquivo estão fora do escopo atual.
- **Prazo:** a remoção no Cloud Firestore ocorre em até 30 dias após a confirmação da exclusão; como cada backup do servidor é mantido por até 30 dias (RNF17), os backups deixam de conter os dados do usuário em até 60 dias após a confirmação;
- **Administrador único:** o usuário que é o único Administrador de um grupo deve designar outro Administrador antes da exclusão (RN01).

### RN05: Formatos de extrato aceitos (RF21)

A importação de extratos está fora do escopo atual do produto (Won't have now), conforme a [D23](decisoes.md#d23). Este requisito foi retirado junto com o RF21.

### RN06: Princípio offline-first e disponibilidade

A base local é a cópia principal dos dados; o servidor serve à sincronização e aos grupos. Funcionam offline: CP1 a CP4, categorias, metas, conquistas e pontos pessoais. Exigem conexão: cadastro e recuperação de senha (RF01, RF31) e operações de grupo (RF22 a RF25, RF51). Dados de outros membros (RF27, RF29, RF30, RF52, RF53) aparecem offline com a data da última atualização. Uma operação é concluída ao ser gravada na base local (RNF35); a aceitação pelo Cloud Firestore é exibida como estado de sincronização (RF62).

### RN07: Resolução de conflitos

Alterações em campos diferentes do mesmo registro se combinam; no mesmo campo vale a mais recente por ordem lógica das alterações, não só pela hora do aparelho; em edição contra exclusão, a exclusão prevalece. Saldo, totais, progresso, pontos e selos são sempre recalculados a partir dos lançamentos, nunca sincronizados como contadores.

### RN08: Campos obrigatórios de receita e despesa

- **Campos obrigatórios:** data, título e valor são obrigatórios nos formulários de receita e despesa; descrição é opcional.
- **Validação:** os campos são validados no cliente e nas Firebase Security Rules (RNF04).
- **Rejeição:** a rejeição informa o motivo por campo (RNF14).

### RN09: Valor monetário

- **Valor permitido:** maior que zero, com no máximo duas casas decimais e até R$ 999.999.999,99.
- **Tipo de lançamento:** receita ou despesa é definida pelo tipo do lançamento, nunca pelo sinal do valor.
- **Cálculos:** utilizam tipo decimal e as regras de arredondamento da RN21 (RNF07).

### RN10: Tamanho dos textos

- **Título:** de 1 a 80 caracteres após remover espaços das pontas; não pode conter apenas espaços.
- **Descrição:** opcional, com até 255 caracteres.

### RN11: Exclusão com confirmação

- **Confirmação:** exige confirmação explícita do usuário.
- **Recálculo:** após a exclusão, totais, saldo, indicadores e alertas são recalculados na mesma operação.
- **Integridade:** falha em qualquer etapa não deixa o registro nem o saldo alterado (RNF05).
- **Definitividade:** a exclusão é definitiva; a recuperação de registros excluídos fica fora do escopo atual.

### RN12: Datas e períodos

- **Consulta padrão:** sem filtro, mostra os registros do mês corrente.
- **Filtros:** permite consulta por data única ou período, com data inicial menor ou igual à data final.
- **Ordenação:** da data mais recente para a mais antiga.
- **Datas futuras:** são aceitas e contabilizadas no mês correspondente à própria data do lançamento.
- **Gráfico de evolução mensal:** mostra no máximo 6 meses.

### RN13: Categorias

- **Categorias padrão:** Casa, Alimentação, Mobilidade, Estudos, Saúde, Lazer e Reserva financeira.
- **Proteção:** as categorias padrão não podem ser renomeadas nem excluídas; é permitido definir e alterar o limite delas (RN14).
- **Categorias próprias:** o usuário pode criar e editar categorias próprias, com nome único por usuário, sem diferenciar letras maiúsculas de minúsculas, e com no máximo 30 caracteres.
- **Categoria opcional:** uma despesa pode não possuir categoria. Nesse caso, aparece como “Sem categoria” e não entra no cálculo dos limites por categoria. Receitas não possuem categoria.
- **Classificação de despesas:** despesas podem ser classificadas como fixas ou variáveis e essenciais ou não essenciais; esses campos são opcionais.
- **Exclusão de categorias próprias:** o usuário pode excluir categorias próprias mediante confirmação (RN11). Os lançamentos associados não são excluídos e passam a aparecer como “Sem categoria”. A categoria excluída perde todo o seu histórico (limite, indicadores e alertas); criar depois uma categoria com o mesmo nome não recupera esse histórico.
- **Efeito na edição e exclusão:** ao editar o nome ou o limite, ou ao excluir uma categoria, os indicadores de consumo e os alertas de limite são recalculados na mesma operação (RN14).

### RN14: Limite por categoria e renda

- **Limite opcional:** definido por categoria, inclusive nas categorias padrão, em valor monetário (R$) ou percentual da renda mensal.
- **Renda mensal:** soma das receitas com data no mês consultado.
- **Consumo:** corresponde às despesas da categoria no mês divididas pelo limite efetivo.
- **Categorias sem limite:** não geram alertas nem indicadores de consumo.
- **Percentuais:** os percentuais de 50%, 70% e 90% citados na entrevista não são aplicados. Valem os percentuais definidos na RN02 e na RN03.

### RN15: Saldo mensal

- **Cálculo:** saldo do mês = total de receitas do mês − total de despesas do mês.
- **Saldo anterior:** não entra no cálculo do saldo do mês.

### RN16: Saldo anterior

- **Cálculo automático:** corresponde ao saldo do mês anterior (RN15). Sem dado disponível, o sistema informa que não há dados.
- **Saldo inicial:** o usuário pode informar um saldo inicial, inclusive negativo, com mês de referência.
- **Referência:** o saldo informado corresponde ao saldo no início do mês de referência.
- **Meses anteriores:** não possuem saldo anterior calculado, e os lançamentos anteriores ao mês de referência não entram no cálculo.

### RN17: Cores do saldo

| Saldo em relação às receitas do mês | Cor |
|---|---|
| Acima de 90% | Verde |
| Acima de 80% até 90% | Amarelo |
| De 50% a 80% | Laranja |
| Abaixo de 50% | Vermelho |

O indicador é calculado pela proporção do saldo mensal em relação ao total de receitas do mês. Quando não houver receitas no mês, o indicador é preto.

As faixas percentuais e as cores dos indicadores devem ser definidas na configuração do sistema, seguindo os valores estabelecidos nesta regra de negócio.

### RN18: Alerta de saldo negativo

- **Disparo:** ocorre quando o saldo mensal passa de maior ou igual a zero para negativo.
- **Frequência:** no máximo uma vez por mês para cada transição de saldo não negativo para negativo. Se o saldo voltar a zero ou a um valor positivo e ficar negativo novamente, um novo alerta será emitido.
- **Conteúdo:** a mensagem apresenta apenas valores monetários, sem termos de julgamento.
- **Preferências:** como o RF58 não prevê esse tipo de alerta nas preferências, ele permanece sempre ativo até validação.

### RN19: Recorrência de receitas e despesas

- **Opção de recorrência:** o usuário pode definir uma recorrência ao cadastrar ou editar uma receita ou despesa.
- **Configuração:** quando habilitada, a recorrência deve permitir definir a periodicidade do lançamento e, opcionalmente, uma data de término. Ao indicar a recorrência, o sistema abre um formulário para informar o intervalo (um número) e a unidade (dias, meses ou anos).
- **Ausência de recorrência:** quando não configurada, a receita ou despesa é considerada um lançamento único.
- **Geração de lançamentos:** os lançamentos recorrentes devem ser gerados conforme a periodicidade definida, respeitando a data de início e, quando informada, a data de término.
- **Integridade:** cada ocorrência deve ser registrada individualmente, para que os totais, saldos, indicadores e alertas sejam calculados corretamente em cada período.
- **Edição de recorrência:** quando solicitada a edição de uma despesa ou receita, deve-se solicitar se a edição ou exclusão será aplicada a todos os lançamentos registrados, todos os lançamentos futuros ou apenas ao selecionado.

### RN20: Edição de receitas e despesas

- **Campos editáveis:** na edição de uma receita ou despesa, todos os campos do formulário podem ser alterados.
- **Recálculo:** após a edição, totais, saldo, indicadores e alertas são recalculados na mesma operação (RN07, RN11).

### RN21: Precisão dos valores monetários (RNF07)

- **Entrada:** valores monetários devem ser informados com exatamente duas casas decimais.
- **Persistência e cálculos:** os valores registrados mantêm duas casas decimais; não há arredondamento de casas decimais posteriores.
- **Exibição:** valores em reais são apresentados com duas casas decimais.
- **Percentuais:** percentuais derivados podem ser apresentados conforme a precisão definida para cada indicador, sem alterar o valor monetário armazenado.
- **Soma dos percentuais:** a soma dos percentuais por categoria (RF42) não é ajustada a 100%.

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados com a cliente:

- RF57, incluído na revisão da avaliação cruzada para mitigar riscos ([D07](decisoes.md#d07)), ainda sem confirmação da cliente;
- RF65, RF66 e RF67, requisitos latentes de categoria identificados pela equipe na escrita dos casos de uso ([D16](decisoes.md#d16));
- Inclusão do alerta de saldo negativo (RN18) entre as preferências do RF58;
- Características CP7 e CP8 e o objetivo do projeto que cada uma atende;
- Regra de apuração do valor realizado e associação de lançamentos a metas financeiras (tanto de contenção de gastos quanto de reserva pessoal) no RF36;
- Comportamento padrão de disparo das notificações de limite (RF37 e RF38) e de conquistas (RF46) caso o módulo de configuração de notificações (RF58) não seja implementado no recorte do MVP;
- Definição formal dos marcos para concessão de selos e conquistas (RF44) e da pontuação atribuída a cada tipo de meta concluída (RF45).

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 22/09/2026 | Adiciona requisitos funcionais e não funcionais | Evellyn Rocha |
| 1.1 | 22/09/2026 | Ajusta relação CP/RF conforme a versão atual das CPs | Dante Scarpati |
| 1.2 | 28/09/2026 | Correção inicial de requisitos e formatação [RNF05/RNF23, RNF (tabela), RNF08/RNF09/RNF31, RNF14, RF (lista), RF22/RF30/RF51/RF53, RF39, RF42] | Caio Pacheco |
| 1.3 | 28/09/2026 | Reverte "correção inicial de requisitos e formatação [RNF05/RNF23, RNF (tabela), RNF08/RNF09/RNF31, RNF14, RF (lista), RF22/RF30/RF51/RF53, RF39, RF42]" | Caio Pacheco |
| 1.4 | 28/09/2026 | Ajuste de requisitos de acordo com o feedback do grupo anterior | Erick Alves |
| 1.5 | 28/09/2026 | Atualiza os requisitos funcionais com o feedback do monitor e do grupo externo | Erick Alves |
| 1.6 | 29/09/2026 | Adiciona correção dos requisitos | Natan França |
| 1.7 | 10/10/2026 | Adiciona feedback do grupo Cybersetor | Natan França |
| 1.8 | 13/10/2026 | Corrige a seção 2.5, adiciona requisitos e regras de negócio e adiciona o vídeo da apresentação da Unidade II | Dante Scarpati |
| 1.9 | 26/10/2026 | Adiciona novas regras de negócio | Natan França |
| 1.10 | 26/10/2026 | Corrige a fórmula da RN15 | Natan França |
| 1.11 | 26/10/2026 | Corrige RN02 | Natan França |
| 1.12 | 27/10/2026 | Adiciona regra de negócio de recorrência de despesas e receitas | Natan França |
| 1.13 | 27/10/2026 | Adiciona requisitos latentes de categoria | Natan França |
| 1.14 | 27/10/2026 | Ajusta regra de negócio em relação às cores | Natan França |
| 1.15 | 27/10/2026 | Atualiza regras de negócio | Natan França |
| 1.16 | 31/10/2026 | Ajusta RNFs à arquitetura com Firebase e app móvel | Bruno Duarte |
| 1.17 | 03/11/2026 | Inclui as colunas Origem e Situação, a legenda da situação, a tabela de requisitos retirados e novos pontos para validação; inclui o histórico de versões | Bruno Duarte |
| 1.18 | 05/11/2026 | Relaciona os requisitos de uso local, backup e sincronização à decisão D20 | Equipe UniCash |
| 1.19 | 07/11/2026 | Ajusta os requisitos ao modelo local-first (issue #21): retira a regra de precedência da RN06 e a exigência de usuário autenticado dos RF11, RF34, RF35, RF40 a RF43 e RF59; ajusta RF63 e RN04; inclui a RN21 | Dante Scarpati |
| 1.20 | 10/11/2026 | Confirma o RF59 como requisito vigente do MVP e remove sua pendência de validação. | Equipe UniCash |
| 1.21 | 10/11/2026 | Retira do escopo atual os fluxos de importação, extração, anexos de comprovantes e backup por arquivo (Won't have now), conforme a D23. | Equipe UniCash |
| 1.22 | 11/11/2026 | Revisa requisitos (issue #20): delimita campos em RF01 e RF07; esclarece meta de reserva no RF12; preserva RF36 registrando pendência de cálculo; preserva referências de notificações em RF37, RF38 e RF46 registrando pendência de padrão do MVP; harmoniza RF59 e RF61 ao modelo local-first; registra pendências em Pontos para validação | Leonardo Alves |