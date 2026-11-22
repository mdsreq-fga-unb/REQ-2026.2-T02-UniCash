# Testes do UC01 – Gerenciar receitas

## 1. Preparação (uma vez)

```bash
npx expo install jest-expo jest @types/jest -- --save-dev
npm install --save-dev @testing-library/react-native better-sqlite3 @types/better-sqlite3 @firebase/rules-unit-testing
```

Em `package.json`, em `scripts`:

```json
"test": "jest",
"test:rules": "firebase emulators:exec --only firestore --project unicash-rules-test \"jest --config jest.rules.config.js\""
```

- `npm test` roda unitários, serviço (SQLite em memória) e telas. Não precisa de emulador nem de celular.
- `npm run test:rules` roda as Security Rules no Firebase Emulator Suite (precisa de `firebase-tools`, Java e do `firebase.json` com a chave `firestore`). Se o `firestore.rules` não estiver na raiz do repositório, defina `FIRESTORE_RULES_PATH`.

## 2. Mapa do checklist → arquivos

| Item do checklist | Onde |
|---|---|
| Registrar com campos válidos | `service/registrar.test.ts`, `screens/ReceitaForm.test.tsx` |
| Data, título ou valor ausentes; valor ≤ 0, > 2 casas, acima do limite (RN09) | `unit/validation.test.ts`, `unit/money.test.ts`, `screens/ReceitaForm.test.tsx` |
| Título vazio, só espaços, > 80; descrição vazia aceita e > 255 rejeitada (RN10) | `unit/validation.test.ts`, `screens/ReceitaForm.test.tsx` |
| Data futura no mês correto; filtros (sem filtro, data única, período, invertido); ordenação; estado vazio | `service/consulta.test.ts`, `screens/FiltroReceitas.test.tsx`, `screens/ListaReceitas.test.tsx` |
| Editar cada campo, inclusive mudança de mês, e recálculo dos dois meses | `service/editar.test.ts`, `service/serie.test.ts` |
| Recorrência em dias, meses e anos, com e sem término; intervalo zero e término anterior rejeitados | `service/recorrencia.test.ts`, `unit/validation.test.ts`, `screens/ReceitaForm.test.tsx` |
| Série: editar e excluir nos três alcances, totais; geração sem término (12 meses) e conclusão ao abrir o app sem duplicidade | `service/serie.test.ts`, `service/recorrencia.test.ts`, `screens/EditarReceita.test.tsx`, `screens/DetalheReceita.test.tsx` |
| Excluir com confirmação, cancelar, falha em cada etapa da transação (RNF05) | `screens/DetalheReceita.test.tsx`, `service/atomicidade.test.ts` |
| EX06: receita já excluída | `service/editar.test.ts`, `screens/DetalheReceita.test.tsx`, `screens/EditarReceita.test.tsx` |
| EX08: falha de leitura local | `service/leitura.test.ts`, `screens/ListaReceitas.test.tsx`, `screens/DetalheReceita.test.tsx`, `screens/EditarReceita.test.tsx` |
| Encerramento forçado durante a gravação (RNF35) | simulado em `service/atomicidade.test.ts`; roteiro real em 3.1 |
| Offline com reinício; excluir, sincronizar e restaurar da nuvem; EX07 (acesso negado) | `service/sync.test.ts`, `screens/ListaReceitas.test.tsx`; roteiro real em 3.2 |
| Security Rules, inclusive outro usuário (RNF03) | `rules/firestore.rules.test.ts` |
| Usabilidade RNF14 e RNF27 | roteiros 3.3 e 3.4 |

## 3. Roteiros manuais (não automatizáveis)

### 3.1 Encerramento forçado durante a gravação (RNF35)
1. Registre uma receita **recorrente sem término** (gera ~13 ocorrências).
2. No instante em que tocar em "Salvar receita", force o fechamento do app (Android: deslizar o app nos recentes; iOS: fechar pelo seletor de apps). Repita algumas vezes, variando o instante.
3. Reabra o app. **Esperado:** a série está inteira (13 ocorrências) ou ausente; nunca com ocorrências faltando no meio nem sem a série.

### 3.2 Offline, reinício e nuvem
1. Com a conta conectada, ative o modo avião. Registre, edite e exclua receitas.
   **Esperado:** tudo funciona; registros mostram "Sincronização pendente" e o cabeçalho mostra "N pendentes".
2. Feche e reabra o app ainda offline. **Esperado:** os dados continuam lá e continuam pendentes.
3. Desative o modo avião e abra a lista. **Esperado:** pendências somem e os documentos aparecem em `usuarios/{uid}/receitas` no console do Firebase.
4. Exclua uma receita já sincronizada e deixe sincronizar. **Esperado:** o documento some do console.
5. **Restauração da nuvem:** a função `restaurarDaNuvem()` (em `sync.ts`) já existe e é coberta por `service/sync.test.ts`. Para validar no aparelho: com a conta conectada e dados sincronizados, desinstale/limpe o app, entre na mesma conta e acione a restauração. **Esperado:** receitas e séries voltam sem duplicar ocorrências, e a receita excluída **não** reaparece. A tela/botão que chama a função pertence ao fluxo de login/cadastro (fora do UC01).

