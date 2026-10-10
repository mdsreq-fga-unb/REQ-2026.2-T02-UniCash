# Requisitos Funcionais

Os requisitos funcionais descrevem os comportamentos e funcionalidades que o usuário poderá executar ou observar no sistema.

**Premissa de escopo:** os lançamentos são inseridos de forma declarativa pelo usuário, manualmente ou por importação de arquivo de extrato ou comprovante fornecido por ele. Não há integração por API com bancos ou cartões de crédito.

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

## Requisitos Funcionais

A tabela está ordenada por Característica de Produto.

| Código | Nome e descrição | Característica de Produto |
|---|---|---|
| **RF07** | **Registrar receita:** Permitir informar valor, data, descrição e demais campos definidos para uma receita; validar e salvar o lançamento. | CP1 |
| **RF08** | **Consultar receitas:** Exibir as receitas registradas pelo usuário, com consulta por período e detalhe de cada lançamento. | CP1 |
| **RF09** | **Editar receita:** Permitir alterar os dados de uma receita existente e recalcular os totais afetados após salvar. | CP1 |
| **RF10** | **Excluir receita:** Permitir remover uma receita mediante confirmação e atualizar os totais relacionados. | CP1 |
| **RF15** | **Registrar despesa:** Permitir informar valor, data, descrição e categoria de uma despesa; validar e salvar o lançamento. | CP1 |
| **RF16** | **Consultar despesas:** Exibir as despesas registradas pelo usuário, com consulta por período, categoria e detalhe. | CP1 |
| **RF17** | **Editar despesa:** Permitir alterar os dados de uma despesa existente e salvar as mudanças após a validação. | CP1 |
| **RF18** | **Excluir despesa:** Permitir remover uma despesa mediante confirmação e atualizar os cálculos dependentes. | CP1 |
| **RF21** | **Importar extrato bancário:** Permitir selecionar um arquivo de extrato em um dos formatos aceitos (RN05), apresentar prévia dos lançamentos reconhecidos, solicitar revisão quando a leitura for ambígua e confirmar sua incorporação aos dados financeiros. | CP1 |
| **RF32** | **Definir lançamento recorrente:** Permitir marcar receita ou despesa como fixa ou recorrente e informar sua periodicidade para gerar lançamentos nos meses seguintes. | CP1 |
| **RF33** | **Editar ocorrência de lançamento recorrente:** Permitir alterar apenas o lançamento de um mês específico sem modificar as demais ocorrências da série. | CP1 |
| **RF48** | **Identificar lançamento duplicado:** Comparar cada registro importado com os lançamentos já registrados e considerar possível duplicidade quando o valor for idêntico e a data diferir em até 1 dia; para cada possível duplicidade, exibir os dois registros lado a lado e pedir ao usuário que escolha entre descartar o importado ou mantê-lo como lançamento distinto, antes de consolidar. | CP1 |
| **RF50** | **Registrar despesa por comprovante:** Permitir fotografar ou selecionar um comprovante, anexá-lo ao lançamento e confirmar ou informar os dados da despesa antes de salvar. | CP1 |
| **RF59** | **Registrar lançamento sem conexão:** Permitir ao usuário autenticado registrar receita ou despesa sem conexão, guardá-lo localmente, informar seu estado de envio e enviá-lo ao servidor quando a conexão voltar. | CP1 |
| **RF60** | **Extrair dados de comprovante:** Ler a imagem do comprovante indicado no RF50 e sugerir valor, data e descrição da despesa para confirmação ou correção pelo usuário. | CP1 |
| **RF19** | **Criar categoria de despesas:** Permitir cadastrar uma categoria para classificar despesas e, quando aplicável, definir seu limite de gasto. | CP2 |
| **RF47** | **Classificar lançamentos importados:** Sugerir a categoria de cada registro importado a partir de palavras-chave da descrição associadas às categorias do usuário e de lançamentos anteriores com a mesma descrição, permitindo revisão antes da confirmação; quando não houver correspondência, deixar o registro sem categoria sugerida. | CP2 |
| **RF12** | **Criar meta financeira:** Permitir definir objetivo, valor alvo, prazo e tipo de meta de gasto ou investimento. | CP3 |
| **RF13** | **Editar meta financeira:** Permitir alterar os parâmetros de uma meta existente e salvar as mudanças após a validação. | CP3 |
| **RF14** | **Excluir meta financeira:** Permitir remover uma meta mediante confirmação, sem excluir os lançamentos financeiros associados. | CP3 |
| **RF20** | **Visualizar metas financeiras:** Exibir as metas do usuário com valor alvo, prazo, valor realizado e situação atual. | CP3 |
| **RF36** | **Acompanhar progresso da meta:** Comparar o valor realizado com o valor alvo e apresentar progresso e valor restante da meta. | CP3 |
| **RF37** | **Notificar aproximação do limite:** Emitir alerta quando o gasto atingir o limiar de aproximação definido na RN03 para a meta de gasto ou categoria, apresentando apenas os valores envolvidos (gasto, limite e categoria ou meta), sem termos de julgamento, e respeitando as preferências do RF58. | CP3 |
| **RF38** | **Notificar ultrapassagem do limite:** Emitir alerta quando o gasto superar o limite definido na RN03 para a meta de gasto ou categoria, apresentando apenas os valores envolvidos (gasto, limite e categoria ou meta), sem termos de julgamento, e respeitando as preferências do RF58. | CP3 |
| **RF39** | **Exibir indicador de consumo do limite da categoria:** Apresentar, para cada categoria com limite definido, um indicador visual do consumo do limite no período selecionado, conforme as faixas da RN02. | CP3 |
| **RF11** | **Calcular total de receitas:** Exibir ao usuário autenticado a soma das receitas do período selecionado como valor de entrada correspondente. | CP4 |
| **RF34** | **Calcular saldo mensal:** Exibir ao usuário autenticado o saldo do mês, calculado a partir do saldo inicial, das receitas e das despesas registradas no período. | CP4 |
| **RF35** | **Exibir saldo do mês anterior:** Exibir ao usuário autenticado o saldo remanescente do mês anterior como referência na apresentação do mês atual. | CP4 |
| **RF40** | **Gerar resumo financeiro inicial:** Ao abrir o aplicativo, exibir ao usuário autenticado o saldo, o total de receitas, o total de despesas e o progresso das metas do período selecionado, sendo o mês corrente o período padrão; quando não houver lançamentos, exibir estado vazio com atalho para o tutorial (RF55). | CP4 |
| **RF41** | **Exibir gráfico de despesas:** Exibir ao usuário autenticado um gráfico de barras com o total de despesas por categoria no período selecionado, com o valor de cada barra apresentado como rótulo e a categoria identificada na legenda. | CP4 |
| **RF42** | **Exibir percentual por categoria:** Exibir ao usuário autenticado o percentual do total de despesas do período que cada categoria representa; quando não houver despesas no período, não apresentar percentual. | CP4 |
| **RF43** | **Exibir previsão de despesas recorrentes:** Exibir ao usuário autenticado as despesas recorrentes já cadastradas (RF32) previstas para os próximos 30 dias, identificadas como valores previstos. | CP4 |
| **RF49** | **Consolidar extratos de contas:** Exibir ao usuário, em uma visão única, os lançamentos confirmados de diferentes extratos importados, identificando em cada um a instituição de origem informada na importação. | CP4 |
| **RF01** | **Cadastrar usuário:** Permitir que uma pessoa crie uma conta ao informar os dados obrigatórios e uma senha; após a validação, registrar o perfil e confirmar o cadastro. | CP5 |
| **RF02** | **Autenticar usuário:** Permitir o acesso com credenciais válidas, iniciar a sessão e informar o motivo quando a autenticação for rejeitada. | CP5 |
| **RF03** | **Visualizar perfil de usuário:** Exibir ao usuário autenticado os dados do próprio perfil. | CP5 |
| **RF04** | **Editar perfil de usuário:** Permitir ao usuário autenticado alterar seus dados de perfil e salvar as mudanças após a validação. | CP5 |
| **RF05** | **Excluir perfil de usuário:** Solicitar confirmação antes da exclusão da conta e executar a remoção dos dados associados conforme a política de retenção da RN04. | CP5 |
| **RF06** | **Encerrar sessão:** Permitir ao usuário sair da conta e invalidar a sessão ativa no aplicativo. | CP5 |
| **RF31** | **Recuperar senha:** Permitir solicitar redefinição por um canal verificado e cadastrar uma nova senha por meio de ligação temporária de uso único. | CP5 |
| **RF55** | **Apresentar tutorial inicial:** No primeiro acesso, oferecer tutorial interativo que informe o que o aplicativo faz e o que não faz (organiza e apresenta as informações financeiras, sem aumentar a renda nem garantir a redução de dívidas) e guie o usuário por registrar receita (RF07), registrar despesa (RF15), criar meta financeira (RF12) e ler o resumo inicial (RF40), explicando em linguagem simples os termos financeiros usados e com opção de avançar ou encerrar a qualquer etapa; permitir reabrir o tutorial pelo menu de ajuda. | CP6 |
| **RF56** | **Avisar manutenção programada:** Exibir aos usuários, ao abrir o aplicativo, aviso prévio com período e impacto previsto de uma manutenção programada, informada pela equipe de operação por configuração do sistema, sem tela de cadastro no produto. | CP6 |
| **RF58** | **Configurar notificações:** Permitir ao usuário ativar ou desativar cada tipo de alerta (aproximação do limite, ultrapassagem do limite e conquistas) e alterar a escolha a qualquer momento. | CP6 |
| **RF22** | **Criar grupo de amigos ou família:** Permitir ao usuário criar um grupo, definir seu nome e assumir o papel inicial de administração. | CP7 |
| **RF23** | **Entrar em grupo de amigos ou família:** Permitir ao usuário aceitar um convite válido para integrar um grupo e passar a acessar o conteúdo permitido ao seu papel (RN01). | CP7 |
| **RF24** | **Convidar membro para grupo:** Permitir ao Administrador do grupo (RN01) enviar convite e acompanhar sua situação até o aceite ou cancelamento. | CP7 |
| **RF25** | **Sair de grupo de amigos ou família:** Permitir ao membro sair do grupo, com confirmação e atualização de suas permissões de acesso. | CP7 |
| **RF26** | **Tornar controle financeiro privado:** Permitir ao usuário marcar seus dados financeiros como privados para impedir sua visualização pelos demais integrantes do grupo. | CP7 |
| **RF27** | **Visualizar metas de membros do grupo:** Exibir aos integrantes do grupo as metas compartilhadas pelos membros, conforme o papel de quem consulta (RN01) e a privacidade definida no RF26. | CP7 |
| **RF28** | **Criar meta do grupo:** Permitir ao Administrador do grupo (RN01) definir objetivo, valor alvo e prazo para uma meta coletiva. | CP7 |
| **RF29** | **Visualizar metas do grupo:** Exibir as metas coletivas com seu progresso e prazo aos integrantes do grupo (RN01). | CP7 |
| **RF51** | **Definir papel de membro:** Permitir ao administrador do grupo atribuir ou alterar o papel de cada integrante (Administrador ou Membro) e aplicar as permissões do papel, conforme a RN01. | CP7 |
| **RF52** | **Consolidar dados do grupo:** Exibir aos integrantes do grupo o total de receitas, o total de despesas e o saldo dos lançamentos que cada integrante tornou compartilhados, respeitando a privacidade definida no RF26; a comparação entre membros é tratada no RF53. | CP7 |
| **RF53** | **Comparar gastos do grupo:** Exibir aos integrantes do grupo, no período selecionado, um gráfico de barras com o total de despesas compartilhadas e o percentual de participação nas despesas do grupo dos membros que optaram por participar da comparação, de acordo com a escolha registrada no RF57. | CP7 |
| **RF57** | **Configurar participação em comparações do grupo:** Permitir ao usuário escolher se seus dados aparecem na classificação do grupo (RF30) e na comparação de gastos do grupo (RF53), mantendo a participação desativada por padrão e permitindo alterar a escolha a qualquer momento. | CP7 |
| **RF30** | **Classificar usuários do grupo:** Ordenar os membros que optaram por participar da classificação, conforme a pontuação acumulada, e exibir sua posição no grupo, de acordo com a escolha registrada no RF57. | CP8 |
| **RF44** | **Conceder conquistas financeiras:** Identificar o cumprimento dos marcos financeiros definidos e registrar no perfil do usuário os selos correspondentes. | CP8 |
| **RF45** | **Atribuir pontuação por metas:** Somar ao usuário os pontos definidos para cada meta concluída e atualizar e exibir seu total. | CP8 |
| **RF46** | **Notificar conquista obtida:** Informar ao usuário quando um selo ou conquista for concedido, com identificação do marco atingido, respeitando as preferências do RF58. | CP8 |

