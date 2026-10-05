# Escopo do MVP (Minimum Viable Product) — UniCash

Este documento apresenta a especificação atualizada do **Minimum Viable Product (MVP)** do aplicativo **UniCash**, contendo a relação detalhada dos **Requisitos Funcionais (RFs)** selecionados e seus respectivos **Requisitos Não-Funcionais (RNFs)** associados.

---

## 1. Priorização do backlog e definição do MVP

A priorização do MVP foi realizada com base na planilha **planilha_priorizacao_unicash**, utilizando uma matriz 4 × 4 de **valor de negócio × esforço técnico**. Cada requisito foi avaliado pelas participantes em uma escala de 1 a 4:

| Nota | Interpretação do valor de negócio |
| :--- | :--- |
| **4** | Must have: essencial para o funcionamento e para a validação da proposta do UniCash |
| **3** | Should have: importante, mas pode ser entregue após o núcleo do MVP |
| **2** | Could have: oportunidade de evolução, sem impacto no funcionamento básico |
| **1** | Won't have now: não priorizado para a versão atual |

Para obter o valor de negócio, foi calculada a média das três avaliações recebidas por cada requisito. O esforço técnico foi consolidado a partir da média dos três critérios avaliados por cada integrante e, posteriormente, da média entre as seis avaliações consideradas na planilha. Assim, a decisão não dependeu de uma única opinião e permitiu comparar o benefício esperado com a complexidade de implementação.

### 1.1 Métricas e fórmulas de cálculo

As métricas foram calculadas por requisito, mantendo as casas decimais durante os cálculos e arredondando apenas para a classificação na matriz:

* **Média de valor de negócio (MVN):** soma das notas de valor atribuídas pelas três avaliadoras dividida por três. Para o requisito $RF_i$, a fórmula é $MVN_i = (V_{i1} + V_{i2} + V_{i3}) / 3$.
* **Média de esforço por avaliador:** cada integrante avaliou três critérios de esforço técnico. Para a avaliadora $j$, a média é $E_{ij} = (C_{ij1} + C_{ij2} + C_{ij3}) / 3$.
* **Média de esforço técnico (MET):** média das seis médias individuais de esforço: $MET_i = (E_{i1} + E_{i2} + E_{i3} + E_{i4} + E_{i5} + E_{i6} + E_{i7}) / 7$.

As médias contínuas foram convertidas para as faixas da matriz pelo valor mais próximo na escala de 1 a 4. Para o valor de negócio, as faixas representam: 1,0–1,49 = **1 — baixo**; 1,5–2,49 = **2 — moderado**; 2,5–3,49 = **3 — alto**; e 3,5–4,0 = **4 — muito alto**. Para o esforço técnico, as mesmas faixas representam, respectivamente, esforço **baixo**, **moderado**, **alto** e **muito alto**.

O quadrante foi obtido pelo cruzamento entre a faixa de valor e a faixa de esforço. Em seguida, a equipe analisou dependências, riscos e necessidade de funcionamento do produto: requisitos de alto valor e baixo ou moderado esforço foram priorizados para o MVP; requisitos de valor moderado ou esforço alto foram mantidos como evolução futura. A matriz abaixo apresenta a classificação calculada para todos os requisitos da tabela consolidada.

### 1.2 Critério de decisão

| Valor de negócio \ Esforço técnico  | **1 — baixo** | **2 — moderado** | **3 — alto** | **4 — muito alto** |
| :--- | :--- | :--- | :--- | :--- |
| **4 — muito alto** | **Prioridade máxima**<br>RF03, RF04, RF05, RF07, RF08, RF09, RF10, RF11, RF12, RF13, RF14, RF15, RF16, RF17, RF18, RF19, RF20, RF34, RF35, RF36 | **Forte candidato ao MVP**<br>RF06, RF26, RF32, RF33, RF37, RF38, RF39, RF40, RF41, RF42, RF44, RF45, RF46, RF55 | **Avaliar viabilidade**<br>RF48, RF56 | **Planejar, reduzir ou decompor**<br>— |
| **3 — alto** | **Forte candidato ao MVP**<br>— | **Candidato ao MVP**<br>RF01, RF02, RF22, RF25, RF51 | **Avaliar contexto**<br>RF31 | **Entrega futura**<br>— |
| **2 — moderado** | **Avaliar oportunidade**<br>RF29 | **Entrega futura**<br>RF23, RF24, RF27, RF28, RF30, RF43, RF52, RF53 | **Entrega futura**<br>RF21, RF47, RF49 | **Baixa prioridade**<br>— |
| **1 — baixo** | **Avaliar oportunidade**<br>— | **Baixa prioridade**<br>— | **Baixa prioridade**<br>RF50, RF54 | **Não priorizar agora**<br>— |

