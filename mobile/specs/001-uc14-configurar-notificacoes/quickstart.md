# Quickstart: validar o UC14

## Pré-requisitos
- `cd mobile && npm ci`
- `npx expo install expo-notifications` já aplicado e plugin em `app.json`.

## Automático
```bash
npx jest tests/features/notificacoes tests/screens/Perfil.test.tsx
npx expo lint && npx tsc --noEmit
```
Esperado: cenários da [spec](spec.md) (US1 a US3) verdes, com `NotificationPermission` simulada.

## Validação em aparelho

Consulte o [roteiro manual do UC14](../../tests/MANUAL.md#uc14--configurar-notificações).
