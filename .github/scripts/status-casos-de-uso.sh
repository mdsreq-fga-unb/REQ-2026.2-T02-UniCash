#!/usr/bin/env bash
# Move as issues ligadas a um PR no quadro "Unicash Casos de Uso" (#130).
# Ambiente: GH_TOKEN, REPO (dono/nome), PR (número); DRY_RUN=1 só mostra o que faria.
set -euo pipefail

PROJETO_ID="PVT_kwDOBl4sv84BockC"
CAMPO_STATUS="PVTSSF_lADOBl4sv84BockCzhm8p8I"
declare -A OPCAO=([in-progress]="47fc9ee4" [test]="df73e18b" [done]="98236657")
DONO="${REPO%%/*}"
NOME="${REPO##*/}"

pr_json=$(gh api graphql -F dono="$DONO" -F nome="$NOME" -F pr="$PR" -f query='
query($dono: String!, $nome: String!, $pr: Int!) {
  repository(owner: $dono, name: $nome) {
    pullRequest(number: $pr) {
      state isDraft merged body
      closingIssuesReferences(first: 20) { nodes { number } }
    }
  }
}' -q '.data.repository.pullRequest')

estado=$(jq -r .state <<<"$pr_json")
rascunho=$(jq -r .isDraft <<<"$pr_json")
mergeado=$(jq -r .merged <<<"$pr_json")

# Merge leva a Done; fechado sem merge ou rascunho volta a In progress; aberto vai para Test (revisão).
if [[ "$mergeado" == "true" ]]; then
  alvo=done
elif [[ "$estado" == "CLOSED" || "$rascunho" == "true" ]]; then
  alvo=in-progress
else
  alvo=test
fi

# Issues: as de "Closes #N" e as citadas como #N no corpo do PR.
mapfile -t issues < <({
  jq -r '.closingIssuesReferences.nodes[].number' <<<"$pr_json"
  jq -r '.body // ""' <<<"$pr_json" | grep -oE '(^|[^&[:alnum:]])#[0-9]+' | grep -oE '[0-9]+' || true
} | sort -un)

if [[ ${#issues[@]} -eq 0 ]]; then
  echo "PR #$PR não cita issues; nada a mover."
  exit 0
fi

for n in "${issues[@]}"; do
  item=$(gh api graphql -F dono="$DONO" -F nome="$NOME" -F n="$n" -f query='
  query($dono: String!, $nome: String!, $n: Int!) {
    repository(owner: $dono, name: $nome) {
      # "#N" pode ser um PR; só issues contam.
      issueOrPullRequest(number: $n) {
        ... on Issue { projectItems(first: 20) { nodes { id project { id } } } }
      }
    }
  }' -q ".data.repository.issueOrPullRequest.projectItems.nodes[]? | select(.project.id == \"$PROJETO_ID\") | .id" 2>/dev/null || true)

  if [[ -z "$item" ]]; then
    echo "#$n: fora do quadro de casos de uso; ignorada."
    continue
  fi
  echo "#$n: Status -> $alvo"
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    continue
  fi
  gh api graphql -F projeto="$PROJETO_ID" -F item="$item" -F campo="$CAMPO_STATUS" -F opcao="${OPCAO[$alvo]}" -f query='
  mutation($projeto: ID!, $item: ID!, $campo: ID!, $opcao: String!) {
    updateProjectV2ItemFieldValue(input: {projectId: $projeto, itemId: $item, fieldId: $campo,
      value: {singleSelectOptionId: $opcao}}) { projectV2Item { id } }
  }' >/dev/null
done
