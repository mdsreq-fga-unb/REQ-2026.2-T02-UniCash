# Roteiro manual — UC13 Acompanhar conquistas e pontuação

Aparelho físico ou emulador (o Expo Go serve: a notificação é local, sem push remoto). Protótipo: "07 · Conquistas e pontuação" (CQ1 a CQ6).

**Preparação**: para ver pontos e o selo "Primeira meta concluída" antes do UC12, iniciar com as metas de exemplo: `EXPO_PUBLIC_METAS_EXEMPLO=1 npx expo start`. Sem a variável, não há metas concluídas.

| # | Passos | Resultado esperado | Fluxo |
|---|---|---|---|
| 1 | Instalação limpa, sem metas de exemplo → Perfil → ícone ★ | Total 0, "Nenhuma meta concluída", "Nenhuma conquista ainda." e o texto de incentivo [CQ3] | B, FA01 |
| 2 | Registrar receitas maiores que despesas em setembro e outubro (meses já encerrados) e abrir Conquistas | "Selos conquistados (2)": "No verde em outubro" (31/10) e "No verde em setembro" (30/09). Nenhuma notificação, porque é a primeira avaliação | A1, FR-009a |
| 3 | Reiniciar com as metas de exemplo e abrir Conquistas | Total 300, "3 metas concluídas · 100 pontos cada", selo "Primeira meta concluída" e as 3 metas com "+100" [CQ1] | A2, RF45 |
| 4 | Tocar "No verde em outubro" | Detalhe com "Conquistado em 31/10/2026", "Saldo positivo no mês", "Outubro/2026", receitas, despesas e saldo iguais aos do resumo de outubro [CQ2] | B3 |
| 5 | Tocar "Ver resumo do mês" | Resumo aberto em outubro, com os mesmos totais | B3 |
| 6 | Excluir receitas até outubro ficar negativo e voltar a Conquistas | O selo de outubro some | FA08 |
| 7 | Desfazer (registrar de novo a receita) | O selo volta, sem notificação | FA08, FR-007a |
| 8 | Perfil → ligar "Conquistas" e permitir. Registrar receita em agosto que deixe o mês no verde | Chega "Novo selo: No verde em agosto" com "Você fechou agosto com saldo positivo. Toque para ver." [CQ5] | A3, RF46 |
| 9 | Tocar na notificação | O app abre a área Conquistas | RF46 |
| 10 | Desligar "Conquistas" no Perfil e criar outro mês no verde | O selo aparece em Conquistas, sem notificação; ao religar, não chega aviso atrasado | FA04 |
| 11 | Modo avião, repetir o passo 6 | Selos e pontos se comportam igual | FA06, RN06 |
| 12 | Repetir abertura de Conquistas várias vezes | Nenhum selo ou ponto duplicado | FA02, FA03 |

Não cobertos manualmente (testes automatizados em `tests/screens/Conquistas.test.tsx`): EX03, erro de leitura [CQ4], e EX04, acesso negado [CQ6].
