# Requisitos Não Funcionais

Os requisitos não funcionais registram os critérios esperados e os mecanismos previstos para atendê-los.

A classificação combina o modelo **URPS+** (Usabilidade, Confiabilidade, Desempenho e Suportabilidade, mais Restrições de design, Implementação, Interface e Físicos), de Grady e Caswell, com a categoria **Segurança** da classificação de Sommerville, usada de forma complementar.

## Classificação

| Categoria | Origem | Descrição |
|---|---|---|
| **Usabilidade** | URPS+ | Requisitos relacionados à facilidade de uso, acessibilidade e interação com o sistema. |
| **Confiabilidade** | URPS+ | Requisitos relacionados a falha, recuperação, precisão e disponibilidade dos dados e operações, observáveis no uso do sistema. |
| **Desempenho** | URPS+ | Requisitos relacionados ao tempo de resposta, capacidade e execução das operações. |
| **Suportabilidade** | URPS+ | Requisitos relacionados à organização, manutenção, teste, evolução e compatibilidade do sistema. |
| **Implementação** | URPS+ | Requisitos que restringem o código ou a construção, como técnicas, políticas de integridade de banco de dados e tecnologias adotadas. |
| **Restrições de design** | URPS+ | Requisitos relacionados às restrições estabelecidas para a arquitetura e a comunicação entre componentes. |
| **Segurança** | Sommerville | Requisitos relacionados à proteção, autenticação, autorização, privacidade e conformidade legal no tratamento dos dados. |

## Requisitos

A coluna **Aplica-se a** indica se o requisito vale para o sistema inteiro ou para funcionalidades específicas.

