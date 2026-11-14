"""Status de implementação dos casos de uso a partir do GitHub.

Coleta as issues ``UCnn`` e os pull requests ligados a elas, calcula o status
de cada caso de uso e monta o quadro exibido no site. Não depende do MkDocs,
para poder ser testado sozinho; o hook ``rastreabilidade.py`` é quem o usa.
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone

log = logging.getLogger("mkdocs.hooks.github_status")

# Horário de Brasília com deslocamento fixo: o Brasil não tem horário de verão desde 2019,
# e assim o hook não depende do pacote tzdata (ausente no Python do Windows).
FUSO = timezone(timedelta(hours=-3), "America/Sao_Paulo")
API = "https://api.github.com"
TITULO_UC = re.compile(r"^(UC\d{2})\b")
INDISPONIVEL = {"coletado_em": None, "fonte": "indisponivel", "casos": {}}

CONSULTA = """
query($dono: String!, $nome: String!, $cursor: String) {
  repository(owner: $dono, name: $nome) {
    issues(first: 100, after: $cursor, states: [OPEN, CLOSED]) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state
        assignees(first: 10) { nodes { login } }
        closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ...Pr } }
        timelineItems(first: 50, itemTypes: [CROSS_REFERENCED_EVENT]) {
          nodes { ... on CrossReferencedEvent { source { ... on PullRequest { ...Pr } } } }
        }
      }
    }
  }
}
fragment Pr on PullRequest {
  number title url state baseRefName mergedAt
  repository { nameWithOwner }
  mergeCommit { oid }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
}
"""

SEM_ISSUE = "Sem issue"
PLANEJADO = "Planejado"
EM_DESENVOLVIMENTO = "Em desenvolvimento"
IMPLEMENTADO = "Implementado na develop"
PUBLICADO = "Publicado na main"
NAO_INFORMADO = "Não informado"
STATUS_VALIDOS = {SEM_ISSUE, PLANEJADO, EM_DESENVOLVIMENTO, IMPLEMENTADO, PUBLICADO}


def _nivel_pr(pr: dict) -> int:
    """0 = não conta, 1 = aberto, 2 = integrado fora da main, 3 = na main."""
    if pr.get("estado") == "OPEN":
        return 1
    if pr.get("estado") == "MERGED":
        if pr.get("base") == "main" or pr.get("na_main"):
            return 3
        # Só a develop conta como implementação; um PR integrado na docs, por
        # exemplo, apenas documenta o caso de uso.
        return 2 if pr.get("base") == "develop" else 0
    return 0


def derivar_status(caso: dict | None) -> str:
    """Status do caso de uso: vale o PR mais avançado, não o estado da issue."""
    if caso is None:
        return NAO_INFORMADO
    if not caso.get("issue"):
        return SEM_ISSUE
    nivel = max((_nivel_pr(pr) for pr in caso.get("prs", [])), default=0)
    return {0: PLANEJADO, 1: EM_DESENVOLVIMENTO, 2: IMPLEMENTADO, 3: PUBLICADO}[nivel]


# --------------------------------------------------------------------------- #
# Rede (as únicas funções que acessam a internet)
# --------------------------------------------------------------------------- #

def _cabecalhos(token: str | None) -> dict:
    cabecalhos = {"Accept": "application/vnd.github+json", "User-Agent": "unicash-site"}
    if token:
        cabecalhos["Authorization"] = f"Bearer {token}"
    return cabecalhos


def _post_graphql(token: str, query: str, variaveis: dict, timeout: float) -> dict:
    corpo = json.dumps({"query": query, "variables": variaveis}).encode()
    pedido = urllib.request.Request(f"{API}/graphql", data=corpo, headers=_cabecalhos(token), method="POST")
    with urllib.request.urlopen(pedido, timeout=timeout) as resposta:
        dados = json.load(resposta)
    # Com permissão parcial, o GitHub devolve os dados que pode e uma lista de erros:
    # aproveita os dados e só falha quando não vier nada.
    if not dados.get("data"):
        mensagem = (dados.get("errors") or [{}])[0].get("message")
        raise RuntimeError(f"GraphQL não devolveu dados: {mensagem}")
    if dados.get("errors"):
        log.info("Status dos casos de uso: a API devolveu dados parciais (%d erro(s)).", len(dados["errors"]))
    return dados


def _get_json(url: str, token: str | None, timeout: float) -> dict:
    pedido = urllib.request.Request(url, headers=_cabecalhos(token))
    with urllib.request.urlopen(pedido, timeout=timeout) as resposta:
        return json.load(resposta)


# --------------------------------------------------------------------------- #
# Coleta
# --------------------------------------------------------------------------- #

def _pr(no: dict) -> dict:
    commits = (no.get("commits") or {}).get("nodes") or []
    rollup = (commits[0]["commit"].get("statusCheckRollup") if commits else None) or {}
    return {
        "numero": no["number"],
        "titulo": no["title"],
        "url": no["url"],
        "estado": no["state"],
        "base": no["baseRefName"],
        "integrado_em": no.get("mergedAt"),
        "ci": rollup.get("state"),
        "na_main": False,
        "_oid": (no.get("mergeCommit") or {}).get("oid"),
    }


def _prs_da_issue(issue: dict, repo: str) -> list[dict]:
    nos = list(issue["closedByPullRequestsReferences"]["nodes"])
    nos += [t["source"] for t in issue["timelineItems"]["nodes"] if t.get("source")]
    vistos, prs = set(), []
    for no in nos:
        if "number" not in no or (no.get("repository") or {}).get("nameWithOwner") != repo:
            continue
        if no["number"] in vistos:
            continue
        vistos.add(no["number"])
        prs.append(_pr(no))
    return sorted(prs, key=lambda pr: pr["numero"])


def coletar(repo: str, token: str, codigos: list[str], timeout: float = 10.0) -> dict:
    """Busca na API as issues UCnn e seus PRs. Lança exceção se a API falhar."""
    dono, nome = repo.split("/", 1)
    issues, cursor = [], None
    while True:
        dados = _post_graphql(token, CONSULTA, {"dono": dono, "nome": nome, "cursor": cursor}, timeout)
        pagina = dados["data"]["repository"]["issues"]
        issues += pagina["nodes"]
        if not pagina["pageInfo"]["hasNextPage"]:
            break
        cursor = pagina["pageInfo"]["endCursor"]

    por_codigo: dict[str, dict] = {}
    for issue in sorted(issues, key=lambda i: i["number"]):
        achado = TITULO_UC.match(issue["title"])
        if achado and achado.group(1) in codigos and achado.group(1) not in por_codigo:
            por_codigo[achado.group(1)] = issue

    casos = {}
    for cod in codigos:
        issue = por_codigo.get(cod)
        if not issue:
            casos[cod] = {"status": SEM_ISSUE, "issue": None, "prs": []}
            continue
        prs = _prs_da_issue(issue, repo)
        for pr in prs:
            oid = pr.pop("_oid")
            if pr["estado"] == "MERGED" and pr["base"] != "main" and oid:
                comparacao = _get_json(f"{API}/repos/{repo}/compare/main...{oid}", token, timeout)
                pr["na_main"] = comparacao.get("status") in ("behind", "identical")
        caso = {
            "issue": {"numero": issue["number"], "url": issue["url"], "estado": issue["state"],
                      "responsaveis": [a["login"] for a in issue["assignees"]["nodes"]]},
            "prs": prs,
        }
        casos[cod] = {"status": derivar_status(caso), **caso}
    return {"coletado_em": datetime.now(FUSO).isoformat(timespec="seconds"), "fonte": "api", "casos": casos}


def _caso_valido(caso) -> bool:
    """Confere a forma de um caso lido do JSON publicado, que pode ser de uma versão antiga."""
    if not isinstance(caso, dict) or caso.get("status") not in STATUS_VALIDOS:
        return False
    issue, prs = caso.get("issue"), caso.get("prs")
    if issue is not None and not (isinstance(issue, dict) and isinstance(issue.get("numero"), int)):
        return False
    campos_pr = ("numero", "titulo", "url", "estado", "base")
    return isinstance(prs, list) and all(isinstance(pr, dict) and all(k in pr for k in campos_pr) for pr in prs)


def _normalizar_publicado(publicado: dict, codigos: list[str]) -> dict:
    """Mantém só os casos bem formados e uma data de coleta legível."""
    coletado_em = publicado.get("coletado_em")
    try:
        datetime.fromisoformat(str(coletado_em).replace("Z", "+00:00"))
    except ValueError:
        coletado_em = None
    casos = {cod: caso for cod, caso in publicado["casos"].items() if cod in codigos and _caso_valido(caso)}
    return {"coletado_em": coletado_em, "fonte": "publicado", "casos": casos}


def carregar(repo: str, codigos: list[str], url_publicada: str) -> dict:
    """Dados para o build: API, senão o JSON já publicado, senão indisponível. Nunca lança."""
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        try:
            dados = coletar(repo, token, codigos)
            log.info("Status dos casos de uso: dados coletados na API do GitHub.")
            return dados
        except Exception as erro:  # noqa: BLE001 - o build não pode falhar por causa da API
            log.info("Status dos casos de uso: API do GitHub indisponível (%s).", type(erro).__name__)
    else:
        log.info("Status dos casos de uso: sem GITHUB_TOKEN; usando os dados publicados.")
    try:
        publicado = _get_json(url_publicada, None, 10.0)
        if isinstance(publicado, dict) and isinstance(publicado.get("casos"), dict):
            log.info("Status dos casos de uso: usando os dados publicados no site.")
            return _normalizar_publicado(publicado, codigos)
    except Exception as erro:  # noqa: BLE001
        log.info("Status dos casos de uso: dados publicados indisponíveis (%s).", type(erro).__name__)
    log.info("Status dos casos de uso: dados do GitHub indisponíveis neste build.")
    return dict(INDISPONIVEL, casos={})


# --------------------------------------------------------------------------- #
# Quadro exibido no site
# --------------------------------------------------------------------------- #

CI = {"SUCCESS": "CI passou ✓", "FAILURE": "CI falhou ✗", "ERROR": "CI falhou ✗",
      "PENDING": "CI em andamento", "EXPECTED": "CI em andamento"}


def slug_status(status: str) -> str:
    """Mesmo resultado do slug() de catalogo.js, para reaproveitar as classes de cor."""
    sem_acento = unicodedata.normalize("NFD", status).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", sem_acento).strip("-")


def _data(iso: str | None, com_hora: bool = False) -> str:
    if not iso:
        return ""
    momento = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(FUSO)
    return momento.strftime("%d/%m/%Y %H:%M" if com_hora else "%d/%m/%Y")


def _link(url: str, texto: str) -> str:
    return f'<a href="{html.escape(url)}" target="_blank" rel="noopener">{html.escape(texto)}</a>'


def _linha_pr(pr: dict) -> str:
    if pr["estado"] == "MERGED":
        estado = f"integrado na {html.escape(pr['base'])} em {_data(pr.get('integrado_em'))}"
    elif pr["estado"] == "OPEN":
        estado = f"aberto para a {html.escape(pr['base'])}"
    else:
        estado = "fechado sem merge"
    ci = CI.get(pr.get("ci") or "", "sem CI")
    return (f'<li>PR {_link(pr["url"], "#" + str(pr["numero"]))} '
            f'“{html.escape(pr["titulo"])}” · {estado} · {ci}</li>')


TITULOS = {
    PLANEJADO: "Ainda sem código",
    SEM_ISSUE: "Nenhuma issue criada no GitHub",
    NAO_INFORMADO: "Dados do GitHub indisponíveis neste build",
}
CLASSE_CI = {"SUCCESS": "ok", "FAILURE": "falha", "ERROR": "falha", "PENDING": "andamento", "EXPECTED": "andamento"}


def _pr_principal(prs: list[dict]) -> dict | None:
    """O PR mais avançado; no empate, o mais recente."""
    candidatos = [pr for pr in prs if _nivel_pr(pr) > 0]
    return max(candidatos, key=lambda pr: (_nivel_pr(pr), pr["numero"])) if candidatos else None


def _titulo(status: str, pr: dict | None) -> str:
    if status == PUBLICADO and pr:
        return f"Na main desde {_data(pr.get('integrado_em'))}"
    if status == IMPLEMENTADO and pr:
        return f"Integrado na develop em {_data(pr.get('integrado_em'))}"
    if status == EM_DESENVOLVIMENTO and pr:
        return f"Em revisão no PR #{pr['numero']}"
    return TITULOS.get(status, TITULOS[NAO_INFORMADO])


def _chip(conteudo: str, classe: str = "") -> str:
    return f'<span class="uc-card__chip{(" " + classe) if classe else ""}">{conteudo}</span>'


def quadro_html(cod: str, dados: dict) -> str:
    """Card do caso de uso: selo, frase principal, evidências essenciais e o resto recolhido.

    Sai num único bloco HTML sem linhas em branco, para não quebrar o Markdown em volta.
    """
    caso = (dados.get("casos") or {}).get(cod)
    status = caso["status"] if caso else NAO_INFORMADO
    slug = slug_status(status)
    prs = caso.get("prs", []) if caso else []
    principal = _pr_principal(prs)

    topo = f'<span class="uc-card__selo catalogo-status catalogo-status-{slug}">{html.escape(status)}</span>'
    if dados.get("coletado_em") and dados.get("fonte") != "indisponivel":
        topo += f'<span class="uc-card__rodape">GitHub · {_data(dados["coletado_em"], True)}</span>'

    chips = []
    if principal:
        chips.append(_chip(_link(principal["url"], f"PR #{principal['numero']} ↗")))
        estado_ci = CLASSE_CI.get(principal.get("ci") or "")
        if estado_ci:
            rotulo_ci = CI[principal["ci"]]
            chips.append(_chip(html.escape(rotulo_ci), f"uc-card__ci uc-card__ci--{estado_ci}"))
    issue = caso.get("issue") if caso else None
    if issue:
        numero = "Issue #" + str(issue.get("numero", "?"))
        chips.append(_chip(_link(issue["url"], numero) if issue.get("url") else html.escape(numero)))
        for login in issue.get("responsaveis") or []:
            avatar = (f'<img class="uc-card__avatar" src="https://avatars.githubusercontent.com/'
                      f'{html.escape(login)}?s=40" alt="" loading="lazy">')
            chips.append(_chip(avatar + html.escape(login), "uc-card__pessoa"))

    partes = [f'<div class="uc-card uc-card--{slug}">',
              f'<div class="uc-card__topo">{topo}</div>',
              f'<p class="uc-card__titulo">{html.escape(_titulo(status, principal))}</p>']
    if chips:
        partes.append(f'<div class="uc-card__meta">{"".join(chips)}</div>')
    if len(prs) > 1:
        partes.append(f'<details class="uc-card__detalhes"><summary>Todos os PRs ({len(prs)})</summary>'
                      f'<ul>{"".join(_linha_pr(pr) for pr in prs)}</ul></details>')
    partes.append("</div>")
    return "".join(partes)


def resumo(cod: str, dados: dict) -> dict:
    """Frase do card e o link da evidência principal (PR, senão issue), para o catálogo."""
    caso = (dados.get("casos") or {}).get(cod)
    status = caso["status"] if caso else NAO_INFORMADO
    principal = _pr_principal(caso.get("prs", [])) if caso else None
    issue = caso.get("issue") if caso else None
    if principal:
        url, rotulo = principal["url"], f"PR #{principal['numero']}"
    elif issue and issue.get("url"):
        url, rotulo = issue["url"], f"Issue #{issue.get('numero', '?')}"
    else:
        url, rotulo = None, None
    return {"frase": _titulo(status, principal), "url": url, "rotulo": rotulo}
