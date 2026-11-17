# Definition of Ready e Definition of Done

Este documento define os critérios de entrada e de saída dos casos de uso e itens do Backlog do Produto do UniCash. Os critérios apoiam o refinamento, o fluxo de trabalho no Kanban e a validação das entregas nos timeboxes.

Os registros que comprovam a aplicação do DoR estão organizados em
[Evidências da Definition of Ready](evidencias_dor.md), separadamente dos
critérios desta página.

Os registros que comprovam a aplicação do DoD estão organizados em
[Evidências da Definition of Done](evidencias_dod.md), separadamente dos
critérios desta página.

## DoR (Definition of Ready) — Filtro de Entrada

Para que um caso de uso seja movido para **Pronto para Desenvolvimento**, todos os itens abaixo devem estar marcados durante o refinamento.

### Dimensão de Clareza

- [ ] O ator e o objetivo de negócio estão descritos e são compreendidos de forma inequívoca por toda a equipe.
- [ ] Todas as regras de negócio relacionadas ao item estão catalogadas e vinculadas ao requisito correspondente.
- [ ] As dependências técnicas (APIs, integrações e banco de dados) e os impedimentos de infraestrutura (acessos e ambientes) foram identificados e não bloqueiam o início do desenvolvimento.
- [ ] O responsável pelo Caso de Uso e seu revisor conseguiram compreender o que está escrito no caso de uso. Caso alguém não tenha compreendido, foi adicionado uma justificativa.

### Dimensão de Estimabilidade

- [ ] O fluxo principal, os fluxos alternativos e os fluxos de exceção do caso de uso estão descritos com profundidade suficiente para estimar esforço e complexidade.

### Dimensão de Escopo

- [ ] A descrição do caso de uso não é um contrato fechado; os detalhes de solução podem ser discutidos entre equipe e cliente até a entrega.
- [ ] O caso de uso entrega valor claro e perceptível para a cliente ou para o negócio.
- [ ] A equipe possui informação suficiente para estimar o esforço com razoável confiança.
- [ ] O caso de uso possui checklists técnicos claros, que permitem a implementação paralela (duas frentes diferentes) e verificar objetivamente se foi implementado corretamente.

### Tratamento de dependências planejadas

Quando um caso de uso depende de outro que ainda não foi concluído, de um requisito que ainda não tem caso de uso ou de um acesso ou ambiente ainda não disponível, a dependência é registrada no próprio caso de uso, com a forma de tratá-la, em vez de ser dispensada com uma justificativa genérica. O checklist técnico é o instrumento que facilita o desenvolvimento nesses casos: o contrato definido nele (modelo de dados, funções de cálculo compartilhadas, formato das mensagens e eventos) é aprovado no início do timebox, e as duas frentes e os casos de uso dependentes trabalham em paralelo sobre esse mesmo contrato, usando dados de teste ou versões simuladas até que a implementação real fique pronta. O que só pode ser verificado depois que a dependência for concluída fica explícito no caso de uso, como integração posterior, e nos testes marcados do checklist, e não impede que o item seja considerado pronto para desenvolvimento. Dependências sem solução definida são registradas como pendência, com a decisão correspondente.

## DoD (Definition of Done) — Filtro de Saída

O **Nível 1** deve ser preenchido pelos responsáveis técnicos antes de solicitar o review e o merge. O **Nível 2 e o Nível 3** só devem ser preenchidos depois de validados com a cliente.

### Nível 1 — Done Técnico (implementado e pronto para review e homologação)

#### Completude funcional

- [ ] O fluxo principal, os fluxos alternativos e os fluxos de exceção foram 100% implementados no código.
- [ ] Os cenários de exceção e caminhos tristes (edge cases) possuem tratamento de erro com feedback amigável, sem quebras bruscas.

#### Qualidade técnica e testes

- [ ] O pipeline de CI/CD foi executado com sucesso, verificando build, testes automatizados e linting, sem alertas críticos.
- [ ] O pull request traz uma tabela ligando cada fluxo do caso de uso (principal, alternativos e de exceção) e cada regra de negócio (RN) afetada ao teste que a verifica, e nenhum item da tabela está sem teste.
- [ ] Cada regra de negócio (RN) implementada ou alterada tem teste para o caso válido, para o caso inválido e para os valores-limite (por exemplo, valor zero, limite exato de gasto, campos obrigatórios vazios, centavos).

#### Integração, documentação e evidências

- [ ] Os checklists técnicos foram totalmente preenchidos.
- [ ] Há evidência anexada ao pull request (relatório ou log de testes, prints) dos testes de **precisão** (valores em centavos inteiros, sem erro de arredondamento) e de **isolamento** (os dados de um usuário não são acessíveis a outro, com o resultado do `test:rules` no Firebase Emulator), nos itens que se aplicam ao caso de uso.
- [ ] Há evidência de **persistência** e de **sincronização**, nos itens que se aplicam ao caso de uso: o relatório dos testes automatizados (SQLite em memória e Firebase mockado) e, além disso, prova manual feita no Expo Go ou no APK (prints ou vídeo curto) de que os dados continuam no SQLite local após fechar e reabrir o app e de que o envio e a restauração dos dados pelo Firebase funcionam de verdade.
- [ ] A rastreabilidade vertical (requisito → caso de uso → código → teste) foi mantida e atualizada na ferramenta de gestão.
- [ ] A documentação técnica foi atualizada no GitPages.

### Nível 2 — Done de Negócio (homologado e aprovado conforme os requisitos de negócio)

- [ ] O UAT (Teste de Aceitação do Usuário) foi realizado com a cliente, em aparelho real via Expo Go, com o valor entregue pela funcionalidade claramente demonstrado.

### Nível 3 — Done Definitivo (validado, aprovado e oficialmente entregue)

- [ ] O code review foi aprovado por, no mínimo, um representante técnico da equipe.
- [ ] O código foi integrado à branch principal sem conflitos.
- [ ] O CI (`Mobile CI`) está verde na branch principal, e a funcionalidade foi entregue em APK gerado pelo EAS Build (perfil `preview`) via tag `v*` (`Mobile Release`) ou pelo workflow manual `Mobile EAS Build`, com o link do build registrado no PR ou na release. Como o UniCash não tem API própria nem servidor, o "deploy" é esse APK; não há ambiente de Staging separado.

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 10/10/2026 | Adiciona dor e dod | Natan França |
| 1.1 | 23/10/2026 | Corrige checklist do DoR | Natan França |
| 1.2 | 23/10/2026 | Corrige o fluxo e a clareza do DoD | Natan França |
| 1.3 | 31/10/2026 | Corrige gramaticalmente o texto | Natan França |
| 1.4 | 03/11/2026 | Inclui o histórico de versões | Bruno Duarte |
