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
| **RF65** | **Consultar categorias:** Exibir ao usuário a lista de categorias disponíveis (padrão e próprias), identificando as categorias padrão e o limite de gasto de cada uma, quando definido, com a opção de ver os lançamentos classificados em cada categoria. | CP2 |
| **RF66** | **Editar categoria:** Permitir alterar o nome e o limite de gasto de uma categoria própria, validar a unicidade do nome (RN13), salvar as mudanças e recalcular os indicadores e alertas de limite afetados (RF37, RF38 e RF39). As categorias padrão não podem ser editadas (RN13). | CP2 |
| **RF67** | **Excluir categoria:** Permitir remover uma categoria própria mediante confirmação (RN11), mantendo os lançamentos associados, que passam a constar como “Sem categoria” (RN13), e atualizar os indicadores e alertas dependentes. As categorias padrão não podem ser excluídas (RN13). | CP2 |
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
| **RF61** | **Usar sem conta:** Permitir usar todas as funcionalidades individuais sem cadastro, com os dados somente no dispositivo; a conta é necessária só para sincronizar e participar de grupos. | CP5 |
| **RF55** | **Apresentar tutorial inicial:** No primeiro acesso, oferecer tutorial interativo que informe o que o aplicativo faz e o que não faz (organiza e apresenta as informações financeiras, sem aumentar a renda nem garantir a redução de dívidas) e guie o usuário por registrar receita (RF07), registrar despesa (RF15), criar meta financeira (RF12) e ler o resumo inicial (RF40), explicando em linguagem simples os termos financeiros usados e com opção de avançar ou encerrar a qualquer etapa; permitir reabrir o tutorial pelo menu de ajuda. | CP6 |
| **RF56** | **Avisar manutenção programada:** Exibir aos usuários, ao abrir o aplicativo, aviso prévio com período e impacto previsto de uma manutenção programada, informada pela equipe de operação por configuração do sistema, sem tela de cadastro no produto. | CP6 |
| **RF58** | **Configurar notificações:** Permitir ao usuário ativar ou desativar cada tipo de alerta (aproximação do limite, ultrapassagem do limite e conquistas) e alterar a escolha a qualquer momento. | CP6 |
| **RF62** | **Acompanhar sincronização:** Exibir o estado (sincronizado, pendente, sem conexão, erro), a última sincronização e as alterações pendentes, com opção de sincronizar na hora; generaliza o “estado de envio” do RF59. | CP6 |
| **RF63** | **Gerar backup:** Criar um arquivo completo e restaurável dos dados do usuário, sem exigir conexão. | CP6 |
| **RF64** | **Restaurar backup:** Validar o arquivo, mostrar prévia e permitir substituir ou mesclar com os dados atuais. | CP6 |
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
| Abaixo de 50% | Verde |
| De 50% a 80% | Amarelo |
| De 80% a 90% | Laranja |
| Acima de 90% | Vermelho |

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

### RN06: Princípio offline-first e disponibilidade

A base local é a cópia principal dos dados; o servidor serve à sincronização e aos grupos. Funcionam offline: CP1 a CP4, categorias, metas, importação, conquistas e pontos pessoais. Exigem conexão: cadastro e recuperação de senha (RF01, RF31) e operações de grupo (RF22 a RF25, RF51). Dados de outros membros (RF27, RF29, RF30, RF52, RF53) aparecem offline com a data da última atualização. Em caso de conflito com RF59, RNF02, RNF06, RNF08, RNF09 ou RNF31, prevalece esta regra para operações locais.

### RN07: Resolução de conflitos

Alterações em campos diferentes do mesmo registro se combinam; no mesmo campo vale a mais recente por ordem lógica das alterações, não só pela hora do aparelho; em edição contra exclusão, a exclusão prevalece. Saldo, totais, progresso, pontos e selos são sempre recalculados a partir dos lançamentos, nunca sincronizados como contadores.

### RN08: Campos obrigatórios de receita e despesa

- **Campos obrigatórios:** data, título e valor são obrigatórios nos formulários de receita e despesa; descrição é opcional.
- **Validação:** os campos são validados no cliente e no servidor (RNF04).
- **Rejeição:** a rejeição informa o motivo por campo (RNF14).

### RN09: Valor monetário

- **Valor permitido:** maior que zero, com no máximo duas casas decimais e até R$ 999.999.999,99.
- **Tipo de lançamento:** receita ou despesa é definida pelo tipo do lançamento, nunca pelo sinal do valor.
- **Cálculos:** utilizam tipo decimal com arredondamento explícito (RNF07).

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

