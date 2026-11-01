<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="mobile/assets/images/brand/logo-branco.svg">
    <img src="mobile/assets/images/brand/logo.svg" alt="UniCash" height="72">
  </picture>
</p>

<p align="center">
  Gestão financeira pessoal para estudantes, famílias e a comunidade universitária.<br>
  Projeto da disciplina Requisitos de Software (FGA0313) — UnB/FGA, turma 02, 2026.2.
</p>

<p align="center">
  <a href="https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-UniCash/"><strong>Documentação</strong></a> ·
  <a href="mobile/README.md">App mobile</a> ·
  <a href=".github/CONTRIBUTING.md">Como contribuir</a>
</p>

---

## Sobre

O UniCash ajuda quem tem renda curta e variável a organizar o dinheiro do mês: registrar receitas e despesas, definir limites por categoria, acompanhar metas e ver para onde o dinheiro está indo. O app funciona sem internet, guarda os dados no próprio aparelho e não pede dados bancários.

A visão do produto, os requisitos (funcionais, não funcionais e regras de negócio), os casos de uso, o processo de engenharia de requisitos e as atas das reuniões com as clientes estão na [documentação do projeto](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-UniCash/).

## Organização do repositório

| Onde | O quê |
| --- | --- |
| [`mobile/`](mobile/) | app em React Native com Expo (SDK 58), Expo Router e TypeScript |
| branch [`docs`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/tree/docs) | documentação em MkDocs Material, publicada no GitHub Pages |
| [`.github/`](.github/) | CI/CD, templates de issue e PR, políticas do repositório |
| `docker-compose.yml` | ambiente de desenvolvimento do app em container |

## Rodar o app

```bash
git clone git@github.com:mdsreq-fga-unb/REQ-2026.2-T02-UniCash.git
cd REQ-2026.2-T02-UniCash/mobile
nvm use
npm install
npm start
```

Leia o QR code com o [Expo Go](https://expo.dev/go) no celular. Para rodar com Docker, gerar builds no EAS ou entender os workflows do GitHub Actions, veja o [README do app](mobile/README.md).

## Contribuir

Toda mudança parte de uma issue, segue em uma branch com prefixo (`feat/`, `fix/`, `docs/`, `chore/`) e entra por pull request com commits no padrão Conventional Commits. Os detalhes estão em [CONTRIBUTING](.github/CONTRIBUTING.md). Leia também o [código de conduta](.github/CODE_OF_CONDUCT.md), a [política de segurança](.github/SECURITY.md) e as [diretrizes de acessibilidade](.github/ACCESSIBILITY.md).

## Equipe SevenSpecs

Bruno Duarte · Caio Pacheco · Dante Scarpati · Erick Alves · Evellyn Rocha · Leonardo Alves · Natan França

## Licença

[MIT](LICENSE) © 2026 Equipe UniCash (sevenspecs) — FGA/UnB
