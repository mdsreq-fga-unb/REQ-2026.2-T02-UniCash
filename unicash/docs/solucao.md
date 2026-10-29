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
| CP6 | Suporte ao uso e operação | A solução deverá prover a capacidade de proporcionar uma experiência de utilização acessível e compreensível, favorecendo a autonomia dos usuários na utilização do produto. | VN6 | Maior autonomia dos usuários e redução das dificuldades de utilização. | OE1 | OE3 |
| CP7 | Colaboração em grupo de amigos ou família | A solução deverá prover a capacidade de apoiar a organização financeira compartilhada entre amigos e familiares, conciliando objetivos coletivos e necessidades individuais. | VN7 | Facilitação do planejamento financeiro conjunto, respeitando as necessidades e a privacidade dos participantes. | OE4 | OE2 |
| CP8 | Engajamento e incentivo ao cumprimento de metas | A solução deverá prover a capacidade de estimular o envolvimento contínuo dos usuários na organização de suas finanças e na busca por seus objetivos financeiros. | VN8 | Maior continuidade no acompanhamento financeiro e incentivo à formação de hábitos de organização e economia. | OE4 | OE2 |

## 2.4 Tecnologias a Serem Utilizadas

Para o desenvolvimento do UniCash, serão utilizadas tecnologias compatíveis com a arquitetura local-first do projeto e com o escopo previsto para a disciplina. O aplicativo será desenvolvido em **React Native** com **Expo** e **TypeScript**, a partir de uma única base de código para Android e iOS. A navegação entre telas utilizará o **Expo Router**.

Os dados financeiros serão armazenados no próprio dispositivo, em um banco **SQLite**, de acordo com o princípio local-first: a base local é a cópia principal e as funcionalidades individuais operam sem conexão.

A sincronização entre dispositivos e os recursos de grupo utilizarão o **Supabase**, serviço gerenciado baseado em **PostgreSQL**, sem backend próprio a ser desenvolvido ou hospedado pela equipe. O aplicativo acessa o Supabase diretamente pelo seu SDK, com autenticação pelo **Supabase Auth** e controle de acesso por **Row Level Security** (RLS): políticas no próprio banco garantem que cada usuário leia e altere apenas os seus dados e os dados dos grupos dos quais participa. O Supabase guarda o registro das alterações de cada campo, identificadas por um relógio lógico híbrido (HLC); a combinação dessas alterações é feita no aplicativo, conforme as regras de sincronização definidas nos requisitos.

Durante o desenvolvimento, a equipe executará o aplicativo no **Expo Go**. O ambiente de desenvolvimento será padronizado com **Docker** e **Docker Compose**, que executam o servidor de desenvolvimento do Expo em contêiner e dispensam a instalação local do Node.js; o Supabase também pode ser executado localmente para testes. As versões instaláveis (APK para Android e, quando houver conta Apple, IPA para iOS) serão geradas na nuvem pelo **EAS Build**, sem exigir Android Studio ou Xcode nas máquinas da equipe.

Como apoio ao desenvolvimento colaborativo serão utilizados **Git** e **GitHub** para controle de versão e gerenciamento do código-fonte, e **GitHub Actions** para integração e entrega contínuas: verificação de lint e tipos a cada pull request e geração do APK a cada versão publicada. Também serão adotadas boas práticas relacionadas à **proteção dos dados armazenados e organização do projeto**, de forma compatível com as características definidas para o UniCash.

## 2.5 Pesquisa de Mercado e Análise Competitiva

Existem diversas soluções destinadas à gestão de finanças pessoais. Parte delas utiliza modelos de assinatura ou limita determinadas funcionalidades às versões pagas. O Mobills, por exemplo, disponibiliza uma modalidade gratuita e reserva ao Premium recursos como cadastro ilimitado de contas e cartões, integração automática, orçamentos e objetivos ilimitados. O Organizze comercializa planos pagos, incluindo o Plano Conectado, que acrescenta a conexão automática com instituições financeiras. O Minhas Economias também possui uma versão gratuita, mas oferece funcionalidades adicionais por meio do plano pago Meu Clube.

