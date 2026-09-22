# 2 - SOLUÇÃO PROPOSTA

## 2.1 Objetivo Geral do Produto

O objetivo do produto é **auxiliar estudantes universitários, famílias e demais usuários a organizar receitas, despesas e metas financeiras** de forma simples e intuitiva, por meio de uma plataforma de gestão financeira pessoal. A solução permitirá um acompanhamento contínuo da situação financeira do usuário, promovendo maior controle sobre os gastos, incentivo à formação de reservas financeiras e apoio à tomada de decisões relacionadas ao orçamento pessoal, reduzindo a dependência de planilhas e outros métodos de controle pouco práticos.

## 2.2 Objetivos Específicos (OE) do Produto

- **(OE1)** Facilitar o registro e o acompanhamento das receitas e despesas dos usuários em um ambiente simples e intuitivo;
- **(OE2)** Auxiliar no planejamento financeiro por meio do controle de orçamento, categorização de gastos e acompanhamento de metas de economia;
- **(OE3)** Disponibilizar informações e indicadores que permitam ao usuário compreender seus hábitos financeiros e tomar decisões mais conscientes;
- **(OE4)** Incentivar a organização financeira de estudantes universitários, famílias e demais usuários, contribuindo para a redução do endividamento e para a formação de reservas financeiras;

## 2.3 Características de Produto (mapeadas com os Objetivos Específicos do Produto)

| **ID** | **Característica de Produto (CP)** | **Descrição resumida** | **ID** | **Valor de negócio (VN) principal** | **Contribuição principal** | **Contribuição secundária** |
|---|---|---|---|---|---|---|
| CP1 | Gestão de movimentações financeiras | A solução deverá prover a capacidade de gerir os fluxos de entrada e saída de recursos, permitindo ao usuário manter um histórico unificado e organizado de suas finanças. | VN1 | Maior controle financeiro e redução da perda de informações sobre movimentações diárias. | OE1 | OE3 |
| CP2 | Organização e análise dos gastos | A solução deverá prover a capacidade de estruturar as finanças, agrupando os registros por categorias para facilitar a compreensão dos hábitos de consumo. | VN2 | Melhor compreensão de onde os recursos são alocados e apoio à organização do orçamento. | OE2 | OE3 |
| CP3 | Planejamento financeiro pessoal | A solução deverá prover a capacidade de projetar o futuro financeiro, estabelecendo orçamentos e acompanhando metas voltadas à economia. | VN3 | Incentivo à formação de reservas financeiras e redução do endividamento. | OE2 | OE4 |
| CP4 | Visualização da situação financeira | A solução deverá prover a capacidade de fornecer um panorama claro do estado atual das finanças, consolidando saldos, gráficos e resumos periódicos. | VN4 | Apoio à tomada de decisões rápidas a partir de uma compreensão visual da situação financeira. | OE3 | OE2 |
| CP5 | Gestão da identidade do usuário | A solução deverá prover a capacidade de individualizar a experiência, garantindo o acesso autenticado e a manutenção do perfil de cada utilizador. | VN5 | Garantia de que os dados financeiros fiquem segregados e restritos ao seu respectivo titular. | OE1 | OE4 |

## 2.4 Tecnologias a Serem Utilizadas

Para o desenvolvimento do UniCash, serão utilizadas tecnologias compatíveis com os objetivos do projeto e com o escopo previsto para a disciplina. O frontend será desenvolvido utilizando **React**, permitindo a construção de uma interface moderna, responsiva e reutilizável para o gerenciamento das informações financeiras dos usuários. No backend será utilizado **Python**, responsável pela implementação da lógica de negócio, autenticação dos usuários e disponibilização de APIs para comunicação com o cliente da aplicação.

Para a persistência dos dados será utilizado o **PostgreSQL**, considerando sua flexibilidade para armazenar informações como receitas, despesas, categorias, metas financeiras e dados cadastrais dos usuários. A comunicação entre frontend e backend será realizada por meio de **APIs REST**, facilitando a integração entre os componentes do sistema.

Como apoio ao desenvolvimento colaborativo serão utilizados **Git** e **GitHub** para controle de versão e gerenciamento do código-fonte. Também serão adotadas boas práticas relacionadas à **autenticação de usuários, proteção dos dados armazenados e organização do projeto**, de forma compatível com as características definidas para o UniCash.

