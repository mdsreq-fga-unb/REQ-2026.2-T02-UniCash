# 2 - SOLUÇÃO PROPOSTA

## 2.1 Objetivo Geral do Produto

O objetivo do produto é **auxiliar estudantes universitários, famílias e demais usuários a organizar receitas, despesas e metas financeiras** de forma simples e intuitiva, por meio de uma plataforma de gestão financeira pessoal. A solução permitirá um acompanhamento contínuo da situação financeira do usuário, promovendo maior controle sobre os gastos, incentivo à formação de reservas financeiras e apoio à tomada de decisões relacionadas ao orçamento pessoal, reduzindo a dependência de planilhas e outros métodos de controle pouco práticos.

## 2.2 Objetivos Específicos (OE) do Produto

- **(OE1)** Facilitar o registro e o acompanhamento das receitas e despesas dos usuários em um ambiente simples e intuitivo;
- **(OE2)** Auxiliar no planejamento financeiro por meio do controle de orçamento, categorização de gastos e acompanhamento de metas de economia;
- **(OE3)** Disponibilizar informações e indicadores que permitam ao usuário compreender seus hábitos financeiros e tomar decisões mais conscientes;
- **(OE4)** Incentivar a organização financeira de estudantes universitários, famílias e demais usuários, contribuindo para a redução do endividamento e para a formação de reservas financeiras;
- **(OE5)** Disponibilizar uma base tecnológica que permita a evolução gradual da plataforma, possibilitando a inclusão de novas funcionalidades conforme as necessidades dos usuários forem identificadas.

## 2.3 Características de Produto (mapeadas com os Objetivos Específicos do Produto)

| **ID** | **Característica de Produto (CP)** | **Descrição resumida** | **ID** | **Valor de negócio (VN) principal** | **Contribuição principal** | **Contribuição secundária** |
|---|---|---|---|---|---|---|
| CP1 | Cadastro e gerenciamento de receitas e despesas | A solução deverá permitir o registro, edição, exclusão e consulta de receitas e despesas, possibilitando que o usuário acompanhe sua movimentação financeira de forma organizada e intuitiva. | VN1 | Maior controle financeiro e redução da perda de informações sobre movimentações. | OE1 | OE3 |
| CP2 | Organização financeira por categorias | A solução deverá permitir classificar receitas e despesas por categorias, facilitando a identificação dos principais tipos de gastos e apoiando o planejamento financeiro. | VN2 | Melhor compreensão dos hábitos de consumo e apoio à organização do orçamento. | OE2 | OE3 |
| CP3 | Planejamento financeiro e metas | A solução deverá possibilitar a criação de metas financeiras e o acompanhamento do orçamento, incentivando o usuário a economizar e manter controle sobre seus gastos. | VN3 | Incentivo à formação de reservas financeiras e redução do endividamento. | OE2 | OE4 |
| CP4 | Relatórios e indicadores financeiros | A solução deverá apresentar gráficos, relatórios e indicadores que permitam visualizar receitas, despesas, saldo e evolução financeira ao longo do tempo. | VN4 | Apoio à tomada de decisões e melhor acompanhamento da situação financeira. | OE3 | OE2 |
| CP5 | Perfil e gerenciamento do usuário | A solução deverá permitir o gerenciamento das informações do usuário, incluindo autenticação, atualização de dados cadastrais e personalização básica da experiência. | VN5 | Maior praticidade, segurança e personalização da utilização do sistema. | OE1 | OE4 |
| CP6 | Segurança e proteção dos dados | A solução deverá incorporar mecanismos de autenticação e proteção das informações financeiras dos usuários, garantindo privacidade e confiabilidade no uso da plataforma. | VN6 | Fortalecimento da confiança dos usuários e proteção das informações financeiras. | OE4 | OE1 |

## 2.4 Tecnologias a Serem Utilizadas

Para o desenvolvimento do UniCash, serão utilizadas tecnologias compatíveis com os objetivos do projeto e com o escopo previsto para a disciplina. O frontend será desenvolvido utilizando **React**, permitindo a construção de uma interface moderna, responsiva e reutilizável para o gerenciamento das informações financeiras dos usuários. No backend será utilizado **Node.js**, responsável pela implementação da lógica de negócio, autenticação dos usuários e disponibilização de APIs para comunicação com o cliente da aplicação.

Para a persistência dos dados será utilizado o **MongoDB**, considerando sua flexibilidade para armazenar informações como receitas, despesas, categorias, metas financeiras e dados cadastrais dos usuários. A comunicação entre frontend e backend será realizada por meio de **APIs REST**, facilitando a integração entre os componentes do sistema.

