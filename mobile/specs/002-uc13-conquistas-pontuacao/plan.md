# Implementation Plan: UC13 - Acompanhar conquistas e pontuação

**Branch**: `feat/uc13-conquistas-pontuacao` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-uc13-conquistas-pontuacao/spec.md`

## Summary

Criar a área "Conquistas" (protótipo 07, telas CQ1 a CQ6), aberta pelo ícone de selo no Perfil. Selos e pontos são derivados a cada leitura por uma função pura sobre os totais mensais (mesmo período do resumo) e as metas concluídas, o que cobre FA02, FA03, FA07 e FA08 sem contador nem revogação. Só a emissão da notificação é gravada, em `conquistas_emitidas`, para notificar cada selo uma vez, pular o histórico na primeira avaliação e tentar de novo após falha. A notificação local usa a preferência e a permissão do UC14. Metas vêm de uma `FonteMetas` substituível até o UC12 existir.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React Native via Expo SDK 58
**Primary Dependencies**: expo-router, expo-sqlite, expo-notifications (já instalado no UC14); nenhuma dependência nova
**Storage**: SQLite local por dono (`getDb()`), nova tabela `conquistas_emitidas` (migração 016, `VERSAO_ESQUEMA` 15 → 16)
**Testing**: Jest 30 + jest-expo + React Native Testing Library; `EmissorNotificacao`, `NotificationPreferences` e `NotificationPermission` simulados; `FonteMetas` de exemplo
**Target Platform**: Android e iOS (notificação local funciona no Expo Go)
**Project Type**: mobile-app
**Performance Goals**: área Conquistas carrega em menos de 500 ms com 5 anos de lançamentos (uma consulta agrupada)
**Constraints**: offline-first (RN06, RNF34); sem contador sincronizado (RN07); dados isolados por dono (RNF03); paleta de `src/lib/theme.ts` (RNF38)
**Scale/Scope**: 2 rotas, 1 módulo de domínio, 1 tabela, 2 marcos

## Constitution Check

`.specify/memory/constitution.md` ainda é o modelo sem princípios preenchidos; não há gates formais. Aplicam-se as regras do `AGENTS.md`: Expo Router em `src/app/`, código não-rota fora de `src/app/`, consultar a doc v58 antes de usar API Expo, lint e typecheck antes de concluir. Migração segue a regra de equipe de `src/db/migrations.ts` (só via registro `MIGRACOES`). **Resultado**: sem violações (antes e depois do design).

## Project Structure

### Documentation (this feature)

```text
specs/002-uc13-conquistas-pontuacao/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── conquistas.ts.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root: mobile/)

```text
src/app/conquistas/index.tsx                     # CQ1, CQ3, CQ4, CQ6
src/app/conquistas/[chave].tsx                   # CQ2 (detalhe do selo)
src/app/perfil.tsx                               # ícone de selo no cabeçalho
src/app/_layout.tsx                              # gatilhos de avaliação e toque na notificação
src/components/conquistas/CartaoPontos.tsx
src/components/conquistas/ItemSelo.tsx
src/components/conquistas/ItemPontuacao.tsx
src/features/conquistas/config.ts                # MARCOS, PONTOS_POR_META (valores de teste)
src/features/conquistas/types.ts
src/features/conquistas/avaliacao.ts             # avaliar() puro
src/features/conquistas/consulta.ts              # totais mensais + FonteMetas → ResumoConquistas
src/features/conquistas/metas.ts                 # FonteMetas: vazia (produção) e exemplo
src/features/conquistas/emissao.ts               # avaliarEEmitir, conquistas_emitidas, linha de base
src/features/conquistas/emissor.ts               # EmissorNotificacao (expo-notifications) + simulado
src/features/conquistas/gatilhos.ts              # aoMudarLancamentos (chamado em receitas/despesas)
src/features/conquistas/mensagens.ts
src/features/conquistas/useConquistas.ts
src/features/receitas/service.ts | src/features/despesas/service.ts   # avisar mudança
src/db/schema.ts | src/db/migrations.ts          # migração 016
tests/features/conquistas/*.test.ts
tests/screens/Conquistas.test.tsx
tests/MANUAL-UC13.md
```

**Structure Decision**: mesmo padrão `features/<dominio>` + `components/<dominio>` + rotas finas em `src/app/` usado no UC14 e no consumo.

## Phase 0 / Phase 1

- Pesquisa: [research.md](research.md)
- Modelo de dados: [data-model.md](data-model.md)
- Contratos: [contracts/conquistas.ts.md](contracts/conquistas.ts.md)
- Validação: [quickstart.md](quickstart.md)

## Complexity Tracking

Nenhuma violação a justificar.
