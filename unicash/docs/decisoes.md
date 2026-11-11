# Registro de decisões

Esta página reúne as decisões que mudaram o escopo, os requisitos, o processo ou a arquitetura do UniCash. Cada decisão registra a origem (ata, pull request ou commit), o motivo, as alternativas descartadas, os requisitos afetados e como a mudança foi comunicada. As atas continuam sendo o registro detalhado das reuniões; esta página permite recuperar a decisão sem percorrer todas elas.

**Como registrar:** cada nova decisão recebe o próximo identificador (D20, D21...). Os identificadores não são renumerados nem reutilizados. Quando uma decisão é substituída, o registro antigo permanece, com a situação **Substituída** e o identificador da decisão que a substituiu. Os requisitos afetados citam a decisão na coluna **Origem** das páginas de [Requisitos Funcionais](requisitos_funcionais.md) e [Requisitos Não Funcionais](requisitos_nao_funcionais.md).

## Resumo

| ID | Data | Decisão | Origem | Situação |
|---|---|---|---|---|
| [D01](#d01) | 29/08/2026 | Recomendação de investimentos fora do escopo | [R01](atas/posts/r01.md) | Vigente |
| [D02](#d02) | 29/08/2026 | Registro manual de receitas e despesas | [R01](atas/posts/r01.md) | Vigente |
| [D03](#d03) | 29/08/2026 | Indicador em semáforo do consumo do limite | [R01](atas/posts/r01.md) | Vigente, com limiares alterados pela [D15](#d15) |
| [D04](#d04) | 04/09/2026 | Processo DSDM com quadro Kanban | [R02](atas/posts/r02.md) | Vigente |
| [D05](#d05) | 17/09/2026 | Diferenciais: importação de extratos, grupos e gamificação | [R03](atas/posts/r03.md) | Vigente |
| [D06](#d06) | 24/09/2026 | Reorganização das características de produto | [R04](atas/posts/r04.md) | Vigente |
| [D07](#d07) | 28/09/2026 | Revisão dos requisitos após a avaliação cruzada | Avaliação cruzada e monitoria | Vigente |
| [D08](#d08) | 28/09/2026 | Priorização por valor × esforço e MoSCoW | [R05](atas/posts/r05.md) | Vigente |
| [D09](#d09) | 02/10/2026 | Validação do MVP, com grupos e automação de relatórios fora dele | [R07](atas/posts/r07.md) | Vigente |
| [D10](#d10) | 02/10/2026 | Funcionamento sem internet, com dados no aparelho | [R07](atas/posts/r07.md) | Vigente |
| [D11](#d11) | 02/10/2026 | Código aberto | [R07](atas/posts/r07.md) | Vigente |
| [D12](#d12) | 02/10/2026 | Cadastro com dados mínimos | [R07](atas/posts/r07.md) | Vigente |
| [D13](#d13) | 05/10/2026 | Casos de uso no lugar de histórias de usuário | [R08](atas/posts/r08.md) | Vigente |
| [D14](#d14) | 05/10/2026 | Backlog de requisitos separado do Kanban | [R08](atas/posts/r08.md) | Vigente |
| [D15](#d15) | 26/10/2026 | Faixas do indicador e dos alertas de limite | Equipe | Vigente, validada pela [D22](#d22) |
| [D16](#d16) | 27/10/2026 | Requisitos latentes de categoria | Equipe | Proposta |
| [D17](#d17) | 28/10/2026 | Paleta de cores da interface | Equipe | Vigente |
| [D18](#d18) | 29/10/2026 | Aplicativo móvel em React Native com Expo e SQLite local | [PR #34](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/34) | Vigente |
| [D19](#d19) | 30/10/2026 | Firebase para sincronização e grupos | [PR #34](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/34) | Vigente |
| [D20](#d20) | 05/11/2026 | Arquitetura local-first com suporte offline-first e sincronização opcional | Equipe | Vigente |
| [D21](#d21) | 07/11/2026 | Ajuste dos RNFs ao modelo local-first | [Issue #21](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/21) | Proposta |
| [D22](#d22) | 10/11/2026 | Validado com a cliente das regras de limites, retenção, uso offline e gamifição | Documento validado com Leinad e Maria | Vigente, com RF57 pendente |

A situação **Proposta** indica uma decisão da equipe que ainda depende de confirmação da cliente.

## Decisões

### D01 — Recomendação de investimentos fora do escopo { #d01 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 29/08/2026 |
| **Origem** | [R01](atas/posts/r01.md), reunião de diagnóstico com a cliente |
| **Decisão** | O UniCash não fará recomendação de investimentos. |
| **Motivo** | O foco do produto é quem administra um recurso limitado; quem tem recurso para investir já tem acesso a outras formas de orientação. |
| **Alternativas descartadas** | Recomendação de investimentos, proposta pela equipe. |
| **Requisitos afetados** | Nenhum; o tema ficou fora do escopo. |
| **Comunicação** | Decidida pela cliente na própria reunião. |

### D02 — Registro manual de receitas e despesas { #d02 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 29/08/2026 |
| **Origem** | [R01](atas/posts/r01.md) |
| **Decisão** | Receitas e despesas são lançadas manualmente pelo usuário, inclusive os pequenos gastos à vista. |
| **Motivo** | A cliente relatou que o controle atual é feito em papel, planilhas ou pela fatura do cartão, e que quem usa esses meios se perde e gasta além do planejado. |
| **Requisitos afetados** | RF07, RF15 |
| **Comunicação** | Acordada com a cliente na reunião. Na [R05](atas/posts/r05.md), a equipe confirmou que o registro manual continua disponível mesmo com a importação de extratos ([D05](#d05)). |

### D03 — Indicador em semáforo do consumo do limite { #d03 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 29/08/2026 |
| **Origem** | [R01](atas/posts/r01.md) |
| **Decisão** | Um indicador em verde, amarelo e vermelho mostra a proximidade do limite de gasto. |
| **Motivo** | Ver o limite disponível no cartão incentiva gastos por impulso e prejudica a reserva. No exemplo da cliente, o amarelo acenderia em 50% da renda e o vermelho em 70%, preservando 30% para reserva. |
| **Requisitos afetados** | RF37, RF38, RF39, RN02, RN03, RN14 |
| **Comunicação** | Proposta da cliente na reunião. Os limiares foram alterados depois pela [D15](#d15). |

### D04 — Processo DSDM com quadro Kanban { #d04 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 04/09/2026 |
| **Origem** | [R02](atas/posts/r02.md), reunião da equipe com o monitor |
| **Decisão** | A equipe adota o DSDM como processo e o Kanban para acompanhar o desenvolvimento. |
| **Motivo** | Uso de timeboxes, da priorização MoSCoW e da gestão de requisitos sob incerteza quanto ao MVP. |
| **Alternativas descartadas** | Scrum/XP adaptado; OpenUP, usado como quadro comparativo. |
| **Requisitos afetados** | Nenhum requisito; afeta as [Estratégias de engenharia de software](estrategia.md). |
| **Comunicação** | Apresentada ao monitor, que alertou que adaptações de metodologia devem ser validadas com o professor. |

### D05 — Diferenciais: importação de extratos, grupos e gamificação { #d05 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 17/09/2026 |
| **Origem** | [R03](atas/posts/r03.md), workshop de refinamento com a cliente |
| **Decisão** | O produto passa a ter como diferenciais a importação de extratos, os grupos para dividir despesas e metas e a gamificação com alertas. |
| **Motivo** | Retorno do professor: os recursos básicos propostos já existem em várias ferramentas do mercado. |
| **Requisitos afetados** | RF21, RF47 a RF50, RF60 e RN05 (importação); CP7, com RF22 a RF29, RF51 a RF53 e RF57 (grupos); CP8, com RF30 e RF44 a RF46 (gamificação) |
| **Comunicação** | Discutida e acordada com a cliente no workshop. |

### D06 — Reorganização das características de produto { #d06 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 24/09/2026 |
| **Origem** | [R04](atas/posts/r04.md), primeira versão consolidada dos requisitos |
| **Decisão** | As seis características de produto passam a oito, com a criação de CP7 (colaboração em grupo) e CP8 (engajamento), e as regras de negócio passam a ser registradas separadamente. |
| **Motivo** | Agrupar os requisitos de grupo e de gamificação que surgiram na [D05](#d05). |
| **Requisitos afetados** | CP1 a CP8; RN01 a RN05 |
| **Comunicação** | Registrada na [R04](atas/posts/r04.md). |

### D07 — Revisão dos requisitos após a avaliação cruzada { #d07 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 28/09/2026 e 29/09/2026 |
| **Origem** | Feedback da equipe revisora (planilha do grupo Cybersetor na página de [Requisitos Funcionais](requisitos_funcionais.md#feedback-do-grupo-cybersetor)) e da monitoria; commits [2ae7c9e](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/2ae7c9e), [2d78183](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/2d78183) e [8403381](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/8403381) |
| **Decisão** | Refinar os requisitos apontados pela revisão; incluir RF57 a RF60, RNF32 e RNF33; fundir o RF54 ao RF21, com os formatos aceitos na RN05; fundir RNF13 e RNF23 ao RNF05; retirar o RNF15. |
| **Motivo** | A revisão apontou ambiguidades e dependências inexistentes (por exemplo, o cadastro de contas exigido pelo RF49). A equipe também levou aos requisitos as mitigações dos riscos da seção 3.4: ansiedade e culpa (RF30, RF37, RF38, RF46, RF53, RF57, RF58), falsa percepção de que organizar resolve a falta de renda (RF55) e exclusão por menor letramento (RF55). |
| **Requisitos afetados** | RF21, RF30, RF37, RF38, RF40, RF46, RF48, RF49, RF51 a RF60, RNF05, RNF32, RNF33, RN01, RN05 |
| **Comunicação** | A [R06](atas/posts/r06.md) registrou que essas mudanças não tinham sido rastreadas. Os requisitos novos ainda não foram confirmados com a cliente e constam em Pontos para validação. |

### D08 — Priorização por valor × esforço e MoSCoW { #d08 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 25/09/2026 a 28/09/2026 |
| **Origem** | [R05](atas/posts/r05.md), priorização com a cliente e a representante |
| **Decisão** | Cada avaliadora dá a cada requisito uma nota de valor de 1 a 4 (MoSCoW), a equipe estima o esforço técnico, e a matriz valor × esforço orienta o MVP. |
| **Motivo** | Selecionar o núcleo do produto com a participação das usuárias e considerando o esforço da equipe. |
| **Requisitos afetados** | RF01 a RF56; [Escopo do MVP](mvp.md) |
| **Comunicação** | Planilha preenchida pela cliente e pelas representantes até 28/09/2026. |

### D09 — Validação do MVP, com grupos e automação de relatórios fora dele { #d09 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 02/10/2026 |
| **Origem** | [R07](atas/posts/r07.md), validação do MVP |
| **Decisão** | O MVP definido na [D08](#d08) é aceito. Os grupos e a automação de relatórios ficam para depois do MVP. |
| **Motivo** | A automação de relatórios tem esforço técnico alto. |
| **Requisitos afetados** | CP7; [Escopo do MVP](mvp.md) |
| **Comunicação** | Validada pela cliente e pelas duas representantes. |

### D10 — Funcionamento sem internet, com dados no aparelho { #d10 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 02/10/2026 |
| **Origem** | [R07](atas/posts/r07.md) |
| **Decisão** | O aplicativo funciona sem internet e guarda os dados no próprio aparelho (local-first). A sincronização serve apenas para usar vários dispositivos e os grupos. |
| **Motivo** | Privacidade: Alana França preferiu que os dados ficassem apenas no aparelho, e as demais participantes concordaram. |
| **Requisitos afetados** | RF59, RF61 a RF64, RNF26, RNF34 a RNF36, RN06, RN07 |
| **Comunicação** | Acordada na reunião. Desdobrada na escolha da tecnologia ([D18](#d18)). |

### D11 — Código aberto { #d11 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 02/10/2026 |
| **Origem** | [R07](atas/posts/r07.md) |
| **Decisão** | O aplicativo será publicado como código aberto. |
| **Requisitos afetados** | RNF37 |
| **Comunicação** | Acordada na reunião, com a concordância de Maria Vitória. |

### D12 — Cadastro com dados mínimos { #d12 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 02/10/2026 |
| **Origem** | [R07](atas/posts/r07.md) |
| **Decisão** | O cadastro não pede CPF nem e-mail. Em questões de dados pessoais, a objeção de uma participante prevalece sobre a maioria. |
| **Motivo** | Recomendação de Maria Vitória sobre proteção de dados pessoais. |
| **Requisitos afetados** | RF01, RF61, RNF32 |
| **Comunicação** | Definida pela cliente na reunião. Os dados do cadastro seriam detalhados na escrita dos casos de uso. |

### D13 — Casos de uso no lugar de histórias de usuário { #d13 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 05/10/2026 |
| **Origem** | [R08](atas/posts/r08.md), reunião da equipe com o monitor |
| **Decisão** | Os requisitos passam a ser declarados como casos de uso. |
| **Motivo** | Orientação do professor. |
| **Alternativas descartadas** | Temas, épicos e histórias de usuário. |
| **Requisitos afetados** | [Casos de uso](casos_de_uso.md); [Engenharia de requisitos](engenharia_de_requisitos.md) |
| **Comunicação** | Aceita pelos presentes na reunião. |

### D14 — Backlog de requisitos separado do Kanban { #d14 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 05/10/2026 |
| **Origem** | [R08](atas/posts/r08.md) |
| **Decisão** | O backlog de requisitos, com a lista priorizada e a breve descrição dos casos de uso, fica em um GitHub Project separado do quadro Kanban de atividades. |
| **Motivo** | Separar o que será construído do acompanhamento das tarefas da equipe. |
| **Requisitos afetados** | Nenhum requisito; afeta o acompanhamento do projeto. |
| **Comunicação** | Combinada com o monitor. |

### D15 — Faixas do indicador e dos alertas de limite { #d15 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 26/10/2026 |
| **Origem** | Equipe, na escrita das regras de negócio (commit [553f87c](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/553f87c)) |
| **Decisão** | Os percentuais citados na entrevista (50%, 70% e 90%) não são aplicados. Valem as faixas da RN02 (50%, 80% e 90%) e os disparos da RN03 (80% e 100%). |
| **Motivo** | Não registrado. |
| **Requisitos afetados** | RF37, RF38, RF39, RN02, RN03, RN14 |
| **Comunicação** | Sem registro de comunicação à cliente. Consta em Pontos para validação. |

### D16 — Requisitos latentes de categoria { #d16 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 27/10/2026 |
| **Origem** | Equipe, na escrita dos casos de uso (commit [8cc33bb](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/8cc33bb)) |
| **Decisão** | Incluir a consulta, a edição e a exclusão de categorias. |
| **Motivo** | A gestão de categorias só previa a criação (RF19), embora a RN13 já tratasse da edição e da exclusão de categorias próprias. |
| **Requisitos afetados** | RF65, RF66, RF67, RN13 |
| **Comunicação** | Sem registro de comunicação à cliente. Consta em Pontos para validação. |

### D17 — Paleta de cores da interface { #d17 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 28/10/2026 |
| **Origem** | Equipe (commit [7e42737](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/7e42737)) |
| **Decisão** | A interface usa a paleta “Tesouraria Teal”, definida em um único conjunto de variáveis de tema. |
| **Motivo** | Padronizar as cores da interface. A escolha da paleta não tem justificativa registrada. |
| **Requisitos afetados** | RNF38 |
| **Comunicação** | Sem registro de comunicação à cliente. |

### D18 — Aplicativo móvel em React Native com Expo e SQLite local { #d18 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 29/10/2026 |
| **Origem** | [PR #33](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/33) (configuração do Expo) e [PR #34](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/34) (commit [e6b7b36](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/e6b7b36)) |
| **Decisão** | O aplicativo é desenvolvido em React Native com Expo e TypeScript, com os dados em SQLite no próprio dispositivo. O Expo Go é usado no desenvolvimento, o EAS Build gera os instaláveis e o GitHub Actions faz a integração contínua. |
| **Motivo** | Atender à [D10](#d10): funcionar sem internet exige um aplicativo instalado com base local como cópia principal dos dados. Uma única base de código atende Android e iOS, e o Expo Go e o EAS Build dispensam Android Studio e Xcode nas máquinas da equipe. |
| **Alternativas descartadas** | Aplicação web em React com backend em Django, PostgreSQL e API REST (stack anterior, descrita na seção 2.4 da Solução até 29/10/2026). |
| **Requisitos afetados** | RNF24; seção 2.4 da [Solução proposta](solucao.md) |
| **Comunicação** | Revisada pela equipe no PR #34. Sem registro de comunicação à cliente. |

### D19 — Firebase para sincronização e grupos { #d19 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 30/10/2026 |
| **Origem** | [PR #34](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/34) (commits [d13fba5](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/d13fba5), [0643129](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/0643129) e [28b4449](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/commit/28b4449)) |
| **Decisão** | A sincronização entre dispositivos e os grupos usam o Firebase: o aplicativo acessa o Cloud Firestore pelo SDK JavaScript oficial, o login usa o Firebase Authentication e o acesso é controlado pelas Firebase Security Rules, sem backend próprio. |
| **Motivo** | O SDK JavaScript do Firestore funciona no Expo Go ([D18](#d18)), e o Firebase dispensa desenvolver e hospedar um backend próprio. As Security Rules cobrem a autorização exigida pelos RNF03 e RNF10, e o Firebase Emulator Suite permite testar localmente. |
| **Alternativas descartadas** | Supabase (PostgreSQL gerenciado com Supabase Auth e Row Level Security), adotado em 29/10/2026 e substituído no dia seguinte; backend próprio em Django com API REST ([D18](#d18)). |
| **Requisitos afetados** | RNF03, RNF04, RNF10, RNF19, RNF20, RNF21, RNF24, RNF26, RNF30 (reescrito de “Expor API RESTful” para “Acessar o Firebase pelo SDK oficial”); RN08; casos de uso que citavam servidor ou API |
| **Comunicação** | Revisada pela equipe no PR #34; os RNFs foram ajustados em 31/10/2026. Sem registro de comunicação à cliente. |

### D20 — Arquitetura local-first com suporte offline-first e sincronização opcional { #d20 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 05/11/2026 |
| **Origem** | Equipe, revisão da documentação da solução |
| **Decisão** | O UniCash adota uma arquitetura local-first com suporte aos princípios offline-first. O SQLite é o armazenamento principal e sustenta o cadastro, a edição, a exclusão, as consultas, os cálculos e os relatórios localmente. O Firebase é utilizado apenas de forma opcional, quando o usuário opta por uma conta e pela sincronização em nuvem. |
| **Motivo** | Essa definição representa melhor o funcionamento do produto: as funcionalidades principais não dependem de conta, internet ou Firebase, enquanto a sincronização em nuvem permanece como recurso adicional para uso em vários dispositivos e em grupos. |
| **Alternativas descartadas** | Tratar o Firebase como dependência obrigatória da aplicação; classificar o produto como exclusivamente offline-first ou exclusivamente local-only. |
| **Requisitos afetados** | RF59, RF61 a RF64, RNF26, RNF34 a RNF36, RN06, RN07; seção 2.4 da [Solução proposta](solucao.md) |
| **Comunicação** | Registrada na documentação pela equipe. Sem registro de comunicação à cliente. |

### D21 — Ajuste dos RNFs ao modelo local-first { #d21 }

| Campo | Registro |
| :--- | :--- |
| **Data** | 07/11/2026 |
| **Origem** | Revisão da lista de requisitos não funcionais ([issue #21](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/21)) |
| **Decisão** | Atualizar diretamente os requisitos afetados pela [D20](#d20), retirando a regra de precedência da RN06. A autenticação passa a valer na sincronização (RNF02), a proteção local fica no RNF39 e a criptografia, no RNF25. O RNF06 é fundido ao RNF35, que define a única condição para informar sucesso na gravação. Os backups do servidor passam a ter retenção de 30 dias, a recuperação dos dados no aparelho fica no RNF40 e o arredondamento, na RN21. Os títulos dos requisitos não citam tecnologias; quando necessárias, elas ficam na descrição. |
| **Motivo** | A regra de precedência mantinha declarações conflitantes no catálogo. Faltavam também as regras de arredondamento do RNF07, a distinção entre as cópias dos dados e a caracterização da carga dos ensaios. |
| **Alternativas descartadas** | Manter a regra de precedência da RN06. |
| **Requisitos afetados** | RF11, RF34, RF35, RF40 a RF43, RF59, RF63; RNF02, RNF04, RNF06, RNF07, RNF08, RNF09, RNF17, RNF18, RNF25, RNF30, RNF31, RNF35, RNF39, RNF40; RN04, RN06, RN09, RN21 |
| **Comunicação** | Proposta da equipe. Pendente de validação em pares e com a cliente; consta em Pontos para validação. |

## Pendências do registro

- Registrar o motivo da escolha da paleta na [D17](#d17);
- Comunicar à cliente as decisões de arquitetura [D18](#d18) e [D19](#d19) e registrar a comunicação em ata;
- Validar com a cliente as decisões propostas [D15](#d15), [D16](#d16) e [D21](#d21).

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 03/11/2026 | Cria o Registro de decisões com as decisões D01 a D19 | Bruno Duarte |
| 1.1 | 05/11/2026 | Registra a decisão D20 sobre a arquitetura local-first com suporte offline-first | Equipe UniCash |
| 1.2 | 07/11/2026 | Registra a decisão D21 sobre o ajuste dos RNFs ao modelo local-first (issue #21) | Dante Scarpati |
