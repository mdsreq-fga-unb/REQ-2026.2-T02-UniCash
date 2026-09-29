# Escopo do MVP (Minimum Viable Product) — UniCash

Este documento apresenta a especificação atualizada do **Minimum Viable Product (MVP)** do aplicativo **UniCash**, contendo a relação detalhada dos **Requisitos Funcionais (RFs)** selecionados e seus respectivos **Requisitos Não-Funcionais (RNFs)** associados.

---

## 1. Mapeamento de Requisitos do MVP (RFs e RNFs)

Abaixo estão listados os Requisitos Funcionais do escopo do MVP juntamente com os Requisitos Não-Funcionais que definem critérios de qualidade, desempenho, segurança e usabilidade.

### 1.1. Gestão de Contas e Perfil de Usuário

#### RF01 — Cadastrar usuário
* **Descrição:** Permitir que o estudante crie uma conta no aplicativo informando dados básicos.
* **RNF Associados:**
  * **RNF01 (Segurança):** As senhas de usuário devem ser armazenadas utilizando hash criptográfico forte (ex: bcrypt/Argon2).
  * **RNF02 (Desempenho):** O processo de cadastro deve responder e confirmar em no máximo 2 segundos.

#### RF02 — Autenticar usuário
* **Descrição:** Permitir que o usuário realize login seguro na aplicação.
* **RNF Associados:**
  * **RNF03 (Segurança):** Uso de autenticação baseada em Tokens JWT com tempo de expiração definido.
  * **RNF04 (Usabilidade):** Permitir opção de "lembrar sessão" para acesso facilitado.

#### RF03 — Visualizar perfil de usuário
* **Descrição:** Permitir a consulta das informações cadastradas no perfil.
* **RNF Associados:**
  * **RNF05 (Privacidade):** Exibição restrita apenas ao usuário autenticado dono da conta.

#### RF04 — Editar perfil de usuário
* **Descrição:** Permitir a alteração de dados do perfil (nome, e-mail, foto, etc.).
* **RNF Associados:**
  * **RNF02 (Desempenho):** Atualizações de perfil devem ser processadas em até 1,5 segundo.

#### RF05 — Excluir perfil de usuário
* **Descrição:** Permitir a remoção completa da conta e exclusão permanente dos dados do usuário.
* **RNF Associados:**
  * **RNF06 (Conformidade/LGPD):** A exclusão deve remover de forma irreversível todos os dados pessoais e lançamentos financeiros associados (Direito ao Esquecimento).

#### RF06 — Encerrar sessão
* **Descrição:** Permitir que o usuário faça logout da sua conta em qualquer momento.
* **RNF Associados:**
  * **RNF07 (Segurança):** Invalidação imediata do token de sessão no dispositivo local.

---

### 1.2. Gestão de Receitas

#### RF07 — Registrar receita
* **Descrição:** Permitir a inserção manual de entradas financeiras (ex: mesada, salário, bolsa, estipêndio).
* **RNF Associados:**
  * **RNF08 (Disponibilidade/Offline):** Permitir o registro e armazenamento local mesmo sem conexão ativa com a internet (sincronização posterior).

#### RF08 — Consultar receitas
* **Descrição:** Listar o histórico de receitas registradas com filtros de ordenação e busca por período.
* **RNF Associados:**
  * **RNF09 (Desempenho):** Carregamento da listagem de receitas em no máximo 1 segundo.

#### RF09 — Editar receita
* **Descrição:** Permitir a alteração de valor, data, descrição ou fonte de uma receita cadastrada.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Atualização automática e imediata nos totais acumulados de saldo.

#### RF10 — Excluir receita
* **Descrição:** Permitir a remoção de um registro de receita efetuado incorretamente.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Reversão imediata do impacto do valor excluído no saldo geral.

#### RF11 — Calcular total de receitas
* **Descrição:** Consolidar e somar o total de entradas financeiras em um determinado período (mensal/anual).
* **RNF Associados:**
  * **RNF11 (Precisão):** Garantir precisão decimal exata em todos os cálculos monetários (sem erros de ponto flutuante).

---

### 1.3. Gestão de Metas Financeiras

#### RF12 — Criar meta financeira
* **Descrição:** Permitir o estabelecimento de metas de economia ou limites de gastos com prazos definidos.
* **RNF Associados:**
  * **RNF12 (Usabilidade):** Interface simples e guiada para criação de metas em até 3 etapas.

#### RF13 — Editar meta financeira
* **Descrição:** Permitir a alteração de prazos, valores-alvo ou nomes de metas existentes.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Recálculo imediato do percentual de progresso.

#### RF14 — Excluir meta financeira
* **Descrição:** Permitir o cancelamento ou exclusão de uma meta orçamentária.
* **RNF Associados:**
  * **RNF13 (Confiabilidade):** Solicitação de confirmação explícita antes da exclusão definitiva.

---

### 1.4. Gestão de Despesas e Categorização

#### RF15 — Registrar despesa
* **Descrição:** Permitir o lançamento de saídas financeiras, vinculando valor, data e categoria.
* **RNF Associados:**
  * **RNF08 (Disponibilidade/Offline):** Suporte para inserção rápida sem depender de conectividade.

#### RF16 — Consultar despesas
* **Descrição:** Apresentar histórico e detalhes de todas as despesas lançadas.
* **RNF Associados:**
  * **RNF09 (Desempenho):** Renderização ágil de listas longas utilizando paginação/virtualização.

#### RF17 — Editar despesa
* **Descrição:** Permitir retificar informações relativas a lançamentos de saída.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Atualização automática dos relatórios e gráficos por categoria.

#### RF18 — Excluir despesa
* **Descrição:** Permitir a exclusão de lançamentos de despesas.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Recálculo instantâneo do saldo disponível e orçamento.

