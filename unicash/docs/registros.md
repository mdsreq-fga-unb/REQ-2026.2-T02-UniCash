# Registros de Engenharia de Requisitos

Esta página reúne os registros das reuniões e das versões dos requisitos que servem como evidência das atividades de Engenharia de Requisitos descritas na seção 5. Os registros estão em ordem cronológica, e os identificadores R01 a R08 são usados na seção 5.5. As reuniões com transcrição foram gravadas no Microsoft Teams, e as transcrições são mantidas pela equipe.

---

## R01 — Reunião de diagnóstico (29/08/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Pré-projeto |
| **Formato** | Videoconferência pelo Microsoft Teams, com 24 min 36 s e transcrição automática |
| **Participantes** | Leinad Santos França (cliente); Natan José França (condução); Bruno Bernardes Duarte |
| **Atividades de ER** | Elicitação e Descoberta (entrevista semiestruturada); Análise e Consenso (escopo e público da ideia) |

**Contexto relatado pela cliente:**

- A ideia surgiu para ajudar famílias que estão endividadas há muito tempo por não conseguirem se organizar usando planilhas de Excel.
- O escopo foi ampliado para estudantes universitários que recebem bolsa auxílio e, muitas vezes, moram fora. Eles têm despesas com xerox, viagem e aluguel e, ao final do curso, recorrem a rifas para custear a formatura.
- Hoje, o controle é feito com anotações em papel, planilhas ou acompanhando a fatura e o limite do cartão de crédito.

**Problemas relatados:**

1. Pessoas permanecem endividadas por não conseguirem se organizar com planilhas de Excel.
2. Estudantes recorrem a rifas no fim do curso por não terem se planejado ao longo da graduação.
3. É difícil administrar um recurso financeiro muito limitado.
4. Quem usa Excel ou anotações manuais se perde no controle e gasta além do orçamento planejado.
5. Ver limite disponível no cartão incentiva gastos por impulso, o que prejudica a meta de reserva.
6. Anotar cada pequeno gasto manualmente é cansativo e desestimula o uso.

**Decisões e entendimentos:**

| Tópico | Decisão | Requisitos relacionados |
| :--- | :--- | :--- |
| Público-alvo | Estudantes universitários e famílias, podendo se estender à comunidade universitária (professores e técnicos). | Seção 1.7 |
| Recomendação de investimentos | Proposta pela equipe e descartada pela cliente: o foco é quem administra recurso limitado, e quem tem recurso para investir já tem acesso a outras formas de orientação. | Fora do escopo |
| Registro de gastos | Lançamento manual de receitas e despesas, inclusive pequenos gastos à vista. | RF07, RF15 |
| Indicador em semáforo | Verde indica recurso disponível, amarelo indica aproximação do limite e vermelho indica limite atingido. No exemplo da cliente, o amarelo acende ao atingir 50% da renda e o vermelho ao atingir 70%, preservando 30% para reserva. | RF37, RF38, RF39, RN02, RN03 |
| Organização dos gastos | Grupos de prioridades, supérfluos e imprevistos, com categorias personalizáveis por cada usuário. | RF19 |
| Histórico | Tela com histórico e gráfico para comparar meses e anos (proposta da equipe). | RF41 |
| Conquistas | Premiação para quem mantém as contas no verde (proposta da equipe, aceita pela cliente). | RF44, RF45, RF46 |
| Comunicação | Cliente disponível às terças-feiras, das 19h às 21h30. Dúvidas pontuais podem ser enviadas por formulário, e será criado um grupo de mensagens com a cliente. | Seção 7.2 |

**Pendências:** organizar as categorias de prioridades para públicos diferentes, que a cliente deixou em aberto.

**Evidência:** transcrição automática da reunião.

---

## R02 — Reunião de equipe #002 (04/09/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Viabilidade |
| **Formato** | Videoconferência da equipe com o monitor da disciplina, com transcrição automática |
| **Participantes** | Natan, Erick, Caio, Dante e Bruno; monitor Enzo Lopes Ferreira |
| **Atividades de ER** | Análise e Consenso (viabilidade técnica da equipe) |

**Decisões e encaminhamentos:**