### 3.3 RNF14 – o usuário identifica o motivo do erro (4 de 5)
- Recrute 5 pessoas. Para cada uma, mostre a tela de nova receita já com um erro provocado (um por pessoa, rodando os 5 primeiros): data vazia; título só com espaços; valor `0`; valor `10,999`; término anterior ao início.
- Pergunte: "O que precisa corrigir?" sem ajuda.
- **Passa** se pelo menos 4 de 5 apontarem o campo e o motivo corretos. Registre as respostas.

### 3.4 RNF27 – registro em até 3 etapas
Contagem (sem recorrência), a partir da lista: **(1)** tocar em "+"; **(2)** preencher título, valor e data (o botão "Hoje" ajuda); **(3)** tocar em "Salvar receita". Cronometre 5 pessoas e confirme que ninguém precisa de um passo extra.
**Com recorrência:** a contagem ainda está pendente de definição (abrir "Repetição", escolher "Repete", ajustar e "Concluir" somam etapas); anote o resultado para decidir o limite.

---

# Testes do UC10 – Conta e sessão

## 1. Preparação (uma vez)

As dependências de teste são as mesmas do UC01. Para o UC10 acrescente:

```bash
npx expo install firebase @react-native-async-storage/async-storage
```

- `npm test` roda unitários, serviço e telas do UC10 junto com os demais. Não precisa de emulador nem de celular.
- `npm run test:rules` roda também `tests/rules/conta.rules.test.ts` (perfil em `usuarios/{uid}`), sobre o mesmo `firestore.rules` do UC01.
- A prova manual (seção 3) usa o **Firebase real**, porque o Emulator Suite não envia e-mails: no `.env`, `EXPO_PUBLIC_USE_EMULATOR=false` e as variáveis `EXPO_PUBLIC_FIREBASE_*` preenchidas. No Console: ativar o provedor E-mail/senha (Authentication → Sign-in method) e publicar as regras com `firebase deploy --only firestore:rules`.
- No `src/app/_layout.tsx`, `iniciarConta()` precisa estar chamada; sem ela o app continua com o serviço simulado.

## 2. Mapa do checklist → arquivos

| Item do checklist | Onde |
|---|---|
| Cadastro com campos válidos; finalidade dos dados; sem CPF | `screens/CadastroConta.test.tsx`, `service/auth-conta.test.ts` |
| E-mail ausente, inválido; senha com 7 e com 8 caracteres; sem maiúscula, sem minúscula, sem caractere especial | `unit/validation-conta.test.ts`, `screens/CadastroConta.test.tsx`, `screens/RedefinirSenha.test.tsx` |
| E-mail já em uso (EX02); falha ao criar conta ou perfil sem estado parcial (EX07, EX10) | `service/auth-conta.test.ts`, `screens/CadastroConta.test.tsx`, `unit/firebase-erros-conta.test.ts` |
| Conta pendente de confirmação não inicia sessão; "Já confirmei"; reenvio (EX11, FA07) | `screens/ConfirmarEmail.test.tsx`, `screens/EntrarConta.test.tsx`, `service/auth-conta.test.ts` |
| Entrada com credenciais corretas e rejeitadas; sem conexão (EX04, EX05) | `screens/EntrarConta.test.tsx`, `service/auth-conta.test.ts`, `unit/erros-conta.test.ts` |
| Recuperar senha com resposta neutra; ligação inválida (EX06) | `screens/RecuperarSenha.test.tsx`, `screens/RedefinirSenha.test.tsx`, `service/auth-conta.test.ts` |
| Encerrar sessão; pendências ao sair; falha ao sair (FA03, EX09) | `screens/Conta.test.tsx`, `service/servico-conta.test.ts`, `service/sync-app-conta.test.ts` |
| Marcar dados do aparelho como pendentes e enviar; recusar o envio (E5, E6, FA01, EX08) | `screens/ConfirmarEmail.test.tsx`, `service/servico-conta.test.ts`, `service/sync-app-conta.test.ts` |
| Restauração em aparelho novo (FA02, RNF40) | `service/sync-app-conta.test.ts`, `service/index-conta.test.ts` |
| Mensagens sem senha, token ou dados sensíveis (RNF14) | `unit/erros-conta.test.ts`, `unit/firebase-erros-conta.test.ts` |
| Security Rules: perfil de outro usuário negado; e-mail ausente recusado (RNF03, RNF04) | `rules/conta.rules.test.ts` |
| Dados locais continuam após sair e reabrir o app (RN06) | roteiros 3.2 e 3.3 |
| Acessibilidade e paleta (RNF33, RNF38) | roteiro 3.7 |

