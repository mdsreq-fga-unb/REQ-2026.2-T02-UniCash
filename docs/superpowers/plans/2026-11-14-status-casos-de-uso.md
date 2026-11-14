# Status dos casos de uso a partir do GitHub — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cada caso de uso do site mostra o status de implementação calculado a partir de issues, PRs, merges e CI do GitHub, com links que comprovam.

**Architecture:** um módulo Python novo (`github_status.py`) coleta os dados pela API do GitHub, calcula o status e monta o HTML; o hook `rastreabilidade.py` chama o módulo no build do MkDocs. Um workflow na `main` dispara o deploy da `docs` periodicamente e quando issues ou PRs mudam.

**Tech Stack:** Python 3 (biblioteca padrão: `urllib`, `json`, `zoneinfo`, `unittest`), MkDocs Material, GitHub GraphQL e REST, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-14-status-casos-de-uso-design.md`

## Global Constraints

- Sem dependência nova no `unicash/requirements.txt`.
- O build roda com `mkdocs build --strict`: nada deste código pode chamar `log.warning` ou `log.error`; usar `log.info`.
- Nenhum token pode aparecer no HTML, no JSON publicado ou nos logs.
- Repositório: `mdsreq-fga-unb/REQ-2026.2-T02-UniCash` (derivar de `repo_url` do `mkdocs.yml`).
- URL publicada do JSON: `https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-UniCash/consulta/dados/github.json`.
- Status, exatamente com estes textos: `Sem issue`, `Planejado`, `Em desenvolvimento`, `Implementado na develop`, `Publicado na main`, `Não informado`.
- Datas exibidas no fuso `America/Sao_Paulo`, formato `dd/mm/aaaa HH:MM`.
- Token lido de `GITHUB_TOKEN` ou, na falta dele, `GH_TOKEN`.
- Toda a comunicação do código (comentários, mensagens) em português, como o restante do hook.

## Review Focus

- **API fora do ar ou sem token no build local:** o site é construído com o JSON publicado ou com "Não informado"; nunca falha. Teste em Task 2.
- **PR fechado sem merge ligado à issue:** não conta como "Em desenvolvimento". Teste em Task 1.
- **UC no site sem issue no GitHub (UC07 a UC09, por exemplo) e issue `UCnn` que não existe no site:** a primeira vira "Sem issue"; a segunda é ignorada. Teste em Task 1 e Task 4.
- **Duas issues com o mesmo código:** usar a de menor número. Teste em Task 2.
- **JSON publicado antigo ou malformado:** se não for JSON válido com a chave `casos`, cair para "indisponível". Teste em Task 2.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `unicash/hooks/github_status.py` (novo) | Coleta na API, fallback, status derivado, HTML do quadro. Não importa nada do MkDocs. |
| `unicash/hooks/tests/test_github_status.py` (novo) | Testes `unittest` do módulo. |
| `unicash/hooks/tests/fixtures/graphql_issues.json` (novo) | Resposta GraphQL gravada para os testes. |
| `unicash/hooks/rastreabilidade.py` | Chama o módulo; troca o CSV pelo status do GitHub; publica `github.json`; insere o quadro. |
| `unicash/docs/stylesheets/consulta.css` | Cores dos novos status e estilo do quadro, claro e escuro. |
| `.github/workflows/deploy-pages.yml` (branch `docs`) | Passa o token e as permissões de leitura ao build. |
| `.github/workflows/atualizar-site.yml` (branch `main`, novo) | Dispara o deploy da `docs`. |

Rodar os testes a partir de `unicash/`: `python3 -m unittest discover -s hooks/tests -v`.

## Formato dos dados

`carregar()` devolve, e `github.json` publica, este dicionário:

```json
{
  "coletado_em": "2026-11-14T09:00:00-03:00",
  "fonte": "api",
  "casos": {
    "UC01": {
      "status": "Implementado na develop",
      "issue": {"numero": 28, "url": "https://github.com/.../issues/28", "estado": "OPEN", "responsaveis": ["Natan8643"]},
      "prs": [
        {"numero": 48, "titulo": "Uc01 gerenciar receitas", "url": "https://github.com/.../pull/48",
         "estado": "MERGED", "base": "develop", "integrado_em": "2026-11-09T18:00:00Z",
         "ci": "SUCCESS", "na_main": false}
      ]
    }
  }
}
```

`fonte` vale `api`, `publicado` ou `indisponivel`. `ci` vale `SUCCESS`, `FAILURE`, `ERROR`, `PENDING`, `EXPECTED` ou `null`. `coletado_em` é `null` quando `fonte` é `indisponivel`.

---

### Task 1: Status derivado

**Files:**
- Create: `unicash/hooks/github_status.py`
- Create: `unicash/hooks/tests/test_github_status.py`

**Interfaces:**
- Produces: `derivar_status(caso: dict | None) -> str`, em que `caso` tem as chaves `issue` e `prs` do formato acima; constantes `SEM_ISSUE`, `PLANEJADO`, `EM_DESENVOLVIMENTO`, `IMPLEMENTADO`, `PUBLICADO`, `NAO_INFORMADO` com os textos das Global Constraints.

- [ ] **Step 1: Escrever os testes que falham**

```python
class TestDerivarStatus(unittest.TestCase):
    def pr(self, **k): return {"estado": "OPEN", "base": "develop", "na_main": False, **k}
    def test_sem_issue(self):            self.assertEqual(derivar_status({"issue": None, "prs": []}), "Sem issue")
    def test_none_e_nao_informado(self): self.assertEqual(derivar_status(None), "Não informado")
    def test_issue_sem_pr(self):         self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": []}), "Planejado")
    def test_pr_aberto(self):            self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr()]}), "Em desenvolvimento")
    def test_pr_fechado_sem_merge_nao_conta(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="CLOSED")]}), "Planejado")
    def test_merge_na_develop(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED")]}), "Implementado na develop")
    def test_merge_presente_na_main(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED", na_main=True)]}), "Publicado na main")
    def test_merge_direto_na_main(self):
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": [self.pr(estado="MERGED", base="main")]}), "Publicado na main")
    def test_vale_o_pr_mais_avancado(self):
        prs = [self.pr(), self.pr(estado="MERGED"), self.pr(estado="CLOSED")]
        self.assertEqual(derivar_status({"issue": {"numero": 1}, "prs": prs}), "Implementado na develop")
```

- [ ] **Step 2: Rodar e ver falhar** — `python3 -m unittest discover -s hooks/tests -v` → `ModuleNotFoundError: github_status`. O teste adiciona `hooks/` ao `sys.path` antes do import.

- [ ] **Step 3: Implementar `derivar_status` em `github_status.py`.** Ordem de prioridade: `PUBLICADO` > `IMPLEMENTADO` > `EM_DESENVOLVIMENTO` > `PLANEJADO`.

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `git add unicash/hooks && git commit -m "feat(site): calcula o status do caso de uso a partir dos PRs"`

### Task 2: Coleta na API e fallback

**Files:**
- Modify: `unicash/hooks/github_status.py`
- Create: `unicash/hooks/tests/fixtures/graphql_issues.json`
- Modify: `unicash/hooks/tests/test_github_status.py`

**Interfaces:**
- Consumes: `derivar_status` (Task 1).
- Produces:
  - `coletar(repo: str, token: str, codigos: list[str], timeout: float = 10.0) -> dict` — devolve `{"coletado_em", "fonte": "api", "casos"}` só com os códigos pedidos; código sem issue vira `{"status": "Sem issue", "issue": None, "prs": []}`. Lança exceção em qualquer falha de rede ou HTTP.
  - `carregar(repo: str, codigos: list[str], url_publicada: str) -> dict` — nunca lança. Tenta `coletar` (se houver token), depois baixa `url_publicada` (fonte `publicado`), depois devolve `{"coletado_em": None, "fonte": "indisponivel", "casos": {}}`. Registra no log (`log.info`) qual fonte foi usada, sem o token.
  - Funções internas de HTTP `_post_graphql(token, query, variaveis, timeout) -> dict` e `_get_json(url, token | None, timeout) -> dict`, as únicas que tocam a rede, para os testes as substituírem com `unittest.mock.patch`.

- [ ] **Step 1: Gravar a fixture.** Rodar a consulta GraphQL abaixo contra o repositório real com `gh api graphql` e salvar a resposta em `fixtures/graphql_issues.json`. Acrescentar à mão uma segunda issue `UC01` com número maior (para o teste de duplicata) e uma issue `UC99` (código inexistente no site).

```graphql
query($q: String!) {
  search(query: $q, type: ISSUE, first: 100) {
    nodes { ... on Issue {
      number title url state
      assignees(first: 10) { nodes { login } }
      closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ...Pr } }
      timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
        nodes { ... on CrossReferencedEvent { source { ... on PullRequest { ...Pr } } } }
      }
    } }
  }
}
fragment Pr on PullRequest {
  number title url state baseRefName mergedAt
  repository { nameWithOwner }
  mergeCommit { oid }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}
