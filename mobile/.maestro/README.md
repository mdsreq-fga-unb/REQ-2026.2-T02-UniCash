# Testes ponta a ponta com Maestro (issue #133)

Os fluxos daqui rodam o app de verdade num emulador ou aparelho Android e geram **prints** (`takeScreenshot`) e, se você quiser, **vídeo** (`maestro record`). Esses arquivos servem de evidência visual em cada caso de uso. Os testes Jest continuam sendo os testes de regra; o Maestro cobre a navegação e a aparência.

## Estrutura

```text
.maestro/
├── config.yaml              # quais fluxos rodam por padrão
├── subflows/                # passos reaproveitados (abrir o app limpo, nova receita, abrir Conquistas)
├── uc13/                    # um arquivo por fluxo do UC13
└── artefatos/               # prints gerados (ignorados pelo git; anexar ao PR)
```

## Pré-requisitos

1. **Maestro CLI**: `curl -fsSL "https://get.maestro.mobile.dev" | bash` (precisa de Java 17+).
2. **Android**: emulador do Android Studio ou aparelho com depuração USB (`adb devices` deve listá-lo).
3. **App instalado com o pacote `br.unb.unicash`**: build de desenvolvimento (`npx expo run:android` ou `bunx eas-cli build --profile development`). O Expo Go não serve, porque o Maestro abre o app pelo `appId` e pelo esquema `unicash://`.

## Rodar no GitHub Actions

Não precisa de emulador local. O workflow `.github/workflows/mobile-e2e.yml` compila um APK com o perfil `e2e-test` do `eas.json` (cota gratuita do EAS), liga um emulador Android no runner do GitHub e roda `.maestro/rodar-ci.sh`.

- **Num PR**: adicione a label `e2e`. Outras labels e novos pushes não disparam; para rodar de novo, tire e recoloque a label.
- **Manual**: Actions > Mobile E2E (Maestro) > Run workflow (depois que o arquivo estiver na `main`).

Onde ver o resultado:

- **No PR**: um comentário fixo "Testes ponta a ponta (Maestro)", atualizado a cada execução, com o resultado de cada fluxo, a galeria de prints e o link do vídeo.
- **Na execução** (aba Checks → Mobile E2E): o mesmo resumo aparece no topo da página.
- **Arquivos**: os prints e o vídeo ficam na branch `e2e-evidencias`, em `pr-<número>/execucao-<id>/` (só evidências, sem código). O relatório JUnit e a saída completa do Maestro ficam no artefato `e2e-uc13`. Os jobs Maestro do EAS Workflows exigem plano pago, por isso o EAS só faz o build.

## Rodar localmente

```bash
cd mobile
npx expo start                      # Metro, com o build de desenvolvimento aberto no emulador
npm run e2e                         # todos os fluxos do UC13
npm run e2e -- .maestro/uc13/02-selos-e-detalhe.yaml   # um fluxo só
npm run e2e:gravar                  # grava vídeo do fluxo 02 em artefatos/uc13/
```

Os prints saem em `mobile/.maestro/artefatos/uc13/`.

## Fluxos do UC13

| Arquivo | Cobre | Prints |
|---|---|---|
| `01-estado-vazio.yaml` | FA01 [CQ3] (rodar sem `EXPO_PUBLIC_METAS_EXEMPLO`) | `01-estado-vazio` |
| `02-selos-e-detalhe.yaml` | A1, B2, B3 [CQ1, CQ2] | `02-lista-de-selos`, `03-detalhe-do-selo`, `04-resumo-do-mes-do-selo` |
| `03-alerta-conquistas.yaml` | A3 com RF58, linha de base (FR-009a) | `05-alerta-conquistas-ligado`, `06-selo-novo-registrado` |

As datas padrão (setembro, outubro e agosto de 2026) precisam ser de meses já encerrados. Para mudar: `maestro test -e DATA_B=05/10/2027 ...`.

## Convenções para os próximos UCs

- Uma pasta por caso de uso (`.maestro/ucNN/`), um arquivo por fluxo, com o fluxo do caso de uso no comentário do topo.
- Prints em `artefatos/ucNN/NN-nome`, na ordem em que aparecem no roteiro manual.
- Para tocar em elementos, prefira `testID` (`id:` no Maestro) quando o texto se repete na tela.
