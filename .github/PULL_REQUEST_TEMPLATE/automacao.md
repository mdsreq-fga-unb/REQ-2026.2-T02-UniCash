<!--
Template para PRs de automação e infraestrutura: workflows do GitHub Actions,
scripts, hooks do site e configurações do repositório. Apague os comentários e as
seções que não se aplicam.
-->

## Resumo

<!-- Em uma ou duas frases: o que esta automação faz e qual problema resolve. -->

Issue: #

## Como funciona

<!-- Gatilhos, o que executa, onde roda e o que produz. Um diagrama curto ou uma lista basta. -->

## Permissões e segredos

<!--
Permissões novas do GITHUB_TOKEN, secrets necessários e onde ficam.
Escreva "Nenhum" quando não houver.
-->

## Riscos e limitações

<!-- O que acontece se falhar, como desfazer e o que esta PR ainda não cobre. -->

## Como testar

<!-- Comandos locais e, depois do merge, o que conferir no Actions. -->

## PRs relacionadas

<!-- Outras PRs das quais esta depende ou que a complementam. -->

## Checklist

- [ ] O YAML dos workflows é válido
- [ ] Testei localmente o que dá para testar fora do Actions
- [ ] Uma falha da automação não quebra o site nem o app
- [ ] Permissões no mínimo necessário
- [ ] Não incluí segredos (tokens, chaves, `.env`)
