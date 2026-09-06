# 4 - ESTRATÉGIAS DE ENGENHARIA DE SOFTWARE

As decisões desta seção decorrem de três condições descritas nas seções 1 e 2: os requisitos ainda são instáveis, já tendo o escopo sido ampliado uma vez; a cliente é uma usuária real, acessível com frequência, porém sem formação técnica; e o projeto será conduzido por sete estudantes em um semestre, com disponibilidade limitada pelas demais disciplinas. Como prazo e equipe são fixos, o escopo é a única variável de ajuste.

---

## 4.1 Estratégia Priorizada

* **Abordagem de Desenvolvimento de Software:** Híbrida. Os requisitos não estão completamente conhecidos e devem evoluir com o feedback da cliente, o que torna inviável fixá-los antecipadamente e tratá-los por controle formal de mudanças; por outro lado, a ampliação já ocorrida no escopo recomenda alguma estruturação inicial antes do detalhamento. A abordagem híbrida concilia as duas necessidades, calibrando o nível de formalidade conforme o contexto de cada fase (MARSICANO, 2026).
* **Ciclo de vida:** Adaptativo, de natureza iterativa e incremental. O projeto começa exploratório, voltado ao entendimento do negócio, e ganha formalidade à medida que os requisitos se estabilizam; cada iteração entrega um incremento utilizável. Assim, uma eventual queda de produtividade custa funcionalidades de menor prioridade, e não o produto inteiro.
* **Processo de Engenharia de Software:** DSDM (*Dynamic Systems Development Method*), processo híbrido/adaptativo que abrange gestão do projeto, governança e envolvimento do negócio, e não apenas práticas de desenvolvimento (MARSICANO, 2026). Por reunir ciclo de vida, papéis e mecanismos de controle de escopo em um único processo, dispensa a combinação com um framework de gerenciamento adicional.
* **Framework de gerenciamento operacional:** Kanban. Embora o DSDM já reúna ciclo de vida, papéis e controle de escopo, ele não prescreve como o trabalho deve ser visualizado e conduzido no dia a dia dentro de cada timebox. Para isso, a equipe adota o Kanban como instrumento operacional: um quadro visual com colunas de status e limites explícitos de trabalho em andamento (WIP), que tornam gargalos e sobrecarga visíveis em tempo real, sem sobrepor os papéis e os mecanismos de priorização já definidos pelo DSDM (ANDERSON, 2010).

Para caber na realidade da equipe, o processo foi calibrado da seguinte forma:

1. **Fases:** Estudo de viabilidade e de negócio nas primeiras semanas, seguido das iterações de modelo funcional e de projeto e construção, encerradas pela implementação ao final do semestre (AGILE BUSINESS CONSORTIUM, 2021).
2. **Timeboxes:** Timeboxes de duas semanas, aproximadamente seis após o estudo inicial, alinhados às unidades da disciplina. Prazo e equipe permanecem fixos; o escopo alocado a cada timebox é o que se ajusta.
3. **Priorização MoSCoW:** Cada requisito é classificado em *Must have*, *Should have*, *Could have* ou *Won’t have this time*. Os *Must have* delimitam o MVP e são dimensionados para um ritmo conservador; as classes inferiores funcionam como margem de manobra em semanas de sobrecarga (MARSICANO, 2026).
4. **Papéis:** A cliente atua como Embaixadora do Negócio, participando dos workshops e das revisões de timebox; um integrante acumula o papel de Visionário do Negócio, guardando os objetivos do produto e fazendo a interlocução com a cliente entre as sessões; outro responde pela coordenação técnica; e os cinco demais desenvolvem e testam.
5. **Elicitação:** Por workshops facilitados no início de cada fase, com protótipos evolutivos como principal instrumento de captura, comunicação e validação de requisitos.
6. **Documentação “quanto basta”:** Business case enxuto, definição de arquitetura e protótipos, somados aos artefatos exigidos pela disciplina.
7. **Métodos técnicos complementares:** Como o DSDM não prescreve práticas de codificação, a equipe adota testes automatizados sobre as regras de cálculo de saldo, orçamento e metas, integração contínua e revisão obrigatória por *pull request*; métodos e processos são complementares (BECK; ANDRES, 2004; MARSICANO, 2026).
8. **Elementos reduzidos:** A governança corporativa, o patrocínio formal e o estudo de viabilidade extenso previstos pelo método foram enxugados, por serem desproporcionais a um projeto acadêmico sem orçamento e sem exigência regulatória. A comunicação diária é substituída por sincronização assíncrona escrita e uma reunião semanal de alinhamento, dada a incompatibilidade de horários.

