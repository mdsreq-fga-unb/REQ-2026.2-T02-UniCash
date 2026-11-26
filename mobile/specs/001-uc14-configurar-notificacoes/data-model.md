# Data Model: UC14

## PreferenciaNotificacao (SQLite `preferencias_notificacao`)

| Campo | Tipo | Regra |
|---|---|---|
| `uid` | TEXT NOT NULL | dono; `'local'` sem conta (RNF03) |
| `tipo` | TEXT NOT NULL | `limite` \| `conquistas` (CHECK) |
| `ativo` | INTEGER NOT NULL | 0 ou 1 |
| `atualizado_em` | TEXT NOT NULL | ISO 8601; base da RN07 (vale a mais recente) |
| `estado_sync` | TEXT NOT NULL | `local` \| `pendente` \| `sincronizado` \| `erro` |

PK `(uid, tipo)`. Linha ausente = `ESTADO_INICIAL[tipo]` (desligado, D25); nada é gravado só por abrir a tela (FA08).

**Transições de `estado_sync`**: sem conta → `local`; com conta → `pendente` a cada gravação; `sincronizado`/`erro` serão definidos pela integração com o UC16.

**Migração**: incrementa `user_version`, cria a tabela com `IF NOT EXISTS`; idempotente.

## EstadoPermissao (não persistido)

`nao-decidida` (status `undetermined` e `canAskAgain`) · `concedida` · `negada`. Lido do SO a cada abertura e ao voltar ao primeiro plano.
