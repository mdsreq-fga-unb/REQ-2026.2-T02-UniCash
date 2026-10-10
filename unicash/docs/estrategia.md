# 4 - ESTRATÉGIAS DE ENGENHARIA DE SOFTWARE

As decisões desta seção decorrem de três condições descritas nas seções 1 e 2: os requisitos ainda são instáveis, já tendo o escopo sido ampliado uma vez; a cliente é uma usuária real, acessível com frequência, porém sem formação técnica; e o projeto será conduzido por sete estudantes em um semestre, com disponibilidade limitada pelas demais disciplinas. Como prazo e equipe são fixos, o escopo funcional é a principal variável de ajuste, preservando os critérios de qualidade e os requisitos necessários de segurança e privacidade.

---

## 4.1 Estratégia Priorizada

* **Abordagem de Desenvolvimento de Software:** Híbrida. Os requisitos não estão completamente conhecidos e devem evoluir com o feedback da cliente, o que torna pouco adequado fixar todo o escopo antecipadamente; por outro lado, a ampliação já ocorrida no escopo recomenda alguma estruturação inicial antes do detalhamento. A abordagem híbrida concilia as duas necessidades, calibrando o nível de formalidade conforme o contexto de cada fase (MARSICANO, 2026).
* **Ciclo de vida:** Adaptativo, de natureza iterativa e incremental. O projeto começa exploratório, voltado ao entendimento do negócio, e ganha formalidade à medida que os requisitos se estabilizam; cada iteração entrega um incremento utilizável. Assim, uma eventual queda de produtividade custa funcionalidades de menor prioridade, e não o produto inteiro.
* **Processo de Engenharia de Software:** DSDM (*Dynamic Systems Development Method*), processo híbrido/adaptativo que abrange gestão do projeto, governança e envolvimento do negócio, e não apenas práticas de desenvolvimento (MARSICANO, 2026). Seus mecanismos de timeboxing, priorização MoSCoW e participação do negócio orientam a gestão de prazo, recursos e escopo. O Kanban complementa essa estrutura na organização cotidiana do trabalho.
* **Framework de gerenciamento operacional:** Kanban. Para dar visibilidade ao fluxo de trabalho dentro de cada timebox, a equipe adota o Kanban como instrumento operacional: um quadro visual com colunas de status e limites explícitos de trabalho em andamento (WIP), que tornam gargalos e sobrecarga visíveis em tempo real, sem sobrepor os papéis e os mecanismos de priorização já definidos pelo DSDM (ANDERSON, 2010).

Para caber na realidade da equipe, o processo foi calibrado da seguinte forma:

1. **Fases:** Estudo de viabilidade e de negócio nas primeiras semanas, seguido das iterações de modelo funcional e de projeto e construção, encerradas pela implementação ao final do semestre (AGILE BUSINESS CONSORTIUM, 2021).
2. **Timeboxes:** Timeboxes de duas semanas, aproximadamente seis após o estudo inicial, alinhados às unidades da disciplina. Prazo e equipe permanecem fixos; o escopo alocado a cada timebox é o que se ajusta.
3. **Priorização MoSCoW:** Cada requisito é classificado em *Must have*, *Should have*, *Could have* ou *Won’t have this time*. Os *Must have* delimitam o MVP e são dimensionados para um ritmo conservador; as classes inferiores funcionam como margem de manobra em semanas de sobrecarga (MARSICANO, 2026).
4. **Papéis:**

| Integrante | Papéis atribuídos |
| :--- | :--- |
| **BRUNO BERNARDES DUARTE** | Desenvolvedor; Facilitador; Escrivão; Testador |
| **CAIO PACHECO SANTOS** | Desenvolvedor; Coordenador Técnico; Escrivão; Testador |
| **DANTE FERNANDES SCARPATI** | Desenvolvedor; Anunciante; Escrivão; Testador |
| **ERICK ALVES DOS SANTOS** | Desenvolvedor; Escrivão; Testador |
| **EVELLYN DE SOUSA ROCHA** | Desenvolvedora; Intermediadora; Escrivã; Testadora |
| **LEONARDO RAMIRO ALVES DE OLIVEIRA** | Desenvolvedor; Gerenciador de Timebox; Escrivão; Testador |
| **NATAN JOSE FRANCA** | Desenvolvedor; Visionário; Escrivão; Testador |
| **Clientes** | Embaixadoras do Negócio |

