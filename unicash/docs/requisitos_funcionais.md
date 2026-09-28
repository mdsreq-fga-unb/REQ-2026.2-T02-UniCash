# Requisitos Funcionais

Os requisitos funcionais descrevem os comportamentos e funcionalidades que o usuário poderá executar ou observar no sistema.

## Objetivos Específicos do Produto

Os objetivos abaixo têm origem na seção 2.2 de `solucao.md`.

| Código | Objetivo específico |
|---|---|
| OE1 | Facilitar o registro e o acompanhamento das receitas e despesas dos usuários em um ambiente simples e intuitivo. |
| OE2 | Auxiliar no planejamento financeiro por meio do controle de orçamento, categorização de gastos e acompanhamento de metas de economia. |
| OE3 | Disponibilizar informações e indicadores que permitam ao usuário compreender seus hábitos financeiros e tomar decisões mais conscientes. |
| OE4 | Incentivar a organização financeira de estudantes universitários, famílias e demais usuários, contribuindo para a redução do endividamento e para a formação de reservas financeiras. |

## Características de Produto

As características CP1 a CP5 e suas contribuições aos objetivos seguem a seção 2.3 de `solucao.md`. CP6 e CP7 são complementos propostos nesta revisão para explicitar a origem de RF22, RF30, RF51 e RF53; sua incorporação ao detalhamento da solução depende de validação com a cliente. CP6 contempla a criação de grupos, a definição de papéis e a consulta de informações financeiras compartilhadas. CP7 contempla o incentivo ao acompanhamento de metas por meio de pontuação e classificação.

| Código | Característica | Objetivos relacionados | Origem |
|---|---|---|---|
| CP1 | Gestão de movimentações financeiras | OE1 (principal); OE3 (secundário) | `solucao.md`, seção 2.3 |
| CP2 | Organização e análise dos gastos | OE2 (principal); OE3 (secundário) | `solucao.md`, seção 2.3 |
| CP3 | Planejamento financeiro pessoal | OE2 (principal); OE4 (secundário) | `solucao.md`, seção 2.3 |
| CP4 | Visualização da situação financeira | OE3 (principal); OE2 (secundário) | `solucao.md`, seção 2.3 |
| CP5 | Gestão da identidade do usuário | OE1 (principal); OE4 (secundário) | `solucao.md`, seção 2.3 |
| CP6 | Gestão de grupos e compartilhamento financeiro | OE4 (principal); OE1 e OE3 (secundários) — vínculo proposto | Complemento proposto na revisão; pendente de validação |
| CP7 | Engajamento financeiro | OE4 (principal); OE2 (secundário) — vínculo proposto | Complemento proposto na revisão; pendente de validação |

## Requisitos Funcionais

Os requisitos estão agrupados por característica, mantendo os códigos originais. A coluna de objetivos explicita a contribuição da característica vinculada a cada requisito; não representa confirmação de uma nova demanda pela cliente. As vinculações a CP dos requisitos não selecionados para correção foram preservadas.

### CP1 — Gestão de movimentações financeiras

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF07** | **Registrar receita:** Permitir informar valor, data, descrição e demais campos definidos para uma receita; validar e salvar o lançamento. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF08** | **Consultar receitas:** Exibir as receitas registradas pelo usuário, com consulta por período e detalhe de cada lançamento. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF09** | **Editar receita:** Permitir alterar os dados de uma receita existente e recalcular os totais afetados após salvar. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF10** | **Excluir receita:** Permitir remover uma receita mediante confirmação e atualizar os totais relacionados. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF15** | **Registrar despesa:** Permitir informar valor, data, descrição e categoria de uma despesa; validar e salvar o lançamento. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF16** | **Consultar despesas:** Exibir as despesas registradas pelo usuário, com consulta por período, categoria e detalhe. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF17** | **Editar despesa:** Permitir alterar uma despesa existente e atualizar saldo, categoria e indicadores afetados. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF18** | **Excluir despesa:** Permitir remover uma despesa mediante confirmação e atualizar os cálculos dependentes. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF21** | **Importar extrato bancário:** Permitir selecionar um arquivo de extrato, revisar os lançamentos reconhecidos e confirmar sua incorporação aos dados financeiros. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF32** | **Definir lançamento recorrente:** Permitir marcar receita ou despesa como fixa ou recorrente e informar sua periodicidade para gerar lançamentos nos meses seguintes. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF33** | **Editar ocorrência de lançamento recorrente:** Permitir alterar apenas o lançamento de um mês específico sem modificar as demais ocorrências da série. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF48** | **Identificar lançamento duplicado:** Comparar valor, data e descrição de registros importados com lançamentos manuais e pedir confirmação para cada possível duplicidade antes de consolidar. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF50** | **Registrar despesa por comprovante:** Permitir fotografar ou selecionar um comprovante, extrair campos sugeridos e confirmar ou corrigir os dados antes de salvar a despesa. | CP1 | OE1 (principal); OE3 (secundário) |
| **RF54** | **Importar formatos de extrato:** Aceitar extratos nos formatos OFX, CSV, PDF e imagem, apresentar prévia dos dados identificados e solicitar revisão quando a leitura for ambígua. | CP1 | OE1 (principal); OE3 (secundário) |

