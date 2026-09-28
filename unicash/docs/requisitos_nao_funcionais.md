# Requisitos Não Funcionais

Os requisitos não funcionais registram os critérios esperados e os mecanismos previstos para atendê-los.

A classificação segue **Usabilidade, Confiabilidade, Desempenho e Suportabilidade (URPS)**, além das categorias de restrição e segurança do **URPS+**.

## Classificação URPS+

| Categoria | Descrição |
|---|---|
| **Usabilidade** | Requisitos relacionados à facilidade de uso e interação com o sistema. |
| **Confiabilidade** | Requisitos relacionados à consistência, integridade e disponibilidade dos dados e operações. |
| **Desempenho** | Requisitos relacionados ao tempo de resposta, capacidade e execução das operações. |
| **Suportabilidade** | Requisitos relacionados à organização, manutenção e evolução do sistema. |
| **Interfaces** | Requisitos relacionados à compatibilidade e interação com interfaces e navegadores. |
| **Segurança** | Requisitos relacionados à proteção, autenticação, autorização e privacidade dos dados. |
| **Implementação** | Requisitos relacionados às tecnologias e mecanismos definidos para implementação. |
| **Restrições de design** | Requisitos relacionados às restrições estabelecidas para a arquitetura e comunicação do sistema. |

## Requisitos

