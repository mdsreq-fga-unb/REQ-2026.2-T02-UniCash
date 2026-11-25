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
| Registrar com campos válidos | `service/receita/registrar.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Data, título ou valor ausentes; valor ≤ 0, > 2 casas, acima do limite (RN09) | `unit/validation.test.ts`, `unit/money.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Título vazio, só espaços, > 80; descrição vazia aceita e > 255 rejeitada (RN10) | `unit/validation.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Data futura no mês correto; filtros (sem filtro, data única, período, invertido); ordenação; estado vazio | `service/receita/consulta.test.ts`, `screens/receita/FiltroReceitas.test.tsx`, `screens/receita/ListaReceitas.test.tsx` |
| Editar cada campo, inclusive mudança de mês, e recálculo dos dois meses | `service/receita/editar.test.ts`, `service/receita/serie.test.ts` |
| Recorrência em dias, meses e anos, com e sem término; intervalo zero e término anterior rejeitados | `service/receita/recorrencia.test.ts`, `unit/validation.test.ts`, `screens/receita/ReceitaForm.test.tsx` |
| Série: editar e excluir nos três alcances, totais; geração sem término (12 meses) e conclusão ao abrir o app sem duplicidade | `service/receita/serie.test.ts`, `service/receita/recorrencia.test.ts`, `screens/receita/EditarReceita.test.tsx`, `screens/receita/DetalheReceita.test.tsx` |
| Excluir com confirmação, cancelar, falha em cada etapa da transação (RNF05) | `screens/receita/DetalheReceita.test.tsx`, `service/receita/atomicidade.test.ts` |
| EX06: receita já excluída | `service/receita/editar.test.ts`, `screens/receita/DetalheReceita.test.tsx`, `screens/receita/EditarReceita.test.tsx` |
| EX08: falha de leitura local | `service/receita/leitura.test.ts`, `screens/receita/ListaReceitas.test.tsx`, `screens/receita/DetalheReceita.test.tsx`, `screens/receita/EditarReceita.test.tsx` |
| Encerramento forçado durante a gravação (RNF35) | simulado em `service/receita/atomicidade.test.ts`; roteiro real em 3.1 |
| Offline com reinício; excluir, sincronizar e restaurar da nuvem; EX07 (acesso negado) | `service/receita/sync.test.ts`, `screens/receita/ListaReceitas.test.tsx`; roteiro real em 3.2 |
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
5. **Restauração da nuvem:** a função `restaurarDaNuvem()` (em `sync.ts`) já existe e é coberta por `service/receita/sync.test.ts`. Para validar no aparelho: com a conta conectada e dados sincronizados, desinstale/limpe o app, entre na mesma conta e acione a restauração. **Esperado:** receitas e séries voltam sem duplicar ocorrências, e a receita excluída **não** reaparece. Quem chama a função é o UC10: ao entrar com uma conta em aparelho vazio, a restauração é automática (roteiro 3.6 do UC10).

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
- O prazo de validade das ligações de e-mail (confirmação, redefinição e novo e-mail) é o do Firebase Authentication e não é configurável (decisão de 23/11/2026). A redefinição de senha acontece na página padrão do Firebase.
- A sincronização só roda com o e-mail confirmado e, depois de um cadastro novo, fica **pausada** até a pessoa pedir o envio (FA01). Para repetir o roteiro 3.6 num aparelho já usado, limpe os dados do app: a pausa fica no AsyncStorage por UID.

## 2. Mapa do checklist → arquivos

| Item do checklist | Onde |
|---|---|
| Cadastro com campos válidos; finalidade dos dados; sem CPF | `screens/CadastroConta.test.tsx`, `service/conta/auth-conta.test.ts` |
| E-mail ausente, inválido; senha com 7 e com 8 caracteres; sem maiúscula, sem minúscula, sem caractere especial | `unit/validation-conta.test.ts`, `screens/CadastroConta.test.tsx`, `screens/RedefinirSenha.test.tsx` |
| E-mail já em uso (EX02); falha ao criar conta ou perfil sem estado parcial (EX07, EX10) | `service/conta/auth-conta.test.ts`, `screens/CadastroConta.test.tsx`, `unit/firebase-erros-conta.test.ts` |
| Conta pendente de confirmação não inicia sessão; "Já confirmei"; reenvio (EX11, FA07) | `screens/ConfirmarEmail.test.tsx`, `screens/EntrarConta.test.tsx`, `service/conta/auth-conta.test.ts` |
| Entrada com credenciais corretas e rejeitadas; sem conexão (EX04, EX05) | `screens/EntrarConta.test.tsx`, `service/conta/auth-conta.test.ts`, `unit/erros-conta.test.ts` |
| Recuperar senha com resposta neutra; ligação inválida (EX06) | `screens/RecuperarSenha.test.tsx`, `screens/RedefinirSenha.test.tsx`, `service/conta/auth-conta.test.ts` |
| Encerrar sessão; pendências ao sair; falha ao sair (FA03, EX09) | `screens/Conta.test.tsx`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts` |
| Marcar dados do aparelho como pendentes e enviar; recusar o envio (E5, E6, FA01, EX08) | `screens/ConfirmarEmail.test.tsx`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts` |
| Sincronização só com e-mail confirmado (RF62, EX11) | `service/receita/sync.test.ts`, `service/receita/sync.segundoPlano.test.ts` |
| Envio automático pausado depois do cadastro; "Não enviar"; envio pedido pela pessoa libera o envio (FA01) | `service/receita/sync.test.ts`, `service/conta/servico-conta.test.ts`, `service/conta/sync-app-conta.test.ts`, `screens/ConfirmarEmail.test.tsx` |
| Sair suspende a sincronização e mantém os dados locais (RF06, RN06) | `service/conta/servico-conta.test.ts`, `screens/Conta.test.tsx` |
| Restauração em aparelho novo (FA02, RNF40) | `service/conta/sync-app-conta.test.ts`, `service/conta/index-conta.test.ts` |
| Mensagens sem senha, token ou dados sensíveis (RNF14) | `unit/erros-conta.test.ts`, `unit/firebase-erros-conta.test.ts` |
| Security Rules: perfil de outro usuário negado; e-mail ausente recusado (RNF03, RNF04) | `rules/conta.rules.test.ts` |
| Dados locais continuam após sair e reabrir o app (RN06) | roteiros 3.2 e 3.3 |
| Acessibilidade e paleta (RNF33, RNF38) | roteiro 3.7 |

## 3. Roteiros manuais (não automatizáveis)

Antes de começar, cadastre alguns registros locais (receitas e despesas) para conferir que os dados do aparelho são preservados. Use duas caixas de e-mail de teste (A e B). Anexe as evidências na issue.

### 3.1 Cadastro e confirmação do e-mail
1. Conta → Criar conta. Informe o e-mail A e a senha `Abcdef1!`. **Esperado:** a tela informa a finalidade dos dados e não pede CPF; chega o e-mail de confirmação. No Console, `usuarios/{uid}` existe (só `email`, `criado_em` e `nome`, se informado) e **não há** documentos em `usuarios/{uid}/receitas`, mesmo com registros locais e conexão: nada sobe antes de confirmar o e-mail.
2. Antes de confirmar, feche o app, abra e tente Entrar com o e-mail A. **Esperado:** "Este e-mail ainda não foi confirmado" e a tela de confirmação com "Reenviar". Não há sessão.
3. Toque em "Reenviar". **Esperado:** chega uma nova ligação. (O prazo de validade é o do Firebase; a tela não promete um prazo em minutos depois do ajuste da pendência 5.5 da rastreabilidade. Se ainda mostrar "5 minutos", registre na issue.)
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
1. Confirme o e-mail A e escolha "Enviar meus dados". **Esperado:** os registros continuam no app e aparecem em `usuarios/{uid}/receitas`, `despesas` (se a UC02 já estiver integrada) e `recorrencias` no Console do Firebase; uma receita registrada depois disso sobe sem nova ação; o perfil `usuarios/{uid}` tem só `email`, `criado_em` e `nome` (se informado), sem CPF e sem senha.
2. **FA01 — recusar o envio.** Cadastre o e-mail B, confirme e escolha "Não enviar". **Esperado:** vai à tela inicial; os dados ficam só no aparelho e nada aparece na nuvem.
   1. Registre uma receita nova e abra a lista, com conexão. **Esperado:** continua "pendente" (cabeçalho com "N pendentes") e nada aparece no Console. Feche e reabra o app: a pausa continua.
   2. Conta → Sair → "Sincronizar e sair". **Esperado:** todos os pendentes (os do aparelho e os feitos depois da recusa) aparecem em `usuarios/{uid}/receitas` e a sessão é encerrada.
   3. Entre de novo com o e-mail B, registre outra receita e abra a lista. **Esperado:** ela sobe sozinha: o envio automático voltou depois do pedido da pessoa.
   4. Com outro e-mail (C), cadastre, confirme e **feche o app sem responder** à pergunta. Reabra e entre. **Esperado:** nada sobe até a pessoa pedir o envio (a pausa começa no cadastro).
   5. Troque de conta no mesmo aparelho e confirme que a pausa de uma não afeta a outra.
3. **Aparelho novo:** com os dados do passo 1 já enviados, limpe os dados do app (ou reinstale) e entre com o e-mail A. **Esperado:** receitas, despesas e séries voltam sem duplicar ocorrências, e a receita excluída não reaparece. Se falhar com a mensagem de catálogo ausente, abra a lista de categorias para semear as padrão e entre de novo.

### 3.7 Acessibilidade e identidade visual (RNF33, RNF38)
Percorra cadastro, entrada, confirmação, recuperação e conta com TalkBack (Android) ou VoiceOver (iOS), com a fonte ampliada e nos modos claro e escuro. **Esperado:** todo campo e botão tem rótulo lido pelo leitor de tela; o texto continua legível com fonte ampliada; os contrastes seguem a WCAG 2.1 AA; a paleta é a "Tesouraria Teal". Registre as respostas.

### 3.8 Verificações no Console do Firebase
- A conta aparece em Authentication com o e-mail confirmado.
- Séries (`recorrencias`): se alguma série ficar pendente com "permission-denied" (aviso de acesso negado na lista), registre na issue; é o ponto sobre o campo `tipo` descrito na pendência 5.5 da rastreabilidade.
- Uma chamada direta à API com senha de 7 caracteres é recusada, se a política de senha do servidor estiver ativa.


## 4. Roteiros manuais do UC03 – Consultar resumo financeiro

Rodar com `npx expo start` e abrir no Expo Go. O app abre direto no resumo (`src/app/index.tsx`).
Resultados em `tests/RASTREABILIDADE.md`, seção do UC03.

### 4.1 Fluxo principal e alternativos no aparelho
1. **FA02 – sem lançamentos:** com a base vazia (limpe os dados do Expo Go), abra o app.
   **Esperado:** "Nenhum lançamento ainda", com "Ver tutorial" (abre "Tutorial em breve") e atalhos para registrar receita e despesa; os botões Receitas, Despesas e Categorias continuam no fim da tela (Categorias deve abrir mesmo sem lançamentos).
2. **Passos 3 e 4:** registre no mês atual duas receitas no mesmo dia (ex.: R$ 100,10 e R$ 50,20), uma em outro dia e duas despesas. Volte ao resumo.
   **Esperado:** saldo, total de receitas e total de despesas batem com a conta feita à mão; "Receitas por dia" mostra só os dias com lançamento, e o dia com duas receitas aparece somado (R$ 150,30).
3. **Passos 5 e 6 / FA04:** use as setas para ir a meses anteriores e futuros, passando pela virada do ano. Registre uma receita com data num mês futuro.
   **Esperado:** cada mês mostra os próprios totais; ao trocar de mês, aparece o carregamento e nunca os valores do mês anterior sob o título novo; a receita futura aparece no mês dela.
4. **FA01:** vá a um mês com despesas e sem receitas. **Esperado:** total de receitas R$ 0,00 e "Nenhuma receita neste mês."
5. **FA05:** edite o valor de uma receita, exclua uma despesa e volte ao resumo. **Esperado:** os totais e o saldo são recalculados.
6. **Pós-condição:** navegue por vários meses e confira as listas de receitas e despesas. **Esperado:** nada foi alterado.

### 4.2 FA03 – offline e sem conta (RN06, RF61)
Ative o modo avião, sem conta conectada, e repita os passos 2 a 5 de 4.1. **Esperado:** o resumo funciona igual, calculado só com a base local.

### 4.3 RNF20 – diferentes tamanhos de celular
Abra o resumo num aparelho pequeno (≈ 360 dp de largura) e num grande, ou aumente o tamanho da fonte do sistema.
**Esperado:** nada cortado nem sobreposto; os cartões de receitas e despesas e os botões passam para uma coluna quando não cabem lado a lado; o nome do mês não empurra as setas; a tela rola até o fim.

### 4.4 RNF07 – precisão
Registre receitas de R$ 0,10 e R$ 0,20 no mesmo dia. **Esperado:** o dia e o total mostram exatamente R$ 0,30.

O EX01 (falha no cálculo) não é provocável no aparelho sem alterar o código; fica coberto pelos testes automatizados.

### 4.5 – Geração de recorrências na abertura do resumo

1. Em um aparelho de teste, no primeiro dia de um mês, registre uma receita de R$ 100,10 e uma despesa de R$ 40,20, ambas com repetição mensal, sem término e com a data de início nesse dia. Nas listas de receitas e despesas, confirme que o mês 13 meses à frente ainda não tem ocorrências dessas séries.
2. Encerre o app, avance a data do aparelho para o primeiro dia do mês seguinte e reabra no Expo Go. **Sem tocar nas setas de mês**, assim que a camada "Preparando seus dados locais…" sumir, confira que o resumo do mês corrente já mostra receitas de R$ 100,10, despesas de R$ 40,20 e saldo de R$ 59,90 (e não o estado vazio nem a mensagem de falha). Só então navegue até o mês que estava vazio no passo anterior.
3. Confira nesse mês uma ocorrência de cada série, receitas de R$ 100,10, despesas de R$ 40,20 e saldo de R$ 59,90. Encerre e abra o app novamente e confirme que as ocorrências e os totais permanecem iguais. Restaure a data automática do aparelho após o teste.
