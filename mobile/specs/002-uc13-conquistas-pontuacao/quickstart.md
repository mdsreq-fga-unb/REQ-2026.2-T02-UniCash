# Quickstart: validar o UC13

## Pré-requisitos
- Branch `feat/uc13-conquistas-pontuacao` (base: UC14, PR #127).
- `bun install` (ou `npm install`) em `mobile/`.

## Automático
```bash
npx jest tests/features/conquistas tests/screens/Conquistas.test.tsx tests/db/migrations.test.ts
npx expo lint
npx tsc --noEmit
```
Cobertura esperada:
- `avaliar` (puro): mês com saldo positivo, zero, negativo, sem lançamentos, mês corrente; 0, 1 e 3 metas; total de pontos; ordem (US2, FR-005 a FR-007).
- FA08: excluir a receita que deixava outubro no verde remove o selo; recriar devolve o selo sem nova notificação (FR-007a).
- `avaliarEEmitir` com emissor e preferências simulados: linha de base sem notificação (FR-009a); selo novo notifica uma vez; alerta desligado não notifica (FA04); 2 selos → 2 notificações (FA05); falha de emissão → `pendente` e nova tentativa (EX02); chamadas repetidas não duplicam (SC-002).
- Tela: estados cheio, vazio, erro com "Tentar novamente", acesso negado; toque no selo abre o detalhe (US1, US3, US5).
- Migração 012 cria `conquistas_emitidas` em base nova e em base na versão 11.

## Manual (roteiro em `tests/MANUAL-UC13.md`)
1. `npx expo start`; app com lançamentos de setembro e outubro no verde e a fonte de metas de exemplo ligada.
2. Perfil → ícone de selo: total 300, 3 selos, 3 metas pontuadas [CQ1].
3. Tocar "No verde em outubro": receitas, despesas e saldo iguais ao resumo de outubro [CQ2].
4. Excluir receitas até outubro ficar negativo: selo some; desfazer: selo volta sem notificação.
5. Ligar "Conquistas" no Perfil, criar condição de selo novo: chega "Novo selo: …"; tocar abre Conquistas [CQ5].
6. Desligar "Conquistas" e repetir: selo aparece, sem notificação.
7. Base nova: estado vazio com "Ver metas" [CQ3].