5. **Elicitação:** Por workshops facilitados no início de cada fase, com protótipos evolutivos como principal instrumento de captura, comunicação e validação de requisitos.
6. **Documentação “quanto basta”:** Business case enxuto, definição de arquitetura e protótipos, somados aos artefatos exigidos pela disciplina. As decisões sobre tratamento de dados pessoais e financeiros, controle de acesso e critérios de aceitação de segurança e privacidade também devem ser registradas.
7. **Métodos técnicos complementares:** Como o DSDM não prescreve práticas de codificação, a equipe adota testes automatizados sobre as regras de cálculo de saldo, orçamento e metas, integração contínua e revisão obrigatória por *pull request*; métodos e processos são complementares (BECK; ANDRES, 2004; MARSICANO, 2026).
8. **Elementos reduzidos:** As estruturas de governança e patrocínio e o detalhamento do estudo de viabilidade são ajustados ao porte acadêmico, à disponibilidade da equipe e à ausência de orçamento financeiro dedicado. Essa adaptação reduz o volume de cerimônias e documentos, preservando as responsabilidades pelas decisões, pela qualidade e pela proteção dos dados. O tratamento de informações pessoais e financeiras exige considerar as obrigações aplicáveis de proteção de dados, ainda que o produto não execute transações financeiras. A comunicação diária ocorre por sincronização assíncrona escrita, complementada por uma reunião semanal de alinhamento, dada a incompatibilidade de horários.

---

## 4.2 Quadro Comparativo

Os dois processos considerados pela equipe foram o DSDM e o OpenUP. Ambos organizam o trabalho de forma iterativa e incremental e podem ser adaptados a equipes pequenas. O OpenUP é um processo leve e adaptável; suas fases não implicam, por si só, custo elevado de estruturação em projetos curtos. A comparação considera principalmente como cada processo orienta o controle de prazo, recursos e escopo e a participação do negócio no contexto do UniCash.

| Característica | DSDM | OpenUP |
| :--- | :--- | :--- |
| **Estrutura** | Estudo de viabilidade e de negócio, iterações de modelo funcional e de projeto e construção, e implementação; trabalho dividido em timeboxes de duas a seis semanas. | Quatro fases (concepção, elaboração, construção e transição), com iterações internas. |
| **Organização dos requisitos** | Business case, requisitos de negócio e requisitos da solução, todos classificados por MoSCoW. | Visão, casos de uso ou histórias, requisitos técnicos e não funcionais. |
| **Documentação** | Guiada pelo princípio de “quanto basta”: business case, definição de arquitetura e protótipos evolutivos. | Leve e adaptável ao projeto, com artefatos como visão, requisitos e registros de arquitetura, detalhados conforme a necessidade. |
| **Mudanças de requisitos** | Acolhidas com prazo e custo mantidos fixos; o ajuste recai sobre o escopo, por repriorização MoSCoW. | Incorporadas ao planejamento iterativo, considerando prioridades, riscos e impactos na arquitetura, que pode evoluir durante o projeto. |
| **Envolvimento da cliente** | Papéis de negócio explícitos (Embaixador e Visionário) e workshops facilitados; pressupõe participação frequente. | Colaboração contínua com stakeholders na definição de requisitos, nas decisões e na avaliação dos incrementos. |
| **Aprendizado e adaptação** | Exige assimilar fases, papéis, timeboxes e priorização MoSCoW, ajustando sua aplicação ao porte da equipe. | Exige assimilar fases, iterações, papéis e artefatos, selecionando o nível de detalhamento adequado ao projeto. |
| **Ponto de atenção no projeto** | Depende da participação frequente do negócio e da aplicação disciplinada do MoSCoW; seus papéis e artefatos precisam ser dimensionados para a equipe. | Para reproduzir a estratégia pretendida pela equipe, seria necessário explicitar acordos de priorização e ajuste de escopo com prazo e recursos fixos; MoSCoW não é um mecanismo central do processo. |

