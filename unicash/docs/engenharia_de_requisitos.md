# 5 - ENGENHARIA DE REQUISITOS

O processo de Engenharia de Requisitos (ER) do UniCash é organizado em seis atividades, distribuídas pelas fases do DSDM:

1. **Elicitação e Descoberta:** obter necessidades, problemas e informações do domínio junto à cliente e aos usuários.
2. **Análise e Consenso:** analisar, classificar, negociar e priorizar os requisitos, chegando a decisões acordadas com a cliente.
3. **Declaração:** registrar os requisitos em uma forma definida (texto em linguagem natural, casos de uso e critérios de aceitação).
4. **Representação:** produzir modelos e protótipos que tornem os requisitos compreensíveis para a equipe e para a cliente.
5. **Verificação e Validação:** verificar se os requisitos estão bem escritos e prontos, e validar se atendem às necessidades reais.
6. **Organização e Atualização:** manter o backlog e a rastreabilidade atualizados à medida que os requisitos mudam.

Nas tabelas a seguir, cada técnica informa os participantes e o critério de seleção, as entradas analisadas, o responsável e a forma de registro e de evidência. Ferramentas, artefatos e práticas de gestão do projeto que apoiam a ER, mas não são técnicas de ER, estão separados na seção 5.3.

**Participantes de referência:**

