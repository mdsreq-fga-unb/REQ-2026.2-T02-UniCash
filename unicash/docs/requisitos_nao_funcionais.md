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

| Código | Nome e descrição | Classificação URPS+ |
|---|---|---|
| **RNF01** | **Proteger senhas armazenadas:** Armazenar todas as senhas com algoritmo próprio para senhas e sal individual; nunca persistir sua versão em texto claro. | Segurança |
| **RNF02** | **Exigir autenticação:** Permitir acesso aos dados financeiros apenas após autenticação válida, verificando a sessão em cada requisição protegida. | Segurança |
| **RNF03** | **Isolar dados privados:** Aplicar autorização por proprietário em cada consulta ou alteração de dado privado, inclusive em chamadas diretas à API. | Segurança |
| **RNF04** | **Validar campos obrigatórios:** Validar todos os campos obrigatórios no cliente e novamente no servidor antes da persistência; rejeitar dados incompletos. | Confiabilidade |
| **RNF05** | **Preservar consistência financeira:** Aplicar restrições de integridade e transações de banco para que cada operação concluída deixe saldos e registros coerentes. | Confiabilidade |
| **RNF06** | **Persistir lançamentos confirmados:** Confirmar a gravação no banco antes de informar sucesso, de modo que os dados permaneçam disponíveis após o encerramento da sessão. | Confiabilidade |
| **RNF07** | **Calcular valores monetários:** Utilizar tipo decimal e regras explícitas de arredondamento nos cálculos, apresentando resultados com duas casas decimais. | Confiabilidade |
| **RNF08** | **Limitar tempo das operações:** Concluir pelo menos 95% das operações financeiras comuns em até 5 segundos com 100 usuários simultâneos; medir o tempo fim a fim. | Desempenho |
| **RNF09** | **Suportar usuários simultâneos:** Manter as funcionalidades principais disponíveis para 100 usuários simultâneos; verificar em ensaio de carga. | Desempenho |
| **RNF10** | **Autorizar dados compartilhados:** Conferir grupo e papel do solicitante antes de devolver ou alterar dados compartilhados, inclusive nas chamadas à API. | Segurança |
| **RNF11** | **Sincronizar dados compartilhados:** Propagar alterações a membros autorizados em até 5 segundos quando houver conexão, com atualização ou consulta periódica da visão. | Desempenho |
| **RNF12** | **Validar registros importados:** Validar estrutura, campos obrigatórios e valores de cada lançamento de extrato antes de sua gravação definitiva. | Confiabilidade |
| **RNF13** | **Preservar dados durante importação:** Executar a consolidação do extrato em transação; em caso de falha, reverter a gravação sem alterar dados financeiros preexistentes. | Confiabilidade |
| **RNF14** | **Explicar operações rejeitadas:** Exibir mensagem compreensível sobre o motivo de toda rejeição, sem revelar senha, token ou outros dados sensíveis. | Usabilidade |
| **RNF15** | **Contextualizar alertas:** Apresentar em cada alerta a categoria, meta ou valor que motivou sua emissão. | Usabilidade |
| **RNF16** | **Auditar operações críticas:** Registrar usuário, operação, data e horário das operações financeiras designadas críticas em trilha de auditoria protegida. | Segurança |
| **RNF17** | **Realizar backup periódico:** Produzir ao menos um backup dos dados financeiros a cada 24 horas e verificar a conclusão da rotina. | Confiabilidade |
| **RNF18** | **Restaurar backup válido:** Restaurar os dados presentes no último backup válido em até 1 hora após falha que exija recuperação; verificar com exercício de restauração. | Confiabilidade |
| **RNF19** | **Proteger dados em trânsito:** Utilizar HTTPS com TLS em todas as comunicações entre aplicação cliente e servidor e rejeitar conexões sem proteção. | Segurança |
| **RNF20** | **Adaptar interface a telas:** Manter as funcionalidades principais utilizáveis em larguras de 320 a 1920 pixels mediante leiaute responsivo. | Usabilidade |
| **RNF21** | **Assegurar compatibilidade de navegadores:** Executar as funcionalidades principais nos navegadores e versões declarados compatíveis pelo projeto; validar em testes por navegador. | Interfaces |
| **RNF22** | **Atualizar classificação do grupo:** Refletir mudanças de pontuação na classificação dos usuários em até 5 segundos quando houver conexão. | Desempenho |
| **RNF23** | **Evitar operações parciais:** Executar operações financeiras compostas em transações atômicas e reverter todas as alterações se alguma etapa falhar. | Confiabilidade |
| **RNF24** | **Adotar tecnologias definidas:** Implementar o frontend em React, o backend em Django, a persistência em PostgreSQL e a comunicação entre componentes por API REST. | Implementação |
| **RNF25** | **Criptografar dados armazenados:** Usar criptografia em repouso nos dados financeiros e manter as chaves sob acesso restrito e separado dos dados. | Segurança |
| **RNF26** | **Conservar lançamentos offline:** Guardar localmente os lançamentos confirmados sem conexão e enviá-los ao servidor quando a conexão voltar, com prevenção de duplicidade. | Confiabilidade |
| **RNF27** | **Reduzir etapas de lançamento:** Permitir registrar manualmente receita ou despesa em até três etapas após abrir a tela de lançamento; verificar o fluxo em teste de usabilidade. | Usabilidade |
| **RNF28** | **Organizar módulos da aplicação:** Separar responsabilidades em módulos e manter interfaces definidas para inserir novas funcionalidades sem reestruturar módulos não relacionados. | Suportabilidade |
| **RNF29** | **Testar regras financeiras:** Executar testes automatizados de saldo, orçamento e metas no processo de integração, cobrindo limites e casos de erro. | Suportabilidade |
| **RNF30** | **Expor API RESTful:** Realizar a comunicação entre cliente e backend por endpoints RESTful com contratos de requisição e resposta documentados. | Restrições de design |
| **RNF31** | **Limitar tempo de importação:** Concluir pelo menos 95% das importações de extratos de até 1.000 registros em até 30 segundos com 100 usuários simultâneos; medir fim a fim. | Desempenho |

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados:

- Os limiares definidos no **RF39**;
- Os tempos e volumes propostos nos **RNF08, RNF11, RNF22 e RNF31**;
- O limite de três etapas definido no **RNF27**.