# Escopo do MVP (Minimum Viable Product) — UniCash

Este documento apresenta a especificação atualizada do **Minimum Viable Product (MVP)** do aplicativo **UniCash**, contendo a relação detalhada dos **Requisitos Funcionais (RFs)** selecionados e seus respectivos **Requisitos Não-Funcionais (RNFs)** associados.

---

## 1. Priorização do backlog e definição do MVP

O MVP e organizado em tres niveis de escopo:

- **Nucleo local:** funcionalidades financeiras que devem funcionar no aparelho, sem conta, internet ou Firebase, conforme a [D20](decisoes.md#d20).
- **Fluxos condicionais:** funcionalidades que dependem de uma decisao de uso de conta, sincronizacao ou confirmacao de requisitos ainda propostos.
- **Fora do MVP:** funcionalidades adiadas para releases posteriores.

Essa distincao evita tratar como entrega confirmada um requisito que ainda depende de validacao, sem perder sua rastreabilidade na matriz RF-RNF.

A priorização original ([R05 — 25/09/2026](atas/posts/r05.md)) usou a [planilha de priorização do UniCash](https://docs.google.com/spreadsheets/d/1uoo81vAhU673u4y6JfPPllNKDKD-qf1iN6xD9fmMXCw/edit?usp=sharing). As abas **valor**, **esforço** e **resumo** contêm RF01 a RF56. O gráfico desta página cruza as médias em uma matriz 4 × 4 de valor de negócio × esforço técnico. As notas de valor têm a seguinte interpretação:

| Nota | Interpretação do valor de negócio |
| :--- | :--- |
| **4** | Must have: essencial para o funcionamento e para a validação da proposta do UniCash |
| **3** | Should have: importante, mas pode ser entregue após o núcleo do MVP |
| **2** | Could have: oportunidade de evolução, sem impacto no funcionamento básico |
| **1** | Won't have now: não priorizado para a versão atual |

As notas individuais de valor orientam a priorização MoSCoW. A média e a célula da matriz apoiam a seleção, mas não atribuem sozinhas uma decisão final de inclusão: dependências e decisões de escopo também precisam ser registradas.

### 1.1 Cálculo das médias

As notas são calculadas em três passos:

1. **Valor de negócio:** somam-se as notas de Leinad, Alana e Maria e divide-se por três.
2. **Esforço de cada integrante:** somam-se as notas de esforço, complexidade e lacuna de capacidade e divide-se por três. Cada critério recebe uma nota de 1 a 4; quanto maior a nota, maior a dificuldade.
3. **Esforço técnico final:** é a média de todos os integrantes que preencheram os três critérios daquele requisito: 7 avaliadores em 23 requisitos e 6 nos outros 33 (Bruno preencheu apenas 23).

Por exemplo, RF01 recebeu notas de valor **4, 4 e 2**, resultando em uma média de **3,33**. Como tem 7 avaliadores, sua média de esforço é **1,857**, apresentada como **1,86**, e não **1,85**. Isso coloca o requisito na faixa de valor alto e esforço moderado.

As médias completas são usadas na classificação. Os números apresentados no gráfico são arredondados para duas casas decimais.

| Média | Faixa | Valor de negócio | Esforço técnico |
| :--- | :--- | :--- | :--- |
| De 1 até menos de 1,5 | 1 | Baixo | Baixo |
| De 1,5 até menos de 2,5 | 2 | Moderado | Moderado |
| De 2,5 até menos de 3,5 | 3 | Alto | Alto |
| De 3,5 a 4 | 4 | Muito alto | Muito alto |

A tabela acima, publicada no MkDocs, é a referência oficial para a classificação da priorização. Os limites são inclusivos na faixa superior: 1,5 pertence à faixa 2 e 2,5 pertence à faixa 3. A planilha permanece como fonte das notas, mas não substitui a regra de classificação documentada nesta página.

A planilha cobre apenas RF01 a RF56; RF57 a RF64 ainda não têm notas nessa priorização.

### 1.2 Critério de decisão

<div id="matriz-valor-esforco" style="width:100%;height:1050px;" role="region" aria-label="Matriz de valor de negócio e esforço técnico">O gráfico interativo é exibido no site publicado. As notas também podem ser consultadas na planilha de priorização indicada no início desta página.</div>


<p style="font-size:13px;line-height:2">
<span style="background:#8fdca3;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Prioridade máxima</span>
<span style="background:#cdeed3;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Candidato / forte candidato ao MVP</span>
<span style="background:#cfe0fb;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Avaliar (viabilidade, contexto, oportunidade)</span>
<span style="background:#fbe9b0;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Planejar, reduzir ou decompor</span>
<span style="background:#ececef;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Entrega futura</span>
<span style="background:#f6c9c9;color:#1c1c1e;padding:3px 10px;border-radius:4px;display:inline-block;margin:2px">Baixa prioridade</span>
</p>

### 1.2.1 Decisão correspondente a cada célula

A célula é determinada pela interseção da faixa de **valor de negócio** (linha) com a faixa de **esforço técnico** (coluna). O gráfico usa exatamente a regra abaixo; a decisão é uma orientação de priorização e pode ser ajustada por dependências, riscos e decisões de escopo registradas no documento.

| Valor \ Esforço | 1 — baixo | 2 — moderado | 3 — alto | 4 — muito alto |
| :--- | :--- | :--- | :--- | :--- |
| **4 — muito alto** | **Prioridade máxima** | **Candidato / forte candidato ao MVP** | **Avaliar** viabilidade, contexto e oportunidade | **Planejar, reduzir ou decompor** |
| **3 — alto** | **Candidato / forte candidato ao MVP** | **Candidato / forte candidato ao MVP** | **Avaliar** viabilidade, contexto e oportunidade | **Entrega futura** |
| **2 — moderado** | **Avaliar** viabilidade, contexto e oportunidade | **Entrega futura** | **Entrega futura** | **Baixa prioridade** |
| **1 — baixo** | **Avaliar** viabilidade, contexto e oportunidade | **Baixa prioridade** | **Baixa prioridade** | **Baixa prioridade** |

Foram priorizados para o MVP os requisitos com valor medio igual ou aproximado a **4** e esforco baixo ou moderado, pois eles entregam alto valor com menor risco e permitem validar rapidamente a proposta central do aplicativo. A planilha classificou como prioridade principal os requisitos de receitas, metas, despesas, saldos, limites, relatorios, gamificacao e onboarding que se encontram nesses quadrantes. Pela [D20](decisoes.md#d20), o armazenamento e o processamento locais sao o caminho principal; cadastro, autenticacao e sincronizacao nao sao dependencias do uso financeiro individual e aparecem como fluxos condicionais.

### 1.3 Resultado da priorização

O recorte priorizado contempla:

| Frente do MVP | RFs relacionados | Escopo contemplado |
| :--- | :--- | :--- |
| **Núcleo financeiro** | RF07, RF08, RF09, RF10, RF11, RF15, RF16, RF17, RF18, RF34, RF35 | Registrar, consultar, editar e excluir receitas e despesas; calcular totais e saldo mensal; e reportar o saldo anterior. |
| **Metas e acompanhamento** | RF12, RF13, RF14, RF20, RF36 | Criar, editar, excluir e visualizar metas, além de acompanhar o progresso financeiro. |
| **Acesso e privacidade (condicional)** | RF01, RF02, RF03, RF04, RF05, RF06, RF31 | Cadastrar e autenticar uma conta para sincronizacao, visualizar e editar o perfil, encerrar a sessao, excluir a conta e recuperar a senha por canal verificado. O uso local individual nao depende desse fluxo. |
| **Categorias, limites e relatorios** | RF19, RF37, RF38, RF39, RF40, RF41, RF42, RF58 | Criar categorias de despesas, configurar preferencias de notificacao, notificar a aproximacao e a ultrapassagem de limites, exibir o indicador de consumo e gerar o resumo e os relatorios. |
| **Recorrencia e engajamento** | RF32, RF33, RF44, RF45, RF46 | Definir e editar lancamentos recorrentes, conceder conquistas, atribuir pontuacao e notificar conquistas obtidas. |
| **Orientação inicial** | RF55 | Apresentar o tutorial inicial para reduzir a curva de aprendizado e apoiar o uso correto do aplicativo. |

O RF59 integra o MVP e formaliza o registro sem conexao, com armazenamento local e envio posterior ao Cloud Firestore quando a sincronizacao estiver ativa. Conforme a [D20](decisoes.md#d20), o funcionamento local nao depende de conta, internet ou Firebase; a sincronizacao em nuvem e opcional. Funcionalidades com menor valor medio, esforco tecnico alto ou dependencias ainda nao resolvidas, como recursos de grupos e automacoes mais avancadas, permanecem fora do nucleo do MVP e podem ser reavaliadas em releases posteriores. Os fluxos de importacao e exportacao listados na tabela de limites foram classificados como Won't have now. A matriz e um apoio a decisao: dependencias, riscos de seguranca, privacidade e integridade financeira tambem foram considerados antes da composicao final do escopo.

### 1.3.1 Conjunto mínimo de RNFs da primeira versão

Para a primeira versão do núcleo local, o conjunto mínimo de RNFs é:

| RNFs mínimos | Motivo |
| :--- | :--- |
| **RNF04** | Impede gravar lançamentos e configurações incompletos. |
| **RNF05** | Evita estado parcial em operações financeiras compostas. |
| **RNF07** | Garante cálculos e apresentação monetária consistentes. |
| **RNF14** | Explica ao usuário por que uma operação foi rejeitada. |
| **RNF24** | Define a arquitetura e as tecnologias necessárias para a primeira versão. |
| **RNF25** | Protege os dados financeiros armazenados no dispositivo. |
| **RNF28** | Mantém os módulos evolutivos e com responsabilidades separadas. |
| **RNF29** | Exige testes automatizados das regras de saldo, metas e limites. |
| **RNF34** | Garante que o núcleo individual funcione sem conexão. |
| **RNF35** | Garante a persistência local durável e informa o estado de sincronização. |
| **RNF37** e **RNF38** | Atendem, respectivamente, à licença livre e à identidade visual definida. |

Quando a sincronização do **RF59** estiver habilitada, também são mínimos para esse fluxo o **RNF26** (preservação sem perda ou duplicidade) e o **RNF36** (convergência das réplicas); o **RNF19** e o **RNF30** aplicam-se à comunicação com o Firebase. RNFs de conta, grupos, backup do servidor e recuperação em aparelho novo não fazem parte do mínimo do núcleo local.

### 1.4 Limites do recorte

| Classificacao | Inclui | Condicao |
| :--- | :--- | :--- |
| **Nucleo confirmado** | RF07 a RF20, RF32 a RF42, RF44, RF45, RF46, RF55, RF58 e RF59 | Execucao e persistencia locais, respeitando os RNFs aplicaveis; o RF59 tambem contempla o envio posterior quando a sincronizacao estiver ativa. |
| **Condicional** | RF01 a RF06 e RF31 | Depende de conta e recuperacao de acesso; o uso financeiro local nao depende desses fluxos. |
| **Proposto ou posterior** | RF22 a RF30, RF51 a RF54, RF56, RF65 a RF67 | Requer priorizacao, validacao ou planejamento de release posterior. |
| **Fora do MVP (Won't have now)** | RF21, RF47, RF48, RF49, RF50, RF60, RF63 e RF64 | Importação, consolidação, extração, anexos de comprovantes e backup por arquivo foram retirados do escopo atual. |

O agrupamento acima e uma sintese de escopo, nao altera a situacao dos requisitos no catalogo. RF58 e RF59 estao confirmados no MVP. RF37, RF38 e RF46 utilizam as preferencias configuradas no RF58.

---

## 2. Matriz de Rastreabilidade Resumida

Esta matriz relaciona os RFs selecionados na seção 1.3 aos RNFs do [catálogo de requisitos não funcionais](requisitos_nao_funcionais.md). Os nomes dos RFs seguem o [catálogo de requisitos funcionais](requisitos_funcionais.md). A matriz distingue os requisitos transversais das associações específicas, evitando atribuir a todas as funções de um grupo uma relação que só existe para algumas delas.

As associações específicas reproduzem a coluna **Aplica-se a** do catálogo, incluindo os intervalos de códigos. A ausência de associação específica significa que o catálogo não declara um vínculo individual; os requisitos transversais continuam aplicáveis conforme seu escopo. Esta síntese não cria requisitos nem altera a seleção do MVP.

**Legenda:** o asterisco (`*`) identifica RNF com situação **Proposto**, ainda pendente de confirmação. A presença na matriz não significa validação, implementação ou entrega. Os demais RNFs relacionados estão **Vigentes** no catálogo; suas ressalvas de aplicação continuam valendo.

### 2.1 Requisitos transversais

Estes RNFs têm aplicação declarada ao sistema e complementam a tabela por RF. As exceções e condições abaixo devem ser observadas; não se presume que toda operação local utiliza a rede.

| RNF | Propriedade ou restrição | Aplicação e ressalvas |
| :--- | :--- | :--- |
| RNF03 | Isolar dados privados | Sistema |
| RNF14 | Explicar operações rejeitadas | Sistema |
| RNF19 | Proteger dados em trânsito | Comunicação com o Firebase, quando utilizada; não exige conexão para as operações locais. |
| RNF20 (proposto) | Adaptar interface a telas | Sistema |
| RNF21 (proposto) | Assegurar compatibilidade de plataformas | Sistema |
| RNF24 | Adotar tecnologias definidas | Sistema |
| RNF25 | Criptografar dados armazenados | Sistema |
| RNF28 | Organizar módulos da aplicação | Sistema |
| RNF30 | Acessar o servidor pela biblioteca oficial | Comunicação com o Firebase, quando utilizada, e versionamento e testes das Security Rules. |
| RNF34 | Operar sem conexão | Funcionalidades individuais sem rede; o catálogo excetua RF01, RF22 a RF25, RF31 e RF51. No recorte atual, RF01 e RF31 sao fluxos condicionais de conta e recuperação, não operações do núcleo local. |
| RNF37 | Publicar sob licença livre | Sistema |
| RNF38 | Aplicar paleta de cores definida | Sistema |
| RNF39 (proposto) | Proteger acesso local | Sistema; bloqueio opcional pela autenticação do aparelho, sem exigir conta nem conexão. |

### 2.2 Associações específicas por requisito funcional

Cada linha contém somente os RNFs que citam aquele RF na coluna **Aplica-se a**, além dos transversais da seção anterior. RNFs específicos propostos são identificados por asterisco.

| Requisito funcional | Nome | RNFs específicos associados |
| :--- | :--- | :--- |
| **RF01** | Cadastrar usuário | RNF01, RNF04, RNF32\*, RNF33\* |
| **RF02** | Autenticar usuário | RNF33\* |
| **RF03** | Visualizar perfil de usuário | RNF02, RNF32\* |
| **RF04** | Editar perfil de usuário | RNF01, RNF02, RNF04, RNF32\* |
| **RF05** | Excluir perfil de usuário | RNF02, RNF16\*, RNF32\* |
| **RF06** | Encerrar sessão | RNF02 |
| **RF07** | Registrar receita | RNF04, RNF05, RNF08\*, RNF27\*, RNF33\*, RNF35 |
| **RF08** | Consultar receitas | RNF08\* |
| **RF09** | Editar receita | RNF05, RNF08\*, RNF35 |
| **RF10** | Excluir receita | RNF05, RNF08\*, RNF16\*, RNF35 |
| **RF11** | Calcular total de receitas | RNF07, RNF08\*, RNF29 |
| **RF12** | Criar meta financeira | RNF04 |
| **RF13** | Editar meta financeira | RNF04, RNF16\* |
| **RF14** | Excluir meta financeira | RNF16\* |
| **RF15** | Registrar despesa | RNF04, RNF05, RNF08\*, RNF27\*, RNF33\*, RNF35 |
| **RF16** | Consultar despesas | RNF08\* |
| **RF17** | Editar despesa | RNF05, RNF08\*, RNF35 |
| **RF18** | Excluir despesa | RNF05, RNF08\*, RNF16\*, RNF35 |
| **RF19** | Criar categoria de despesas | RNF04 |
| **RF20** | Visualizar metas financeiras | Sem associação específica declarada; aplicam-se os transversais. |
| **RF31** | Recuperar senha | RNF01 |
| **RF32** | Definir lançamento recorrente | RNF05, RNF35 |
| **RF33** | Editar ocorrência de lançamento recorrente | RNF05, RNF35 |
| **RF34** | Calcular saldo mensal | RNF07, RNF08\*, RNF29 |
| **RF35** | Exibir saldo do mês anterior | RNF07 |
| **RF36** | Acompanhar progresso da meta | RNF07, RNF29 |
| **RF37** | Notificar aproximação do limite | RNF29 |
| **RF38** | Notificar ultrapassagem do limite | RNF29 |
| **RF39** | Exibir indicador de consumo do limite da categoria | RNF29 |
| **RF40** | Gerar resumo financeiro inicial | RNF33\* |
| **RF41** | Exibir gráfico de despesas | RNF07 |
| **RF42** | Exibir percentual por categoria | RNF07 |
| **RF44** | Conceder conquistas financeiras | Sem associação específica declarada; aplicam-se os transversais. |
| **RF45** | Atribuir pontuação por metas | RNF22\* |
| **RF46** | Notificar conquista obtida | Sem associação específica declarada; aplicam-se os transversais. |
| **RF55** | Apresentar tutorial inicial | Sem associação específica declarada; aplicam-se os transversais. |
| **RF58** | Configurar notificações | Sem associação específica declarada; aplicam-se os transversais. |
| **RF59** | Registrar lançamento sem conexão | RNF26, RNF35, RNF36 |

### 2.3 Ressalvas e dependências para revisão

- **Autenticação e uso local:** pela [D21](decisoes.md#d21), o RNF02 vale apenas na sincronização e no acesso aos dados compartilhados; no recorte do MVP, aplica-se aos RF03 a RF06. O acesso local é tratado pelos RNF25 e RNF39, e a RN06 deixou de ter regra de precedência.
- **Gamificação individual e classificação em grupo:** RNF22 cita RF45, mas seu prazo de atualização se refere à classificação do grupo (RF30), fora do MVP atual. A relação foi preservada por constar no catálogo; não implica incluir grupos no MVP nem aplicar esse prazo à pontuação exclusivamente local.
- **Alertas e tutorial:** não há RNF específico associado a RF55 na coluna **Aplica-se a**; valem os transversais. RF37 e RF38 têm vínculo específico com RNF29. As condições de disparo e o conteúdo dos alertas estão nos próprios RFs e na RN03, e não no RNF18, que trata da restauração do backup do servidor.
- **Preferencias de notificacao:** RF58 e um requisito vigente do MVP e configura as preferências utilizadas pelos RF37, RF38 e RF46.
- **Backup e recuperação:** RNF17 e RNF18 tratam apenas dos dados sincronizados no Cloud Firestore e não se aplicam aos RFs do recorte. Quem usa o app sem conta recupera os dados pelo arquivo do RF63 (RNF40), e RF61 a RF64 estão fora do recorte da seção 1.3.
- **Códigos retirados:** RNF06, RNF13, RNF15 e RNF23 não são usados como requisitos ativos nesta matriz. Seus destinos constam no catálogo.

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 29/09/2026 | Adiciona escopo do mvp | Natan França |
| 1.1 | 05/10/2026 | Adiciona matriz de priorização do mvp | Natan França |
| 1.2 | 05/10/2026 | Altera numeração e corrige requisito que estava em falta | Natan França |
| 1.3 | 05/10/2026 | Adiciona grafico de esforço x valor | Natan França |
| 1.4 | 08/10/2026 | Relaciona os topicos do mvp com os IDs dos requisitos priorizados | Natan França |
| 1.5 | 27/10/2026 | Corrige cálculo da priorização do MVP | Caio Pacheco |
| 1.6 | 31/10/2026 | Usa priorizacao.csv como fonte única das notas de priorização | Bruno Duarte |
| 1.7 | 31/10/2026 | Tema escuro, consulta flutuante, leitura contínua e atas em blog | Bruno Duarte |
| 1.8 | 03/11/2026 | Inclui o histórico de versões | Bruno Duarte |
| 1.9 | 04/11/2026 | Corrige a matriz RF–RNF conforme o catálogo atual, separa requisitos transversais e específicos e explicita propostas e pendências de aplicação (issue #19). | Erick Alves |
| 1.10 | 04/11/2026 | Move o código do gráfico de priorização para arquivo JavaScript carregado pelo MkDocs e inclui orientação para prévias sem suporte a scripts. | Erick Alves |
| 1.11 | 07/11/2026 | Atualiza a matriz RF–RNF conforme a revisão dos RNFs da D21 (issue #21) | Dante Scarpati |
| 1.12 | 10/11/2026 | Corrige a classificacao do RF31, alinha o recorte a arquitetura local-first da D20 e explicita fluxos condicionais e limites do MVP. | Equipe UniCash |
| 1.14 | 10/11/2026 | Define o MkDocs como referencia da priorizacao e corrige o RF58 como requisito vigente do nucleo do MVP. | Equipe UniCash |
| 1.15 | 10/11/2026 | Classifica importacao e exportacao como Won't have now e alinha os limites do MVP. | Equipe UniCash |
| 1.13 | 10/11/2026 | Inclui o RF59 no MVP como requisito confirmado de registro local e sincronização opcional. | Equipe UniCash |