| Tópico | Decisão ou encaminhamento |
| :--- | :--- |
| Processo | Adoção do DSDM, pelo uso de timeboxes, da priorização MoSCoW e da gestão de requisitos sob incerteza quanto ao MVP. |
| Framework visual | Adoção do Kanban para acompanhar o status do desenvolvimento. |
| Comparação | Caio elaborou um rascunho com Scrum/XP adaptado e usou o OpenUP como quadro comparativo. |
| Orientação da monitoria | O monitor elogiou a organização e o cumprimento de prazos, recomendou cobrar a participação de todos e alertou que adaptações de metodologia devem ser validadas com o professor. |
| Liderança | Caio sugeriu passar a liderança do grupo para Natan; a troca deve ser formalizada por e-mail ao professor. |
| Viabilidade técnica | Bruno criou um formulário de conhecimentos para levantar o domínio técnico de cada integrante; parte da equipe ainda precisava respondê-lo. |
| Contato com a cliente | Horário reservado às terças-feiras, das 19h às 21h; a cliente já está no canal da comunidade. |
| Vídeo | Gravação da apresentação na segunda-feira (feriado), com cada integrante apresentando um tópico. |

---

## R03 — Reunião de refinamento com a cliente (17/09/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 1 |
| **Formato** | Reunião da equipe com a cliente |
| **Participantes** | Leinad Santos França (cliente); equipe |
| **Atividades de ER** | Elicitação e Descoberta (workshop); Análise e Consenso (diferenciação do produto) |

**Feedback do professor discutido:** os recursos básicos propostos já existem em várias ferramentas do mercado, e a equipe precisa definir diferenciais para o produto. Ele também pediu que mais perfis de usuários participem da validação, como estudantes de graduação, pós-graduandos e membros de famílias, para evitar uma visão enviesada.

**Motivação da cliente:** incômodo com planilhas manuais e com aplicativos bancários complexos e engessados; busca por uma solução mais intuitiva e lúdica.

**Decisões e entendimentos:**

| Tópico | Decisão | Requisitos relacionados |
| :--- | :--- | :--- |
| Diferencial: leitura de extratos | Importar extratos de vários bancos por arquivo ou imagem, consolidando contas e dinheiro físico. | RF21, RF47, RF48, RF49, RF50, RF60, RN05 |
| Diferencial: grupos | Compartilhar e gerenciar despesas e metas entre casais, famílias ou pais e filhos universitários. | CP7 (RF22 a RF29, RF51 a RF53, RF57) |
| Diferencial: gamificação e alertas | Metas, pontuação e alertas em verde, amarelo e vermelho conforme o uso do orçamento. | CP8 (RF30, RF44 a RF46); RF37 a RF39 |
| Autenticação | Login e senha para proteger os dados. | RF01, RF02 |
| Receitas e despesas | Inclusão manual com nome, categoria e valor, ou por importação de extrato, com exibição do total. | RF07, RF11, RF15, RF21 |
| Categorias | Categorias editáveis, como despesas fixas, lazer e investimentos. | RF19 |
| Recorrência | Compras parceladas e despesas recorrentes, com projeção para meses futuros. | RF32, RF33, RF43 |
| Histórico | Navegação mês a mês. | RF08, RF16, RF34, RF35 |
| Validação | A cliente vai convidar amigas pesquisadoras e pós-graduandas para participar da validação. | Seção 5 (participantes) |

**Encaminhamentos:** formalizar e organizar os RFs; priorizar os requisitos com MoSCoW; agendar nova validação com a cliente antes da entrega da terça-feira seguinte.

---