| Código | Nome e descrição | Classificação URPS+ | Aplica-se a |
|---|---|---|---|
| **RNF01** | **Proteger senhas armazenadas:** Armazenar todas as senhas com algoritmo próprio para senhas e sal individual; nunca persistir sua versão em texto claro. | Segurança | RF01, RF04 e RF31 — armazenamento e alteração de senhas |
| **RNF02** | **Exigir autenticação:** Permitir acesso aos dados financeiros apenas após autenticação válida, verificando a sessão em cada requisição protegida. | Segurança | Sistema — todas as funcionalidades de acesso a dados financeiros |
| **RNF03** | **Isolar dados privados:** Aplicar autorização por proprietário em cada consulta ou alteração de dado privado, inclusive em chamadas diretas à API. | Segurança | Sistema — consultas e alterações de dados privados |
| **RNF04** | **Validar campos obrigatórios:** Validar todos os campos obrigatórios no cliente e novamente no servidor antes da persistência; rejeitar dados incompletos. | Confiabilidade | Sistema — operações com campos obrigatórios |
| **RNF05** | **Preservar consistência e atomicidade financeira:** Garantir que cada operação financeira concluída mantenha os registros e os saldos correspondentes coerentes. Se qualquer etapa de uma operação composta falhar antes da conclusão, nenhuma alteração dessa operação deve permanecer gravada, preservando o estado anterior dos registros e saldos. Verificar por comparação dos dados antes e depois de operações bem-sucedidas e de falhas induzidas em cada etapa de gravação. | Confiabilidade | Sistema — operações que gravam ou alteram dados financeiros; inclui importações e geração de recorrências |
| **RNF06** | **Persistir lançamentos confirmados:** Confirmar a gravação no banco antes de informar sucesso, de modo que os dados permaneçam disponíveis após o encerramento da sessão. | Confiabilidade | RF07, RF09, RF15, RF17, RF21, RF32, RF33, RF50 e RF54 |
| **RNF07** | **Calcular valores monetários:** Utilizar tipo decimal e regras explícitas de arredondamento nos cálculos, apresentando resultados com duas casas decimais. | Confiabilidade | Sistema — cálculos e apresentação de valores monetários |
| **RNF08** | **Limitar tempo das operações:** Concluir pelo menos 95% das operações de registro, consulta, edição e exclusão de receitas e despesas, bem como de consulta de saldo mensal, em até 5 segundos, com 100 usuários simultâneos no cenário CT-D01. Medir no cliente, da ação que inicia a operação até a exibição de seu resultado, incluindo comunicação, processamento e persistência quando aplicável. O número de usuários e o limite de tempo são hipóteses pendentes de validação. | Desempenho | RF07 a RF10, RF15 a RF18 e RF34 |
| **RNF09** | **Suportar usuários simultâneos:** Manter as operações financeiras de RF07 a RF10, RF15 a RF18 e RF34 disponíveis durante 30 minutos de carga estável com 100 usuários simultâneos no cenário CT-D01. Todas as operações com dados válidos e permissões adequadas devem retornar o resultado esperado, sem indisponibilidade ou erro causado pela carga. O tempo de resposta deve atender ao RNF08. O número de usuários e a duração do ensaio são hipóteses pendentes de validação. | Desempenho | RF07 a RF10, RF15 a RF18 e RF34 |
| **RNF10** | **Autorizar dados compartilhados:** Conferir grupo e papel do solicitante antes de devolver ou alterar dados compartilhados, inclusive nas chamadas à API. | Segurança | RF22 a RF30 e RF51 a RF53 |
| **RNF11** | **Sincronizar dados compartilhados:** Propagar alterações a membros autorizados em até 5 segundos quando houver conexão, com atualização ou consulta periódica da visão. | Desempenho | RF27 a RF29, RF52 e RF53 — dados compartilhados |
| **RNF12** | **Validar registros importados:** Validar estrutura, campos obrigatórios e valores de cada lançamento de extrato antes de sua gravação definitiva. | Confiabilidade | RF21, RF47, RF48 e RF54 |
| **RNF13** | **Preservar dados durante importação:** Executar a consolidação do extrato em transação; em caso de falha, reverter a gravação sem alterar dados financeiros preexistentes. | Confiabilidade | RF21, RF48, RF49 e RF54 — consolidação de importações |
| **RNF14** | **Explicar operações rejeitadas:** Exibir mensagem sobre o motivo de toda rejeição sem revelar senha, token ou outros dados sensíveis. Em teste de usabilidade com cinco participantes representativos do público-alvo, pelo menos quatro devem identificar corretamente, sem ajuda, o motivo de cada rejeição apresentada. Verificar separadamente os cenários de campos obrigatórios ausentes, valores inválidos, autenticação rejeitada e acesso não autorizado, usando mensagens que não exponham credenciais nem dados privados. | Usabilidade | Sistema — operações rejeitadas |
| **RNF15** | **Contextualizar alertas:** Apresentar em cada alerta a categoria, meta ou valor que motivou sua emissão. | Usabilidade | RF37, RF38 e RF46 |
| **RNF16** | **Auditar operações críticas:** Registrar usuário, operação, data e horário das operações financeiras designadas críticas em trilha de auditoria protegida. | Segurança | Sistema — operações financeiras designadas críticas |
| **RNF17** | **Realizar backup periódico:** Produzir ao menos um backup dos dados financeiros a cada 24 horas e verificar a conclusão da rotina. | Confiabilidade | Sistema — dados financeiros persistidos |
| **RNF18** | **Restaurar backup válido:** Restaurar os dados presentes no último backup válido em até 1 hora após falha que exija recuperação; verificar com exercício de restauração. | Confiabilidade | Sistema — recuperação de dados financeiros a partir de backup |
| **RNF19** | **Proteger dados em trânsito:** Utilizar HTTPS com TLS em todas as comunicações entre aplicação cliente e servidor e rejeitar conexões sem proteção. | Segurança | Sistema — comunicação entre cliente e servidor |
| **RNF20** | **Adaptar interface a telas:** Manter as funcionalidades principais utilizáveis em larguras de 320 a 1920 pixels mediante leiaute responsivo. | Usabilidade | Sistema — interface das funcionalidades principais |
| **RNF21** | **Assegurar compatibilidade de navegadores:** Executar as funcionalidades principais nos navegadores e versões declarados compatíveis pelo projeto; validar em testes por navegador. | Interfaces | Sistema — execução das funcionalidades principais nos navegadores compatíveis |
| **RNF22** | **Atualizar classificação do grupo:** Refletir mudanças de pontuação na classificação dos usuários em até 5 segundos quando houver conexão. | Desempenho | RF30 e RF45 — classificação e pontuação |
| **RNF24** | **Adotar tecnologias definidas:** Implementar o frontend em React, o backend em Django, a persistência em PostgreSQL e a comunicação entre componentes por API REST. | Implementação | Sistema — frontend, backend, persistência e comunicação |
| **RNF25** | **Criptografar dados armazenados:** Usar criptografia em repouso nos dados financeiros e manter as chaves sob acesso restrito e separado dos dados. | Segurança | Sistema — dados financeiros armazenados |
| **RNF26** | **Conservar lançamentos offline:** Guardar localmente os lançamentos confirmados sem conexão e enviá-los ao servidor quando a conexão voltar, com prevenção de duplicidade. | Confiabilidade | RF07 e RF15 — conservação de lançamentos; o fluxo offline ainda não possui RF próprio no catálogo |
| **RNF27** | **Reduzir etapas de lançamento:** Permitir registrar manualmente receita ou despesa em até três etapas após abrir a tela de lançamento; verificar o fluxo em teste de usabilidade. | Usabilidade | RF07 e RF15 |
| **RNF28** | **Organizar módulos da aplicação:** Separar responsabilidades em módulos e manter interfaces definidas para inserir novas funcionalidades sem reestruturar módulos não relacionados. | Suportabilidade | Sistema — organização dos módulos |
| **RNF29** | **Testar regras financeiras:** Executar testes automatizados de saldo, orçamento e metas no processo de integração, cobrindo limites e casos de erro. | Suportabilidade | RF11 a RF14, RF19, RF20, RF28, RF29, RF34 a RF39, RF42 e RF43 — regras financeiras de saldo, orçamento e metas |
| **RNF30** | **Expor API RESTful:** Realizar a comunicação entre cliente e backend por endpoints RESTful com contratos de requisição e resposta documentados. | Restrições de design | Sistema — comunicação entre cliente e backend |
| **RNF31** | **Limitar tempo de importação:** Concluir pelo menos 95% das importações de extratos válidos de até 1.000 registros em até 30 segundos de processamento fim a fim, com 100 usuários simultâneos no cenário CT-D02. Somar o tempo entre o envio do arquivo e a exibição da prévia ao tempo entre a confirmação do usuário e a exibição do resultado da gravação, incluindo comunicação, processamento e persistência; excluir o tempo de revisão humana. Os tempos, volumes e número de usuários são hipóteses pendentes de validação. | Desempenho | RF21, RF47 a RF49 e RF54 — fluxo de importação |

**RNF23:** Incorporado ao RNF05 por duplicidade, sem renumerar os demais requisitos.

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados:

- Os limiares da regra RN-CAT01 e a apresentação associada ao **RF39**, registrados no documento de requisitos funcionais;
- A hipótese de **100 usuários simultâneos dos RNF08, RNF09 e RNF31**, com base na estimativa de público e de uso concorrente;
- Os tempos e volumes propostos nos **RNF08, RNF11, RNF22 e RNF31**;
- O ambiente de referência, a massa de dados, a composição da carga e os procedimentos CT-D01 e CT-D02, incluindo os 30 minutos de carga estável do **RNF09**;
- O critério proposto de quatro acertos entre cinco participantes para cada cenário do **RNF14**;
- O limite de três etapas definido no **RNF27**.