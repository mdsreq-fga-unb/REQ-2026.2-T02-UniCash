# 5 - ENGENHARIA DE REQUISITOS

## 5.1 Atividades e Técnicas de ER e DSDM/Kanban

### **Pré-projeto**
* **Elicitação e Descoberta:**
  * **Entrevistas:** Realizar entrevistas com a representante do projeto para entender o problema atual, identificar os *stakeholders*, levantar as necessidades e o que a levou a buscar um software como solução, compreendendo a ideia geral do produto.
* **Análise e Consenso:**
  * **Análise de efetividade:** Analisar se a ideia é efetiva, se solucionará o problema e se a solução deve ser desenvolvida.

---

### **Viabilidade**
* **Elicitação e Descoberta:**
  * **Entrevistas:** Realizar entrevistas com a representante do projeto para compreender o escopo e com o time de desenvolvimento para identificar a viabilidade técnica da equipe.
* **Análise e Consenso:**
  * **Análise de riscos:** Mapear os riscos do projeto e seus impactos no desenvolvimento.
  * **Análise de Custo/Benefício:** Analisar o custo e o benefício dos requisitos descobertos para identificar quais funcionalidades trarão mais impacto e valor.
* **Declaração:**
  * **Texto livre:** Escrever os requisitos identificados e separá-los em funcionais, não funcionais e regras de negócio.

---

### **Fundamentos**
* **Elicitação e Descoberta:**
  * **Entrevistas:** Realizar entrevistas com a cliente para descobrir a prioridade dos requisitos no incentivo à gestão financeira.
  * **Investigação do problema:** Pesquisar as causas do endividamento e das dificuldades na gestão financeira para entender o impacto necessário do software.
* **Análise e Consenso:**
  * **Priorização MoSCoW:** Priorizar funcionalidades críticas (*Must have*, *Should have*, *Could have* e *Won't have*) para a gestão financeira, como metas de economia e centralização de gastos.
  * **Definição do MVP:** Definir o escopo do MVP para entregar uma solução funcional inicial aos *stakeholders*.
* **Declaração:**
  * **Casos de uso detalhados:** Estruturar os requisitos em casos de uso, descrevendo ator, objetivo, pré-condições, pós-condições, fluxo principal, fluxos alternativos, fluxos de exceção, regras de negócio e critérios de aceitação.
  * **Quadro Kanban:** Organizar os requisitos conforme a priorização no quadro visual para facilitar o acompanhamento do fluxo.

---

### **Desenvolvimento Evolutivo**
* **Elicitação e Descoberta:**
  * **Formulários de coleta:** Coletar informações com os *stakeholders* para refinar os requisitos.
* **Análise e Consenso:**
  * **Definição das Timeboxes:** Alinhar prazos das *timeboxes* com a equipe para garantir entregas de valor no tempo previsto.
* **Declaração:**
  * **Refinamento dos casos de uso e Definition of Ready (DoR):** Detalhar os fluxos, regras de negócio e critérios de aceitação de cada caso de uso, garantindo que esteja pronto antes de iniciar o desenvolvimento.
* **Representação:**
  * **Protótipos e Wireframes:** Criar representações visuais dos requisitos para facilitar a compreensão da equipe.
* **Verificação e Validação:**
  * **Coleta de feedback:** Coletar retorno da representante do projeto para validar se as funcionalidades resolvem o problema.
  * **Revisão dos requisitos:** Refinar os requisitos continuadamente para manter o alinhamento com os objetivos.
* **Organização e Atualização:**
  * **Atualização do Backlog:** Ajustar os requisitos com base nos *feedbacks*.
  * **Análise do desenvolvimento e organização:** Discutir o andamento, identificar gargalos e reorganizar a equipe.
  * **Repriorização:** Aplicar MoSCoW novamente caso as prioridades ou valores tenham mudado.

---

### **Implantação**
* **Verificação e Validação:**
  * **Validação final:** Validar se todos os requisitos priorizados foram entregues no MVP.
* **Organização e Atualização:**
  * **Documentação:** Revisar a documentação final para facilitar a manutenção futura.

---

### **Pós-projeto**
* **Elicitação e Descoberta:**
  * **Investigação de novos incrementos:** Identificar novos requisitos que agreguem valor ao sistema.
  * **Priorização MoSCoW e Mapeamento de Valor:** Definir a prioridade de novas funcionalidades considerando o impacto no negócio.
* **Análise e Organização:**
  * **Discussões em Grupo e Análise de Causas:** Realizar retrospectiva sobre o que funcionou e o que pode ser melhorado para otimizar as próximas *sprints*.

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
| **Pré-projeto** | Elicitação e Descoberta | Levantamento inicial do problema via Entrevistas | Necessidades do negócio e as partes interessadas iniciais identificadas. |
| | Análise e Consenso | Análise de efetividade da ideia | Decisão consensuada sobre a viabilidade de prosseguir com a solução. |
| **Viabilidade** | Elicitação e Descoberta | Levantamento de escopo e capacidade técnica via Entrevistas | Escopo preliminar e viabilidade técnica da equipe compreendidos. |
| | Análise e Consenso | Análise de Riscos e Análise de Custo/Benefício | Riscos mapeados e requisitos priorizados por impacto e valor. |
| | Declaração de Requisitos | Registros em Texto livre | Requisitos iniciais documentados e classificados (RF, RNF e RN). |
| **Fundamentos** | Elicitação e Descoberta | Levantamento de prioridades e do domínio via Entrevistas e Investigação do Problema | Prioridades da cliente e contexto do endividamento/gestão financeira compreendidos. |
| | Análise e Consenso | Priorização MoSCoW e Definição do MVP | Requisitos classificados por prioridade e escopo do MVP definido. |
| | Declaração de Requisitos | Registro de Casos de Uso Detalhados e Quadro Kanban | Requisitos estruturados em casos de uso detalhados e organizados no fluxo visual. |
| **Desenvolvimento Evolutivo** | Elicitação e Descoberta | Refinamento de requisitos via Formulários de Coleta | Requisitos refinados com base em informações adicionais dos *stakeholders*. |
| | Análise e Consenso | Planejamento e Definição das Timeboxes | Prazos de cada *timebox* definidos e alinhados à entrega de valor. |
| | Declaração de Requisitos | Refinamento dos Casos de Uso e Definition of Ready (DoR) | Casos de uso prontos (*ready*) para desenvolvimento com fluxos e critérios claros. |
| | Representação de Requisitos | Criação de Protótipos e Wireframes | Representações visuais que facilitam a compreensão do time. |
| | Verificação e Validação | Coleta de Feedback e Revisão dos Requisitos | Requisitos validados junto à cliente e alinhados ao objetivo do projeto. |
| | Organização e Atualização | Atualizar Backlog, Monitoramento WIP no Kanban e Repriorização MoSCoW | Backlog atualizado, gargalos de fluxo identificados e requisitos repriorizados. |
| **Implantação** | Verificação e Validação | Validação Final | Confirmação de que os requisitos priorizados foram entregues no MVP. |
| | Organização e Atualização | Consolidação da Documentação | Documentação do projeto revisada e organizada para manutenção futura. |
| **Pós-projeto** | Elicitação e Descoberta | Investigação de Novos Incrementos, Priorização MoSCoW e Mapeamento de Valor | Novos requisitos identificados e priorizados conforme valor e impacto. |
| | Organização e Atualização | Revisão do processo via Discussões em Grupo e Análise de Causas | Melhorias identificadas para aumentar a eficiência das próximas iterações. |