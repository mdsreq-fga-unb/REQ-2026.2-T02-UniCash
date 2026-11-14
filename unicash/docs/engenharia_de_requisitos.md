# 5 - ENGENHARIA DE REQUISITOS

O processo de Engenharia de Requisitos (ER) do UniCash é organizado em seis atividades, distribuídas pelas fases do DSDM:

1. **Elicitação e Descoberta:** obter necessidades, problemas e informações do domínio junto à cliente e aos usuários.
2. **Análise e Consenso:** analisar, classificar, negociar e priorizar os requisitos, chegando a decisões acordadas com a cliente.
3. **Declaração:** registrar os requisitos em uma forma definida (texto em linguagem natural, casos de uso e checklist estruturado).
4. **Representação:** produzir modelos e protótipos que tornem os requisitos compreensíveis para a equipe e para a cliente.
5. **Verificação e Validação:** verificar se os requisitos estão bem escritos e prontos, e validar se atendem às necessidades reais.
6. **Organização e Atualização:** manter o backlog e a rastreabilidade atualizados à medida que os requisitos mudam.

Nas tabelas a seguir, cada técnica informa os participantes e o critério de seleção, as entradas analisadas, o responsável e a forma de registro e de evidência. Ferramentas, artefatos e práticas de gestão do projeto que apoiam a ER, mas não são técnicas de ER, estão separados na seção 5.4.

**Participantes de referência:**