---

## 4.2 Quadro Comparativo

Os dois processos considerados pela equipe foram o DSDM e o OpenUP. Ambos são classificados como híbridos/adaptativos, organizam o trabalho de forma iterativa e incremental e são viáveis para equipes pequenas; diferem na origem, no tratamento do prazo e no peso da estrutura de negócio.

| Característica | DSDM | OpenUP |
| :--- | :--- | :--- |
| **Estrutura** | Estudo de viabilidade e de negócio, iterações de modelo funcional e de projeto e construção, e implementação; trabalho dividido em timeboxes de duas a seis semanas. | Quatro fases (concepção, elaboração, construção e transição), com iterações internas. |
| **Organização dos requisitos** | Business case, requisitos de negócio e requisitos da solução, todos classificados por MoSCoW. | Visão, casos de uso ou histórias, requisitos técnicos e não funcionais. |
| **Documentação** | Guiada pelo princípio de “quanto basta”: business case, definição de arquitetura e protótipos evolutivos. | Enxuta frente ao RUP: visão, lista de requisitos e modelo de casos de uso simplificado. |
| **Mudanças de requisitos** | Acolhidas com prazo e custo mantidos fixos; o ajuste recai sobre o escopo, por repriorização MoSCoW. | Adaptáveis, porém condicionadas à arquitetura definida nas fases iniciais. |
| **Envolvimento da cliente** | Papéis de negócio explícitos (Embaixador e Visionário) e workshops facilitados; pressupõe participação frequente. | Colaboração direta com stakeholders em revisões e demonstrações, sem papéis de negócio dedicados. |
| **Curva de aprendizado** | Média a alta; exige assimilar fases, papéis e vocabulário próprios do método. | Média; exige assimilar fases e artefatos do Processo Unificado durante a disciplina. |
| **Limitação principal** | Mais prescritivo que métodos ágeis leves e potencialmente burocrático; depende de compromisso contínuo do negócio. | Custo de estruturação elevado para projetos curtos e de baixa criticidade. |

> **Quadro 3** – Comparação entre DSDM e OpenUP para o contexto do UniCash.  
> **Fonte:** elaborado pela equipe (2026).

---

## 4.3 Justificativa

A equipe optou pelo DSDM pelos seguintes motivos:

1. **Trata o prazo fixo como premissa, não como risco:** Diferentemente de outros métodos ágeis, o DSDM mantém prazo e custo fixos e ajusta o escopo pela priorização MoSCoW (AGILE BUSINESS CONSORTIUM, 2021). É exatamente a restrição do projeto: com equipe e semestre imutáveis, o conjunto de *Must have* define o MVP e as classes inferiores absorvem semanas de sobrecarga sem ameaçar a entrega final.
2. **Torna a prioridade explícita e negociável com a cliente:** As quatro classes do MoSCoW formam um vocabulário que uma usuária sem formação técnica compreende e utiliza, deixando claro o que é essencial e o que pode ser adiado para cumprir o prazo (MARSICANO, 2026). O corte de escopo deixa de ser decisão técnica unilateral e passa a ser acordo com a cliente.
3. **Valida por protótipo e ainda assim documenta o suficiente:** A iteração de modelo funcional gera protótipos que servem simultaneamente de especificação e de validação, e uma tela funcional produz feedback mais preciso de uma usuária não técnica do que a leitura de artefatos. Ao mesmo tempo, a documentação “quanto basta” cobre as exigências documentais da disciplina sem o formalismo de fases do OpenUP, desnecessário em um produto de lançamento manual, sem transações financeiras e sem exigência regulatória (KROLL; MACISAAC, 2006).

**Kanban:** A escolha decorre da mesma restrição de fundo: com prazo e equipe fixos, a equipe precisa de visibilidade contínua sobre o fluxo para redirecionar esforço a tempo de proteger o escopo *Must have*, algo que o ritmo de duas semanas do timebox, por si só, não garante entre uma revisão e outra. Por não prescrever fases, papéis ou vocabulário próprios, o Kanban se soma ao DSDM sem conflito de governança, funcionando como camada de execução dentro da estrutura de fases e prioridades já estabelecida.