```

Variável: `q = "repo:<repo> is:issue UC in:title"`. Filtrar no Python pelos títulos que casam com `^(UC\d{2})\b`. PRs de outro repositório (`nameWithOwner` diferente) são descartados; PRs repetidos entre as duas listas aparecem uma vez só.

- [ ] **Step 2: Escrever os testes que falham**
  - `test_coletar_monta_caso_uc01`: com `_post_graphql` devolvendo a fixture e `_get_json` (comparação) devolvendo `{"status": "ahead"}`, `coletar(...)["casos"]["UC01"]` tem `issue.numero == 28`, um PR `48` com `base == "develop"`, `estado == "MERGED"`, `na_main is False` e `status == "Implementado na develop"`.
  - `test_coletar_na_main_quando_behind`: comparação devolvendo `{"status": "behind"}` → `status == "Publicado na main"`.
  - `test_coletar_duplicata_usa_menor_numero`: `UC01` usa a issue 28.
  - `test_coletar_ignora_codigo_fora_do_site`: `"UC99" not in casos`.
  - `test_coletar_uc_sem_issue`: pedindo `["UC01", "UC07"]` quando a fixture não tem `UC07` → `casos["UC07"]["status"] == "Sem issue"`.
  - `test_carregar_sem_token_usa_publicado`: sem `GITHUB_TOKEN` e `GH_TOKEN` no ambiente (`patch.dict(os.environ, {}, clear=True)`), `_get_json` devolvendo um JSON válido → `fonte == "publicado"` e `_post_graphql` não foi chamado.
  - `test_carregar_api_falha_usa_publicado`: `_post_graphql` lança `urllib.error.URLError` → `fonte == "publicado"`.
  - `test_carregar_tudo_falha`: as duas lançam → `{"coletado_em": None, "fonte": "indisponivel", "casos": {}}`.
  - `test_carregar_publicado_malformado`: `_get_json` devolve `{"x": 1}` → `fonte == "indisponivel"`.

- [ ] **Step 3: Rodar e ver falhar.**

- [ ] **Step 4: Implementar `coletar`, `carregar`, `_post_graphql`, `_get_json`.** Cabeçalhos: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `User-Agent: unicash-site`. Comparação: `GET https://api.github.com/repos/<repo>/compare/main...<oid>`; `behind` ou `identical` significa `na_main = True`; chamar só para PRs `MERGED` com base diferente de `main`. `coletado_em` em ISO 8601 no fuso `America/Sao_Paulo`.