| Código | Nome e descrição | Classificação | Aplica-se a |
|---|---|---|---|
| **RNF01** | **Proteger senhas armazenadas:** Armazenar todas as senhas com algoritmo próprio para senhas e sal individual; nunca persistir sua versão em texto claro. | Implementação | RF01, RF04, RF31 |
| **RNF02** | **Exigir autenticação:** Permitir acesso aos dados financeiros apenas após autenticação válida, verificando a sessão em cada requisição protegida. | Segurança | Sistema, exceto RF01, RF02 e RF31 |
| **RNF03** | **Isolar dados privados:** Aplicar autorização por proprietário em cada consulta ou alteração de dado privado, inclusive em chamadas diretas à API. | Segurança | Sistema |
| **RNF04** | **Validar campos obrigatórios:** Validar todos os campos obrigatórios no cliente e novamente no servidor antes da persistência; rejeitar dados incompletos. | Implementação | RF01, RF04, RF07, RF12, RF13, RF15, RF19, RF22, RF28 |
| **RNF05** | **Evitar estado parcial em operações financeiras:** Após falha em qualquer etapa de uma operação financeira composta, inclusive a consolidação de extrato importado, nenhum saldo ou registro deve permanecer alterado; verificar com teste de falha induzida em cada etapa. | Confiabilidade | RF07, RF09, RF10, RF15, RF17, RF18, RF21, RF32, RF33, RF50 |
| **RNF06** | **Persistir lançamentos confirmados:** Confirmar a gravação no banco antes de informar sucesso, de modo que os dados permaneçam disponíveis após o encerramento da sessão. | Confiabilidade | RF07, RF15, RF21, RF32, RF50 |
| **RNF07** | **Calcular valores monetários:** Utilizar tipo decimal e regras explícitas de arredondamento nos cálculos, apresentando resultados com duas casas decimais. | Implementação | RF11, RF34, RF35, RF36, RF41, RF42, RF52, RF53 |
| **RNF08** | **Limitar tempo das operações:** Concluir pelo menos 95% das operações financeiras comuns em até 5 segundos com 100 usuários simultâneos; medir o tempo fim a fim, conforme as premissas de carga abaixo. | Desempenho | RF07 a RF11, RF15 a RF18, RF34 |
| **RNF09** | **Suportar usuários simultâneos:** Manter as funcionalidades principais disponíveis para 100 usuários simultâneos; verificar em ensaio de carga, conforme as premissas de carga abaixo. | Desempenho | Sistema |
| **RNF10** | **Autorizar dados compartilhados:** Conferir grupo e papel do solicitante antes de devolver ou alterar dados compartilhados, inclusive nas chamadas à API. | Segurança | RF24, RF27, RF28, RF29, RF51, RF52, RF53 |
| **RNF11** | **Sincronizar dados compartilhados:** Propagar alterações a membros autorizados em até 5 segundos quando houver conexão, com atualização ou consulta periódica da visão; medir com dois clientes conectados ao mesmo grupo, do salvamento da alteração até sua exibição no outro cliente. | Desempenho | RF27, RF29, RF52, RF53 |
| **RNF12** | **Validar registros importados:** Validar estrutura, campos obrigatórios e valores de cada lançamento de extrato antes de sua gravação definitiva. | Confiabilidade | RF21, RF47, RF48 |
| **RNF14** | **Explicar operações rejeitadas:** Exibir, em toda rejeição, mensagem que informe o motivo da rejeição; verificar em teste de usabilidade em que pelo menos 4 de 5 usuários identificam o motivo sem ajuda. A mensagem não deve revelar senha, token ou outros dados sensíveis. | Usabilidade | Sistema |
| **RNF16** | **Auditar operações críticas:** Registrar usuário, operação, data e horário das operações críticas em trilha de auditoria protegida. São críticas: exclusão de perfil (RF05), exclusão de receita (RF10) e de despesa (RF18), alteração (RF13) e exclusão (RF14) de meta, saída de grupo (RF25), alteração de papel de membro (RF51) e confirmação de importação de extrato (RF21). | Segurança | RF05, RF10, RF13, RF14, RF18, RF21, RF25, RF51 |
| **RNF17** | **Realizar backup periódico:** Produzir ao menos um backup dos dados financeiros a cada 24 horas e verificar a conclusão da rotina. | Confiabilidade | Sistema |
| **RNF18** | **Restaurar backup válido:** Restaurar os dados presentes no último backup válido em até 1 hora após falha que exija recuperação; verificar com exercício de restauração. | Confiabilidade | Sistema |
| **RNF19** | **Proteger dados em trânsito:** Utilizar HTTPS com TLS em todas as comunicações entre aplicação cliente e servidor e rejeitar conexões sem proteção. | Restrições de design | Sistema |
| **RNF20** | **Adaptar interface a telas:** Manter as funcionalidades principais utilizáveis em larguras de 320 a 1920 pixels mediante leiaute responsivo; verificar conferindo as funcionalidades principais nas larguras de 320, 768, 1366 e 1920 pixels. | Usabilidade | Sistema |
| **RNF21** | **Assegurar compatibilidade de navegadores:** Executar as funcionalidades principais nas duas versões estáveis mais recentes do Chrome, Firefox, Edge e Safari; validar em testes por navegador. | Suportabilidade | Sistema |
| **RNF22** | **Atualizar classificação do grupo:** Refletir mudanças de pontuação na classificação dos usuários em até 5 segundos quando houver conexão; medir com dois clientes conectados ao mesmo grupo, da conclusão da meta até a atualização da classificação no outro cliente. | Desempenho | RF30, RF45 |
| **RNF24** | **Adotar tecnologias definidas:** Implementar o frontend em React, o backend em Django, a persistência em PostgreSQL e a comunicação entre componentes por API REST. | Implementação | Sistema |
| **RNF25** | **Criptografar dados armazenados:** Usar criptografia em repouso nos dados financeiros e manter as chaves sob acesso restrito e separado dos dados. | Segurança | Sistema |
| **RNF26** | **Preservar lançamentos feitos sem conexão:** Após a reconexão, todos os lançamentos registrados sem conexão constam no servidor, sem perda nem duplicidade; verificar registrando lançamentos sem conexão, reconectando e conferindo os dados no servidor. | Confiabilidade | RF59 |
| **RNF27** | **Reduzir etapas de lançamento:** Permitir registrar manualmente receita ou despesa em até três etapas após abrir a tela de lançamento; verificar o fluxo em teste de usabilidade. | Usabilidade | RF07, RF15 |
| **RNF28** | **Organizar módulos da aplicação:** Separar responsabilidades em módulos e manter interfaces definidas para inserir novas funcionalidades sem reestruturar módulos não relacionados. | Suportabilidade | Sistema |
| **RNF29** | **Testar regras financeiras:** Executar testes automatizados de saldo, orçamento e metas no processo de integração, cobrindo limites e casos de erro. | Suportabilidade | RF11, RF34, RF36, RF37, RF38, RF39 |
| **RNF30** | **Expor API RESTful:** Realizar a comunicação entre cliente e backend por endpoints RESTful com contratos de requisição e resposta documentados. | Restrições de design | Sistema |
| **RNF31** | **Limitar tempo de importação:** Concluir pelo menos 95% das importações de extratos de até 1.000 registros em até 30 segundos com 100 usuários simultâneos; medir fim a fim, conforme as premissas de carga abaixo. | Desempenho | RF21 |
| **RNF32** | **Tratar dados pessoais conforme a LGPD:** Informar ao usuário, no cadastro, a finalidade do tratamento dos seus dados; aplicar a política de retenção da RN04; permitir ao titular solicitar acesso, correção e exclusão dos seus dados. Verificar com lista de conferência de conformidade à LGPD. | Segurança | RF01, RF03, RF04, RF05 |
| **RNF33** | **Assegurar acessibilidade:** Atender ao WCAG 2.1 nível AA nas telas principais (cadastro, autenticação, lançamento de receita e despesa e resumo inicial); verificar com ferramenta automatizada de avaliação e revisão manual. | Usabilidade | RF01, RF02, RF07, RF15, RF40 |

**Códigos descontinuados** (não reutilizados):

- **RNF13** e **RNF23** foram fundidos ao RNF05, que passou a descrever a propriedade observável;
- **RNF15** foi retirado; o conteúdo dos alertas (gasto, limite e categoria ou meta) está descrito nos RF37 e RF38.

## Premissas de carga (RNF08, RNF09 e RNF31)

- **Origem do número:** 100 usuários simultâneos é hipótese de trabalho para uma comunidade da UESB e suas famílias; não há estimativa de público confirmada;
- **Ambiente do ensaio:** proposta de ambiente de homologação com configuração equivalente à de produção, a confirmar.

## Pontos para validação

Os seguintes pontos ainda precisam ser confirmados:

- Os limiares definidos na **RN02** e na **RN03** e a política de retenção da **RN04** (requisitos funcionais);
- O número de 100 usuários simultâneos e o ambiente do ensaio de carga, usados nos **RNF08, RNF09 e RNF31**;
- Os tempos e volumes propostos nos **RNF08, RNF11, RNF22 e RNF31**;
- O limite de três etapas definido no **RNF27**;
- A relação de operações críticas do **RNF16**;
- Os navegadores e versões do **RNF21**;
- O nível de conformidade WCAG (AA) do **RNF33** e o escopo do **RNF32**;
- A viabilidade do uso sem conexão (**RNF26** e **RF59**).