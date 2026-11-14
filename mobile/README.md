# UniCash — app mobile

App Expo (SDK 58, Expo Router, React Native, TypeScript). No dia a dia, todo mundo desenvolve com o **Expo Go** no celular. Os builds instaláveis (APK, AAB, IPA) são gerados na nuvem pelo **EAS Build**, então ninguém precisa de Android Studio ou Xcode.

## 1. Pré-requisitos

- **Git**
- **Node.js LTS** — recomendamos instalar com o [nvm](https://github.com/nvm-sh/nvm). Dentro de `mobile/`, rode `nvm use` (lê o `.nvmrc`).
- **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)). A versão do Expo Go precisa suportar o **SDK 58**.
- **VS Code** (opcional): ao abrir a pasta, aceite as extensões recomendadas (Expo Tools, ESLint, Prettier).
- Acesso ao projeto **Firebase** do UniCash (para pegar as chaves do app Web). Peça a quem é Owner.

## 2. Rodar o app

```bash
git clone git@github.com:mdsreq-fga-unb/REQ-2026.2-T02-UniCash.git
cd REQ-2026.2-T02-UniCash/mobile
nvm use
npm install
```

Antes de iniciar, configure o Firebase (próxima subseção). Depois:

```bash
npm start
```

Leia o QR code com o Expo Go (Android) ou com a câmera (iOS). O celular e o computador precisam estar na mesma rede Wi-Fi.

Se a rede bloquear a conexão (Wi-Fi da UnB, VPN, rede de visitantes), use o túnel:

```bash
npm run start:tunnel
```

Salvar um arquivo recarrega o app na hora. No terminal: `r` recarrega, `j` abre o debugger, `?` mostra os atalhos.

### Configurar o Firebase

O app lê a configuração do Firebase de variáveis `EXPO_PUBLIC_FIREBASE_*`. O modelo fica no `.env.example` da **raiz** do repositório (junto com as variáveis do Docker). O `.env` real **não vai para o git**.

1. Pegue os valores no console do Firebase: *Configurações do projeto → Seus apps → app Web*.
2. Crie o `.env` conforme o jeito que você roda o app:

    - **Sem Docker** (`npm start` em `mobile/`): o Expo só lê o `.env` de dentro de `mobile/`. Copie o modelo para lá e preencha:

        ```bash
        cp ../.env.example .env
        ```

        As variáveis do Docker (`EXPO_HOST_IP`, `EXPO_TOKEN`) ficam sem uso nesse arquivo, o que é inofensivo.

    - **Com Docker:** use o `.env` da raiz (veja a seção Docker abaixo). O Compose repassa as variáveis ao container.

3. Reinicie o Metro com cache limpo sempre que mudar o `.env`: `npx expo start -c`.

A inicialização do Firebase está em `src/lib/firebase.ts`, que exporta `auth` e `db` (Firestore). Importe de lá, não inicialize o Firebase em outros arquivos. Se aparecer `auth/invalid-api-key`, alguma variável está vazia ou o Metro não foi reiniciado.

### Alternativa: rodar com Docker

Se preferir não instalar Node na máquina, use o Docker Compose (na raiz do repositório). Precisa de Docker, de uma conta Expo com acesso à organização **sevenspecs** e do Expo Go no celular.

1. Crie o `.env` na raiz do repositório:

    ```bash
    cp .env.example .env
    ```

2. Preencha o `.env` (ele não vai para o git). O mesmo arquivo guarda as variáveis do Docker e as do Firebase:

    - `EXPO_HOST_IP`: o IP da **sua** máquina na rede Wi-Fi. Linux: `hostname -I`; macOS: `ipconfig getifaddr en0`; Windows: `ipconfig` (campo "Endereço IPv4"). Sem isso, o QR code aponta para o container e o celular não conecta.
    - `EXPO_TOKEN`: um token **pessoal** criado em expo.dev → *Account settings* → *Access tokens*. O container não tem navegador para o login, e o projeto pertence à organização sevenspecs. Não use o token da organização (é só do GitHub Actions) nem compartilhe o seu.
    - `EXPO_PUBLIC_FIREBASE_*`: as chaves do Firebase (veja "Configurar o Firebase").

3. Suba o Expo:

    ```bash
    docker compose run --rm --service-ports mobile
    ```

    Use `run`, não `up`: no `up` o teclado vai para o Docker Compose e os atalhos do Expo (`r`, `j`, `?`) não funcionam. O `--service-ports` publica a porta 8081.

4. Leia o QR code com o Expo Go. O log deve mostrar `exp://<seu IP>:8081`. Editar os arquivos em `mobile/` recarrega o app.

Problemas comuns:

| Sintoma | Correção |
| --- | --- |
| QR code com IP errado (ex.: `192.168.0.10`) | ajuste `EXPO_HOST_IP` no `.env` |
| `spawn xdg-open ENOENT` / pede login | preencha `EXPO_TOKEN` no `.env` |
| Celular não conecta | mesmo Wi-Fi do PC; libere a porta 8081 no firewall (`sudo ufw allow 8081/tcp`); ou use o túnel: `docker compose --profile tunnel run --rm mobile-tunnel` |
| `w` não abre a web | abra `http://localhost:8081` no seu navegador |
| `auth/invalid-api-key` | variáveis `EXPO_PUBLIC_FIREBASE_*` vazias no `.env` da raiz; suba o container de novo |

Depois de mudar o `package.json`, reconstrua a imagem: `docker compose build mobile`. Para instalar uma dependência pelo container: `docker compose run --rm mobile npx expo install <pacote>`.

## 3. Regras para continuar compatível com o Expo Go