- [ ] **Step 5: Rodar e ver passar.**

- [ ] **Step 6: Commit** — `git commit -m "feat(site): coleta issues e PRs dos casos de uso no GitHub, com fallback"`

### Task 3: HTML do quadro e estilo

**Files:**
- Modify: `unicash/hooks/github_status.py`
- Modify: `unicash/hooks/tests/test_github_status.py`
- Modify: `unicash/docs/stylesheets/consulta.css`

**Interfaces:**
- Produces:
  - `slug_status(status: str) -> str` — mesmo resultado do `slug()` de `catalogo.js` (minúsculas, sem acento, não alfanumérico vira `-`). Ex.: `"Não informado"` → `"nao-informado"`, `"Implementado na develop"` → `"implementado-na-develop"`.
  - `quadro_html(cod: str, dados: dict) -> str` — `dados` é o retorno de `carregar`. Um único `<div class="uc-status">`, sem linhas em branco internas (para não quebrar o Markdown em volta).

- [ ] **Step 1: Escrever os testes que falham**
  - `test_slug_status`: os dois exemplos acima e `"Publicado na main"` → `"publicado-na-main"`.
  - `test_quadro_com_pr`: para o UC01 da fixture de Task 2, o HTML contém `catalogo-status-implementado-na-develop`, `href="https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/48"`, `09/11/2026`, `develop`, a issue `#28` com link, `Natan8643` e `Dados do GitHub de`.
  - `test_quadro_indisponivel`: com `fonte == "indisponivel"` contém `Dados do GitHub indisponíveis neste build` e `catalogo-status-nao-informado`.
  - `test_quadro_publicado_avisa_data`: com `fonte == "publicado"` mostra a data de `coletado_em` formatada.
  - `test_quadro_escapa_html`: título de PR `<script>` aparece como `&lt;script&gt;` (`html.escape`).
  - `test_quadro_sem_linha_em_branco`: `"\n\n" not in quadro_html(...)`.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar `slug_status` e `quadro_html`.** Conteúdo, nesta ordem: selo `<span class="catalogo-status catalogo-status-<slug>">`; linha da issue (número com link, `aberta`/`fechada`, responsáveis) ou "Sem issue no GitHub"; uma linha por PR (número com link, título, estado em português: `aberto`, `integrado na <base> em dd/mm/aaaa`, `fechado sem merge`; CI: `CI passou ✓`, `CI falhou ✗`, `CI em andamento`, `sem CI`); rodapé `Dados do GitHub de dd/mm/aaaa HH:MM` ou a frase de indisponível.