Foram priorizados para o MVP os requisitos com valor médio igual ou aproximado a **4** e esforço baixo ou moderado, pois eles entregam alto valor com menor risco e permitem validar rapidamente a proposta central do aplicativo. A planilha classificou como prioridade principal os requisitos de gestão de perfil, receitas, metas, despesas, saldos, limites, relatórios, gamificação e onboarding que se encontram nesses quadrantes. Cadastro e autenticação foram mantidos como dependências estruturais do MVP, pois são necessários para proteger os dados financeiros e garantir que as demais funcionalidades sejam utilizadas por um usuário identificado.

### 1.3 Resultado da priorização

O recorte priorizado contempla:

* **Núcleo financeiro:** registrar, consultar, editar e excluir receitas e despesas; calcular totais e saldo mensal; e reportar o saldo anterior.
* **Metas e acompanhamento:** criar, editar, excluir e visualizar metas, além de acompanhar o progresso financeiro.
* **Acesso e privacidade:** cadastrar e autenticar o usuário, visualizar e editar o perfil, encerrar a sessão e excluir a conta.
* **Categorias, limites e relatórios:** criar categorias de despesas, notificar a aproximação ou ultrapassagem de limites e exibir o resumo e os indicadores financeiros.
* **Recorrência e engajamento:** definir e editar lançamentos recorrentes, conceder conquistas, atribuir pontuação e notificar conquistas obtidas.
* **Orientação inicial:** apresentar o tutorial inicial para reduzir a curva de aprendizado e apoiar o uso correto do aplicativo.

Funcionalidades com menor valor médio, esforço técnico alto ou dependências ainda não resolvidas, como importações bancárias, recursos de grupos e automações mais avançadas, permanecem fora do núcleo do MVP e podem ser reavaliadas em releases posteriores. A matriz é um apoio à decisão: dependências, riscos de segurança, privacidade e integridade financeira também foram considerados antes da composição final do escopo.

---


## 2. Matriz de Rastreabilidade Resumida

| Requisito Funcional (RF) | Requisito Não-Funcional (RNF) Principal | Categoria |
| :--- | :--- | :--- |
| **RF01, RF02, RF06** | RNF01, RNF03, RNF07 (Segurança) | Gestão de Usuário e Acesso |
| **RF03, RF04, RF05** | RNF02, RNF05, RNF06 (Desempenho / LGPD) | Perfil e Privacidade |
| **RF07 a RF11** | RNF08, RNF09, RNF11 (Offline / Precisão) | Gestão de Receitas |
| **RF12 a RF14, RF20, RF36**| RNF12, RNF13, RNF15 (Usabilidade / UX) | Metas Financeiras |
| **RF15 a RF19** | RNF08, RNF09, RNF14 (Offline / Flexibilidade)| Despesas e Categorias |
| **RF31 a RF35** | RNF10, RNF16, RNF17 (Automação / Integridade)| Recorrência e Saldos |
| **RF37, RF38** | RNF18 (Push / Desempenho) | Alertas e Limites |
| **RF39 a RF42** | RNF09, RNF15, RNF19 (Acessibilidade / UX) | Relatórios e Gráficos |
| **RF44 a RF46** | RNF18, RNF20 (Engajamento / Feedback) | Gamificação |
| **RF55** | RNF04 (Usabilidade) | Onboarding |