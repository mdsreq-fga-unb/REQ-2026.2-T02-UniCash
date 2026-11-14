# Status dos casos de uso a partir do GitHub — design

Data: 14/11/2026 · Autor: Bruno Duarte

## Intenção

O professor precisa comprovar, no site do projeto, o que já foi implementado em cada caso de uso. A prova é o rastro verificável no GitHub (PR integrado, branch, data, CI), e não um status declarado à mão. Hoje o site não mostra nada disso: o hook `rastreabilidade.py` tem o campo `status_implementacao`, mas ele vem de um CSV que não existe, e todo caso de uso aparece como "Não informado".

## Objetivos

- Em cada caso de uso da página [Casos de uso](../../../unicash/docs/casos_de_uso.md), mostrar um quadro de status com links para a issue e os PRs, a branch de destino, a data do merge e o resultado do CI.
- Preencher `status_implementacao` com um status derivado desses dados, para que a coluna de status do catálogo (`catalogo.js`) e a página gerada de cada UC em `consulta/` também mostrem o status.
- Manter os dados atualizados sem depender de alguém dar push na branch `docs`.

## Fora do escopo

- A coluna do quadro de casos de uso (Project 130). Exige um token pessoal e mostra só um status declarado. Pode entrar depois.
- Status de RFs individuais. Só casos de uso.
- Releases e APK. Ainda não existem; o nível "Publicado" usa a `main`.

## O que não pode acontecer

- O build do site quebrar porque a API do GitHub falhou, o token faltou ou o limite de consultas acabou. O deploy usa `mkdocs build --strict`, então nada disso pode virar aviso (`log.warning`): usar `log.info`.
- Mostrar um status sem o link que o comprova.
- Expor um token no site, nos logs ou no JSON publicado.

## Abordagens consideradas

| Abordagem | Vantagens | Desvantagens |
|---|---|---|
| **A. Hook busca no GitHub durante o build (escolhida)** | Usa só dados públicos e verificáveis; funciona com o `GITHUB_TOKEN` do Actions; reaproveita o hook e a coluna de status existentes; deixa um registro datado | Precisa de um workflow na `main` para reconstruir o site periodicamente |
| B. A + coluna do Project 130 | Mostra a coluna do quadro (por exemplo "Test") | Exige token pessoal como secret; o quadro é status declarado, não prova |
| C. Consulta no navegador ao abrir a página | Sempre atual, sem rebuild | Limite de 60 consultas por hora por visitante; não lê o quadro privado; sem registro datado |

Bruno escolheu a A em 14/11/2026.

## Como funciona

### Dados que entram

Para cada código `UCnn` encontrado em `casos_de_uso.md`:

