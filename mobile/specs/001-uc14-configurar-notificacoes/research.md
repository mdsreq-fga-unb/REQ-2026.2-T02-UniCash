# Research: UC14 - Configurar notificações

## R1. API de permissão
- **Decision**: `expo-notifications` (`getPermissionsAsync`, `requestPermissionsAsync`), mapeando `status` + `canAskAgain` para `nao-decidida | concedida | negada`; no iOS usar `ios.status` (PROVISIONAL/EPHEMERAL contam como concedida).
- **Rationale**: módulo Expo recomendado, SDK 58; permissões e notificações locais funcionam no Expo Go.
- **Alternatives**: `react-native-permissions` (terceiro, desnecessário); Firebase Messaging (push remoto, fora do escopo).

## R2. Android 13+
- **Decision**: criar o canal `alertas` com `setNotificationChannelAsync` antes de `requestPermissionsAsync`.
- **Rationale**: a documentação v58 diz que o diálogo "will not appear until at least one notification channel is created".

## R3. "Pedir só na primeira vez"
- **Decision**: não gravar flag própria; decidir pelo estado do SO (`undetermined` pede, demais não).
- **Rationale**: o SO é a fonte da verdade; evita divergência após reinstalação ou liberação manual.
- **Alternatives**: flag em `preferencias_locais` (pode ficar dessincronizada do SO).

## R4. Abrir configurações do aparelho
- **Decision**: `Linking.openSettings()` do `react-native`.
- **Rationale**: a documentação de `expo-notifications` não oferece API para isso; `Linking.openSettings` é a API padrão do RN nas duas plataformas.

## R5. Persistência
- **Decision**: tabela nova `preferencias_notificacao` (tipo, ativo, atualizado_em, estado_sync, uid).
- **Rationale**: `preferencias_locais` só guarda 0/1 sem estado de sincronização nem dono; o UC14 exige pendência de sincronização (FA05) e isolamento (RNF03).

## R6. Sincronização
- **Decision**: gravar `estado_sync = 'pendente'` quando houver conta; não enviar ao Firestore nesta entrega.
- **Rationale**: DoR do UC14 marca a sincronização real como integração posterior; a fila do UC16 não tem o tipo "Preferência".

## R7. Atualizar aviso ao voltar das configurações
- **Decision**: reler a permissão no evento `AppState` `active`.
