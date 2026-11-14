<!--
Template para PRs de documentação (branch `docs`): requisitos, processo, cronograma,
atas e páginas do site. Apague os comentários e as seções que não se aplicam.
-->

## Resumo

<!-- Em uma ou duas frases: o que esta PR muda na documentação e por quê. -->

Issue: #

## Apontamentos atendidos

<!--
Uma linha por apontamento da issue (por exemplo, da revisão do professor).
"Onde" é a página e a seção alterada, com link para o site quando possível.
Se um apontamento ficou de fora, diga por quê na coluna "O que foi feito".
-->

| Apontamento | O que foi feito | Onde |
| --- | --- | --- |
|  |  |  |

## Decisões e rastreabilidade

<!--
Decisões registradas ou usadas (D01, D02...), atas (R01...), requisitos afetados (RF, RNF, RN, UC)
e o que foi proposta da equipe, ainda sem validação da cliente.
-->

## Pendências fora desta PR

<!-- O que ainda depende da cliente, de outra pessoa da equipe ou de trabalho de campo. -->

## Como revisar

<!-- Páginas para abrir e o que conferir em cada uma. -->

```bash
cd unicash
mkdocs serve
```

## Checklist

- [ ] `mkdocs build --strict` passa em `unicash/`
- [ ] O histórico de versões de cada página alterada tem uma linha nova citando a issue
- [ ] Links e âncoras novos funcionam no site gerado
- [ ] O que é proposta da equipe está marcado como pendente de validação da cliente
- [ ] Não incluí segredos (tokens, chaves, `.env`)
