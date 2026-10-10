# Definition of Ready e Definition of Done

Este documento define os critérios de entrada e de saída dos casos de uso e itens do Backlog do Produto do UniCash. Os critérios apoiam o refinamento, o fluxo de trabalho no Kanban e a validação das entregas nos timeboxes.

## DoR (Definition of Ready) — Filtro de Entrada

Para que um caso de uso seja movido para **Pronto para Desenvolvimento**, todos os itens abaixo devem estar marcados durante o refinamento.

### Dimensão de Clareza

- [ ] O ator e o objetivo de negócio estão descritos e são compreendidos de forma inequívoca por toda a equipe.
- [ ] Todas as regras de negócio relacionadas ao item estão catalogadas e vinculadas ao requisito correspondente.
- [ ] As dependências técnicas (APIs, integrações e banco de dados) e os impedimentos de infraestrutura (acessos e ambientes) foram identificados e não bloqueiam o início do desenvolvimento.

### Dimensão de Estimabilidade

- [ ] O fluxo principal, os fluxos alternativos e os fluxos de exceção do caso de uso estão descritos com profundidade suficiente para estimar esforço e complexidade.

### Dimensão de Escopo

O item passa no checklist **INVEST**. Caso não passe em algum critério, há uma justificativa registrada.

- [ ] **Independente:** o item pode ser desenvolvido, testado e entregue sem depender de outro item ainda não concluído.
- [ ] **Negociável:** a descrição não é um contrato fechado; os detalhes de solução podem ser discutidos entre equipe e cliente até a entrega.
- [ ] **Valiosa:** entrega valor claro e perceptível para a cliente ou para o negócio.
- [ ] **Estimável:** a equipe possui informação suficiente para estimar o esforço com razoável confiança.
- [ ] **Pequena (Small):** o item é pequeno o bastante para ser planejado e concluído dentro de uma única iteração.
- [ ] **Testável:** possui critérios de aceitação claros, que permitem verificar objetivamente se foi implementado corretamente.

## DoD (Definition of Done) — Filtro de Saída

O **Nível 1** deve ser preenchido pelos responsáveis técnicos antes de solicitar o merge ou review. O **Nível 2** só é preenchido depois de validado com a cliente.

### Nível 1 — Done Técnico (pronto para homologação)

#### Completude funcional

- [ ] O fluxo principal, os fluxos alternativos e os fluxos de exceção foram 100% implementados no código.
- [ ] Os cenários de exceção e caminhos tristes (edge cases) possuem tratamento de erro com feedback amigável, sem quebras bruscas.

#### Qualidade técnica e testes

- [ ] O pipeline de CI/CD foi executado com sucesso, verificando build, testes automatizados e linting, sem alertas críticos.
- [ ] Os testes automatizados cobrem o caminho feliz e os principais edge cases, respeitando a cobertura mínima definida para o projeto.
- [ ] O code review foi aprovado por, no mínimo, um par da equipe.

#### Integração, documentação e evidências

- [ ] Os fluxos foram validados por print ou vídeo, anexado ao item de trabalho.
- [ ] A rastreabilidade vertical (requisito → caso de uso → código → teste) foi mantida e atualizada na ferramenta de gestão.
- [ ] A documentação técnica foi atualizada no Portal Orc.
- [ ] O código foi integrado à branch principal sem conflitos, com o pipeline de build validado e deploy executado com sucesso no ambiente de Homologação/Staging.

### Nível 2 — Done de Negócio (finalizado)

- [ ] O UAT (Teste de Aceitação do Usuário) foi realizado com a cliente, com o valor entregue pela funcionalidade claramente demonstrado.