- **Cliente:** Leinad Santos França, idealizadora do produto e Embaixadora do Negócio.
- **Representantes dos segmentos:** Maria Vitória, representante dos estudantes, e Alana França, representante das famílias.
- **Usuários representativos:** pelo menos cinco estudantes universitários e três representantes de famílias em cada ciclo de validação relevante (seção 7.3). Os estudantes são selecionados entre graduandos que custeiam despesas próprias com renda limitada, com preferência por bolsistas. Os representantes de famílias são selecionados entre pessoas responsáveis pelo orçamento doméstico. Por orientação do professor, a validação também inclui pós-graduandos, indicados pela cliente ([R03](atas/posts/r03.md)). O recrutamento é feito por meio da cliente e das representantes dos segmentos.
- **Equipe:** os papéis de cada integrante estão descritos na [seção 7.1 — Composição da Equipe](interacao.md#71-composição-da-equipe).

---

## 5.1 Atividades e Técnicas de ER e DSDM/Kanban

### **Pré-projeto**

Objetivo: compreender o problema e decidir se a ideia deve seguir para o estudo de viabilidade.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Entrevista semiestruturada | Leinad Santos França (uma entrevista) | Ideia inicial do produto e contexto da cliente | Natan (condução) e Bruno (perguntas e transcrição) | Transcrição e registro da reunião de diagnóstico ([R01](atas/posts/r01.md)); descrição do problema (seção 1.4) |
| Análise e Consenso | Análise de causa raiz com Diagrama de Ishikawa (6M) | Equipe, com revisão da cliente | Problemas relatados na reunião de diagnóstico | Erick e Evellyn | Diagrama de Ishikawa (seção 1.4) |
| Análise e Consenso | Análise de efetividade e de escopo da ideia | Equipe e cliente | Problema, público-alvo e propostas levantadas na entrevista | Natan (Visionário) | Decisões sobre público-alvo e escopo, como o descarte da recomendação de investimentos ([R01](atas/posts/r01.md)) |
| Representação | Rich Picture e mapa de stakeholders | Equipe | Registro da reunião de diagnóstico e Diagrama de Ishikawa | Erick e Evellyn | Rich Picture (seção 1.3); stakeholders (seção 1.6) |

---

### **Viabilidade**

Objetivo: delimitar o escopo preliminar e avaliar se a equipe consegue entregá-lo no semestre.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Análise de soluções existentes | Equipe | Aplicativos de finanças pessoais gratuitos, pagos e open-source (como Minhas Economias, Securo, Monekin e Parsa) | Dante | Quadro comparativo (seção 2.5); discussões em [R03](atas/posts/r03.md), [R05](atas/posts/r05.md) e [R07](atas/posts/r07.md) |
| Análise e Consenso | Análise de viabilidade técnica da equipe | Sete integrantes da equipe | Respostas ao formulário de conhecimentos técnicos de cada integrante | Bruno (formulário) e Caio (Coordenador Técnico) | Formulário de conhecimentos ([R02](atas/posts/r02.md)) |
| Análise e Consenso | Análise de riscos | Equipe; Caio para os riscos técnicos | Lista preliminar de necessidades e restrições de escopo | Leonardo (Gerenciador de Timebox) e Caio (Coordenador Técnico) | Lista de riscos com probabilidade, impacto e ação de mitigação ([Riscos do projeto](riscos.md), registrada em 14/11/2026) |
| Análise e Consenso | Análise de custo/benefício por Característica de Produto | Equipe e cliente | CPs preliminares e riscos | Natan (Visionário) | Fronteiras de escopo (seção 2.6) |
| Análise e Consenso | Classificação dos requisitos em RF, RNF (URPS+ e Sommerville) e RN | Equipe | Lista preliminar de necessidades | Leonardo | Requisitos classificados nas páginas de requisitos funcionais e não funcionais |
| Declaração | Declaração em linguagem natural, com código e descrição de cada requisito | Equipe | Requisitos classificados | Leonardo; revisão de Erick e Evellyn | [Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md) |

---

### **Fundamentos**

Objetivo: priorizar os requisitos, definir o MVP e preparar o backlog.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Workshop de apresentação dos requisitos às representantes dos segmentos | Leinad e Maria Vitória; Alana França informada depois | Lista de requisitos ([R04](atas/posts/r04.md)) | Natan | Contribuições registradas em [R05](atas/posts/r05.md) |
| Análise e Consenso | Priorização MoSCoW com matriz valor de negócio × esforço técnico | Leinad, Maria Vitória e Alana França para o valor de negócio, com nota de 1 a 4 e justificativa; integrantes da equipe para o esforço técnico | RF01 a RF56 | Natan (planilha) e Erick (Campeão do Produto) | Planilha de priorização ([R05](atas/posts/r05.md)); MVP definido como resultado ([Escopo do MVP](mvp.md)) |
| Declaração | Casos de uso em formato breve | Equipe | RFs priorizados como *Must have* | Leonardo | [Casos de uso](casos_de_uso.md) UC01 a UC09, escritos nos Timeboxes 3 e 4; decisão de adotar casos de uso em [R08](atas/posts/r08.md) |
| Representação | Prototipação de baixa fidelidade | Bruno; revisão da cliente | Casos de uso e decisões registradas com a cliente | Bruno | Wireframes no Figma, publicados na [página inicial](index.md#wireframes); data e validação com a cliente sem registro |
| Verificação e Validação | Revisão do escopo do MVP com a cliente e as representantes | Leinad, Maria Vitória e Alana França | MVP e documentação publicada | Natan | Escopo validado e ajustes registrados em [R07](atas/posts/r07.md) |
| Organização e Atualização | Estruturação do backlog de requisitos por CP e caso de uso | Equipe | Casos de uso e CPs | Leonardo | Backlog de requisitos em um GitHub Project separado do Kanban de atividades ([R08](atas/posts/r08.md)); matriz de rastreabilidade (seção 5.5), com versão resumida no [Escopo do MVP](mvp.md#2-matriz-de-rastreabilidade-resumida) e matriz detalhada iniciada por caso de uso na seção 5.5, ainda sem checklist, incremento e validação |

---

### **Desenvolvimento Evolutivo**

Objetivo: refinar, validar e entregar os requisitos de cada timebox. As técnicas abaixo se repetem a cada timebox, exceto o diário financeiro, a entrevista contextual e a análise de tarefas, aplicados uma vez antes dos testes de protótipo.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Elicitação e Descoberta | Workshop facilitado de início de timebox | Equipe, cliente e representantes dos segmentos ligados aos CPs do timebox | Itens do backlog selecionados e feedback do timebox anterior | Bruno (Facilitador) e Leonardo | Ata com decisões e requisitos afetados (exemplo: [R03](atas/posts/r03.md)) |
| Elicitação e Descoberta | Diário financeiro, aplicado uma vez | Cinco estudantes e três representantes de famílias, durante sete dias | Formulário diário com gasto, categoria, forma de registro usada e dificuldade encontrada | Leonardo; recrutamento pela cliente e pelas representantes dos segmentos | Diários consolidados; padrões de gasto e dificuldades associados a RFs e RNFs |
| Elicitação e Descoberta | Entrevista contextual | Dois estudantes e um representante de família, escolhidos entre os participantes do diário | Observação de como o participante registra e consulta suas finanças hoje (planilha, caderno ou aplicativo) | Leonardo e Bruno | Notas de observação; lista das tarefas realizadas atualmente |
| Elicitação e Descoberta | Questionário | Estudantes e famílias recrutados pelas representantes dos segmentos | Dúvidas em aberto sobre os requisitos do timebox | Leonardo | Respostas consolidadas e requisitos ajustados |
| Análise e Consenso | Análise de tarefas | Equipe | Diários e notas das entrevistas contextuais | Bruno | Decomposição das tarefas principais (registrar despesa, consultar saldo do mês, acompanhar meta), usada nos casos de uso, nos protótipos e no roteiro do teste de protótipo |
| Análise e Consenso | Negociação e repriorização MoSCoW | Cliente e equipe | Feedback, respostas do questionário e capacidade do timebox | Erick e Leonardo | Prioridades atualizadas e registradas na ata |
| Declaração | Casos de uso detalhados (fluxo principal, fluxos alternativos, pré e pós-condições) e checklist estruturado | Leonardo, com a cliente e as representantes para definir os dados de cada funcionalidade | Casos de uso breves selecionados para o timebox | Leonardo | Casos de uso detalhados e checklist com identificador, vinculados ao caso de uso |
| Representação | Prototipação evolutiva (média fidelidade) | Bruno; consenso das telas com a cliente e as representantes conduzido por Dante | Casos de uso, checklist estruturado e resultados dos testes de protótipo | Bruno e Dante | Protótipos versionados no Figma |
| Verificação e Validação | Inspeção dos requisitos com checklist da Definition of Ready (DoR) | Toda a equipe técnica | Casos de uso e checklist estruturado | Evellyn | Checklist preenchido; caso de uso marcado como pronto |
| Verificação e Validação | Avaliação cruzada dos requisitos por outra equipe da disciplina | Equipe revisora externa; revisores internos Caio, Dante, Evellyn e Erick | Páginas de requisitos | Revisores internos | Tabela com cada feedback, decisão de aceite e justificativa ([R06](atas/posts/r06.md), [R08](atas/posts/r08.md)) |
| Verificação e Validação | Teste de protótipo com tarefas específicas | Cinco estudantes e três representantes de famílias | Roteiro de tarefas, como "registre uma despesa de xerox", "descubra quanto sobrou no mês" e "crie uma meta de reserva" | Bruno (condução) e Leonardo (observação) | Taxa de conclusão, erros e comentários por tarefa; ajustes nos requisitos |
| Verificação e Validação | Revisão do incremento (*Timebox Review/Demo*) | Cliente e usuários representativos | Incremento entregue e checklist estruturado | Equipe | Registro do resultado de cada item do checklist |
| Organização e Atualização | Atualização do backlog e da matriz de rastreabilidade | Leonardo | Atas, resultados de validação e mudanças aprovadas | Leonardo; divulgação por Dante | Backlog e matriz atualizados, com histórico das mudanças |

---

### **Implantação**

Objetivo: confirmar que o MVP atende aos requisitos priorizados e consolidar a versão final dos requisitos.

| Atividade de ER | Técnica | Participantes | Entradas analisadas | Responsável | Registro e evidência |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Verificação e Validação | Verificação final com checklist estruturado | Cliente e representantes dos segmentos | Checklist estruturado de todos os casos de uso *Must have* | Equipe | Registro do resultado de cada item do checklist |
| Verificação e Validação | Verificação de cobertura pela matriz de rastreabilidade | Leonardo e Natan | Matriz de rastreabilidade | Leonardo | Confirmação de que todo requisito *Must have* tem caso de uso, checklist, incremento e validação |
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
| **Requisitos de produto** | Checklist estruturado | Organizar as condições objetivas, regras, resultados esperados e evidências que devem ser verificados para confirmar que o caso de uso foi implementado corretamente. |

O checklist estruturado de cada caso de uso deve conter, no mínimo, identificador, item verificável, resultado esperado, evidência, responsável pela verificação e situação (*pendente*, *atendido* ou *não atendido*).

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
| | Declaração | Casos de uso detalhados e checklist estruturado | Casos de uso com fluxos e itens verificáveis organizados em checklist. |
| | Representação | Prototipação evolutiva | Protótipos de média fidelidade atualizados. |
| | Verificação e Validação | Inspeção com checklist DoR, avaliação cruzada, teste de protótipo com tarefas e revisão do incremento | Casos de uso prontos para desenvolvimento e requisitos revisados e validados pelos usuários. |
| | Organização e Atualização | Atualização do backlog e da matriz de rastreabilidade | Backlog e rastreabilidade coerentes com as decisões do timebox. |
| **Implantação** | Verificação e Validação | Teste de aceitação e verificação de cobertura pela matriz | Confirmação de que os requisitos *Must have* foram entregues e aceitos. |
| | Organização e Atualização | Consolidação da linha de base dos requisitos | Versão final dos requisitos registrada. |
| **Pós-projeto** | Elicitação e Descoberta | Questionário pós-implantação e entrevistas de acompanhamento | Novas necessidades identificadas a partir do uso. |
| | Análise e Consenso | Priorização MoSCoW e mapeamento de valor | Novos requisitos priorizados. |
| | Organização e Atualização | Registro no backlog de evolução e na matriz | Backlog de evolução atualizado. |

---

## 5.4 Elementos de Apoio que Não São Técnicas de ER

Os elementos abaixo participam do processo, mas não são técnicas de Engenharia de Requisitos. Eles foram retirados das atividades da seção 5.1 e classificados conforme sua natureza.

| Elemento | Classificação | Papel no processo |
| :--- | :--- | :--- |
| Texto livre | Forma de declaração | Forma usada na técnica de declaração em linguagem natural (Viabilidade). |
| Separação em RF, RNF e RN | Análise e classificação | Tratada como técnica de classificação dentro de Análise e Consenso. |
| Definição do MVP | Resultado da priorização | Decorre da priorização MoSCoW com a matriz valor × esforço. |
| Temas, épicos e histórias | Estrutura de declaração e organização | Substituídos por casos de uso como forma de declaração e pelo backlog de requisitos organizado por CP ([R08](atas/posts/r08.md)). |
| Quadro Kanban | Ferramenta de organização e acompanhamento | Mostra o andamento das atividades no [GitHub Projects](https://github.com/orgs/mdsreq-fga-unb/projects/123/views/6); não substitui a rastreabilidade (seção 5.5). |
| Definição das timeboxes | Planejamento do projeto | Definida no cronograma, fora das atividades de ER. |
| Checklist estruturado | Verificação das condições do caso de uso | Declarado junto a cada caso de uso e usado na validação do incremento. |
| Definition of Ready (DoR) | Critério de prontidão | Usada como checklist na inspeção dos requisitos. |
| Wireframes e protótipos | Representações produzidas | Resultado da técnica de prototipação. |
| Atualização do backlog | Prática de organização e atualização | Executada ao final de cada timebox. |
| Monitoramento de WIP | Prática de gestão do fluxo | Limite de WIP definido no cronograma (controle do fluxo). |
| Análise do desenvolvimento e organização | Gestão do projeto | Discutida nas reuniões de alinhamento da equipe. |
| Retrospectiva (discussões em grupo e análise de causas) | Melhoria do processo | Realizada ao final dos timeboxes e no Pós-projeto, fora das atividades de ER. |
| Documentação | Artefato | Substituída pela consolidação da linha de base dos requisitos na Implantação. |

---

## 5.5 Rastreabilidade dos Requisitos

A rastreabilidade permite identificar a necessidade que justifica cada requisito, os objetivos para os quais ele contribui e as evidências de sua implementação e validação. A cadeia de referência é:

**Problema → Objetivo Geral (OG) → Objetivos Específicos (OE) → Características de Produto (CP) → RF/RNF → caso de uso → checklist estruturado → incremento → validação**

O objetivo geral expressa a resposta pretendida ao problema; os objetivos específicos desdobram esse objetivo em contribuições mais delimitadas. As CPs indicam as capacidades do produto que apoiam esses objetivos, e os RFs descrevem os comportamentos associados a cada capacidade. Os RNFs qualificam os RFs indicados no catálogo ou estabelecem propriedades e restrições transversais ao sistema. Portanto, um RNF transversal não precisa ter uma única CP de origem nem um caso de uso exclusivo.

Como a equipe adotou casos de uso em vez de histórias de usuário ([R08](atas/posts/r08.md)), o caso de uso ocupa na cadeia a posição da história.

| Elemento | Identificador ou referência | Onde é registrado | Relação de rastreabilidade |
| :--- | :--- | :--- | :--- |
| Problema | Seção 1.4 | [Cenário atual](cenario.md#14-identificacao-da-oportunidade-ou-problema) | Descreve as dificuldades de organização, registro e acompanhamento financeiro que motivam o produto. |
| Objetivo Geral | OG — referência à seção 2.1 | [Solução proposta](solucao.md#21-objetivo-geral-do-produto) | Responde ao problema com a proposta de auxiliar estudantes, famílias e demais usuários a organizar receitas, despesas e metas financeiras. |
| Objetivo Específico | OE1 a OE4 | [Solução proposta](solucao.md#22-objetivos-especificos-oe-do-produto) | Desdobra o objetivo geral em registro e acompanhamento, planejamento, compreensão das informações e incentivo à organização financeira. |
| Característica de Produto | CP1 a CP8 | [Solução proposta](solucao.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos-do-produto) | As colunas de contribuição principal e secundária indicam os OEs apoiados por cada CP. O estado de validação desses vínculos está na subseção "Estado de validação dos vínculos com os objetivos". |
| Requisito funcional | RFxx | [Requisitos Funcionais](requisitos_funcionais.md) | A coluna **Característica de Produto** identifica a CP de origem. |
| Requisito não funcional | RNFxx | [Requisitos Não Funcionais](requisitos_nao_funcionais.md) | A coluna **Aplica-se a** identifica os RFs qualificados ou a aplicação transversal ao sistema, com suas exceções. |
| Caso de uso | UCxx | [Casos de uso](casos_de_uso.md) e [backlog de casos de uso](https://github.com/orgs/mdsreq-fga-unb/projects/130) | Identifica os RFs atendidos, os requisitos relacionados, os RNFs e as regras que condicionam os fluxos. |
| Checklist estruturado | UCxx-CKy, conforme o padrão previsto | Backlog de requisitos, junto ao caso de uso | Deve identificar o item verificável, o resultado esperado, a evidência e o requisito avaliado. A identificação e a cobertura completas ainda precisam ser consolidadas. |
| Incremento | Timebox, pull request e versão | Repositório | Deve identificar os casos de uso e itens do checklist implementados, com referência ao código e aos testes correspondentes. |
| Validação | Data, versão avaliada e registro da revisão | Ata da revisão do incremento ou da verificação final | Deve registrar o resultado por item do checklist, a evidência e os participantes, distinguindo atendimento, não atendimento e pendência. |

### Vínculos já disponíveis

Os vínculos estão distribuídos entre os documentos de origem e a consulta do site:

- **Problema, OG e OEs:** o problema está na seção 1.4 do Cenário; o objetivo geral e seus desdobramentos estão nas seções 2.1 e 2.2 da Solução Proposta.
- **OE → CP:** a seção 2.3 da Solução Proposta registra a contribuição principal e secundária de cada CP. A existência desse vínculo documentado não substitui a confirmação com a cliente: os vínculos de CP7 e CP8 estão documentados, mas pendentes de confirmação (ver "Estado de validação dos vínculos com os objetivos").
- **CP → RF e RF ↔ RNF:** as tabelas dos catálogos registram as associações. A [matriz resumida do MVP](mvp.md#2-matriz-de-rastreabilidade-resumida) organiza as relações RF–RNF do recorte selecionado.
- **Casos de uso → requisitos:** UC01 a UC09 estão publicados, com fluxos e referências a requisitos e regras. Essa publicação não comprova, por si só, cobertura de todos os RFs do MVP, implementação ou aceite; a cobertura por caso de uso está na subseção "Matriz detalhada por caso de uso".
- **Consulta dos vínculos:** o [catálogo](consulta/index.md) e o [grafo de rastreabilidade](consulta/rastreabilidade.md) apresentam relações extraídas dos documentos. As páginas individuais permitem consultar CPs, RFs, RNFs, regras e casos de uso relacionados. Os vínculos com objetivos continuam registrados na Solução Proposta; não se presume que toda a cadeia esteja representada no grafo.

**Exemplo de percurso já documentado:** a dificuldade de registrar e acompanhar as finanças (Cenário, seção 1.4) motiva o objetivo geral de organização financeira (Solução, seção 2.1). O OE1 desdobra esse objetivo ao tratar do registro e acompanhamento de receitas e despesas. A CP1 contribui principalmente para OE1 e secundariamente para OE3. O RF07 - Registrar receita pertence à CP1 e é detalhado no fluxo de registro da UC01 — Gerenciar receitas. Entre os RNFs específicos associados ao RF07 estão RNF04 (validação dos campos), RNF05 (integridade da operação) e RNF35 (durabilidade local). Esse percurso pode ser conferido nas fontes indicadas e no [catálogo de consulta](consulta/index.md).

### Estado de validação dos vínculos com os objetivos

Os vínculos entre CP e OE são propostas da equipe registradas na Solução Proposta (seção 2.3). Um vínculo só passa a "Confirmado" quando uma ata registra a confirmação pela cliente.

| CP | OE principal | OE secundário | Onde está documentado | Estado de validação | Evidência de validação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| CP7 — Colaboração em grupo de amigos ou família | OE4 | OE2 | [Solução proposta, seção 2.3](solucao.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos-do-produto) | **Proposto: pendente de confirmação pela cliente** | Nenhuma. A [R07](atas/posts/r07.md) registra apenas que os grupos ficam fora do MVP e não confirma o vínculo. |
| CP8 — Engajamento e incentivo ao cumprimento de metas | OE4 | OE2 | [Solução proposta, seção 2.3](solucao.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos-do-produto) | **Proposto: pendente de confirmação pela cliente** | Nenhuma. |

Os vínculos de CP1 a CP6 não constam entre os pontos pendentes de validação da página de [Requisitos Funcionais](requisitos_funcionais.md#pontos-para-validacao).

### Matriz detalhada por caso de uso

A matriz detalhada prevista terá uma linha por item do checklist estruturado. Como os identificadores UCxx-CKy ainda não foram publicados, esta versão inicial está organizada por caso de uso e passa a ser por item do checklist quando eles existirem. O OG (seção 2.1 da Solução Proposta) é comum a todas as linhas. A coluna CP → OE segue a seção 2.3 da Solução Proposta. O termo *pendente* indica que não há registro.

| UC | Item do backlog | RFs atendidos | CP → OE principal | Checklist | Incremento | Testes | Validação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [UC01 — Gerenciar receitas](casos_de_uso.md#uc01-gerenciar-receitas) | [#28](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/28) | RF07, RF08, RF09, RF10 | CP1 → OE1 | pendente | vinculado ao #48, em desenvolvimento | pendente | pendente |
| [UC02 — Gerenciar despesas](casos_de_uso.md#uc02-gerenciar-despesas) | [#29](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/29) | RF15, RF16, RF17, RF18 | CP1 → OE1 | pendente | pendente | pendente | pendente |
| [UC03 — Consultar resumo financeiro](casos_de_uso.md#uc03-consultar-resumo-financeiro) | [#30](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/30) | RF11, RF40 | CP4 → OE3 | pendente | pendente | pendente | pendente |
| [UC04 — Gerenciar saldo mensal](casos_de_uso.md#uc04-gerenciar-saldo-mensal) | [#31](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/31) | RF34, RF35 | CP4 → OE3 | pendente | pendente | pendente | pendente |
| [UC05 — Monitorar limites de gastos](casos_de_uso.md#uc05-monitorar-limites-de-gastos) | [#32](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/32) | RF37, RF38 | CP3 → OE2 | pendente | pendente | pendente | pendente |
| [UC06 — Gerenciar categorias](casos_de_uso.md#uc06-gerenciar-categorias) | [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/43) | RF19; RF65, RF66 e RF67 (propostos) | CP2 → OE2 | pendente | pendente | pendente | pendente |
| [UC07 — Consultar evolução mensal](casos_de_uso.md#uc07-consultar-evolucao-mensal) | [#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/44) | RF68 (não consta no catálogo) | sem vínculo | pendente | pendente | pendente | pendente |
| [UC08 — Gerenciar saldo inicial](casos_de_uso.md#uc08-gerenciar-saldo-inicial) | [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/45) | RF35 | CP4 → OE3 | pendente | pendente | pendente | pendente |
| [UC09 — Monitorar consumo por categoria](casos_de_uso.md#uc09-monitorar-consumo-por-categoria) | [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/46) | RF39 | CP3 → OE2 | pendente | pendente | pendente | pendente |

**RFs do recorte do MVP sem caso de uso:** os requisitos abaixo constam no [Escopo do MVP](mvp.md), mas nenhum caso de uso os declara como requisito atendido. Seus vínculos com caso de uso, checklist, incremento e validação estão pendentes.

- Metas: RF12, RF13, RF14, RF20 e RF36.
- Lançamentos recorrentes: RF32 e RF33.
- Gráfico e percentual por categoria: RF41 e RF42.
- Gamificação: RF44, RF45 e RF46.
- Tutorial, preferências de notificação e registro sem conexão: RF55, RF58 e RF59.
- Conta e acesso (fluxos condicionais): RF01 a RF06 e RF31.

**Pendências de rastreabilidade registradas:**

- O UC07 cita o RF68, que não consta no catálogo de requisitos funcionais.
- O UC08 usa o RF35 para a definição do saldo inicial, mas o RF35 descreve apenas a exibição do saldo do mês anterior.
- Os checklists estruturados (UCxx-CKy) ainda não foram publicados para nenhum caso de uso.
- Nenhum caso de uso tem registro de teste ou de validação com a cliente.

### Continuidade até a implementação e a validação

Os casos de uso UC01 a UC09 já existem e a matriz detalhada foi iniciada por caso de uso; a consolidação da rastreabilidade por item do checklist, incremento, testes e validação permanece parcial.

Quando não houver critério identificado, implementação ou validação registrada, o campo correspondente deve indicar a pendência. Relações no catálogo, checklists de prontidão e inclusão no MVP não equivalem à entrega. A prontidão é avaliada pela [Definition of Ready](dor_dod.md), com registros em [Evidências da DoR](evidencias_dor.md); a conclusão e o aceite dependem das evidências previstas na Definition of Done.

**Regras de manutenção:**

- Manter o OG e os OEs coerentes com o problema e conferir os vínculos OE–CP quando os objetivos ou o escopo mudarem.
- Alterar o estado de validação de um vínculo OE–CP para "Confirmado" somente com registro em ata.
- Nenhum RF é incluído sem uma CP associada, e nenhum caso de uso é incluído sem os RFs que atende.
- Manter as associações RF–RNF coerentes com a coluna **Aplica-se a**, preservando as exceções, a situação dos requisitos e os códigos retirados.
- Todo pull request que implementa funcionalidades cita os casos de uso e os itens do checklist atendidos, com as evidências de teste correspondentes.
- Toda mudança aprovada em ata é refletida no backlog e nos documentos de origem até o final do timebox, para que a consulta gerada acompanhe as alterações.
- Leonardo mantém a matriz detalhada atualizada; na revisão de cada timebox, a equipe verifica se há RF sem CP, requisito *Must have* sem caso de uso, caso de uso sem checklist estruturado e item do checklist sem evidência de implementação ou validação, registrando as pendências.

O quadro Kanban acompanha o fluxo de trabalho, mas não substitui a rastreabilidade: ele mostra em que etapa uma atividade está, e não de qual objetivo um requisito se origina nem como foi validado.

---

## 5.6 Registro das Decisões e Evidências de Execução

As decisões das atividades de ER são registradas em atas com os seguintes campos: data, participantes, pauta, decisões tomadas, requisitos afetados (por identificador) e pendências com responsável. As atas são aprovadas pela cliente no prazo definido na seção 7.2.

A seção 5.1 descreve o processo planejado, organizado pelas fases do DSDM. A coluna "Fase" da tabela abaixo indica quando cada atividade foi de fato executada, conforme os registros. Por isso, atividades previstas para Viabilidade e Fundamentos (como a análise de soluções existentes, a classificação dos requisitos e a priorização do MVP) aparecem aqui nos Timeboxes 1 e 2 do Desenvolvimento Evolutivo.

A tabela relaciona cada atividade à sua evidência e à sua situação, incluindo as atividades previstas que ainda não foram executadas. Os registros R01 a R08 estão na página [Registros de Engenharia de Requisitos](atas/index.md). As decisões que mudaram o escopo, os requisitos, o processo ou a arquitetura estão consolidadas no [Registro de decisões](decisoes.md), com origem, motivo, requisitos afetados e comunicação.

| Situação | Significado |
| :--- | :--- |
| **Registrada** | A atividade foi realizada e há evidência no repositório ou em documento vinculado. |
| **Parcial** | A atividade foi iniciada e parte da evidência está pendente. |
| **Prevista** | A atividade consta no [cronograma](cronograma.md) com data futura e ainda não foi executada. Quando uma atividade for reprogramada, a linha indicará a data original e a nova. |
| **Não aplicada** | A técnica ainda não foi aplicada; a linha indica a data prevista. |
| **Sem registro** | A atividade foi realizada ou é esperada, mas a evidência ainda não foi localizada. |

| Data | Fase | Atividade | Evidência | Situação |
| :--- | :--- | :--- | :--- | :--- |
| 29/08/2026 | Pré-projeto | Entrevista com a cliente | [R01](atas/posts/r01.md) e transcrição da reunião | Registrada |
| 29/08/2026 | Pré-projeto | Análise de efetividade e de escopo da ideia | Decisões sobre público-alvo e escopo em [R01](atas/posts/r01.md) | Registrada |
| — | Pré-projeto | Análise de causa raiz | [Diagrama de Ishikawa](cenario.md#14-identificacao-da-oportunidade-ou-problema) | Registrada |
| — | Pré-projeto | Rich Picture e stakeholders | [Rich Picture](cenario.md#13-rich-picture) e [stakeholders](cenario.md#16-identificacao-dos-stakeholders) | Registrada |
| 29/08/2026 a 01/09/2026 | Pré-projeto | Investigação do problema | Reunião de diagnóstico com a cliente, registrada em [R01](atas/posts/r01.md); perguntas à cliente em reunião no dia 01/09/2026, com [gravação e transcrição no Teams](https://teams.cloud.microsoft/l/meetingrecap?driveId=b%21gVRg82qYskS7W_wygN91oGGhi9q0mmJMhQjNs7iR7diB_7vy5dgSSoHTePCaxco4&driveItemId=01ZK2KMNXJKRPQIAGZBNAYKLKYTVUO6QEI&sitePath=https%3A%2F%2Funbbr-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2F241011537_aluno_unb_br%2FIQDpVF8EANkLQYUtWJ1o70CIAdqAO5zFA2PzaBYolgqdmsI&fileUrl=https%3A%2F%2Funbbr-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2F241011537_aluno_unb_br%2FIQDpVF8EANkLQYUtWJ1o70CIAdqAO5zFA2PzaBYolgqdmsI&iCalUid=040000008200E00074C5B7101A82E008000000009F5C622BE037DD0100000000000000001000000046EA848989653F4882C0E984157E514B&threadId=19%3Ameeting_NzhiZWFmZDAtMDRiZC00N2ZhLTk4MWUtNzRiYzVlODM3NjQ0%40thread.v2&organizerId=04cecbca-018a-4e0d-8207-bb52dde662a3&tenantId=ec359ba1-630b-4d2b-b833-c8e6d48f8059&callId=5cac79b0-67c0-4973-9dff-f1c576f65ea3&threadType=Meeting&meetingType=Scheduled&subType=RecapSharingLink_RecapChiclet&recapType=ODSPTranscript) (acesso restrito a integrantes da UnB); e matéria de referência sobre o recorde de dívidas judicializadas ([G1, 31/08/2026](https://g1.globo.com/economia/noticia/2026/08/31/judicializacao-de-dividas-recorde.ghtml)), que embasaram o Diagrama de Ishikawa | Registrada |
| 04/09/2026 | Viabilidade | Análise de viabilidade técnica da equipe | Formulário de conhecimentos ([R02](atas/posts/r02.md)) | Registrada |
| — | Viabilidade | Análise de riscos | Lista de riscos | Registrada fora do período, em 14/11/2026: [Riscos do projeto](riscos.md) |
| 17/09/2026 | Desenvolvimento Evolutivo — Timebox 1 | Workshop de refinamento com a cliente | [R03](atas/posts/r03.md) | Registrada |
| 17/09/2026 a 08/10/2026 | Desenvolvimento Evolutivo — Timeboxes 1 e 2 | Análise de soluções existentes | [R03](atas/posts/r03.md), [R05](atas/posts/r05.md), [R07](atas/posts/r07.md) e [quadro comparativo](solucao.md) (seção 2.5) | Registrada |
| Anterior a 25/09/2026 | Desenvolvimento Evolutivo — Timebox 1 | Classificação e declaração dos requisitos | Primeira versão ([R04](atas/posts/r04.md)) e versão atual ([Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md)) | Registrada |
| 25/09/2026 | Desenvolvimento Evolutivo — Timebox 2 | Workshop com as representantes e priorização do MVP | [R05](atas/posts/r05.md), planilha de priorização e [Escopo do MVP](mvp.md) | Registrada |
| 30/09/2026 e 05/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Avaliação cruzada dos requisitos | [Planilha de feedback do grupo Cybersetor](requisitos_funcionais.md#feedback-do-grupo-cybersetor), com cada feedback, decisão de aceite e justificativa; discussões em [R06](atas/posts/r06.md) e [R08](atas/posts/r08.md) | Registrada |
| 02/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Validação do escopo do MVP com a cliente e as representantes | [R07](atas/posts/r07.md) | Registrada |
| 05/10/2026 | Desenvolvimento Evolutivo — Timebox 2 | Adoção de casos de uso, com checklist estruturado, como forma de declaração | [R08](atas/posts/r08.md) | Registrada |
| 29/10/2026 e 30/10/2026 | Desenvolvimento Evolutivo — Timeboxes 3 e 4 | Decisão da stack e da sincronização | [D18](decisoes.md#d18), [D19](decisoes.md#d19) e [PR #34](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/34) | Registrada; comunicação à cliente sem registro |
| 27/10/2026 a 01/11/2026 | Desenvolvimento Evolutivo — Timeboxes 3 e 4 | Casos de uso | UC01 a UC09 em [Casos de uso](casos_de_uso.md); UC06 a UC09 sem data no histórico de versões | Registrada |
| 04/11/2026 | Desenvolvimento Evolutivo — Timebox 4 | Matriz de rastreabilidade (versão inicial) | Matriz RF–RNF resumida no [Escopo do MVP](mvp.md#2-matriz-de-rastreabilidade-resumida); matriz detalhada por caso de uso na seção 5.5, ainda sem checklist, incremento, testes e validação | Parcial |
| — | Desenvolvimento Evolutivo — Timebox 4 | Confirmação com a cliente dos vínculos CP7 e CP8 com os objetivos | Seção 5.5, "Estado de validação dos vínculos com os objetivos" | Sem registro |
| Até 31/10/2026 | Não identificada | Prototipação de baixa fidelidade | Wireframes no Figma, publicados na [página inicial](index.md#wireframes), que ganharam seção própria em 31/10/2026; sem ata de validação com a cliente | Registrada |
| 01/09/2026 | Viabilidade | Perguntas à cliente em reunião | [Gravação e transcrição no Teams](https://teams.cloud.microsoft/l/meetingrecap?driveId=b%21gVRg82qYskS7W_wygN91oGGhi9q0mmJMhQjNs7iR7diB_7vy5dgSSoHTePCaxco4&driveItemId=01ZK2KMNXJKRPQIAGZBNAYKLKYTVUO6QEI&sitePath=https%3A%2F%2Funbbr-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2F241011537_aluno_unb_br%2FIQDpVF8EANkLQYUtWJ1o70CIAdqAO5zFA2PzaBYolgqdmsI&fileUrl=https%3A%2F%2Funbbr-my.sharepoint.com%2F%3Av%3A%2Fg%2Fpersonal%2F241011537_aluno_unb_br%2FIQDpVF8EANkLQYUtWJ1o70CIAdqAO5zFA2PzaBYolgqdmsI&iCalUid=040000008200E00074C5B7101A82E008000000009F5C622BE037DD0100000000000000001000000046EA848989653F4882C0E984157E514B&threadId=19%3Ameeting_NzhiZWFmZDAtMDRiZC00N2ZhLTk4MWUtNzRiYzVlODM3NjQ0%40thread.v2&organizerId=04cecbca-018a-4e0d-8207-bb52dde662a3&tenantId=ec359ba1-630b-4d2b-b833-c8e6d48f8059&callId=5cac79b0-67c0-4973-9dff-f1c576f65ea3&threadType=Meeting&meetingType=Scheduled&subType=RecapSharingLink_RecapChiclet&recapType=ODSPTranscript) (acesso restrito a integrantes da UnB); as dúvidas foram esclarecidas em reunião, sem questionário estruturado | Registrada |
| — | Desenvolvimento Evolutivo | Questionário | Nenhum questionário estruturado foi aplicado; as perguntas foram feitas em reunião em 01/09/2026 (linha anterior), portanto não há respostas consolidadas a registrar. Data prevista: a definir na repriorização de 13/11/2026 a 19/11/2026 ([cronograma](cronograma.md)) | Não aplicada |
| 13/11/2026 a 19/11/2026 | Desenvolvimento Evolutivo | Diário financeiro | [Cronograma](cronograma.md); atividade pendente, sem execução registrada e sem reprogramação | Prevista |
| 24/11/2026 a 26/11/2026 | Desenvolvimento Evolutivo | Entrevista contextual | [Cronograma](cronograma.md); atividade pendente, sem execução registrada e sem reprogramação | Prevista |
| 26/11/2026 a 27/11/2026 | Desenvolvimento Evolutivo | Análise de tarefas | [Cronograma](cronograma.md); atividade pendente, sem execução registrada e sem reprogramação | Prevista |
| 30/11/2026 a 03/12/2026 | Desenvolvimento Evolutivo | Teste de protótipo com tarefas | [Cronograma](cronograma.md); atividade pendente, sem execução registrada | Prevista |

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 07/09/2026 | Adiciona topico de engenharia de requisitos | Natan França |
| 1.1 | 10/10/2026 | Explicita metodos de declaração de requisitos | Natan França |
| 1.2 | 10/10/2026 | Reestrutura processo de ER conforme issue #5 | Bruno Duarte |
| 1.3 | 12/10/2026 | Atualiza as referências entre seções e esclarece as pendências | Erick Alves |
| 1.4 | 23/10/2026 | Corrige checklist do DoR | Natan França |
| 1.5 | 31/10/2026 | Tema escuro, consulta flutuante, leitura contínua e atas em blog | Bruno Duarte |
| 1.6 | 31/10/2026 | Adiciona links para o Kanban e os backlogs no GitHub Projects | Bruno Duarte |
| 1.7 | 03/11/2026 | Referencia o Registro de decisões e registra a decisão da stack na seção 5.6; inclui o histórico de versões | Bruno Duarte |
| 1.8 | 07/11/2026 | Atualiza a situação dos casos de uso, dos wireframes e da matriz de rastreabilidade nas seções 5.1 e 5.6 (issue #26) | Dante Scarpati |
| 1.9 | 12/11/2026 | Inclui o OG na cadeia da seção 5.5, registra o estado de validação dos vínculos de CP7 e CP8, publica a matriz detalhada inicial por caso de uso e atualiza a situação dos UC01 a UC09 (issue #19) | Erick Alves |
| 1.10 | 13/11/2026 | Atualiza a seção 5.6: inclui a legenda de situações, registra as evidências da investigação do problema e da avaliação cruzada, as perguntas à cliente em reunião de 01/09/2026 (gravação no Teams), a situação do questionário (não aplicado) e a situação e os períodos das atividades previstas (diário financeiro, entrevista contextual, análise de tarefas e teste de protótipo) (issue #18) | Erick Alves |
| 1.11 | 14/11/2026 | Liga a análise de riscos à nova página de riscos do projeto nas seções 5.1 e 5.6 (issue #17) | Bruno Duarte |