## 2.5 Pesquisa de Mercado e Análise Competitiva

No mercado de gestão financeira pessoal, existem diversas soluções consolidadas. A avaliação a seguir considerou as necessidades específicas do público-alvo do UniCash (estudantes universitários e famílias com orçamento restrito), utilizando como base de comparação as limitações de planos gratuitos verificadas no mercado:

- **Mobills:** oferece um conjunto amplo de funcionalidades. No entanto, na sua versão gratuita, o usuário sofre restrições severas que inviabilizam o controle mensal completo (ex: limite de criação de apenas um planejamento orçamentário, restrição na criação de novas categorias personalizadas e limites de leitura de gráficos de análise).

- **Organizze:** apresenta uma interface simples e organizada. Contudo, seu plano básico/gratuito não permite o controle de cartões de crédito nem a gestão de múltiplas contas (como separar a conta corrente da carteira física ou conta poupança), exigindo assinatura para a organização completa da realidade do usuário comum.

- **Minhas Economias:** diferencia-se por ser uma plataforma 100% gratuita que oferece controle orçamentário e relatórios. O ponto fraco reside na usabilidade (UX/UI menos intuitiva e defasada em relação aos padrões de mercado atuais) e na ausência de recursos focados no engajamento diário e educação de usuários que estão aprendendo a gerir dinheiro agora.

A proposta do UniCash busca uma diferenciação verificável baseada em:

- **Ausência de paywall para controle essencial:** diferente do Mobills e Organizze, o UniCash não limitará a quantidade de categorias, contas básicas ou planejamentos no seu fluxo principal, pois o foco social do projeto exige que a organização financeira não seja condicionada à capacidade de pagamento.

- **Modelagem focada no perfil estudantil/bolsista:** a plataforma virá com estruturas (ou templates sugeridos) de categorias aderentes à realidade de jovens adultos e estudantes (ex: despesas com restaurante universitário, transporte, xerox, materiais, bolsas-auxílio, rateio de moradia), ao invés de focar primariamente em perfis investidores.

- **Curva de aprendizado minimizada** processo de lançamento otimizado focado em usabilidade e rapidez, garantindo a retenção do usuário que não possui disciplina financeira prévia.

## 2.6 Viabilidade da Proposta

A proposta é considerada viável no **contexto da disciplina**, tendo em vista o acesso aos stakeholders para levantamento e validação de requisitos, o escopo enxuto voltado para as necessidades essenciais do usuário final e a disponibilidade de tecnologias adequadas e gratuitas para o desenvolvimento da solução pela equipe.

Para garantir a viabilidade técnica, o cumprimento do prazo de desenvolvimento e a segurança da informação, o sistema possui as seguintes fronteiras de escopo estritamente definidas:

- **Ausência de transações reais**: o sistema funcionará estritamente como uma ferramenta de gestão visual e diário financeiro. Não haverá, sob nenhuma hipótese, transição de dinheiro real, pagamentos ou transferências executadas por dentro da aplicação.
- **Inserção exclusivamente declaratória**: todos os lançamentos de receitas e despesas deverão ser inseridos manualmente pelos usuários.
- **Sem integração bancária**: o sistema não possuirá integração via API com instituições financeiras, operadoras de cartão de crédito ou com o ecossistema de Open Finance.
- **Dados Sensíveis**: a aplicação não solicitará e não armazenará dados bancários sensíveis (como senhas de banco, código de segurança de cartões ou números de contas reais), operando apenas com a representação virtual (ex: "Conta Corrente", "Carteira") criada pelo próprio usuário.

## 2.7 Benefícios Esperados

- **Para o cliente:** disponibilizar uma solução de gestão financeira que atenda às necessidades identificadas durante o levantamento de requisitos, oferecendo uma ferramenta acessível para auxiliar estudantes universitários, famílias e demais usuários no controle de suas finanças. A solução também permitirá a evolução contínua do produto a partir do feedback dos usuários e da validação de novas funcionalidades ao longo do desenvolvimento.

- **Para os usuários:** proporcionar uma forma simples e intuitiva de registrar receitas e despesas, acompanhar o orçamento, visualizar indicadores financeiros e estabelecer metas de economia. Espera-se que o UniCash contribua para o desenvolvimento de hábitos financeiros mais saudáveis, reduzindo o descontrole dos gastos e auxiliando na construção de uma reserva financeira.
