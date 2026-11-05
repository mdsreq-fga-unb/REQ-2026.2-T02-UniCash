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

## Situação dos requisitos { #situacao-dos-requisitos }

A coluna **Origem** aponta a ata em que o requisito surgiu ou foi alterado e a decisão que o motivou, registrada no [Registro de decisões](decisoes.md). [R04](atas/posts/r04.md) indica a primeira versão consolidada pela equipe, quando não houve reunião específica de origem.

A coluna **Situação** separa o que está valendo do que ainda é proposta:

| Situação | Significado |
|---|---|
| **Proposto** | Incluído pela equipe e ainda não confirmado com a cliente. Consta em [Pontos para validação](#pontos-para-validacao). |
| **Vigente** | Integra o escopo atual e não tem pendência de confirmação. |
| **Entregue** | Implementado no aplicativo e aceito conforme a [Definition of Done](dor_dod.md). Nenhum requisito está nesta situação ainda. |
| **Retirado** | Fundido a outro requisito ou removido do escopo. O código não é reutilizado e fica na tabela de requisitos retirados. |

A inclusão no MVP é uma informação à parte, registrada no [Escopo do MVP](mvp.md) e vale apenas para os requisitos funcionais.

## Requisitos

A coluna **Aplica-se a** indica se o requisito vale para o sistema inteiro ou para funcionalidades específicas.

| Código | Nome e descrição | Classificação | Aplica-se a | Origem | Situação |
|---|---|---|---|---|---|
| **RNF01** | **Proteger senhas armazenadas:** Armazenar todas as senhas com algoritmo próprio para senhas e sal individual; nunca persistir sua versão em texto claro. | Implementação | RF01, RF04, RF31 | [R04](atas/posts/r04.md) | Vigente |
| **RNF02** | **Exigir autenticação:** Permitir acesso aos dados financeiros apenas após autenticação válida, verificando a sessão em cada requisição protegida. | Segurança | Sistema, exceto RF01, RF02 e RF31 | [R04](atas/posts/r04.md) | Vigente |
| **RNF03** | **Isolar dados privados:** Aplicar autorização por proprietário em cada consulta ou alteração de dado privado, inclusive em acessos diretos ao Cloud Firestore, barrados pelas Firebase Security Rules. | Segurança | Sistema | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Vigente |
| **RNF04** | **Validar campos obrigatórios:** Validar todos os campos obrigatórios no cliente antes da gravação na base local e novamente nas Firebase Security Rules antes da gravação no Cloud Firestore; rejeitar dados incompletos. | Implementação | RF01, RF04, RF07, RF12, RF13, RF15, RF19, RF22, RF28 | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Vigente |
| **RNF05** | **Evitar estado parcial em operações financeiras:** Após falha em qualquer etapa de uma operação financeira composta, inclusive a consolidação de extrato importado, nenhum saldo ou registro deve permanecer alterado; verificar com teste de falha induzida em cada etapa. | Confiabilidade | RF07, RF09, RF10, RF15, RF17, RF18, RF21, RF32, RF33, RF50 | [R04](atas/posts/r04.md) | Vigente |
| **RNF06** | **Persistir lançamentos confirmados:** Confirmar a gravação no banco antes de informar sucesso, de modo que os dados permaneçam disponíveis após o encerramento da sessão. | Confiabilidade | RF07, RF15, RF21, RF32, RF50 | [R04](atas/posts/r04.md) | Vigente |
| **RNF07** | **Calcular valores monetários:** Utilizar tipo decimal e regras explícitas de arredondamento nos cálculos, apresentando resultados com duas casas decimais. | Implementação | RF11, RF34, RF35, RF36, RF41, RF42, RF52, RF53 | [R04](atas/posts/r04.md) | Vigente |
| **RNF08** | **Limitar tempo das operações:** Concluir pelo menos 95% das operações financeiras comuns em até 5 segundos com 100 usuários simultâneos; medir o tempo fim a fim, conforme as premissas de carga abaixo. | Desempenho | RF07 a RF11, RF15 a RF18, RF34 | [R04](atas/posts/r04.md) | Proposto |
| **RNF09** | **Suportar usuários simultâneos:** Manter as funcionalidades principais disponíveis para 100 usuários simultâneos; verificar em ensaio de carga, conforme as premissas de carga abaixo. | Desempenho | Sistema | [R04](atas/posts/r04.md) | Proposto |
| **RNF10** | **Autorizar dados compartilhados:** Conferir grupo e papel do solicitante antes de devolver ou alterar dados compartilhados, inclusive em acessos diretos ao Cloud Firestore, barrados pelas Firebase Security Rules. | Segurança | RF24, RF27, RF28, RF29, RF51, RF52, RF53 | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Vigente |
| **RNF11** | **Sincronizar dados compartilhados:** Propagar alterações a membros autorizados em até 5 segundos quando houver conexão, com atualização ou consulta periódica da visão; medir com dois clientes conectados ao mesmo grupo, do salvamento da alteração até sua exibição no outro cliente. | Desempenho | RF27, RF29, RF52, RF53 | [R04](atas/posts/r04.md) | Proposto |
| **RNF12** | **Validar registros importados:** Validar estrutura, campos obrigatórios e valores de cada lançamento de extrato antes de sua gravação definitiva. | Confiabilidade | RF21, RF47, RF48 | [R04](atas/posts/r04.md) | Vigente |
| **RNF14** | **Explicar operações rejeitadas:** Exibir, em toda rejeição, mensagem que informe o motivo da rejeição; verificar em teste de usabilidade em que pelo menos 4 de 5 usuários identificam o motivo sem ajuda. A mensagem não deve revelar senha, token ou outros dados sensíveis. | Usabilidade | Sistema | [R04](atas/posts/r04.md) | Vigente |
| **RNF16** | **Auditar operações críticas:** Registrar usuário, operação, data e horário das operações críticas em trilha de auditoria protegida. São críticas: exclusão de perfil (RF05), exclusão de receita (RF10) e de despesa (RF18), alteração (RF13) e exclusão (RF14) de meta, saída de grupo (RF25), alteração de papel de membro (RF51) e confirmação de importação de extrato (RF21). | Segurança | RF05, RF10, RF13, RF14, RF18, RF21, RF25, RF51 | [R04](atas/posts/r04.md) | Proposto |
| **RNF17** | **Realizar backup periódico:** Produzir ao menos um backup dos dados financeiros a cada 24 horas e verificar a conclusão da rotina. | Confiabilidade | Sistema | [R04](atas/posts/r04.md) | Vigente |
| **RNF18** | **Restaurar backup válido:** Restaurar os dados presentes no último backup válido em até 1 hora após falha que exija recuperação; verificar com exercício de restauração. | Confiabilidade | Sistema | [R04](atas/posts/r04.md) | Vigente |
| **RNF19** | **Proteger dados em trânsito:** Utilizar TLS em todas as comunicações entre o aplicativo e os serviços do Firebase e rejeitar conexões sem proteção; apenas o Firebase Emulator Suite, restrito ao ambiente de desenvolvimento, opera sem TLS. | Restrições de design | Sistema | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Vigente |
| **RNF20** | **Adaptar interface a telas:** Manter as funcionalidades principais utilizáveis em celulares com larguras de tela de 320 a 430 dp, em orientação retrato, mediante leiaute responsivo; verificar conferindo as funcionalidades principais nas larguras de 320, 360, 393 e 430 dp. | Usabilidade | Sistema | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Proposto |
| **RNF21** | **Assegurar compatibilidade de plataformas:** Executar as funcionalidades principais em Android e iOS, a partir das versões mínimas suportadas pelo SDK do Expo adotado no projeto; validar em testes em dispositivo ou emulador da versão mínima e da mais recente de cada plataforma. | Suportabilidade | Sistema | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Proposto |
| **RNF22** | **Atualizar classificação do grupo:** Refletir mudanças de pontuação na classificação dos usuários em até 5 segundos quando houver conexão; medir com dois clientes conectados ao mesmo grupo, da conclusão da meta até a atualização da classificação no outro cliente. | Desempenho | RF30, RF45 | [R04](atas/posts/r04.md) | Proposto |
| **RNF24** | **Adotar tecnologias definidas:** Implementar o aplicativo em React Native com Expo e TypeScript, persistir os dados localmente em SQLite, sincronizar e controlar o acesso aos dados compartilhados pelo Firebase (Cloud Firestore, Firebase Authentication e Security Rules), padronizar o ambiente de desenvolvimento com Docker e Docker Compose e gerar as versões instaláveis pelo EAS Build. | Implementação | Sistema | [R04](atas/posts/r04.md), [D18](decisoes.md#d18), [D19](decisoes.md#d19), [D20](decisoes.md#d20) | Vigente |
| **RNF25** | **Criptografar dados armazenados:** Usar criptografia em repouso nos dados financeiros e manter as chaves sob acesso restrito e separado dos dados. | Segurança | Sistema | [R04](atas/posts/r04.md) | Vigente |
| **RNF26** | **Preservar lançamentos feitos sem conexão:** Após a reconexão, todos os lançamentos registrados sem conexão constam no Cloud Firestore, sem perda nem duplicidade; verificar registrando lançamentos sem conexão, reconectando e conferindo os dados no Cloud Firestore. | Confiabilidade | RF59 | [R04](atas/posts/r04.md), [D10](decisoes.md#d10), [D19](decisoes.md#d19), [D20](decisoes.md#d20) | Proposto |
| **RNF27** | **Reduzir etapas de lançamento:** Permitir registrar manualmente receita ou despesa em até três etapas após abrir a tela de lançamento; verificar o fluxo em teste de usabilidade. | Usabilidade | RF07, RF15 | [R04](atas/posts/r04.md) | Proposto |
| **RNF28** | **Organizar módulos da aplicação:** Separar responsabilidades em módulos e manter interfaces definidas para inserir novas funcionalidades sem reestruturar módulos não relacionados. | Suportabilidade | Sistema | [R04](atas/posts/r04.md) | Vigente |
| **RNF29** | **Testar regras financeiras:** Executar testes automatizados de saldo, orçamento e metas no processo de integração, cobrindo limites e casos de erro. | Suportabilidade | RF11, RF34, RF36, RF37, RF38, RF39 | [R04](atas/posts/r04.md) | Vigente |
| **RNF30** | **Acessar o Firebase pelo SDK oficial:** Realizar toda a comunicação com o Firebase pelo SDK JavaScript oficial, sem backend próprio; manter as Firebase Security Rules versionadas no repositório e cobertas por testes automatizados executados no Firebase Emulator Suite. | Restrições de design | Sistema | [R04](atas/posts/r04.md), [D19](decisoes.md#d19) | Vigente |
| **RNF31** | **Limitar tempo de importação:** Concluir pelo menos 95% das importações de extratos de até 1.000 registros em até 30 segundos com 100 usuários simultâneos; medir fim a fim, conforme as premissas de carga abaixo. | Desempenho | RF21 | [R04](atas/posts/r04.md) | Proposto |
| **RNF32** | **Tratar dados pessoais conforme a LGPD:** Informar ao usuário, no cadastro, a finalidade do tratamento dos seus dados; aplicar a política de retenção da RN04; permitir ao titular solicitar acesso, correção e exclusão dos seus dados. Verificar com lista de conferência de conformidade à LGPD. | Segurança | RF01, RF03, RF04, RF05 | [R05](atas/posts/r05.md), [D07](decisoes.md#d07), [D12](decisoes.md#d12) | Proposto |
| **RNF33** | **Assegurar acessibilidade:** Atender ao WCAG 2.1 nível AA nas telas principais (cadastro, autenticação, lançamento de receita e despesa e resumo inicial); verificar com ferramenta automatizada de avaliação e revisão manual. | Usabilidade | RF01, RF02, RF07, RF15, RF40 | [D07](decisoes.md#d07) | Proposto |
| **RNF34** | **Operar sem conexão:** Abrir o app e executar as funcionalidades individuais sem rede, lendo e gravando só na base local; sessão expirada ou servidor fora do ar apenas suspendem a sincronização. Verificar em modo avião com os fluxos principais. Generaliza o RNF26. | Confiabilidade | Sistema, exceto RF01, RF22 a RF25, RF31 e RF51 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20) | Vigente |
| **RNF35** | **Persistir localmente com durabilidade:** Confirmar a gravação na base local antes de informar sucesso e mantê-la após fechar o app ou reiniciar o dispositivo. Verificar com encerramento forçado durante a gravação. | Confiabilidade | RF07, RF09, RF10, RF15, RF17, RF18, RF21, RF32, RF33, RF50, RF59 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20) | Vigente |
| **RNF36** | **Garantir convergência da sincronização:** Aplicar alterações de forma idempotente e independente da ordem; após sincronizar, as réplicas ficam iguais, sem perda nem duplicidade. Verificar com réplicas alterando dados em paralelo e sem conexão. | Confiabilidade | RF27, RF28, RF29, RF51, RF52, RF53, RF59, RF62 | [R07](atas/posts/r07.md), [D10](decisoes.md#d10), [D20](decisoes.md#d20) | Vigente |
| **RNF37** | **Publicar sob licença livre:** Disponibilizar o código-fonte sob licença aprovada pela OSI, com dependências de licenças compatíveis. | Implementação | Sistema | [R07](atas/posts/r07.md), [D11](decisoes.md#d11) | Vigente |
| **RNF38** | **Aplicar paleta de cores definida:** Usar a paleta “Tesouraria Teal” (#082F49,#0E7490,#22C55E,#BAE6FD, #F0FDFF) como base das cores da interface, definida em um único conjunto de variáveis de tema; nenhum componente deve usar cor fixa fora da paleta, exceto cores semânticas de alerta e estado acordadas com as clientes. |	Restrições de design | Sistema | [D17](decisoes.md#d17) | Vigente |

### Requisitos retirados

Os códigos retirados não são reutilizados.

| Código | Situação | Destino | Decisão |
|---|---|---|---|
| RNF13 | Retirado | Fundido ao RNF05, que passou a descrever a propriedade observável. | [D07](decisoes.md#d07) |
| RNF15 | Retirado | O conteúdo dos alertas (gasto, limite e categoria ou meta) está descrito nos RF37 e RF38. | [D07](decisoes.md#d07) |
| RNF23 | Retirado | Fundido ao RNF05, que passou a descrever a propriedade observável. | [D07](decisoes.md#d07) |

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
- As larguras de tela do **RNF20** e as versões mínimas de Android e iOS do **RNF21**;
- O nível de conformidade WCAG (AA) do **RNF33** e o escopo do **RNF32**;
- A viabilidade do uso sem conexão (**RNF26** e **RF59**).

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 22/09/2026 | Adiciona requisitos funcionais e não funcionais | Evellyn Rocha |
| 1.1 | 28/09/2026 | Correção inicial de requisitos e formatação [RNF05/RNF23, RNF (tabela), RNF08/RNF09/RNF31, RNF14, RF (lista), RF22/RF30/RF51/RF53, RF39, RF42] | Caio Pacheco |
| 1.2 | 28/09/2026 | Reverte "correção inicial de requisitos e formatação [RNF05/RNF23, RNF (tabela), RNF08/RNF09/RNF31, RNF14, RF (lista), RF22/RF30/RF51/RF53, RF39, RF42]" | Caio Pacheco |
| 1.3 | 29/09/2026 | Adiciona correção dos requisitos | Natan França |
| 1.4 | 13/10/2026 | Corrige a seção 2.5, adiciona requisitos e regras de negócio e adiciona o vídeo da apresentação da Unidade II | Dante Scarpati |
| 1.5 | 28/10/2026 | Adiciona requisito de paleta de cores | Natan França |
| 1.6 | 29/10/2026 | Atualiza stack tecnológica para Expo/React Native local-first | Bruno Duarte |
| 1.7 | 29/10/2026 | Inclui Docker e Docker Compose na stack tecnológica | Bruno Duarte |
| 1.8 | 29/10/2026 | Define Supabase para sincronização e grupos | Bruno Duarte |
| 1.9 | 30/10/2026 | Troca Supabase por Firebase na sincronização e nos grupos | Bruno Duarte |
| 1.10 | 31/10/2026 | Ajusta RNFs à arquitetura com Firebase e app móvel | Bruno Duarte |
| 1.11 | 03/11/2026 | Inclui as colunas Origem e Situação, a legenda da situação e a tabela de requisitos retirados; inclui o histórico de versões | Bruno Duarte |
| 1.12 | 05/11/2026 | Relaciona os requisitos de armazenamento local, operação offline e sincronização à decisão D20 | Equipe UniCash |