Como apoio ao desenvolvimento colaborativo serão utilizados **Git** e **GitHub** para controle de versão e gerenciamento do código-fonte. Também serão adotadas boas práticas relacionadas à **autenticação de usuários, proteção dos dados armazenados e organização do projeto**, de forma compatível com as características definidas para o UniCash.

## 2.5 Pesquisa de Mercado e Análise Competitiva

No mercado de gestão financeira pessoal, existem diversas soluções consolidadas, como Mobills, Organizze e Minhas Economias. Essas plataformas oferecem funcionalidades para registro de receitas e despesas, categorização de gastos, acompanhamento de orçamentos e geração de relatórios financeiros. Entretanto, algumas limitações podem ser observadas quando consideradas as necessidades do público-alvo do UniCash.

- **Mobills:** oferece um conjunto amplo de funcionalidades para controle financeiro, porém diversos recursos importantes estão disponíveis apenas na versão paga, limitando o acesso de usuários que buscam uma solução gratuita, como muitos estudantes universitários.

- **Organizze:** apresenta uma interface simples e organizada, mas possui limitações relacionadas ao acesso gratuito da plataforma e não é direcionado especificamente às necessidades de estudantes e usuários que desejam desenvolver hábitos financeiros desde o início da vida acadêmica.

- **Minhas Economias:** disponibiliza funcionalidades de planejamento financeiro sem custo, porém possui uma interface menos moderna e oferece menor flexibilidade para evolução da experiência do usuário em comparação com soluções mais recentes.

A proposta do UniCash busca se diferenciar por:

- **Foco no público universitário e em famílias:** a plataforma será desenvolvida considerando as necessidades específicas desses perfis, incluindo despesas recorrentes como bolsa-auxílio, aluguel, transporte, alimentação, material acadêmico e contas domésticas.

- **Facilidade de uso:** o sistema priorizará uma interface intuitiva e de fácil aprendizagem, permitindo que usuários sem conhecimento em finanças consigam organizar seu orçamento com rapidez.

- **Incentivo à educação financeira:** além do registro das movimentações financeiras, a solução buscará estimular hábitos de planejamento e economia, auxiliando o usuário na construção de uma reserva financeira e no acompanhamento de metas pessoais.

- **Evolução contínua da plataforma:** a arquitetura do sistema será planejada para permitir a inclusão gradual de novas funcionalidades, acompanhando as necessidades identificadas junto aos usuários ao longo do desenvolvimento do produto.

## 2.6 Viabilidade da Proposta

A proposta é considerada viável no **contexto da disciplina**, tendo em vista o acesso direto à cliente para levantamento e validação dos requisitos, o escopo definido para o projeto e a possibilidade de desenvolvimento incremental de um Produto Mínimo Viável (MVP) ao longo do semestre.

A equipe possui conhecimentos compatíveis com as tecnologias selecionadas para o desenvolvimento da aplicação e pretende adotar uma abordagem iterativa, priorizando inicialmente as funcionalidades essenciais, como cadastro de usuários, registro de receitas e despesas, categorização de gastos, acompanhamento do saldo financeiro e visualização de indicadores. Essa estratégia permite reduzir a complexidade inicial do projeto e facilitar a validação contínua da solução junto à cliente.

Os principais **riscos** estão relacionados ao tempo disponível para desenvolvimento, ao aprendizado de algumas tecnologias e à implementação de funcionalidades complementares, como relatórios mais elaborados e recursos avançados de análise financeira. Esses riscos serão **mitigados** por meio da priorização das funcionalidades essenciais, do acompanhamento contínuo das atividades da equipe, da realização de validações frequentes com a cliente e da utilização de tecnologias amplamente consolidadas no desenvolvimento de aplicações mobile.

## 2.7 Benefícios Esperados

- **Para o cliente:** disponibilizar uma solução de gestão financeira que atenda às necessidades identificadas durante o levantamento de requisitos, oferecendo uma ferramenta acessível para auxiliar estudantes universitários, famílias e demais usuários no controle de suas finanças. A solução também permitirá a evolução contínua do produto a partir do feedback dos usuários e da validação de novas funcionalidades ao longo do desenvolvimento.

- **Para os usuários:** proporcionar uma forma simples e intuitiva de registrar receitas e despesas, acompanhar o orçamento, visualizar indicadores financeiros e estabelecer metas de economia. Espera-se que o UniCash contribua para o desenvolvimento de hábitos financeiros mais saudáveis, reduzindo o descontrole dos gastos e auxiliando na construção de uma reserva financeira.