#### RF19 — Criar categoria de despesas
* **Descrição:** Permitir ao usuário personalizar suas categorias de gasto (ex: Alimentação, Transporte, Lazer, Faculdade).
* **RNF Associados:**
  * **RNF14 (Flexibilidade):** Suporte à definição de ícones e cores personalizadas para fácil diferenciação visual.

#### RF20 — Visualizar metas financeiras
* **Descrição:** Exibir visão consolidada de todas as metas cadastradas e seus respectivos status.
* **RNF Associados:**
  * **RNF15 (Design/UX):** Indicadores visuais claros (barras de progresso) de fácil interpretação.

---

### 1.5. Lançamentos Recorrentes e Consolidação Financeira

#### RF31 — Excluir lançamento recorrente
* **Descrição:** Cancelar a repetição automática de lançamentos futuros.
* **RNF Associados:**
  * **RNF16 (Consistência):** Opção de manter ou remover histórico de lançamentos já efetuados no passado.

#### RF32 — Definir lançamento recorrente
* **Descrição:** Permitir a criação de despesas/receitas fixas que se repetem periodicamente (mensal, semanal).
* **RNF Associados:**
  * **RNF17 (Automação):** Execução em segundo plano de rotinas para criação automática de lançamentos na data agendada.

#### RF33 — Editar lançamento recorrente
* **Descrição:** Alterar o valor ou a frequência de lançamentos programados.
* **RNF Associados:**
  * **RNF16 (Consistência):** Aplicação de alterações com opção de afetar apenas os lançamentos futuros.

#### RF34 — Calcular saldo mensal
* **Descrição:** Determinar o resultado financeiro líquido do mês ($\text{Receitas} - \text{Despesas}$).
* **RNF Associados:**
  * **RNF11 (Precisão):** Processamento matemático preciso sem arredondamentos indevidos.

#### RF35 — Reportar saldo anterior
* **Descrição:** Carregar e consolidar o saldo acumulado do mês anterior para o mês corrente.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Atualização fluida do caixa continuado sem perda de registros.

#### RF36 — Acompanhar progresso da meta
* **Descrição:** Exibir em percentual e valor restante o quanto falta para atingir a meta financeira.
* **RNF Associados:**
  * **RNF15 (Design/UX):** Atualização dinâmica em tempo real ao registrar novos aportes ou economias.

---

### 1.6. Alertas e Notificações

#### RF37 — Notificar aproximação do limite de gastos
* **Descrição:** Emitir alerta quando o usuário atingir uma porcentagem pré-definida (ex: 80%) do seu teto de gastos.
* **RNF Associados:**
  * **RNF18 (Portabilidade/Push):** Envio de notificações push eficientes e sem atrasos no dispositivo móvel.

#### RF38 — Notificar ultrapassagem do limite de gastos
* **Descrição:** Notificar imediatamente quando o teto de gastos cadastrado for excedido.
* **RNF Associados:**
  * **RNF18 (Portabilidade/Push):** Alerta em tempo real com destaque visual dentro do aplicativo.

---

### 1.7. Visualização de Dados e Relatórios

#### RF39 — Exibir gráfico de despesas por categoria
* **Descrição:** Apresentar distribuição percentual dos gastos por meio de gráfico gráfico interativo (ex: pizza/rosca).
* **RNF Associados:**
  * **RNF19 (Acessibilidade):** Paletas de cores contrastantes e adaptadas para acessibilidade (incluindo daltonismo).

#### RF40 — Exibir resumo mensal
* **Descrição:** Painel geral (Dashboard) reunindo entradas, saídas e saldo acumulado no mês ativo.
* **RNF Associados:**
  * **RNF09 (Desempenho):** Carregamento e renderização inicial do dashboard em menos de 1,5 segundo.

#### RF41 — Exibir comparação mensal
* **Descrição:** Comparativo evolutivo entre os gastos do mês atual em relação a meses anteriores.
* **RNF Associados:**
  * **RNF15 (Design/UX):** Gráficos de barras claros e comparativos simples de entender.

#### RF42 — Exibir total gasto por categoria
* **Descrição:** Listagem detalhada exibindo o valor somado gasto em cada categoria individual.
* **RNF Associados:**
  * **RNF11 (Precisão):** Garantia de paridade exata com a soma de todas as despesas individuais.

---

### 1.8. Gamificação e Engajamento

#### RF44 — Conceder conquistas
* **Descrição:** Desbloquear medalhas/badges virtuais ao atingir metas e manter consistência de registros.
* **RNF Associados:**
  * **RNF20 (Engajamento):** Sistema de feedback imediato na tela ao conquistar uma nova insígnia.

#### RF45 — Pontuação por metas alcançadas
* **Descrição:** Atribuir pontuação ao perfil do estudante sempre que uma meta orçamentária for cumprida.
* **RNF Associados:**
  * **RNF10 (Integridade de Dados):** Cálculo automático e seguro contra manipulação local de pontuação.

#### RF46 — Notificar conquistas
* **Descrição:** Disparar mensagem comemorativa no momento do desbloqueio de conquistas ou pontos.
* **RNF Associados:**
  * **RNF18 (Portabilidade/Push):** Animações leves e notificações atraentes sem travar o dispositivo.

---

### 1.9. Onboarding e Suporte Ao Usuário

#### RF55 — Apresentar tutorial inicial
* **Descrição:** Guia interativo (Onboarding) apresentado na primeira utilização do app para ensinar as principais funcionalidades.
* **RNF Associados:**
  * **RNF04 (Usabilidade):** Permitir a opção de pular ou rever o tutorial a qualquer momento no menu de configurações.

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