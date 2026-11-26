# Roteiro manual — UC14 Configurar notificações

Aparelho físico ou emulador (o Expo Go serve: o UC14 usa só permissões, sem push remoto). Base: D25.

| # | Passos | Resultado esperado | Fluxo |
|---|---|---|---|
| 1 | Instalação limpa → Início → "Perfil" | Seção "Notificações" com "Alertas de limite (80% e 100%)" e "Conquistas", os dois desligados | Passos 1 e 2, D25 |
| 2 | Ligar "Conquistas" e permitir no diálogo do sistema | Interruptor ligado, sem aviso | Passos 3 a 5 |
| 3 | Fechar e reabrir o app | "Conquistas" continua ligado | Pós-condição |
| 3b | Desligar "Conquistas", fechar e reabrir o app | "Conquistas" continua desligado. A supressão do alerta é verificada no teste do consumidor integrado (UC13) | Pós-condição, FA02 |
| 4 | Reinstalar, ligar "Alertas de limite" e negar | Interruptor ligado e aviso de bloqueio com "Abrir configurações" | FA06 |
| 5 | Ligar "Conquistas" | O diálogo do sistema não aparece de novo | FA07 |
| 6 | Tocar "Abrir configurações", liberar as notificações e voltar | Configurações do aparelho abrem; ao voltar, o aviso some | FA06 |
| 7 | Com a permissão negada, desligar os dois tipos | O aviso some | FA06 |
| 8 | Modo avião, alternar um tipo | A gravação funciona normalmente | FA05 |
| 9 | Abrir e sair do Perfil sem tocar em nada | Nada é gravado | FA08 |
| 10 | Conferir a lista | Não aparecem lembrete diário, mês sem movimentação, prazos de metas, atividade dos grupos nem saldo negativo | FA04, D25 |
