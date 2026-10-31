# Como contribuir

Obrigado por contribuir com o UniCash. Este guia resume o fluxo de trabalho da equipe.

## Organização do repositório

| Onde | O quê |
| --- | --- |
| `mobile/` | app em React Native com Expo e TypeScript |
| branch `docs` | documentação do projeto (MkDocs) |
| `.github/` | CI/CD, templates de issue e PR, políticas do repositório |

Para preparar o ambiente e rodar o app (Node ou Docker + Expo Go), siga o [README do app](../mobile/README.md).

## Fluxo de trabalho

1. **Issue primeiro.** Toda mudança parte de uma issue, usando os templates de bug ou de funcionalidade. Relacione o requisito (RF, RNF ou RN) quando houver.
2. **Branch a partir da `main`**, com prefixo pelo tipo de mudança:
    - `feat/` funcionalidade nova (ex.: `feat/rf07-lancar-despesa`)
    - `fix/` correção de bug
    - `docs/` documentação (a partir da branch `docs`)
    - `chore/` configuração, dependências, CI
3. **Commits** no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português: `feat(mobile): permite lançar despesa sem conexão`.
4. **Antes do PR**, dentro de `mobile/`:

    ```bash
    npm run lint
    npm run typecheck
    npm run doctor
    ```

5. **Pull request** para a `main` (ou para a `docs`, quando for documentação), preenchendo o template e citando a issue com `Closes #<número>`.
6. **Revisão:** pelo menos uma pessoa da equipe revisa e aprova. O CI (Mobile CI) precisa passar antes do merge.

## Regras do app

- Instale dependências com `npx expo install <pacote>`, nunca com `npm install <pacote>`.
- Use só bibliotecas compatíveis com o Expo Go. Uma biblioteca com código nativo próprio exige discussão com a equipe antes.
- Valores monetários são guardados em centavos (inteiros).
- Mensagens para o usuário em português do Brasil.

## Dúvidas

Abra uma issue com o label `question` ou fale com a equipe no canal do grupo.