1. **Issue do caso de uso:** a issue do repositório `mdsreq-fga-unb/REQ-2026.2-T02-UniCash` cujo título começa com `UCnn` (exemplo: `UC01 - Gerenciar receitas`, #28). Se houver mais de uma, usar a de menor número e registrar no log.
2. **PRs ligados:** os PRs que fecham a issue (`closingIssuesReferences`, já usado pelo PR #48 em relação à #28) e os que a citam (evento `CrossReferencedEvent` na timeline da issue). De cada PR: número, título, link, estado (aberto, integrado, fechado sem merge), branch de destino, data do merge, autor e o resultado do CI do último commit (`statusCheckRollup`).
3. **Chegou na `main`?** Para cada PR integrado em outra branch, verificar se o commit de merge já está na `main` (API de comparação `main...<sha>`: `behind` ou `identical` significa que está).

Tudo numa consulta GraphQL para as issues e PRs, mais uma comparação REST por PR integrado. Hoje são 9 casos de uso, então o custo é baixo.

### Status derivado

Vale o PR mais avançado:

| Situação | Status |
|---|---|
| Não existe issue com o código | Sem issue |
| Issue sem PR ligado | Planejado |
| Algum PR aberto, nenhum integrado | Em desenvolvimento |
| PR integrado na `develop` (ou outra branch que não a `main`) | Implementado na develop |
| Commit de merge presente na `main` | Publicado na main |

O estado da issue **não** define o status. Uma issue continua aberta quando o PR é integrado na `develop`, porque o GitHub só fecha a issue sozinho quando o merge vai para a branch padrão. O quadro mostra o estado da issue como informação, ao lado do status.

### O que aparece no site

Na página Casos de uso, logo abaixo do título de cada UC:

```
┌───────────────────────────────────────────────────────────────┐
│ ● Implementado na develop                                       │
│ Issue #28 · aberta · responsável: Natan8643                     │
│ PR #48 "Uc01 gerenciar receitas" · integrado na develop         │
│        em 09/11/2026 · CI: falhou ✗ / passou ✓ / sem CI          │
│ Dados do GitHub de 14/11/2026 09:00                             │
└───────────────────────────────────────────────────────────────┘
```

- Os números de issue e PR são links para o GitHub.
- A cor do selo de status segue a classe `catalogo-status-<slug>` já usada pelo catálogo, com as cores novas no CSS.
- Na página gerada `consulta/ucNN.md`, o mesmo quadro entra como selo e lista de evidências.
- Na coluna de status do catálogo, o texto do status derivado.
- Os dados brutos vão para `consulta/dados/github.json`, com a data da coleta, para quem quiser conferir.

### Quando os dados não vêm

Ordem de tentativa:

1. API do GitHub com o token de `GITHUB_TOKEN` (ou `GH_TOKEN`) do ambiente.
2. Se falhar ou não houver token: baixar o `consulta/dados/github.json` já publicado no GitHub Pages e reaproveitá-lo. O quadro mostra a data antiga da coleta.
3. Se nada funcionar: status "Não informado" e o quadro diz "Dados do GitHub indisponíveis neste build".

Em todos os casos, o build continua. No computador da equipe, sem token, o resultado é o passo 2 ou o 3; quem quiser os dados reais roda `GITHUB_TOKEN=$(gh auth token) mkdocs serve`.

O CSV `docs/dados/status_casos_de_uso.csv` deixa de ser lido. A doc no topo do hook é atualizada.

### Atualização automática

- **Deploy (branch `docs`, `deploy-pages.yml`):** o passo "Construir o site" recebe `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` no `env`, e o job recebe as permissões `issues: read`, `pull-requests: read` e `checks: read`, além das que já tem.
- **Novo workflow na `main` (`atualizar-site.yml`):** agendamentos e eventos de issue e PR só disparam workflows da branch padrão, por isso ele fica na `main`. Gatilhos: a cada 6 horas (`schedule`), PR fechado (`pull_request: closed`), issue aberta, editada, fechada ou reaberta, e manual (`workflow_dispatch`). O único passo roda `gh workflow run deploy-pages.yml --ref docs`, com permissão `actions: write`. Disparos por `workflow_dispatch` com o `GITHUB_TOKEN` são permitidos pelo GitHub. O `concurrency` do deploy já cancela builds repetidos.

São duas PRs: uma para a `docs` (hook, CSS, deploy) e uma para a `main` (workflow de atualização).

## Código

- Novo módulo `unicash/hooks/github_status.py`, com a coleta, o status derivado e o fallback, sem dependência do MkDocs, para poder ser testado sozinho. Usa só a biblioteca padrão (`urllib`, `json`), sem dependência nova no `requirements.txt`.
- `rastreabilidade.py` chama o módulo em `on_config` (no lugar de `ler_status_uc`), publica `github.json` em `on_files`, inclui o quadro na página gerada de cada UC e, em `on_page_markdown` de `casos_de_uso.md`, insere o quadro após cada título `## UCnn`.
- O hook é carregado pelo MkDocs a partir do arquivo. O import do módulo vizinho precisa adicionar a pasta `hooks/` ao `sys.path`, ou o código fica num arquivo só. **Decisão do construtor.**
- Testes com `unittest` para o status derivado e o fallback, com respostas da API gravadas em JSON.

## Deixado ao construtor

- O formato exato do HTML e do CSS do quadro, desde que siga o esboço e as cores do site no modo claro e no escuro.
- Timeout das chamadas (sugestão: 10 segundos no total) e paginação.
- O texto exato dos rótulos de CI.
