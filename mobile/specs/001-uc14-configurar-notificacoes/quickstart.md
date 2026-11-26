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

## Manual (aparelho físico ou emulador, Expo Go serve)
1. Instalação limpa → Home → "Perfil": dois interruptores desligados.
2. Ligar "Conquistas": diálogo do sistema aparece. Permitir → interruptor ligado, sem aviso.
3. Reiniciar o app: "Conquistas" continua ligado.
4. Reinstalar, ligar "Alertas de limite" e negar: interruptor ligado + aviso FA06. Tocar "Abrir configurações", liberar, voltar: aviso some.
5. Ligar o outro tipo: diálogo não reaparece (FA07).
6. Desligar os dois com permissão negada: aviso some.
7. Modo avião: alternar continua funcionando (FA05).