Considerando o público-alvo do UniCash, formado principalmente por estudantes universitários e famílias, o projeto propõe disponibilizar gratuitamente as funcionalidades essenciais da aplicação, sem utilizar assinaturas para restringir o acesso aos seus recursos principais.

O UniCash também será desenvolvido como software open-source. De acordo com a Open Source Initiative, uma licença open-source permite o acesso ao código e concede direitos relacionados ao uso, modificação e redistribuição do software. No UniCash, essa característica será acompanhada de uma política própria de privacidade que não permitirá a comercialização ou o fornecimento dos dados financeiros dos usuários a empresas privadas ou anunciantes.

Outro aspecto da proposta é a adoção de uma arquitetura local-first, na qual os dados são armazenados e processados prioritariamente no dispositivo do usuário. Essa abordagem busca permitir o uso das funcionalidades principais mesmo sem conexão com a internet e reduzir a dependência de serviços externos para acessar as informações financeiras. Diferentemente de uma arquitetura exclusivamente local (local-only), o modelo local-first pode permitir mecanismos complementares de sincronização, caso sejam implementados futuramente, sem deixar de priorizar o armazenamento local. A adoção desse modelo, aliada à política de privacidade e à abertura do código, busca oferecer maior controle sobre as informações pessoais.

O Securo oferece um conjunto amplo de recursos, incluindo múltiplas contas, importação de arquivos, categorização automática, transações recorrentes, orçamentos, metas, relatórios, gerenciamento de patrimônio, múltiplos usuários e sincronização bancária por meio de diferentes provedores, incluindo Pluggy para bancos brasileiros. Em comparação, o UniCash busca uma experiência mais simples para o usuário final, eliminando a necessidade de self-hosting e concentrando-se na utilização local da aplicação. Além disso, os requisitos do UniCash incluem recursos de interação entre amigos e familiares que não constituem o foco principal do Securo, como metas coletivas, compartilhamento seletivo de informações financeiras, comparação de gastos, classificação entre membros e sistema de conquistas e pontuação. Assim, a proposta não é competir com o Securo pela quantidade de funcionalidades administrativas, mas oferecer uma experiência mais acessível e orientada ao uso cotidiano.

O Monekin é uma referência especialmente próxima do UniCash por também ser gratuito, open-source, offline-first e baseado em armazenamento local por SQLite, sem servidores e sem assinaturas. Por esse motivo, características como código aberto, gratuidade, funcionamento local, categorias, orçamentos e registro manual não serão consideradas diferenciais exclusivos do UniCash. A diferenciação proposta está principalmente nos recursos voltados à utilização coletiva e à interação entre usuários, como grupos de amigos e família, privacidade seletiva dentro desses grupos, metas coletivas, comparação de gastos, classificação e conquistas.

O Parsa, por sua vez, parte de uma proposta centrada na conectividade bancária. O projeto utiliza uma arquitetura com armazenamento local e sincronização com um backend, oferecendo integração com Open Finance, categorização de transações, orçamentos e análises financeiras. Seu repositório descreve a solução como orientada à conexão bancária automática, buscando reduzir a necessidade de registrar cada movimentação manualmente. O UniCash se diferencia, no MVP, por priorizar o registro manual, sem exigir integração bancária para seu funcionamento. A arquitetura local-first também busca dar prioridade ao acesso e ao processamento dos dados no dispositivo, enquanto o Parsa adota a sincronização com sua infraestrutura remota. A integração com o Open Finance brasileiro poderá ser considerada em versões futuras, sem constituir uma dependência para a utilização inicial do produto.

Dessa forma, a proposta do UniCash combina características já existentes individualmente no mercado, como gratuidade, código aberto e armazenamento local, com uma experiência voltada à organização financeira individual e compartilhada. Seus principais elementos de diferenciação frente às referências analisadas são o caráter local-first da aplicação, a ausência de necessidade de infraestrutura própria para sua utilização e os mecanismos de interação financeira entre grupos.

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