**Códigos descontinuados** (não reutilizados): **RF54** foi fundido ao RF21; os formatos aceitos passaram para a RN05.

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
| Abaixo de 80% | Verde |
| De 80% a 100% | Amarelo |
| Acima de 100% | Vermelho |

*Pendente de validação com a cliente.*

### RN03: Disparo dos alertas de limite (RF37 e RF38)

Os alertas se aplicam a categorias com limite e a metas de gasto, usando os mesmos percentuais da RN02:

- **Aproximação (RF37):** o gasto atinge 80% do limite da categoria ou do valor alvo da meta de gasto;
- **Ultrapassagem (RF38):** o gasto supera 100% do limite da categoria ou do valor alvo da meta de gasto.

Cada alerta é emitido uma vez por período em que a condição ocorre. *Pendente de validação com a cliente.*

### RN04: Política de retenção na exclusão de perfil (RF05)

- **Removidos:** dados de perfil, lançamentos, categorias, metas, conquistas, pontuação e preferências do usuário, e sua participação em grupos;
- **Anonimizados:** registros da trilha de auditoria (RNF16), que mantêm a operação, a data e o horário sem identificar o usuário;
- **Prazo:** a remoção ocorre em até 30 dias após a confirmação da exclusão; os backups deixam de conter os dados do usuário ao final do ciclo de rotação de backups;
- **Administrador único:** o usuário que é o único Administrador de um grupo deve designar outro Administrador antes da exclusão (RN01).

*Proposta pendente de validação com a cliente.*

### RN05: Formatos de extrato aceitos (RF21)

- **Aceitos:** OFX e CSV;
- **Fora do escopo atual:** PDF e imagem, por exigirem reconhecimento óptico de caracteres; candidatos a uma versão futura.

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados com a cliente:

- Faixas do indicador (RN02) e limiares de disparo dos alertas (RN03);
- Política de retenção proposta na RN04;
- Formatos de extrato aceitos (RN05);
- Viabilidade e escopo do registro sem conexão (RF59) e da leitura automática de comprovantes (RF60), por envolverem esforço e incerteza maiores;
- Características CP7 e CP8 e o objetivo do projeto que cada uma atende.