# Data Model: UC13 - Acompanhar conquistas e pontuação

Selos e pontos são **derivados** (research R1). Só o registro de emissão é gravado.

## Configuração (código, `src/features/conquistas/config.ts`)

### Marco
| Campo | Tipo | Regra |
|---|---|---|
| id | `'no-verde' \| 'primeira-meta'` | estável; compõe a chave do selo |
| nome | `(ref) => string` | "No verde em outubro", "Primeira meta concluída" |
| descricao | string | "Fechou o mês com saldo positivo", "Concluiu a primeira meta financeira" |
| fraseNotificacao | `(ref) => string` | "Você fechou outubro com saldo positivo. Toque para ver." |

`PONTOS_POR_META = 100`.

## Entradas da avaliação (lidas da base)

### TotaisMes
`{ mes: 'AAAA-MM', receitasCentavos, despesasCentavos }`, só meses **anteriores** ao corrente, mesmo período de `intervaloDoMes`, lançamentos com `excluido_em IS NULL`.

### MetaConcluida (de `FonteMetas`)
`{ id, titulo, concluidaEm: 'AAAA-MM-DD' }`.

## Saídas derivadas

### Selo
| Campo | Regra |
|---|---|
| chave | `no-verde:AAAA-MM` ou `primeira-meta` (única) |
| marco | id do Marco |
| nome, descricao | da configuração |
| data | último dia do mês (`no-verde`) ou `concluidaEm` da meta mais antiga (`primeira-meta`) |
| referencia | `{ mes, receitasCentavos, despesasCentavos, saldoCentavos }` ou `{ metaId, titulo }` |

Regras: `no-verde` existe só se `receitas > despesas` (saldo zero ou mês sem lançamentos não conta). `primeira-meta` existe se houver ≥ 1 meta concluída. Ordem: data decrescente.

### PontuacaoMeta
`{ metaId, titulo, concluidaEm, pontos: PONTOS_POR_META }`, uma por meta concluída.

### ResumoConquistas
`{ totalPontos, metasConcluidas, pontosPorMeta, selos: Selo[], pontuacoes: PontuacaoMeta[] }`. `totalPontos = metasConcluidas × PONTOS_POR_META`.

## Tabela nova: `conquistas_emitidas` (migração 012)

| Coluna | Tipo | Regra |
|---|---|---|
| chave | TEXT PK | chave do selo |
| status | TEXT NOT NULL | `'emitida' \| 'pendente'` |
| criado_em | TEXT NOT NULL | ISO |
| atualizado_em | TEXT NOT NULL | ISO |

Fica no banco do dono (`getDb()`), não sincroniza (RN07: em outro aparelho a primeira avaliação vira linha de base).

### Transições de status
```
(sem linha) --primeira avaliação--------------------> emitida (sem notificar)
(sem linha) --alerta desligado----------------------> emitida (sem notificar, FA04)
(sem linha) --alerta ligado + emissão ok------------> emitida
(sem linha) --alerta ligado + falha ou sem permissão-> pendente (EX02)
pendente    --próxima avaliação, emissão ok---------> emitida
pendente    --alerta desligado----------------------> emitida (descarta aviso)
selo some e volta: linha mantida, sem nova notificação (FR-007a)
```

### Marca de linha de base
`preferencias_locais` chave `conquistas_linha_base` = `1` após a primeira avaliação bem-sucedida.
