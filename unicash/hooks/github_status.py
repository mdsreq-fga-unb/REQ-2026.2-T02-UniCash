"""Status de implementação dos casos de uso a partir do GitHub.

Coleta as issues ``UCnn`` e os pull requests ligados a elas, calcula o status
de cada caso de uso e monta o quadro exibido no site. Não depende do MkDocs,
para poder ser testado sozinho; o hook ``rastreabilidade.py`` é quem o usa.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

log = logging.getLogger("mkdocs.hooks.github_status")

FUSO = ZoneInfo("America/Sao_Paulo")
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


def _nivel_pr(pr: dict) -> int:
    """0 = não conta, 1 = aberto, 2 = integrado fora da main, 3 = na main."""
    if pr.get("estado") == "OPEN":
        return 1
    if pr.get("estado") == "MERGED":
        return 3 if pr.get("base") == "main" or pr.get("na_main") else 2
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
    if dados.get("errors"):
        raise RuntimeError(f"GraphQL respondeu com erro: {dados['errors'][0].get('message')}")
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
            return {**publicado, "fonte": "publicado"}
    except Exception as erro:  # noqa: BLE001
        log.info("Status dos casos de uso: dados publicados indisponíveis (%s).", type(erro).__name__)
    log.info("Status dos casos de uso: dados do GitHub indisponíveis neste build.")
    return dict(INDISPONIVEL, casos={})