- **Cliente:** Leinad Santos França, idealizadora do produto e Embaixadora do Negócio.
- **Representantes dos segmentos:** Maria Vitória, representante dos estudantes, e Alana França, representante das famílias.
- **Usuários representativos:** pelo menos cinco estudantes universitários e três representantes de famílias em cada ciclo de validação relevante (seção 7.3). Os estudantes são selecionados entre graduandos que custeiam despesas próprias com renda limitada, com preferência por bolsistas. Os representantes de famílias são selecionados entre pessoas responsáveis pelo orçamento doméstico. Por orientação do professor, a validação também inclui pós-graduandos, indicados pela cliente ([R03](registros.md#r03-reuniao-de-refinamento-com-a-cliente-17092026)). O recrutamento é feito por meio da cliente e das representantes dos segmentos.
- **Equipe:** os papéis de cada integrante estão descritos nas seções 4.1 e 7.3.

---

## 5.1 Atividades e Técnicas de ER e DSDM/Kanban

### **Pré-projeto**

Objetivo: compreender o problema e decidir se a ideia deve seguir para o estudo de viabilidade.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Entrevista semiestruturada | Leinad Santos França (uma entrevista) | Ideia inicial do produto e contexto da cliente | Natan (condução) e Bruno (perguntas e transcrição) | Transcrição e registro da reunião de diagnóstico ([R01](registros.md#r01-reuniao-de-diagnostico-29082026)); descrição do problema (seção 1.4) |
| Análise e Consenso | Análise de causa raiz com Diagrama de Ishikawa (6M) | Equipe, com revisão da cliente | Problemas relatados na reunião de diagnóstico | Erick e Evellyn | Diagrama de Ishikawa (seção 1.4) |
| Análise e Consenso | Análise de efetividade e de escopo da ideia | Equipe e cliente | Problema, público-alvo e propostas levantadas na entrevista | Natan (Visionário) | Decisões sobre público-alvo e escopo, como o descarte da recomendação de investimentos ([R01](registros.md#r01-reuniao-de-diagnostico-29082026)) |
| Representação | Rich Picture e mapa de stakeholders | Equipe | Registro da reunião de diagnóstico e Diagrama de Ishikawa | Erick e Evellyn | Rich Picture (seção 1.3); stakeholders (seção 1.6) |

---

### **Viabilidade**

Objetivo: delimitar o escopo preliminar e avaliar se a equipe consegue entregá-lo no semestre.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Análise de soluções existentes | Equipe | Aplicativos de finanças pessoais gratuitos, pagos e open-source (como Minhas Economias, Securo, Monekin e Parsa) | Dante | Quadro comparativo (seção 2.5); discussões em [R03](registros.md#r03-reuniao-de-refinamento-com-a-cliente-17092026), [R05](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026) e [R07](registros.md#r07-validacao-do-mvp-com-a-cliente-e-as-representantes-02102026) |
| Análise e Consenso | Análise de viabilidade técnica da equipe | Sete integrantes da equipe | Respostas ao formulário de conhecimentos técnicos de cada integrante | Bruno (formulário) e Caio (Coordenador Técnico) | Formulário de conhecimentos ([R02](registros.md#r02-reuniao-de-equipe-002-04092026)) |
| Análise e Consenso | Análise de riscos | Equipe; Caio para os riscos técnicos | Lista preliminar de necessidades e restrições de escopo | Leonardo (Gerenciador de Timebox) e Caio (Coordenador Técnico) | Lista de riscos com probabilidade, impacto e ação de mitigação |
| Análise e Consenso | Análise de custo/benefício por Característica de Produto | Equipe e cliente | CPs preliminares e riscos | Natan (Visionário) | Fronteiras de escopo (seção 2.6) |
| Análise e Consenso | Classificação dos requisitos em RF, RNF (URPS+ e Sommerville) e RN | Equipe | Lista preliminar de necessidades | Leonardo | Requisitos classificados nas páginas de requisitos funcionais e não funcionais |
| Declaração | Declaração em linguagem natural, com código e descrição de cada requisito | Equipe | Requisitos classificados | Leonardo; revisão de Erick e Evellyn | [Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md) |

---

### **Fundamentos**

Objetivo: priorizar os requisitos, definir o MVP e preparar o backlog.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Workshop de apresentação dos requisitos às representantes dos segmentos | Leinad e Maria Vitória; Alana França informada depois | Lista de requisitos ([R04](registros.md#r04-primeira-versao-consolidada-dos-requisitos-anterior-a-25092026)) | Natan | Contribuições registradas em [R05](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026) |
| Análise e Consenso | Priorização MoSCoW com matriz valor de negócio × esforço técnico | Leinad, Maria Vitória e Alana França para o valor de negócio, com nota de 1 a 4 e justificativa; integrantes da equipe para o esforço técnico | RF01 a RF56 | Natan (planilha) e Erick (Campeão do Produto) | Planilha de priorização ([R05](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026)); MVP definido como resultado ([Escopo do MVP](mvp.md)) |
| Declaração | Casos de uso em formato breve | Equipe | RFs priorizados como *Must have* | Leonardo | Casos de uso com identificador próprio, vinculados ao RF de origem; decisão de adotar casos de uso em [R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026) |
| Representação | Prototipação de baixa fidelidade | Bruno; revisão da cliente | Casos de uso e decisões registradas com a cliente | Bruno | Wireframes no Figma |
| Verificação e Validação | Revisão do escopo do MVP com a cliente e as representantes | Leinad, Maria Vitória e Alana França | MVP e documentação publicada | Natan | Escopo validado e ajustes registrados em [R07](registros.md#r07-validacao-do-mvp-com-a-cliente-e-as-representantes-02102026) |
| Organização e Atualização | Estruturação do backlog de requisitos por CP e caso de uso | Equipe | Casos de uso e CPs | Leonardo | Backlog de requisitos em um GitHub Project separado do Kanban de atividades ([R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026)); versão inicial da matriz de rastreabilidade (seção 5.4) |

---

### **Desenvolvimento Evolutivo**

Objetivo: refinar, validar e entregar os requisitos de cada timebox. As técnicas abaixo se repetem a cada timebox, exceto o diário financeiro, a entrevista contextual e a análise de tarefas, aplicados uma vez antes dos testes de protótipo.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Workshop facilitado de início de timebox | Equipe, cliente e representantes dos segmentos ligados aos CPs do timebox | Itens do backlog selecionados e feedback do timebox anterior | Bruno (Facilitador) e Leonardo | Ata com decisões e requisitos afetados (exemplo: [R03](registros.md#r03-reuniao-de-refinamento-com-a-cliente-17092026)) |
| Elicitação e Descoberta | Diário financeiro, aplicado uma vez | Cinco estudantes e três representantes de famílias, durante sete dias | Formulário diário com gasto, categoria, forma de registro usada e dificuldade encontrada | Leonardo; recrutamento pela cliente e pelas representantes dos segmentos | Diários consolidados; padrões de gasto e dificuldades associados a RFs e RNFs |
| Elicitação e Descoberta | Entrevista contextual | Dois estudantes e um representante de família, escolhidos entre os participantes do diário | Observação de como o participante registra e consulta suas finanças hoje (planilha, caderno ou aplicativo) | Leonardo e Bruno | Notas de observação; lista das tarefas realizadas atualmente |
| Elicitação e Descoberta | Questionário | Estudantes e famílias recrutados pelas representantes dos segmentos | Dúvidas em aberto sobre os requisitos do timebox | Leonardo | Respostas consolidadas e requisitos ajustados |
| Análise e Consenso | Análise de tarefas | Equipe | Diários e notas das entrevistas contextuais | Bruno | Decomposição das tarefas principais (registrar despesa, consultar saldo do mês, acompanhar meta), usada nos casos de uso, nos protótipos e no roteiro do teste de protótipo |
| Análise e Consenso | Negociação e repriorização MoSCoW | Cliente e equipe | Feedback, respostas do questionário e capacidade do timebox | Erick e Leonardo | Prioridades atualizadas e registradas na ata |
| Declaração | Casos de uso detalhados (fluxo principal, fluxos alternativos, pré e pós-condições) e critérios de aceitação | Leonardo, com a cliente e as representantes para definir os dados de cada funcionalidade | Casos de uso breves selecionados para o timebox | Leonardo | Casos de uso detalhados e critérios com identificador, vinculados ao caso de uso |
| Representação | Prototipação evolutiva (média fidelidade) | Bruno; consenso das telas com a cliente e as representantes conduzido por Dante | Casos de uso, critérios de aceitação e resultados dos testes de protótipo | Bruno e Dante | Protótipos versionados no Figma |
| Verificação e Validação | Inspeção dos requisitos com checklist da Definition of Ready (DoR) | Dois integrantes que não escreveram o caso de uso | Casos de uso e critérios de aceitação | Evellyn | Checklist preenchido; caso de uso marcado como pronto |
| Verificação e Validação | Avaliação cruzada dos requisitos por outra equipe da disciplina | Equipe revisora externa; revisores internos Caio, Dante, Evellyn e Erick | Páginas de requisitos | Revisores internos | Tabela com cada feedback, decisão de aceite e justificativa ([R06](registros.md#r06-reuniao-de-equipe-30092026), [R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026)) |
| Verificação e Validação | Teste de protótipo com tarefas específicas | Cinco estudantes e três representantes de famílias | Roteiro de tarefas, como "registre uma despesa de xerox", "descubra quanto sobrou no mês" e "crie uma meta de reserva" | Bruno (condução) e Leonardo (observação) | Taxa de conclusão, erros e comentários por tarefa; ajustes nos requisitos |
| Verificação e Validação | Revisão do incremento (*Timebox Review/Demo*) | Cliente e usuários representativos | Incremento entregue e critérios de aceitação | Equipe | Registro de aceite ou rejeição por critério de aceitação |
| Organização e Atualização | Atualização do backlog e da matriz de rastreabilidade | Leonardo | Atas, resultados de validação e mudanças aprovadas | Leonardo; divulgação por Dante | Backlog e matriz atualizados, com histórico das mudanças |

---

### **Implantação**

Objetivo: confirmar que o MVP atende aos requisitos priorizados e consolidar a versão final dos requisitos.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Verificação e Validação | Teste de aceitação | Cliente e representantes dos segmentos | Critérios de aceitação de todos os casos de uso *Must have* | Equipe | Registro de aceite por critério |
| Verificação e Validação | Verificação de cobertura pela matriz de rastreabilidade | Leonardo e Natan | Matriz de rastreabilidade | Leonardo | Confirmação de que todo requisito *Must have* tem caso de uso, critério, incremento e validação |
| Organização e Atualização | Consolidação da linha de base dos requisitos | Erick e Evellyn | Páginas de requisitos e matriz de rastreabilidade | Erick | Versão final dos requisitos e da matriz, identificada no repositório |

---

### **Pós-projeto**

Objetivo: identificar e priorizar os próximos incrementos a partir do uso do MVP.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Questionário pós-implantação e entrevistas de acompanhamento | Cliente e usuários que utilizaram o MVP | Experiência de uso do MVP | Leonardo | Lista de novas necessidades |
| Análise e Consenso | Priorização MoSCoW e mapeamento de valor dos novos requisitos | Cliente e equipe | Novas necessidades e requisitos *Won't have* do MVP | Erick | Backlog de evolução priorizado |
| Organização e Atualização | Registro dos novos requisitos no backlog de evolução e na matriz de rastreabilidade | Leonardo | Novos requisitos priorizados | Leonardo | Backlog de evolução e matriz atualizados |

---

## 5.2 Métodos de Declaração de Requisitos

Os requisitos do UniCash serão declarados em diferentes níveis de detalhamento, conforme o tipo de requisito e a finalidade do registro.

| Tipo de requisito | Método de declaração | Aplicação no projeto |
| :--- | :--- | :--- |
| **Requisitos de negócio** | Texto livre em linguagem natural | Registrar o problema, os objetivos do negócio, as necessidades da cliente e o valor esperado da solução. |
| **Requisitos de usuário** | Texto livre em linguagem natural com declarações curtas | Descrever de forma simples as necessidades e capacidades esperadas pelos usuários. |
| **Requisitos de usuário** | Lista de requisitos com declarações curtas | Organizar e identificar as necessidades dos usuários para priorização, rastreabilidade e acompanhamento no Backlog. |
| **Requisitos de produto** | Casos de uso detalhados | Descrever atores, objetivos, pré-condições, pós-condições, fluxo principal, fluxos alternativos, fluxos de exceção e regras de negócio. |
| **Requisitos de produto** | Critérios de aceitação | Definir as condições objetivas que devem ser verificadas para confirmar que o caso de uso foi implementado corretamente. |

---

## 5.3 Engenharia de Requisitos e o DSDM/Kanban

| Fases do Processo | Atividades ER | Prática / Técnica | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **Pré-projeto** | Elicitação e Descoberta | Entrevista semiestruturada com a cliente | Problema e necessidades iniciais identificados. |
| | Análise e Consenso | Análise de causa raiz (Ishikawa) e análise de efetividade e de escopo da ideia | Causas do problema mapeadas e público-alvo e escopo acordados com a cliente. |
| | Representação | Rich Picture e mapa de stakeholders | Contexto do problema e partes interessadas representados. |
| **Viabilidade** | Elicitação e Descoberta | Análise de soluções existentes | Soluções semelhantes comparadas e diferenciais identificados. |
| | Análise e Consenso | Análise de viabilidade técnica, análise de riscos, análise de custo/benefício e classificação em RF, RNF e RN | Capacidade técnica da equipe conhecida, riscos mapeados, fronteiras de escopo definidas e requisitos classificados. |
| | Declaração | Declaração em linguagem natural | Requisitos iniciais registrados com código e descrição. |
| **Fundamentos** | Elicitação e Descoberta | Workshop de apresentação dos requisitos às representantes | Requisitos conhecidos e comentados pelas representantes dos segmentos. |
| | Análise e Consenso | Priorização MoSCoW com matriz valor × esforço | Requisitos priorizados e MVP definido. |
| | Declaração | Casos de uso em formato breve | Requisitos *Must have* declarados como casos de uso vinculados aos RFs. |
| | Representação | Prototipação de baixa fidelidade | Wireframes das tarefas principais. |
| | Verificação e Validação | Revisão do escopo do MVP com a cliente e as representantes | Escopo do MVP validado. |
| | Organização e Atualização | Estruturação do backlog de requisitos por CP e caso de uso | Backlog organizado e matriz de rastreabilidade iniciada. |
| **Desenvolvimento Evolutivo** | Elicitação e Descoberta | Workshop facilitado, diário financeiro, entrevista contextual e questionário | Requisitos do timebox refinados e hábitos reais do público-alvo compreendidos. |
| | Análise e Consenso | Análise de tarefas e negociação e repriorização MoSCoW | Tarefas principais decompostas e prioridades do timebox acordadas com a cliente. |
| | Declaração | Casos de uso detalhados e critérios de aceitação | Casos de uso com fluxos e critérios verificáveis. |
| | Representação | Prototipação evolutiva | Protótipos de média fidelidade atualizados. |
| | Verificação e Validação | Inspeção com checklist DoR, avaliação cruzada, teste de protótipo com tarefas e revisão do incremento | Casos de uso prontos para desenvolvimento e requisitos revisados e validados pelos usuários. |
| | Organização e Atualização | Atualização do backlog e da matriz de rastreabilidade | Backlog e rastreabilidade coerentes com as decisões do timebox. |
| **Implantação** | Verificação e Validação | Teste de aceitação e verificação de cobertura pela matriz | Confirmação de que os requisitos *Must have* foram entregues e aceitos. |
| | Organização e Atualização | Consolidação da linha de base dos requisitos | Versão final dos requisitos registrada. |
| **Pós-projeto** | Elicitação e Descoberta | Questionário pós-implantação e entrevistas de acompanhamento | Novas necessidades identificadas a partir do uso. |
| | Análise e Consenso | Priorização MoSCoW e mapeamento de valor | Novos requisitos priorizados. |
| | Organização e Atualização | Registro no backlog de evolução e na matriz | Backlog de evolução atualizado. |

---

## 5.3 Elementos de Apoio que Não São Técnicas de ER

Os elementos abaixo participam do processo, mas não são técnicas de Engenharia de Requisitos. Eles foram retirados das atividades da seção 5.1 e classificados conforme sua natureza.

| Elemento | Classificação | Papel no processo |
| :--- | :--- | :--- |
| Texto livre | Forma de declaração | Forma usada na técnica de declaração em linguagem natural (Viabilidade). |
| Separação em RF, RNF e RN | Análise e classificação | Tratada como técnica de classificação dentro de Análise e Consenso. |
| Definição do MVP | Resultado da priorização | Decorre da priorização MoSCoW com a matriz valor × esforço. |
| Temas, épicos e histórias | Estrutura de declaração e organização | Substituídos por casos de uso como forma de declaração e pelo backlog de requisitos organizado por CP ([R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026)). |
| Quadro Kanban | Ferramenta de organização e acompanhamento | Mostra o andamento das atividades no GitHub Projects; não substitui a rastreabilidade (seção 5.4). |
| Definição das timeboxes | Planejamento do projeto | Definida no cronograma, fora das atividades de ER. |
| Critérios de aceitação | Condições para aceitação | Declarados junto a cada caso de uso e usados na validação do incremento. |
| Definition of Ready (DoR) | Critério de prontidão | Usada como checklist na inspeção dos requisitos. |
| Wireframes e protótipos | Representações produzidas | Resultado da técnica de prototipação. |
| Atualização do backlog | Prática de organização e atualização | Executada ao final de cada timebox. |
| Monitoramento de WIP | Prática de gestão do fluxo | Limite de WIP definido no cronograma (controle do fluxo). |
| Análise do desenvolvimento e organização | Gestão do projeto | Discutida nas reuniões de alinhamento da equipe. |
| Retrospectiva (discussões em grupo e análise de causas) | Melhoria do processo | Realizada ao final dos timeboxes e no Pós-projeto, fora das atividades de ER. |
| Documentação | Artefato | Substituída pela consolidação da linha de base dos requisitos na Implantação. |

---

## 5.4 Rastreabilidade dos Requisitos

A rastreabilidade liga cada requisito à sua origem e à sua validação, seguindo a cadeia:

**Problema → OE → CP → RF/RNF → caso de uso → critério de aceitação → incremento → validação**

Como a equipe adotou casos de uso em vez de histórias de usuário ([R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026)), o caso de uso ocupa na cadeia a posição da história.

| Elemento | Identificador | Onde é registrado | Vínculo com o elemento anterior |
| :--- | :--- | :--- | :--- |
| Problema | Seção 1.4 | [Cenário atual](cenario.md) | — |
| Objetivo Específico | OE1 a OE4 | [Solução proposta](solucao.md), seção 2.2 | Cada OE responde ao problema descrito na seção 1.4 |
| Característica de Produto | CP1 a CP8 | [Solução proposta](solucao.md), seção 2.3 | Colunas de contribuição principal e secundária |
| Requisito funcional | RFxx | [Requisitos Funcionais](requisitos_funcionais.md) | Coluna "Característica de Produto" |
| Requisito não funcional | RNFxx | [Requisitos Não Funcionais](requisitos_nao_funcionais.md) | Coluna "Aplica-se a", que indica os RFs ou o sistema inteiro |
| Caso de uso | UCxx | Backlog de requisitos (GitHub Project) | Cada caso de uso cita o RF de origem |
| Critério de aceitação | UCxx-CAy | Backlog de requisitos, junto ao caso de uso | Pertence a um caso de uso |
| Incremento | Timebox e pull request | Repositório | O pull request cita os casos de uso implementados |
| Validação | Data e registro da revisão | Ata da revisão do incremento ou do teste de aceitação | Registra o resultado de cada critério de aceitação |

Os vínculos de Problema até RF/RNF já estão registrados nas páginas indicadas. A partir dos casos de uso, os vínculos são consolidados em uma **matriz de rastreabilidade**, com uma linha por critério de aceitação e as colunas da cadeia acima.

**Regras de manutenção:**

- Nenhum RF é incluído sem uma CP associada, e nenhum caso de uso é incluído sem o RF de origem.
- Todo pull request cita os casos de uso que implementa.
- Toda mudança aprovada em ata é refletida no backlog e na matriz até o final do timebox.
- Leonardo mantém a matriz atualizada; na revisão de cada timebox, a equipe verifica se há RF sem CP, requisito *Must have* sem caso de uso, caso de uso sem critério de aceitação e critério de aceitação sem validação.

O quadro Kanban acompanha o fluxo de trabalho, mas não substitui a rastreabilidade: ele mostra em que etapa uma atividade está, e não de qual objetivo um requisito se origina nem como foi validado.

---

## 5.5 Registro das Decisões e Evidências de Execução

As decisões das atividades de ER são registradas em atas com os seguintes campos: data, participantes, pauta, decisões tomadas, requisitos afetados (por identificador) e pendências com responsável. As atas são aprovadas pela cliente no prazo definido na seção 7.2.

A tabela abaixo relaciona as atividades já realizadas às evidências correspondentes. Os registros R01 a R08 estão na página [Registros de Engenharia de Requisitos](registros.md).

| Data | Fase | Atividade | Evidência | Situação |
| :--- | :--- | :--- | :--- | :--- |
| 29/08/2026 | Pré-projeto | Entrevista com a cliente | [R01](registros.md#r01-reuniao-de-diagnostico-29082026) e transcrição da reunião | Registrada |
| 29/08/2026 | Pré-projeto | Análise de efetividade e de escopo da ideia | Decisões sobre público-alvo e escopo em [R01](registros.md#r01-reuniao-de-diagnostico-29082026) | Registrada |
| — | Pré-projeto | Análise de causa raiz | [Diagrama de Ishikawa](cenario.md#14-identificacao-da-oportunidade-ou-problema) | Registrada |
| — | Pré-projeto | Rich Picture e stakeholders | [Rich Picture](cenario.md#13-rich-picture) e [stakeholders](cenario.md#16-identificacao-dos-stakeholders) | Registrada |
| — | Pré-projeto | Investigação do problema | Fontes ou registros da investigação que embasou o Diagrama de Ishikawa | Sem registro |
| 04/09/2026 | Viabilidade | Análise de viabilidade técnica da equipe | Formulário de conhecimentos ([R02](registros.md#r02-reuniao-de-equipe-002-04092026)) | Registrada |
| — | Viabilidade | Análise de riscos | Lista de riscos | Sem registro |
| 17/09/2026 | Desenvolvimento Evolutivo — Timebox 1 | Workshop de refinamento com a cliente | [R03](registros.md#r03-reuniao-de-refinamento-com-a-cliente-17092026) | Registrada |
| 17/09/2026 a 08/10/2026 | Desenvolvimento Evolutivo — Timeboxes 1 e 2 | Análise de soluções existentes | [R03](registros.md#r03-reuniao-de-refinamento-com-a-cliente-17092026), [R05](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026), [R07](registros.md#r07-validacao-do-mvp-com-a-cliente-e-as-representantes-02102026) e [quadro comparativo](solucao.md) (seção 2.5) | Registrada |
| Anterior a 25/09/2026 | Desenvolvimento Evolutivo — Timebox 1 | Classificação e declaração dos requisitos | Primeira versão ([R04](registros.md#r04-primeira-versao-consolidada-dos-requisitos-anterior-a-25092026)) e versão atual ([Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md)) | Registrada |
| 25/09/2026 | Desenvolvimento Evolutivo — Timebox 2 | Workshop com as representantes e priorização do MVP | [R05](registros.md#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026), planilha de priorização e [Escopo do MVP](mvp.md) | Registrada |
| 30/09/2026 e 05/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Avaliação cruzada dos requisitos | Tabela de aceite e justificativa de cada feedback ([R06](registros.md#r06-reuniao-de-equipe-30092026), [R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026)) | Sem registro no site |
| 02/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Validação do escopo do MVP com a cliente e as representantes | [R07](registros.md#r07-validacao-do-mvp-com-a-cliente-e-as-representantes-02102026) | Registrada |
| 05/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Adoção de casos de uso como forma de declaração | [R08](registros.md#r08-reuniao-de-equipe-com-o-monitor-05102026) | Registrada |