## R04 — Primeira versão consolidada dos requisitos (anterior a 25/09/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 1 |
| **Atividades de ER** | Análise e Consenso (classificação); Declaração (linguagem natural) |
| **Uso** | Base da priorização por valor de negócio × esforço técnico iniciada em 25/09/2026 ([R05](#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026)), que avaliou os requisitos RF01 a RF56 |

**Conteúdo da versão:**

- Seis Características de Produto: CP1 Cadastro e gerenciamento de receitas e despesas; CP2 Organização financeira por categorias; CP3 Planejamento financeiro e metas; CP4 Relatórios e indicadores financeiros; CP5 Perfil e gerenciamento do usuário; CP6 Segurança e proteção dos dados.
- 56 requisitos funcionais (RF01 a RF56), cada um associado a uma CP.
- 31 requisitos não funcionais (RNF01 a RNF31), classificados em URPS+.
- Pontos para validação com a cliente: limiares do indicador de categoria (RF39), tempos e volumes dos RNF08, RNF11, RNF22 e RNF31 e o limite de três etapas do RNF27.

**Mudanças até a versão atual:** as CPs foram reorganizadas em oito, com a criação de CP7 (colaboração em grupo) e CP8 (engajamento), que receberam os requisitos de grupo e de gamificação. Foram incluídos os requisitos RF57 a RF60, o RF54 foi fundido ao RF21, e as regras de negócio passaram a ser registradas separadamente (RN01 a RN05). A versão atual está em [Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md).

---

## R05 — Priorização do MVP com a cliente e representante (25/09/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 2 |
| **Formato** | Videoconferência às sextas-feiras, com transcrição automática (28 min) |
| **Participantes** | Leinad Santos França (cliente); Maria Vitória (representante dos estudantes); Natan (condução), Dante, Leonardo e Evellyn |
| **Atividades de ER** | Elicitação e Descoberta; Análise e Consenso (priorização) |

**Pauta:** apresentar à Maria Vitória, que entrava no projeto, os requisitos levantados até então e explicar a atividade de priorização. A Alana França não participou, e o Natan ficou responsável por explicar a atividade a ela depois.

**Contribuições das participantes:**

| Tópico | Registro | Requisitos relacionados |
| :--- | :--- | :--- |
| Proteção de dados | Maria Vitória perguntou se haveria termo de consentimento para os dados pessoais no cadastro. A equipe reconheceu que a LGPD ainda não estava documentada. | RNF32 |
| Importação de extrato | Maria Vitória perguntou se a importação seria opcional; a equipe confirmou que o registro manual por formulário continua disponível. | RF07, RF15, RF21 |
| Metas | Maria Vitória descreveu o uso esperado: separar gastos fixos e variáveis e reservar uma margem para objetivos como viagem ou compra de um bem. | RF12, RF36 |
| Chatbot e perguntas frequentes | Maria Vitória sugeriu um canal de dúvidas sobre o uso do aplicativo. A sugestão foi anotada para virar requisito. | Ainda não incluído |
| Soluções existentes | Maria Vitória perguntou sobre aplicativos semelhantes. Dante apresentou a pesquisa de mercado (por exemplo, o Minhas Economias, gratuito, mas com interface pouco intuitiva para o público-alvo) e os diferenciais pretendidos (grupos, gamificação e menos etapas por registro). | Seção 2.5; RNF27 |

**Atividade de priorização:** a equipe enviou a planilha de priorização com os 56 requisitos. Cada avaliadora deu a cada requisito uma nota de valor de 1 a 4, com justificativa (4 = *Must have*, 3 = *Should have*, 2 = *Could have*, 1 = *Won't have*). A equipe revisaria as justificativas e preencheria a aba de esforço técnico. O prazo de preenchimento foi o meio-dia de segunda-feira, 28/09/2026.

**Resultado:** matriz valor × esforço e MVP publicados no [Escopo do MVP](mvp.md).

---

## R06 — Reunião de equipe (30/09/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 2 |
| **Formato** | Videoconferência da equipe, com transcrição automática (25 min) |
| **Participantes** | Erick, Caio, Dante e Leonardo |
| **Atividades de ER** | Verificação e Validação (análise da avaliação cruzada); Organização e Atualização |

**Decisões e encaminhamentos:**

| Tópico | Decisão ou encaminhamento |
| :--- | :--- |
| Reuniões | Reuniões da equipe às segundas e quartas-feiras, das 20h às 21h, e reunião com a cliente às sextas-feiras, às 16h. |
| Kanban | O quadro do GitHub Projects deve ser atualizado sempre que alguém começa ou termina uma atividade. |
| Avaliação cruzada | As mudanças feitas a partir da avaliação cruzada não foram rastreadas, e os feedbacks recebidos não estão no site. Pelos critérios do professor, uma issue só é considerada finalizada quando as decisões estão registradas, os feedbacks foram analisados e há evidência da revisão e da validação. |
| Próximas atividades | Registrar no site a priorização, a definição e os ajustes dos requisitos, com versão anterior, versão posterior e o que mudou; iniciar a análise de riscos; reorganizar o site. |

---

## R07 — Validação do MVP com a cliente e as representantes (02/10/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 2 |
| **Formato** | Videoconferência às sextas-feiras, com transcrição automática (25 min) |
| **Participantes** | Leinad Santos França (cliente); Maria Vitória (representante dos estudantes); Alana França (representante das famílias); Natan (condução), Dante e Leonardo |
| **Atividades de ER** | Verificação e Validação (validação do escopo do MVP); Análise e Consenso |

**Pauta:** apresentar o MVP definido a partir da planilha de priorização ([R05](#r05-priorizacao-do-mvp-com-a-cliente-e-representante-25092026)) e a documentação publicada no site.

**Decisões e entendimentos:**

| Tópico | Decisão | Requisitos relacionados |
| :--- | :--- | :--- |
| Escopo do MVP | A cliente e as representantes consideraram que o MVP contempla o que foi acordado na planilha. | [Escopo do MVP](mvp.md) |
| Itens fora do MVP | A automação de relatórios ficou para a próxima entrega por causa do esforço técnico alto. Os grupos também ficaram para depois do MVP. | CP7 |
| Foto do extrato | Alana França considerou a importação por foto do extrato pouco útil, por trazer informação demais. | RF21, RF50, RF60 |
| Uso sem internet | Alana França preferiu um aplicativo que funcione sem internet e guarde os dados apenas no aparelho, por privacidade; as demais concordaram. | RF59, RNF26; seção 2.5 |
| Código aberto | O aplicativo será open-source; Maria Vitória concordou. | Seção 2.5 |
| Dados do cadastro | Maria Vitória recomendou não pedir CPF nem e-mail no cadastro. A cliente definiu que, em questões de dados pessoais, a objeção de uma participante prevalece sobre a maioria. Os dados do cadastro serão definidos na escrita dos casos de uso. | RF01, RNF32 |
| Prototipação | Dante conduzirá com as participantes o consenso sobre as telas. | — |
| Piloto | O MVP poderá ser usado como piloto por pessoas de fora do grupo. | — |

**Encaminhamentos:** escrever os casos de uso na reunião da semana seguinte; as participantes devem pensar nos dados de cada funcionalidade e nas conquistas da gamificação.

---

## R08 — Reunião de equipe com o monitor (05/10/2026)

| Campo | Registro |
| :--- | :--- |
| **Fase** | Desenvolvimento Evolutivo — Timebox 2 |
| **Formato** | Videoconferência da equipe, com transcrição automática (25 min) |
| **Participantes** | Natan, Erick, Caio, Dante e Bruno; monitor Enzo Lopes Ferreira |
| **Atividades de ER** | Declaração (forma de declaração); Organização e Atualização; Verificação e Validação (avaliação cruzada) |

**Decisões e encaminhamentos:**

| Tópico | Decisão ou encaminhamento |
| :--- | :--- |
| Forma de declaração | A equipe decidiu, com a concordância dos presentes, substituir as histórias de usuário por casos de uso, seguindo a orientação do professor. |
| Backlog de requisitos | O backlog de requisitos é a lista priorizada dos requisitos, com breve descrição do caso de uso, e será mantido em um GitHub Project separado do quadro Kanban de atividades. |
| Avaliação cruzada | Cada revisor deve registrar, em tabela, se cada feedback recebido foi aceito ou não e a justificativa. A tabela será publicada na página de requisitos. |
| Priorização | A matriz valor × esforço deve ser apresentada como gráfico no site. |
| Papéis do DSDM | Reforçar a prática dos papéis definidos; a atualização diária do grupo pode ser feita apenas nos dias de reunião. |
| Prazos | Issues pendentes concluídas até 07/10/2026 para revisão do monitor; entrega da unidade em 13/10/2026. |

