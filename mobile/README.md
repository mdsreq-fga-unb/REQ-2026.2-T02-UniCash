# UniCash — app mobile

App Expo (SDK 58, Expo Router, React Native, TypeScript). No dia a dia, todo mundo desenvolve com o **Expo Go** no celular. Os builds instaláveis (APK, AAB, IPA) são gerados na nuvem pelo **EAS Build**, então ninguém precisa de Android Studio ou Xcode.

## 1. Pré-requisitos

- **Git**
- **Node.js LTS** — recomendamos instalar com o [nvm](https://github.com/nvm-sh/nvm). Dentro de `mobile/`, rode `nvm use` (lê o `.nvmrc`).
- **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)). A versão do Expo Go precisa suportar o **SDK 58**.
- **VS Code** (opcional): ao abrir a pasta, aceite as extensões recomendadas (Expo Tools, ESLint, Prettier).

## 2. Rodar o app

```bash
git clone git@github.com:mdsreq-fga-unb/REQ-2026.2-T02-UniCash.git
cd REQ-2026.2-T02-UniCash/mobile
nvm use
npm install
npm start
```

Leia o QR code com o Expo Go (Android) ou com a câmera (iOS). O celular e o computador precisam estar na mesma rede Wi-Fi.

Se a rede bloquear a conexão (Wi-Fi da UnB, VPN, rede de visitantes), use o túnel:

```bash
npm run start:tunnel
```

Salvar um arquivo recarrega o app na hora. No terminal: `r` recarrega, `j` abre o debugger, `?` mostra os atalhos.

## 3. Regras para continuar compatível com o Expo Go

- Instale dependências **sempre** com `npx expo install <pacote>`, nunca com `npm install <pacote>`. Assim a versão sai compatível com o SDK.
- Use só bibliotecas incluídas no Expo Go (módulos `expo-*` do SDK e as listadas na [documentação do SDK](https://docs.expo.dev/versions/v58.0.0/)). Uma biblioteca com código nativo próprio **não roda no Expo Go**. Antes de adicionar uma, discuta com a equipe: ela obriga a criar um *development build*.
- Não crie as pastas `android/` e `ios/` à mão. A configuração nativa fica no `app.json`.

## 4. Antes de abrir um PR

```bash
npm run lint
npm run typecheck
npm run doctor
```

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

## Estrutura

- `src/app/` — telas e rotas (Expo Router: cada arquivo é uma rota, `_layout.tsx` define a navegação)
- `src/components/`, `src/hooks/`, `src/constants/` — código que não é rota
- `assets/` — ícones e splash
- `app.json` — nome, identificadores (`br.unb.unicash`), plugins
- `eas.json` — perfis de build
