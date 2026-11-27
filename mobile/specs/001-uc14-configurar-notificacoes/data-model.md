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

**Transições de `estado_sync`**: sem conta → `local`; com conta → `pendente` a cada gravação (FA05, entregue). O envio ao Firestore, `sincronizado`/`erro` e a resolução de conflitos do EX04 (RN07) ficam para a integração com o UC16.

**Migração 012**: vem depois da 011 da UC05 (alertas). Sobe `user_version` para 12 e cria a tabela com `IF NOT EXISTS`, de forma idempotente. A instalação nova cria as tabelas da UC05 e a do UC14.

## EstadoPermissao (não persistido)

`nao-decidida` (status `undetermined` e `canAskAgain`) · `concedida` · `negada`. Lido do SO a cada abertura e ao voltar ao primeiro plano.