### CP2 — Organização e análise dos gastos

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF19** | **Criar categoria de despesas:** Permitir cadastrar uma categoria para classificar despesas e, quando aplicável, definir seu limite de gasto. | CP2 | OE2 (principal); OE3 (secundário) |
| **RF47** | **Classificar lançamentos importados:** Reconhecer os dados de cada registro importado e sugerir sua categoria, permitindo revisão antes da confirmação. | CP2 | OE2 (principal); OE3 (secundário) |

### CP3 — Planejamento financeiro pessoal

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF12** | **Criar meta financeira:** Permitir definir objetivo, valor alvo, prazo e tipo de meta de gasto ou investimento. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF13** | **Editar meta financeira:** Permitir alterar os parâmetros de uma meta existente e atualizar seu progresso. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF14** | **Excluir meta financeira:** Permitir remover uma meta mediante confirmação, sem excluir os lançamentos financeiros associados. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF20** | **Visualizar metas financeiras:** Exibir as metas do usuário com valor alvo, prazo, valor realizado e situação atual. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF28** | **Criar meta do grupo:** Permitir a um membro autorizado definir objetivo, valor alvo e prazo para uma meta coletiva. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF29** | **Visualizar metas do grupo:** Exibir as metas coletivas com seu progresso e prazo para os membros autorizados. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF36** | **Acompanhar progresso da meta:** Comparar o valor realizado com o valor alvo e apresentar progresso e valor restante da meta. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF37** | **Notificar aproximação do limite:** Emitir alerta quando o gasto atingir o limiar de aproximação definido para a meta ou categoria. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF38** | **Notificar ultrapassagem do limite:** Emitir alerta quando o gasto superar o limite definido para a meta ou categoria. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF39** | **Exibir indicador de consumo do limite da categoria:** Exibir ao usuário autenticado a situação de consumo do limite de gasto de cada categoria no período selecionado, comparando o total de despesas da categoria com seu limite e aplicando a regra RN-CAT01. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF44** | **Conceder conquistas financeiras:** Identificar o cumprimento dos marcos financeiros definidos e registrar os selos correspondentes no perfil. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF45** | **Atribuir pontuação por metas:** Somar ao usuário os pontos definidos para cada meta concluída e atualizar seu total. | CP3 | OE2 (principal); OE4 (secundário) |
| **RF46** | **Notificar conquista obtida:** Informar ao usuário quando um selo ou conquista for concedido, com identificação do marco atingido. | CP3 | OE2 (principal); OE4 (secundário) |

### CP4 — Visualização da situação financeira

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF11** | **Calcular total de receitas:** Somar as receitas do período selecionado e apresentar o valor de entrada correspondente. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF34** | **Calcular saldo mensal:** Calcular e exibir o saldo do mês a partir do saldo inicial, das receitas e das despesas registradas no período. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF35** | **Reportar saldo anterior:** Exibir o saldo remanescente do mês anterior como referência no cálculo e na apresentação do mês atual. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF40** | **Gerar resumo financeiro inicial:** Ao abrir o aplicativo, apresentar saldo, receitas, despesas e indicadores do período selecionado. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF41** | **Exibir gráfico de despesas:** Representar os totais de despesas por categoria no período selecionado em um gráfico com valores identificáveis. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF42** | **Exibir percentual por categoria:** Exibir ao usuário autenticado a participação das despesas de cada categoria no total de despesas do período selecionado, calculada por (despesas da categoria / total de despesas do período) × 100. Quando o total de despesas for zero, apresentar 0% para as categorias exibidas e a mensagem "Sem despesas no período", sem executar a divisão. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF43** | **Exibir previsão de faturas:** Projetar as contas recorrentes já cadastradas para períodos futuros e identificá-las como valores previstos. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF49** | **Consolidar extratos de contas:** Apresentar em uma visão única os lançamentos confirmados de diferentes bancos e contas, preservando a identificação da origem. | CP4 | OE3 (principal); OE2 (secundário) |
| **RF52** | **Consolidar dados do grupo:** Somar e exibir os dados financeiros compartilhados pelos integrantes, respeitando as permissões e a privacidade de cada lançamento. | CP4 | OE3 (principal); OE2 (secundário) |