## 3. Roteiros manuais (não automatizáveis)

Antes de começar, cadastre alguns registros locais (receitas e despesas) para conferir que os dados do aparelho são preservados. Use duas caixas de e-mail de teste (A e B). Anexe as evidências na issue.

### 3.1 Cadastro e confirmação do e-mail
1. Conta → Criar conta. Informe o e-mail A e a senha `Abcdef1!`. **Esperado:** a tela informa a finalidade dos dados e não pede CPF; chega o e-mail de confirmação.
2. Antes de confirmar, feche o app, abra e tente Entrar com o e-mail A. **Esperado:** "Este e-mail ainda não foi confirmado" e a tela de confirmação com "Reenviar". Não há sessão.
3. Toque em "Reenviar". **Esperado:** chega uma nova ligação.
4. Abra a ligação, volte ao app e toque "Já confirmei". **Esperado:** a sessão inicia e o app pergunta se envia os dados do aparelho.
5. Tente cadastrar de novo o e-mail A. **Esperado:** "Este e-mail já está em uso."
6. Tente cadastrar com `Abcde1!` (7 caracteres), `abcdef1!`, `ABCDEF1!` e `Abcdefg1`. **Esperado:** cada uma é recusada com a mensagem da política, o e-mail preservado e a senha limpa.

### 3.2 Entrar, reabrir o app e uso sem conta
1. Entre com o e-mail A. **Esperado:** vai à tela inicial.
2. Feche o app por completo e abra de novo. **Esperado:** a sessão continua ativa e os dados locais estão lá.
3. Em outro aparelho (ou após Sair), use "Continuar sem conta". **Esperado:** o app funciona normalmente só no aparelho (RF61).

### 3.3 Sair e dados locais (RN06, FA03)
1. Conta → Sair, sem pendências. **Esperado:** "Sessão encerrada" e os dados continuam no aparelho.
2. Entre de novo, ative o modo avião, registre uma receita e toque em Sair. **Esperado:** o app avisa da alteração pendente; "Sair mesmo assim" encerra; com conexão, "Sincronizar e sair" envia antes.
3. Reabra o app. **Esperado:** os dados locais continuam.

### 3.4 Sem conexão (EX03, EX05, FA04)
1. Com o modo avião, tente cadastrar, entrar e recuperar a senha. **Esperado:** cada operação mostra a mensagem de falta de conexão e nada é criado.
2. Com sessão ativa e modo avião, toque em Sair. **Esperado:** a sessão é encerrada sem exigir conexão.

### 3.5 Recuperar a senha
1. Entrar → Esqueci minha senha → e-mail A. **Esperado:** mensagem neutra ("Se existir uma conta com esse e-mail...") e chega o e-mail.
2. Abra a ligação e defina a nova senha na página do Firebase. **Esperado:** a senha antiga deixa de funcionar e a nova entra no app.
3. Informe um e-mail sem conta. **Esperado:** a mesma mensagem neutra, sem revelar se a conta existe.

### 3.6 Envio inicial e restauração
1. Confirme o e-mail A e escolha "Enviar meus dados". **Esperado:** os registros continuam no app e aparecem em `usuarios/{uid}/receitas`, `despesas` e `recorrencias` no Console do Firebase; o perfil `usuarios/{uid}` tem só `email`, `criado_em` e `nome` (se informado), sem CPF e sem senha.
2. Cadastre o e-mail B, confirme e escolha "Não enviar". **Esperado:** os dados ficam só no aparelho e nada aparece na nuvem enquanto não houver novo envio (ver pendência FA01).
3. **Aparelho novo:** com os dados do passo 1 já enviados, limpe os dados do app (ou reinstale) e entre com o e-mail A. **Esperado:** receitas, despesas e séries voltam sem duplicar ocorrências, e a receita excluída não reaparece. Se falhar com a mensagem de catálogo ausente, abra a lista de categorias para semear as padrão e entre de novo.

### 3.7 Acessibilidade e identidade visual (RNF33, RNF38)
Percorra cadastro, entrada, confirmação, recuperação e conta com TalkBack (Android) ou VoiceOver (iOS), com a fonte ampliada e nos modos claro e escuro. **Esperado:** todo campo e botão tem rótulo lido pelo leitor de tela; o texto continua legível com fonte ampliada; os contrastes seguem a WCAG 2.1 AA; a paleta é a "Tesouraria Teal". Registre as respostas.

### 3.8 Verificações no Console do Firebase
- A conta aparece em Authentication com o e-mail confirmado.
- Uma chamada direta à API com senha de 7 caracteres é recusada, se a política de senha do servidor estiver ativa.
