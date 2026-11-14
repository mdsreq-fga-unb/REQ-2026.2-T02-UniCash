"""Status de implementação dos casos de uso a partir do GitHub.

Coleta as issues ``UCnn`` e os pull requests ligados a elas, calcula o status
de cada caso de uso e monta o quadro exibido no site. Não depende do MkDocs,
para poder ser testado sozinho; o hook ``rastreabilidade.py`` é quem o usa.
"""

from __future__ import annotations

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
