# Requisitos Funcionais

Os requisitos funcionais descrevem os comportamentos e funcionalidades que o usuário poderá executar ou observar no sistema.

## Características de Produto

| Código | Característica |
|---|---|
| CP1 | Cadastro e gerenciamento de receitas e despesas |
| CP2 | Organização financeira por categorias |
| CP3 | Planejamento financeiro e metas |
| CP4 | Relatórios e indicadores financeiros |
| CP5 | Perfil e gerenciamento do usuário |
| CP6 | Segurança e proteção dos dados |

## Requisitos Funcionais

| Código | Nome e descrição | Característica de Produto |
|---|---|---|
| **RF01** | **Cadastrar usuário:** Permitir que uma pessoa crie uma conta ao informar os dados obrigatórios e uma senha; após a validação, registrar o perfil e confirmar o cadastro. | CP5 |
| **RF02** | **Autenticar usuário:** Permitir o acesso com credenciais válidas, iniciar a sessão e informar o motivo quando a autenticação for rejeitada. | CP5 |
| **RF03** | **Visualizar perfil de usuário:** Exibir ao usuário autenticado os dados do próprio perfil. | CP5 |
| **RF04** | **Editar perfil de usuário:** Permitir ao usuário autenticado alterar seus dados de perfil e salvar as mudanças após a validação. | CP5 |
| **RF05** | **Excluir perfil de usuário:** Solicitar confirmação antes da exclusão da conta e executar o procedimento de remoção dos dados associados conforme a política de retenção definida pelo projeto. | CP5 |
| **RF06** | **Encerrar sessão:** Permitir ao usuário sair da conta e invalidar a sessão ativa no aplicativo. | CP5 |
| **RF07** | **Registrar receita:** Permitir informar valor, data, descrição e demais campos definidos para uma receita; validar e salvar o lançamento. | CP1 |
| **RF08** | **Consultar receitas:** Exibir as receitas registradas pelo usuário, com consulta por período e detalhe de cada lançamento. | CP1 |
| **RF09** | **Editar receita:** Permitir alterar os dados de uma receita existente e recalcular os totais afetados após salvar. | CP1 |
| **RF10** | **Excluir receita:** Permitir remover uma receita mediante confirmação e atualizar os totais relacionados. | CP1 |
| **RF11** | **Calcular total de receitas:** Somar as receitas do período selecionado e apresentar o valor de entrada correspondente. | CP4 |
| **RF12** | **Criar meta financeira:** Permitir definir objetivo, valor alvo, prazo e tipo de meta de gasto ou investimento. | CP3 |
| **RF13** | **Editar meta financeira:** Permitir alterar os parâmetros de uma meta existente e atualizar seu progresso. | CP3 |
| **RF14** | **Excluir meta financeira:** Permitir remover uma meta mediante confirmação, sem excluir os lançamentos financeiros associados. | CP3 |
| **RF15** | **Registrar despesa:** Permitir informar valor, data, descrição e categoria de uma despesa; validar e salvar o lançamento. | CP1 |
| **RF16** | **Consultar despesas:** Exibir as despesas registradas pelo usuário, com consulta por período, categoria e detalhe. | CP1 |
| **RF17** | **Editar despesa:** Permitir alterar uma despesa existente e atualizar saldo, categoria e indicadores afetados. | CP1 |
| **RF18** | **Excluir despesa:** Permitir remover uma despesa mediante confirmação e atualizar os cálculos dependentes. | CP1 |
| **RF19** | **Criar categoria de despesas:** Permitir cadastrar uma categoria para classificar despesas e, quando aplicável, definir seu limite de gasto. | CP2 |
| **RF20** | **Visualizar metas financeiras:** Exibir as metas do usuário com valor alvo, prazo, valor realizado e situação atual. | CP3 |
| **RF21** | **Importar extrato bancário:** Permitir selecionar um arquivo de extrato, revisar os lançamentos reconhecidos e confirmar sua incorporação aos dados financeiros. | CP1 |
| **RF22** | **Criar grupo de amigos ou família:** Permitir ao usuário criar um grupo, definir seu nome e assumir o papel inicial de administração. | CP5 |
| **RF23** | **Entrar em grupo de amigos ou família:** Permitir ao usuário aceitar um convite válido para integrar um grupo e passar a acessar o conteúdo permitido ao seu papel. | CP5 |
| **RF24** | **Convidar membro para grupo:** Permitir ao membro autorizado enviar convite e acompanhar sua situação até o aceite ou cancelamento. | CP5 |
| **RF25** | **Sair de grupo de amigos ou família:** Permitir ao membro sair do grupo, com confirmação e atualização de suas permissões de acesso. | CP5 |
| **RF26** | **Tornar controle financeiro privado:** Permitir ao usuário marcar seus dados financeiros como privados para impedir sua visualização pelos demais integrantes do grupo. | CP6 |
| **RF27** | **Visualizar metas de membros do grupo:** Exibir as metas compartilhadas pelos membros do grupo de acordo com as permissões de quem consulta. | CP5 |
| **RF28** | **Criar meta do grupo:** Permitir a um membro autorizado definir objetivo, valor alvo e prazo para uma meta coletiva. | CP3 |
| **RF29** | **Visualizar metas do grupo:** Exibir as metas coletivas com seu progresso e prazo para os membros autorizados. | CP3 |
| **RF30** | **Classificar usuários do grupo:** Ordenar os membros conforme a pontuação acumulada e exibir sua posição no grupo. | CP5 |
| **RF31** | **Recuperar senha:** Permitir solicitar redefinição por um canal verificado e cadastrar uma nova senha por meio de ligação temporária de uso único. | CP5 |
| **RF32** | **Definir lançamento recorrente:** Permitir marcar receita ou despesa como fixa ou recorrente e informar sua periodicidade para gerar lançamentos nos meses seguintes. | CP1 |
| **RF33** | **Editar ocorrência de lançamento recorrente:** Permitir alterar apenas o lançamento de um mês específico sem modificar as demais ocorrências da série. | CP1 |
| **RF34** | **Calcular saldo mensal:** Calcular e exibir o saldo do mês a partir do saldo inicial, das receitas e das despesas registradas no período. | CP4 |
| **RF35** | **Reportar saldo anterior:** Exibir o saldo remanescente do mês anterior como referência no cálculo e na apresentação do mês atual. | CP4 |
| **RF36** | **Acompanhar progresso da meta:** Comparar o valor realizado com o valor alvo e apresentar progresso e valor restante da meta. | CP3 |
| **RF37** | **Notificar aproximação do limite:** Emitir alerta quando o gasto atingir o limiar de aproximação definido para a meta ou categoria. | CP3 |
| **RF38** | **Notificar ultrapassagem do limite:** Emitir alerta quando o gasto superar o limite definido para a meta ou categoria. | CP3 |
| **RF39** | **Exibir indicador de categoria:** Apresentar indicador verde abaixo de 80% do limite, amarelo de 80% a 100% e vermelho acima de 100%; validar esses limiares com a cliente. **(A SER DISCUTIDO)** | CP3 |
| **RF40** | **Gerar resumo financeiro inicial:** Ao abrir o aplicativo, apresentar saldo, receitas, despesas e indicadores do período selecionado. | CP4 |
| **RF41** | **Exibir gráfico de despesas:** Representar os totais de despesas por categoria no período selecionado em um gráfico com valores identificáveis. | CP4 |
| **RF42** | **Exibir percentual por categoria:** Calcular a relação entre o gasto de cada categoria e a receita do período e apresentar o percentual correspondente. | CP4 |
| **RF43** | **Exibir previsão de faturas:** Projetar as contas recorrentes já cadastradas para períodos futuros e identificá-las como valores previstos. | CP4 |
| **RF44** | **Conceder conquistas financeiras:** Identificar o cumprimento dos marcos financeiros definidos e registrar os selos correspondentes no perfil. | CP3 |
| **RF45** | **Atribuir pontuação por metas:** Somar ao usuário os pontos definidos para cada meta concluída e atualizar seu total. | CP3 |
| **RF46** | **Notificar conquista obtida:** Informar ao usuário quando um selo ou conquista for concedido, com identificação do marco atingido. | CP3 |
| **RF47** | **Classificar lançamentos importados:** Reconhecer os dados de cada registro importado e sugerir sua categoria, permitindo revisão antes da confirmação. | CP2 |
| **RF48** | **Identificar lançamento duplicado:** Comparar valor, data e descrição de registros importados com lançamentos manuais e pedir confirmação para cada possível duplicidade antes de consolidar. | CP1 |
| **RF49** | **Consolidar extratos de contas:** Apresentar em uma visão única os lançamentos confirmados de diferentes bancos e contas, preservando a identificação da origem. | CP4 |
| **RF50** | **Registrar despesa por comprovante:** Permitir fotografar ou selecionar um comprovante, extrair campos sugeridos e confirmar ou corrigir os dados antes de salvar a despesa. | CP1 |
| **RF51** | **Definir papel de membro:** Permitir ao administrador atribuir ou alterar o papel de cada integrante e aplicar as permissões correspondentes. | CP6 |
| **RF52** | **Consolidar dados do grupo:** Somar e exibir os dados financeiros compartilhados pelos integrantes, respeitando as permissões e a privacidade de cada lançamento. | CP4 |
| **RF53** | **Comparar gastos do grupo:** Apresentar comparação dos gastos compartilhados entre membros autorizados, no período selecionado. | CP4 |
| **RF54** | **Importar formatos de extrato:** Aceitar extratos nos formatos OFX, CSV, PDF e imagem, apresentar prévia dos dados identificados e solicitar revisão quando a leitura for ambígua. | CP1 |
| **RF55** | **Apresentar tutorial inicial:** No primeiro acesso, oferecer tutorial interativo das tarefas principais, com opção de avançar ou encerrar. | CP5 |
| **RF56** | **Avisar manutenção programada:** Exibir aos usuários aviso prévio com período e impacto previsto de uma manutenção cadastrada. | CP6 |

> **Ponto para validação:** Os limiares definidos no RF39 ainda precisam ser validados com a cliente.