- Instale dependências **sempre** com `npx expo install <pacote>`, nunca com `npm install <pacote>`. Assim a versão sai compatível com o SDK.
- Não rode `npm audit fix --force` nem `npm install --force`/`--legacy-peer-deps`: eles aceitam versões incompatíveis com o SDK e quebram o app de formas difíceis de depurar. Se o `npm install` der `ERESOLVE`, apague `node_modules` e `package-lock.json` (dentro de `mobile/`) e instale de novo.
- Use só bibliotecas incluídas no Expo Go (módulos `expo-*` do SDK e as listadas na [documentação do SDK](https://docs.expo.dev/versions/v58.0.0/)). Uma biblioteca com código nativo próprio **não roda no Expo Go**. Antes de adicionar uma, discuta com a equipe: ela obriga a criar um *development build*. O SDK JavaScript do Firebase (`firebase`) roda no Expo Go; os pacotes `@react-native-firebase/*` **não**.
- Não crie as pastas `android/` e `ios/` à mão. A configuração nativa fica no `app.json`.

## 4. Antes de abrir um PR

```bash
npm run lint
npm run typecheck
npm run doctor
```

Não inclua `.env`, tokens nem chaves no commit.

## 5. Gerar builds (EAS)

O projeto fica na organização Expo **sevenspecs** ([@sevenspecs/unicash](https://expo.dev/accounts/sevenspecs/projects/unicash)). Para disparar builds, crie uma conta em expo.dev e peça para um Owner te convidar para a organização. Depois:

```bash
npm install -g eas-cli
eas login
```

| Comando | Perfil | Gera | Para quê |
| --- | --- | --- | --- |
| `npm run build:apk` | `preview` | APK | instalar direto no Android (testes, apresentação) |
| `npm run build:aab` | `production` | AAB | Google Play |
| `npm run build:ios` | `preview` | IPA (ad hoc) | iPhones registrados; exige Apple Developer Program |

Ao terminar, o terminal mostra um link e um QR code para baixar o APK. Os builds também aparecem em [expo.dev](https://expo.dev), na página do projeto, aba *Builds*. O plano gratuito usa fila e pode demorar.

A keystore do Android fica guardada no EAS (`eas credentials`). Não gere outra: um APK assinado com outra chave não instala por cima do anterior.

**iOS:** sem uma conta Apple paga (US$ 99/ano), teste no iPhone só pelo Expo Go. Com a conta, registre cada aparelho com `eas device:create` antes de rodar `npm run build:ios`.

### Variáveis do Firebase nos builds

O `.env` não vai para a nuvem, e as variáveis `EXPO_PUBLIC_*` são embutidas no app **na hora do build**. Por isso as chaves do Firebase ficam cadastradas no EAS, nos ambientes `preview` (APK) e `production` (AAB), e cada perfil do `eas.json` aponta para o seu ambiente (`"environment"`).

Quem é Owner da organização cadastra uma vez, dentro de `mobile/`, para cada uma das seis variáveis e cada ambiente:

```bash
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "<valor>" --environment preview --visibility plaintext
```

Variáveis: `EXPO_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID` e `..._APP_ID`. Repita com `--environment production` quando for gerar o AAB. Para conferir: `eas env:list --environment preview`. Como a sintaxe pode mudar entre versões do `eas-cli`, confirme com `eas env:create --help`. Também dá para gerenciar as variáveis na página do projeto em expo.dev.

Essas chaves identificam o app, mas qualquer pessoa consegue extraí-las do APK. A proteção dos dados está nas **regras de segurança do Firestore**, que devem exigir usuário autenticado e restringir cada usuário aos próprios dados.

Se um APK abrir mas o login falhar com `auth/invalid-api-key`, falta alguma variável no ambiente usado pelo perfil.

## 6. GitHub Actions

- **Mobile CI** (`.github/workflows/mobile-ci.yml`): roda lint, typecheck e `expo-doctor` em todo PR que mexe em `mobile/` e em push na `main`/`develop`. Não consome builds do EAS e não precisa das variáveis do Firebase.
- **Mobile EAS Build** (`.github/workflows/mobile-eas-build.yml`): manual. Em *Actions → Mobile EAS Build → Run workflow*, escolha o perfil (`preview` = APK, `production` = AAB) e a plataforma. O build roda no EAS, com as variáveis do ambiente do perfil; o link aparece no log da Action e em expo.dev. Cada execução consome um build da cota da sevenspecs.

- **Mobile Release** (`.github/workflows/mobile-release.yml`), o CD: ao enviar uma tag `v*`, roda lint e typecheck, gera o APK `preview` no EAS, espera terminar e publica uma release no GitHub com o APK anexado.

  ```bash
  git switch main && git pull
  git tag v0.1.0
  git push origin v0.1.0
  ```

Configuração (uma vez, por quem é admin do repositório):

1. Em expo.dev → organização **sevenspecs** → *Access tokens*, crie um token (de preferência de um *robot user* da organização).
2. No GitHub, em *Settings → Secrets and variables → Actions*, crie o secret `EXPO_TOKEN` com esse valor.

O botão *Run workflow* só aparece depois que o arquivo do workflow chega na branch padrão (`main`).

## Estrutura

- `src/app/` — telas e rotas (Expo Router: cada arquivo é uma rota, `_layout.tsx` define a navegação)
- código que não é rota (componentes, hooks, banco) fica em `src/`, fora de `src/app/`
- `src/lib/firebase.ts` — inicialização do Firebase (`auth` e `db`)
- `app.json` — nome, identificadores (`br.unb.unicash`), plugins
- `eas.json` — perfis de build e ambientes do EAS