### RN13: Categorias

- **Categorias padrão:** Casa, Alimentação, Mobilidade, Estudos, Saúde, Lazer e Reserva financeira.
- **Proteção:** as categorias padrão não podem ser editadas nem excluídas.
- **Categorias próprias:** o usuário pode criar e editar categorias próprias, com nome único por usuário, sem diferenciar letras maiúsculas de minúsculas.
- **Categoria opcional:** um lançamento pode não possuir categoria. Nesse caso, aparece como “Sem categoria” e não entra no cálculo dos limites por categoria.
- **Classificação de despesas:** despesas podem ser classificadas como fixas ou variáveis e essenciais ou não essenciais; esses campos são opcionais.
- **Exclusão de categorias próprias:** o usuário pode excluir categorias próprias mediante confirmação (RN11). Os lançamentos associados não são excluídos e passam a aparecer como “Sem categoria”.
- **Efeito na edição e exclusão:** ao editar o nome ou o limite, ou ao excluir uma categoria, os indicadores de consumo e os alertas de limite são recalculados na mesma operação (RN14).


### RN14: Limite por categoria e renda

- **Limite opcional:** definido por categoria em valor monetário (R$) ou percentual da renda mensal.
- **Renda mensal:** soma das receitas com data no mês consultado.
- **Consumo:** corresponde às despesas da categoria no mês divididas pelo limite efetivo.
- **Categorias sem limite:** não geram alertas nem indicadores de consumo.
- **Percentuais:** os percentuais de 50%, 70% e 90% citados na entrevista não são aplicados. Valem os percentuais definidos na RN02 e na RN03.


### RN15: Saldo mensal

- **Cálculo:** saldo do mês = total de receitas do mês − total de despesas do mês.

### RN16: Saldo anterior

- **Cálculo automático:** corresponde ao saldo final do mês anterior.
- **Saldo inicial:** o usuário pode informar um saldo inicial, inclusive negativo, com mês de referência.
- **Referência:** o saldo informado corresponde ao saldo no início do mês de referência.
- **Meses anteriores:** não possuem saldo anterior calculado, e os lançamentos anteriores ao mês de referência não entram no cálculo.
- **Recálculo:** alterar o saldo inicial recalcula os saldos dos meses seguintes.

### RN17: Cores do saldo

| Saldo em relação às receitas do mês | Cor |
|---|---|
| Acima de 90% | Verde |
| Acima de 80% até 90% | Amarelo |
| De 50% a 80% | Laranja |
| Abaixo de 50% | Vermelho |

O indicador é calculado pela proporção do saldo mensal em relação ao total de receitas do mês. Quando não houver receitas no mês, o indicador deverá seguir uma regra específica de configuração.

As faixas percentuais e as cores dos indicadores devem ser definidas na configuração do sistema, seguindo os valores estabelecidos nesta regra de negócio.

### RN18: Alerta de saldo negativo

- **Disparo:** ocorre quando o saldo mensal passa de maior ou igual a zero para negativo.
- **Frequência:** no máximo uma vez por mês para cada transição de saldo não negativo para negativo. Se o saldo voltar a zero ou a um valor positivo e ficar negativo novamente, um novo alerta será emitido.
- **Conteúdo:** a mensagem apresenta apenas valores monetários, sem termos de julgamento.
- **Preferências:** como o RF58 não prevê esse tipo de alerta nas preferências, ele permanece sempre ativo até validação.

### RN19: Recorrência de receitas e despesas

- **Opção de recorrência:** o usuário pode definir uma recorrência ao cadastrar ou editar uma receita ou despesa.
- **Configuração:** quando habilitada, a recorrência deve permitir definir a periodicidade do lançamento e, opcionalmente, uma data de término.
- **Ausência de recorrência:** quando não configurada, a receita ou despesa é considerada um lançamento único.
- **Geração de lançamentos:** os lançamentos recorrentes devem ser gerados conforme a periodicidade definida, respeitando a data de início e, quando informada, a data de término.
- **Integridade:** cada ocorrência deve ser registrada individualmente, para que os totais, saldos, indicadores e alertas sejam calculados corretamente em cada período.

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados com a cliente:

- Faixas do indicador (RN02) e limiares de disparo dos alertas (RN03);
- Política de retenção proposta na RN04;
- Formatos de extrato aceitos (RN05);
- Viabilidade e escopo do registro sem conexão (RF59) e da leitura automática de comprovantes (RF60), por envolverem esforço e incerteza maiores;
- Características CP7 e CP8 e o objetivo do projeto que cada uma atende.