- [ ] **Step 4: CSS em `consulta.css`.** Seguindo o padrão das regras `.catalogo-status-*` existentes (claro e `[data-md-color-scheme="slate"]`): `implementado-na-develop` reaproveita as cores de `implementado`; `publicado-na-main` em verde mais forte; `planejado` e `sem-issue` reaproveitam as de `nao-iniciado`; `nao-informado` neutro. `.uc-status`: caixa com borda `var(--uc-borda)`, cantos arredondados, `padding` pequeno, fonte `0.8rem`, margem abaixo; rodapé com `var(--md-default-fg-color--light)`.

- [ ] **Step 5: Rodar os testes e ver passar.**

- [ ] **Step 6: Commit** — `git commit -m "feat(site): quadro de status do caso de uso"`

### Task 4: Integração no hook

**Files:**
- Modify: `unicash/hooks/rastreabilidade.py` (docstring do topo; `ler_status_uc` removida; `ler_requisitos` ~linha 241; `on_config`; `on_files`; `pagina`; novo `on_page_markdown`)

**Interfaces:**
- Consumes: `carregar`, `quadro_html` (Tasks 2 e 3).
- Produces: variável de módulo `dados_github: dict`; `itens[UC]["status_implementacao"]` preenchido com `casos[UC]["status"]` (ou `"Não informado"`); arquivo publicado `consulta/dados/github.json`.

- [ ] **Step 1: Import.** No topo, `sys.path.insert(0, str(Path(__file__).parent))` e `import github_status`.