> **Quadro 3** – Comparação entre DSDM e OpenUP para o contexto do UniCash.  
> **Fonte:** elaborado pela equipe (2026).

---

## 4.3 Justificativa

A equipe optou pelo DSDM pela aderência de seus mecanismos de gestão às condições do UniCash: prazo de um semestre, sete integrantes com disponibilidade limitada, requisitos em evolução e uma cliente acessível para validações frequentes. A decisão se apoia nos seguintes motivos:

1. **Controle de prazo, custo e escopo:** O DSDM orienta a manutenção de prazo e custo fixos, utilizando o escopo como variável de ajuste por meio de timeboxes e da priorização MoSCoW (AGILE BUSINESS CONSORTIUM, 2021). No projeto acadêmico, essa lógica se traduz em respeitar o calendário da disciplina e a capacidade de trabalho disponível, mesmo sem orçamento financeiro dedicado. Se a capacidade prevista diminuir, a equipe renegocia funcionalidades de menor prioridade, preservando uma entrega essencial utilizável e seus critérios de qualidade, segurança e privacidade. A composição fixa da equipe não significa produtividade constante; por isso, o planejamento deve considerar as demais atividades acadêmicas.
2. **Priorização explícita e negociada com a cliente:** As categorias *Must have*, *Should have*, *Could have* e *Won’t have this time* oferecem um vocabulário acessível para discutir o que é indispensável e o que pode ser adiado (MARSICANO, 2026). Os *Must have* definem o núcleo essencial da entrega, enquanto os *Should have* e *Could have* oferecem flexibilidade para acomodar mudanças e semanas de sobrecarga. Essa classificação deve ser revista com a cliente a cada timebox, evitando que a ampliação do escopo comprometa o prazo ou que cortes sejam decididos unilateralmente pela equipe técnica. Requisitos necessários à proteção dos dados e ao atendimento das obrigações aplicáveis integram os critérios mínimos da solução e não devem ser tratados como funcionalidades opcionais.
3. **Envolvimento contínuo do negócio:** Os papéis de negócio explícitos e os workshops favorecem a participação da cliente nas prioridades e na avaliação dos resultados. Como ela é uma usuária real, acessível e sem formação técnica, protótipos evolutivos e demonstrações dos incrementos facilitam a comunicação e a identificação de divergências de entendimento. O integrante responsável pela interlocução organiza as dúvidas e acompanha os objetivos do produto, mantendo a cliente envolvida nas decisões sobre necessidades e prioridades.
4. **Estrutura proporcional ao contexto:** O DSDM reúne mecanismos úteis para coordenar a equipe, desde que seus papéis, atividades e documentos sejam dimensionados para o semestre. A documentação enxuta deve registrar objetivos, prioridades, decisões de arquitetura e critérios de aceitação, incluindo segurança e privacidade. A redução de formalidades administrativas se justifica pelo porte do projeto e pelos recursos disponíveis; o fato de o produto não executar transações financeiras não elimina as responsabilidades associadas ao tratamento de dados pessoais e financeiros.

O OpenUP permanece uma alternativa viável, pois é leve, adaptável, iterativo e adequado a equipes pequenas (KROLL; MACISAAC, 2006). A existência de fases em ambos os processos não constitui um critério suficiente para preferir um deles. No contexto do UniCash, a preferência pelo DSDM decorre principalmente da combinação explícita entre controle de prazo–custo–escopo, priorização MoSCoW e envolvimento do negócio, mecanismos que correspondem às restrições e à disponibilidade da cliente.

**Kanban:** A escolha decorre da mesma restrição de fundo: com prazo e equipe fixos, a equipe precisa de visibilidade contínua sobre o fluxo para redirecionar esforço a tempo de proteger o escopo *Must have*, algo que o ritmo de duas semanas do timebox, por si só, não garante entre uma revisão e outra. Por não prescrever fases, papéis ou vocabulário próprios, o Kanban se soma ao DSDM sem conflito de governança, funcionando como camada de execução dentro da estrutura de fases e prioridades já estabelecida.
