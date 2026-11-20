# Riscos do projeto

A análise de riscos estava prevista desde a Viabilidade ([seção 5.1](engenharia_de_requisitos.md)), com Leonardo (Gerenciador de *Timebox*) e Caio (Coordenador Técnico) como responsáveis, mas não tinha registro até 14/11/2026. Esta primeira lista foi elaborada nessa data, com prioridade para as consequências da arquitetura local-first ([D20](decisoes.md#d20)): armazenamento no aparelho, sincronização opcional, uso sem conta e recuperação dos dados.

A lista é uma **proposta da equipe**. Ela deve ser revisada na Revisão e validação (13/11/2026 a 19/11/2026) e, depois, a cada fechamento de timebox, quando a situação de cada risco é atualizada nesta página e no [cronograma](cronograma.md#planejamento-e-fechamento-dos-timeboxes).

## Escala

| Nível | Probabilidade | Impacto |
|---|---|---|
| **Alta** | Deve ocorrer no semestre se nada for feito | Compromete o MVP, os dados do usuário ou uma entrega da disciplina |
| **Média** | Pode ocorrer no semestre | Exige replanejar um timebox ou retrabalhar requisitos |
| **Baixa** | Pouco provável no semestre | Causa atraso ou retrabalho localizado |

## Lista de riscos

| ID | Risco | Probabilidade | Impacto | Gatilho | Mitigação | Responsável | Situação |
|---|---|---|---|---|---|---|---|
| R01 | **Perda dos dados de quem usa o app sem conta.** Com o backup por arquivo retirado do escopo ([D23](decisoes.md#d23)), troca, perda ou reinstalação do aparelho apaga os dados de quem não sincroniza ([RF61](requisitos_funcionais.md#rf61), RNF40). | Alta | Alta | Usuário sem conta troca ou formata o aparelho | Avisar no primeiro uso e nas configurações que, sem conta, os dados ficam só no aparelho; levar à cliente a decisão entre manter esse limite ou devolver o backup por arquivo (RF63, RF64) ao escopo | Natan (Visionário), com a cliente | Aberto |
| R02 | **Conflito de sincronização.** Alterações feitas offline em dois aparelhos podem se sobrepor e apagar um lançamento. | Média | Alta | Mesmo usuário edita o mesmo registro em dois aparelhos antes de sincronizar | Combinação por campo com relógio lógico híbrido (RN07, [seção 2.4](solucao.md#24-tecnologias-a-serem-utilizadas)); testes automatizados dos casos de conflito antes de liberar a sincronização | Caio (Coordenador Técnico) | Aberto |
| R03 | **Corrupção ou perda parcial da base local.** Uma falha na gravação no SQLite pode deixar saldo e lançamentos inconsistentes. | Baixa | Alta | App encerrado ou bateria esgotada durante uma gravação | Gravação atômica, com sucesso informado só após a confirmação (RNF35); testes de atomicidade, já existentes para o UC01 ([PR #48](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/48)) | Caio (Coordenador Técnico) | Mitigação em andamento |
| R04 | **Exposição de dados financeiros no aparelho ou na nuvem.** Dados pessoais e financeiros são protegidos pela LGPD. | Média | Alta | Aparelho compartilhado ou perdido; regra de acesso mal escrita no Firestore | Bloqueio local (RNF39) e criptografia (RNF25); Security Rules testadas no Firebase Emulator ([PR #50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/50)); política de privacidade sem venda de dados ([seção 2.5](solucao.md#25-pesquisa-de-mercado-e-analise-competitiva)) | Caio (Coordenador Técnico) | Aberto |
| R05 | **Pouca experiência da equipe com React Native, Expo e Firebase.** | Alta | Média | Casos de uso do Timebox 5 sem pull request até a metade do timebox | Ambiente padronizado em Docker e Expo Go ([PR #33](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/33)); usar o UC01 como referência de estrutura e de testes; cortar *Could have* antes de *Should have* | Leonardo (Gerenciador de *Timebox*) | Aberto |
| R06 | **Escopo do Timebox 5 maior que a capacidade.** O Timebox 5 concentra CP2, CP3, CP4, CP6 e CP8, e o UC02 já foi transferido do Timebox 4. | Alta | Alta | Estimativas da Revisão e validação acima da capacidade dos 10 dias | Repriorização MoSCoW com a cliente na Revisão e validação; corte registrado no [Registro de decisões](decisoes.md) | Leonardo (Gerenciador de *Timebox*) | Aberto |
| R07 | **Validação do problema e do MVP apoiada em poucas pessoas.** As técnicas de observação (diário financeiro, entrevista contextual, teste de protótipo) dependem de recrutamento. | Média | Alta | Menos de cinco estudantes e três representantes de famílias recrutados até 12/11/2026 | Recrutamento pela cliente e pelas representantes; versão reduzida das técnicas, com o corte registrado no Registro de decisões ([cronograma](cronograma.md#tecnicas-de-er-previstas-no-processo)) | Leonardo, com a cliente | Aberto: recrutamento sem registro em 14/11/2026 |
| R08 | **Indisponibilidade da cliente e das representantes** para as revisões de timebox. | Média | Média | Revisão de timebox sem data marcada até o fechamento | Agendar a revisão na abertura do timebox; aceitar validação assíncrona por escrito, registrada em ata | Natan (Visionário) | Aberto |
| R09 | **Decisões de arquitetura e escopo sem conhecimento da cliente.** As D18 a D21 e a D23 não têm registro de comunicação à cliente. | Alta | Média | Cliente discorda de uma decisão já implementada | Apresentar as decisões na Revisão e validação e registrar a comunicação em ata ([Pendências do registro](decisoes.md#pendencias-do-registro)) | Natan (Visionário) | Aberto |
| R10 | **Código integrado sem revisão nem testes no pipeline.** | Alta | Média | Pull request integrado sem aprovação ou com CI falhando | Exigir revisão aprovada e CI verde na proteção das branches; incluir os testes no pipeline ([Evidências de construção](cronograma.md#evidencias-de-construcao)) | Bruno (Facilitador) | Aberto |

## Histórico de versões

| Versão | Data | Descrição | Autor |
|---|---|---|---|
| 1.0 | 14/11/2026 | Cria a lista de riscos com as consequências da arquitetura local-first (issue #17) | Bruno Duarte |