- [ ] **Step 2: Trocar o CSV.** Remover `ler_status_uc` e a menção ao CSV na docstring (explicar a nova fonte, e o `GITHUB_TOKEN=$(gh auth token) mkdocs serve` para rodar localmente). Em `ler_requisitos`, depois de montar os UCs, chamar `carregar(repo, códigos UC encontrados, URL publicada)` uma vez, guardar em `dados_github` e preencher `status_implementacao`. `repo` sai de `config["repo_url"]`, então `ler_requisitos` passa a receber o `config` ou o `repo`.

- [ ] **Step 3: Publicar o JSON.** Em `on_files`, `publica("github", dados_github)`.

- [ ] **Step 4: Página gerada do UC.** Em `pagina()`, para `tipo == "UC"`, inserir `quadro_html(cod, dados_github)` logo após a `div` de selos.

- [ ] **Step 5: Página Casos de uso.** Novo `on_page_markdown(markdown, page, config, files, **kwargs)`: só quando `page.file.src_uri == FONTE["UC"]`; após cada linha `^##\s+(UC\d{2})\s*-` inserir uma linha em branco, `quadro_html(cod, dados_github)` e outra linha em branco. Não mexer em outras páginas.

- [ ] **Step 6: Build sem token.** A partir de `unicash/`, `env -u GITHUB_TOKEN -u GH_TOKEN mkdocs build --strict` termina sem erro; enquanto o JSON ainda não tiver sido publicado, o log mostra a fonte `indisponivel` e `site/casos_de_uso/index.html` tem 9 ocorrências de `class="uc-status"`.

- [ ] **Step 7: Build com token.** `GITHUB_TOKEN=$(gh auth token) mkdocs build --strict`: o quadro do UC01 mostra `Implementado na develop` e o PR #48; `site/consulta/dados/github.json` existe e não contém o token (`grep -c "$(gh auth token)" site/consulta/dados/github.json` → `0`); a coluna de status do catálogo em `consulta/` mostra o mesmo texto (conferir com `mkdocs serve` no navegador, modo claro e escuro).

- [ ] **Step 8: Commit** — `git commit -m "feat(site): mostra nos casos de uso o status vindo do GitHub"`

### Task 5: Deploy com token e PR para a `docs`

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1:** Em `permissions`, acrescentar `issues: read`, `pull-requests: read`, `checks: read` e manter as atuais. No passo "Construir o site", acrescentar `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.

- [ ] **Step 2: Validar o YAML** — `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-pages.yml'))"` sem erro.

- [ ] **Step 3: Commit, push e PR** com base `docs`: `git commit -m "ci(site): passa o token de leitura ao build do site"`; `git push -u origin feat/status-casos-de-uso`; `gh pr create --base docs`. A descrição explica o que muda, como testar localmente e que a PR do workflow da `main` é complementar. Sem atribuição a Claude nos commits nem na descrição.

### Task 6: Workflow de atualização na `main`

**Files:**
- Create: `.github/workflows/atualizar-site.yml` (em uma branch nova `ci/atualizar-site`, criada a partir de `origin/main`)

- [ ] **Step 1: Criar o workflow.** `name: Atualizar o site`; gatilhos: `schedule: - cron: "0 */6 * * *"`, `pull_request: types: [closed]`, `issues: types: [opened, edited, closed, reopened]`, `workflow_dispatch`; `permissions: actions: write`; um job `ubuntu-latest` com um passo `run: gh workflow run deploy-pages.yml --ref docs`, com `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` e `GH_REPO: ${{ github.repository }}`.

- [ ] **Step 2: Validar o YAML** como em Task 5.

- [ ] **Step 3: Commit, push e PR** com base `main`: `git commit -m "ci: reconstrói o site do projeto quando issues e PRs mudam"`; `gh pr create --base main`, citando a PR da Task 5.

- [ ] **Step 4: Verificar depois do merge das duas PRs.** Rodar `gh workflow run atualizar-site.yml` e conferir, com `gh run list --workflow deploy-pages.yml --limit 1`, que um deploy da `docs` começou e terminou com sucesso; abrir a página Casos de uso publicada e conferir o quadro do UC01.
