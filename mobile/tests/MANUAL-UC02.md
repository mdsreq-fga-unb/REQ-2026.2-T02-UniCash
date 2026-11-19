# Testes do UC02 – Gerenciar despesas

A preparação e os comandos são os mesmos do UC01 (`tests/MANUAL.md`, seção 1). A matriz fluxo/RN → teste
está em `tests/RASTREABILIDADE-UC02.md`. Este arquivo cobre o que não se automatiza e como coletar as
evidências exigidas pelo DoD (Nível 1).

## 1. O que roda automaticamente

| Evidência | Comando | O que mostra |
|---|---|---|
| Precisão (centavos inteiros) | `npm test -- despesas.leitura` | 0,10 + 0,20 = 30 centavos exatos e 10,99 preservado (teste "RN09/precisão") |
| Valores-limite de RN09 | `npm test -- despesas.validation` | 0,01, 10,5, 10,99, 999.999.999,99 aceitos; 0, negativos, 10,999 e 1.000.000.000,00 rejeitados com a mensagem literal |
| Isolamento entre usuários | `npm run test:rules` | Security Rules no Firebase Emulator, inclusive o caso de outro usuário nas despesas e nas séries |
| Persistência e sincronização (automatizada) | `npm test -- sync` | SQLite em memória e Firebase mockado: envio, offline, conflito, restauração de despesas e de séries |
| Tudo, com cobertura | `npm test -- --ci --coverage` | Relatório de cobertura (no CI, artefato `coverage`) |

No CI (Mobile CI), os mesmos resultados aparecem nos jobs "Lint, typecheck, testes e build" e
"Security Rules (Firebase Emulator)". Anexe ao PR o link da execução verde e os logs desses dois jobs.

## 2. Roteiros manuais

Rodar no Expo Go ou no APK. Registre prints ou um vídeo curto de cada roteiro.

### 2.1 Persistência após fechar e reabrir o app
1. Registre uma despesa avulsa (título, valor e data) e uma despesa recorrente com término.
2. Edite a avulsa (mude o valor) e exclua uma ocorrência da série.
3. Feche o app pelo seletor de apps e reabra.
4. **Esperado:** a despesa avulsa mostra o valor editado, a série mantém as ocorrências restantes e a
   excluída não reaparece; o total do período confere.

### 2.2 Precisão do total
1. Registre duas despesas no mesmo mês: R$ 0,10 e R$ 0,20. **Esperado:** total `− R$ 0,30`.
2. Registre uma despesa de R$ 10,99. **Esperado:** a lista e o detalhe mostram `10,99`, sem arredondamento.

### 2.3 Encerramento forçado durante a gravação (RNF35)
1. Registre uma despesa **recorrente sem término** (gera ocorrências para os próximos 12 meses).
2. No instante em que tocar em "Salvar despesa", force o fechamento do app. Repita variando o instante.
3. Reabra. **Esperado:** a série está inteira ou ausente; nunca com ocorrências faltando no meio.

### 2.4 Offline, sincronização e restauração (depende da autenticação)
Hoje o app **não tem fluxo de login** (o `auth.currentUser` é nulo), então `sincronizarPendentes` retorna
sem enviar e `restaurarDaNuvem` não é chamada por nenhuma tela. Este roteiro só pode ser executado depois
que o caso de uso de autenticação existir:
1. Com a conta conectada, ative o modo avião. Registre, edite e exclua despesas.
   **Esperado:** tudo funciona; os itens mostram "Sincronização pendente" e a lista mostra "↻ N pendentes".
2. Desative o modo avião e abra a lista. **Esperado:** as pendências somem e os documentos aparecem em
   `usuarios/{uid}/despesas` no console do Firebase, sem campos nulos para despesa sem categoria.
3. Exclua uma despesa já sincronizada. **Esperado:** o documento some do console.
4. Limpe o app, entre na mesma conta e acione a restauração. **Esperado:** despesas e séries voltam (séries
   continuam sendo de despesa) e a despesa excluída não reaparece.

### 2.5 Mensagens de exceção
- **EX05:** abra uma despesa, exclua-a por outro caminho (ou por outro aparelho com a mesma conta) e tente
  editar ou salvar. **Esperado:** "Esta despesa não está mais disponível." na lista.
- **EX06:** só reproduzível com autenticação e regras ativas; está coberto por teste automatizado.
