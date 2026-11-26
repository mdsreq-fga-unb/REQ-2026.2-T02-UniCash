# Implementation Plan: UC14 - Configurar notificações

**Branch**: `feat/uc14-configurar-notificacoes` | **Date**: 2026-11-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-uc14-configurar-notificacoes/spec.md`

## Summary

Criar a tela de Perfil com a seção "Notificações" do protótipo, com dois interruptores (`limite` e `conquistas`), estado inicial desligado e pedido da permissão do aparelho na primeira ativação (D25). As preferências ficam em uma tabela SQLite local com estado de sincronização. O serviço expõe `NotificationPreferences.isEnabled(tipo)` para UC05 e UC13. A permissão fica atrás da interface `NotificationPermission`, implementada com `expo-notifications` e simulada nos testes.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React Native via Expo SDK 58
**Primary Dependencies**: expo-router, expo-sqlite, `expo-notifications` (novo, via `npx expo install`), `Linking.openSettings` do React Native
**Storage**: SQLite local, nova tabela `preferencias_notificacao` (migração incremental)
**Testing**: Jest 30 + jest-expo + React Native Testing Library; `NotificationPermission` simulada
**Target Platform**: Android e iOS (permissões funcionam no Expo Go; push remoto não entra)
**Project Type**: mobile-app
**Performance Goals**: alternar interruptor com resposta visual em menos de 300 ms (gravação local)
**Constraints**: offline-first (RN06, RNF34); dados isolados por usuário (RNF03); paleta de `src/lib/theme.ts` (RNF38)
**Scale/Scope**: 1 rota nova, 1 seção, 2 tipos, 1 tabela

## Constitution Check

`.specify/memory/constitution.md` ainda é o modelo sem princípios preenchidos; não há gates formais. Aplicam-se as regras do `AGENTS.md`: Expo Router em `src/app/`, código não-rota fora de `src/app/`, `npx expo install` para dependências, lint e typecheck antes de concluir. **Resultado**: sem violações (antes e depois do design).

## Project Structure

### Documentation (this feature)

```text
specs/001-uc14-configurar-notificacoes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── notificacoes.ts.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root: mobile/)

```text
src/app/perfil.tsx                                  # rota nova (tela de Perfil)
src/app/index.tsx                                   # botão "Perfil" na home
src/components/perfil/SecaoNotificacoes.tsx         # seção com interruptores, aviso e erros
src/components/perfil/ItemInterruptor.tsx
src/features/notificacoes/types.ts                  # TipoAlerta, EstadoPermissao
src/features/notificacoes/padroes.ts                # ESTADO_INICIAL (constante única, D25)
src/features/notificacoes/preferencias.ts           # NotificationPreferences (SQLite)
src/features/notificacoes/permissao.ts              # NotificationPermission (expo-notifications)
src/features/notificacoes/permissao.simulada.ts
src/features/notificacoes/mensagens.ts              # EX01, EX02, aviso FA06
src/features/notificacoes/useNotificacoes.ts        # hook da seção
src/db/schema.ts | src/db/migrations.ts             # DDL e migração
tests/features/notificacoes/*.test.ts
tests/screens/Perfil.test.tsx
app.json                                            # plugin expo-notifications
```

**Structure Decision**: segue o padrão `features/<dominio>` + `components/<dominio>` + rota fina em `src/app/`, como em `tutorial` e `sincronizacao`.

## Phase 0 / Phase 1

- Pesquisa: [research.md](research.md)
- Modelo de dados: [data-model.md](data-model.md)
- Contratos: [contracts/notificacoes.ts.md](contracts/notificacoes.ts.md)
- Validação: [quickstart.md](quickstart.md)

## Complexity Tracking

Nenhuma violação a justificar.
