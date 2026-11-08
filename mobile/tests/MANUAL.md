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
| Offline com reinício; excluir, sincronizar e restaurar da nuvem | `service/sync.test.ts`; roteiro real em 3.2 |
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
5. **Restauração da nuvem:** o app ainda não tem a função de restaurar dados (item do checklist que depende de uma tela/fluxo de "entrar e recuperar dados"). Quando existir, repita: após restaurar, a receita excluída **não** deve reaparecer e as séries não devem duplicar ocorrências.

### 3.3 RNF14 – o usuário identifica o motivo do erro (4 de 5)
- Recrute 5 pessoas. Para cada uma, mostre a tela de nova receita já com um erro provocado (um por pessoa, rodando os 5 primeiros): data vazia; título só com espaços; valor `0`; valor `10,999`; término anterior ao início.
- Pergunte: "O que precisa corrigir?" sem ajuda.
- **Passa** se pelo menos 4 de 5 apontarem o campo e o motivo corretos. Registre as respostas.

### 3.4 RNF27 – registro em até 3 etapas
Contagem (sem recorrência), a partir da lista: **(1)** tocar em "+"; **(2)** preencher título, valor e data (o botão "Hoje" ajuda); **(3)** tocar em "Salvar receita". Cronometre 5 pessoas e confirme que ninguém precisa de um passo extra.
**Com recorrência:** a contagem ainda está pendente de definição (abrir "Repetição", escolher "Repete", ajustar e "Concluir" somam etapas); anote o resultado para decidir o limite.