### CP5 — Gestão da identidade do usuário

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF01** | **Cadastrar usuário:** Permitir que uma pessoa crie uma conta ao informar os dados obrigatórios e uma senha; após a validação, registrar o perfil e confirmar o cadastro. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF02** | **Autenticar usuário:** Permitir o acesso com credenciais válidas, iniciar a sessão e informar o motivo quando a autenticação for rejeitada. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF03** | **Visualizar perfil de usuário:** Exibir ao usuário autenticado os dados do próprio perfil. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF04** | **Editar perfil de usuário:** Permitir ao usuário autenticado alterar seus dados de perfil e salvar as mudanças após a validação. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF05** | **Excluir perfil de usuário:** Solicitar confirmação antes da exclusão da conta e executar o procedimento de remoção dos dados associados conforme a política de retenção definida pelo projeto. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF06** | **Encerrar sessão:** Permitir ao usuário sair da conta e invalidar a sessão ativa no aplicativo. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF23** | **Entrar em grupo de amigos ou família:** Permitir ao usuário aceitar um convite válido para integrar um grupo e passar a acessar o conteúdo permitido ao seu papel. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF24** | **Convidar membro para grupo:** Permitir ao membro autorizado enviar convite e acompanhar sua situação até o aceite ou cancelamento. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF25** | **Sair de grupo de amigos ou família:** Permitir ao membro sair do grupo, com confirmação e atualização de suas permissões de acesso. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF26** | **Tornar controle financeiro privado:** Permitir ao usuário marcar seus dados financeiros como privados para impedir sua visualização pelos demais integrantes do grupo. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF27** | **Visualizar metas de membros do grupo:** Exibir as metas compartilhadas pelos membros do grupo de acordo com as permissões de quem consulta. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF31** | **Recuperar senha:** Permitir solicitar redefinição por um canal verificado e cadastrar uma nova senha por meio de ligação temporária de uso único. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF55** | **Apresentar tutorial inicial:** No primeiro acesso, oferecer tutorial interativo das tarefas principais, com opção de avançar ou encerrar. | CP5 | OE1 (principal); OE4 (secundário) |
| **RF56** | **Avisar manutenção programada:** Exibir aos usuários aviso prévio com período e impacto previsto de uma manutenção cadastrada. | CP5 | OE1 (principal); OE4 (secundário) |

### CP6 — Gestão de grupos e compartilhamento financeiro

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF22** | **Criar grupo de amigos ou família:** Permitir ao usuário autenticado criar um grupo ao informar seu nome, tornando-o integrante com o papel de Administrador e as permissões definidas no RF51. | CP6 | OE4 (principal); OE1 e OE3 (secundários) — vínculo proposto |
| **RF51** | **Definir papel de membro:** Permitir ao Administrador atribuir ou alterar os papéis Administrador e Membro dos integrantes do próprio grupo. O Administrador pode convidar integrantes (RF24), criar metas coletivas (RF28) e gerenciar papéis; ambos os papéis podem consultar metas compartilhadas e coletivas (RF27 e RF29), classificação (RF30), consolidado (RF52) e comparação de gastos (RF53), apenas sobre informações autorizadas para o grupo. Ambos podem sair do grupo (RF25) e tornar privados os próprios dados (RF26). O papel Membro não permite convidar integrantes, criar metas coletivas ou gerenciar papéis. Nenhum papel autoriza consultar ou alterar dados privados de outro integrante. Impedir alterações de papel que deixem o grupo sem Administrador. | CP6 | OE4 (principal); OE1 e OE3 (secundários) — vínculo proposto |
| **RF53** | **Comparar gastos do grupo:** Exibir aos integrantes autenticados com acesso ao grupo, conforme o RF51, um gráfico de barras com o total de despesas compartilhadas por cada membro no período selecionado. Cada barra deve identificar o membro e seu total monetário; considerar somente lançamentos cuja visualização esteja autorizada ao solicitante. Quando não houver despesas compartilhadas acessíveis no período, exibir "Sem despesas compartilhadas no período". | CP6 | OE4 (principal); OE1 e OE3 (secundários) — vínculo proposto |

### CP7 — Engajamento financeiro

| Código | Nome e descrição | Característica de Produto | Objetivos relacionados |
|---|---|---|---|
| **RF30** | **Classificar usuários do grupo:** Exibir ao usuário autenticado integrante do grupo a classificação de seus membros em ordem decrescente da pontuação acumulada conforme o RF45, informando nome, pontuação e posição de cada membro. Membros com a mesma pontuação devem ocupar a mesma posição. | CP7 | OE4 (principal); OE2 (secundário) — vínculo proposto |

## Regra associada ao RF39

### RN-CAT01 — Situação de consumo do limite da categoria

**Situação: proposta pendente de validação com a cliente.**

Para uma categoria com limite maior que zero no período selecionado, calcular o consumo por `(total de despesas da categoria no período / limite da categoria para o período) × 100` e aplicar as faixas abaixo.

| Consumo do limite | Situação |
|---|---|
| Abaixo de 80% | Dentro do limite |
| De 80% a 100%, inclusive | Próximo do limite ou no limite |
| Acima de 100% | Limite ultrapassado |

Quando a categoria não possuir limite definido ou seu limite for zero, apresentar "Limite não definido" e não calcular o percentual de consumo. Esse tratamento também é proposto para validação.

**Apresentação proposta, pendente de validação:** verde para a primeira faixa, amarelo para a segunda e vermelho para a terceira, acompanhados do texto da situação. As cores são uma decisão de interface associada à regra, separada da descrição funcional.

## Pontos para validação

- Os limiares, o tratamento de categorias sem limite positivo e a apresentação associados ao RF39 e à RN-CAT01.
- As características complementares CP6 e CP7 e suas ligações aos objetivos da solução.
- A distribuição de permissões proposta no RF51 e o tratamento de empates no RF30.
