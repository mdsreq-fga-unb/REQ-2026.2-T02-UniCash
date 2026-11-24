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
