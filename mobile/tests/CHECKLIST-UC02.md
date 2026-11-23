# Checklist técnico e DoD (Nível 1) – UC02 Gerenciar despesas

Legenda: ✅ feito e verificável · ⚠️ parcial ou dependente de outro caso de uso · ⏳ pendente (precisa de ação humana).
O resultado do commit atual está nos [checks do PR #55](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/55/checks).

## DoD – Nível 1

| Item | Situação | Evidência / observação |
|---|---|---|
| Fluxos 100% implementados | ⚠️ | Principal, A, B, C e D implementados, incluindo o catálogo de categorias próprias da [UC06, #43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/43). Faltam por dependência: recálculo de saldo, totais, limites e alertas (UC04, UC05, UC09). Ver `RASTREABILIDADE-UC02.md`, seções 4 e 5. |
| Exceções com feedback amigável | ✅ | EX01 a EX07 e EX09 com a mensagem do caso de uso; EX05 em editar e EX06 na lista incluídos. |
| CI verde (build, testes, lint) | ✅ local | Em 20/11/2026: lint e typecheck aprovados, 1153 testes com cobertura e 57 testes de Rules no Emulator. O CI remoto deve confirmar no PR. |
| Tabela fluxo/RN → teste, sem item sem teste | ✅ | `tests/RASTREABILIDADE-UC02.md`. Os itens ⏳ da tabela são dependências declaradas, não lacunas de teste. |
| RN com teste válido, inválido e valor-limite | ✅ | RN09, RN10, RN12, RN13, RN19 em `unit/despesas.validation.test.ts`, `service/despesas.*.test.ts`. |
| Checklists técnicos preenchidos | ✅ | Este documento e a seção "Mapa" da matriz. |
| Evidência de precisão e isolamento (`test:rules`) | ✅ | 57/57 no Firebase Emulator local em 20/11/2026. Histórico do PR #55: [testes e cobertura](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44630861300/job/135936792573) e [regras no emulador](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44630861300/job/135936792234). |
| Evidência de persistência e sincronização | ⚠️ | Automatizada: ✅ (`service/sync.test.ts`, `db/migrations.test.ts`, tombstones e retry). Manual no Expo Go/APK: ⏳ (`MANUAL-UC02.md`, 2.1 a 2.3). Sincronização real: depende da [autenticação, #61](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/61) (2.4). |
| Rastreabilidade na ferramenta de gestão | ⏳ | Copiar a matriz para a ferramenta da equipe. |
| Documentação técnica no GitPages | ⏳ | Fora do repositório; atualizar com o UC02 e a integração UC06 (esquema de despesas, sincronização e catálogo de categorias). |

## Checklist técnico

### Persistência e dados
- [x] Valores em centavos inteiros (`valor_centavos`); sem ponto flutuante nas somas.
- [x] Gravação em transação única; falha reverte tudo (RN11), inclusive na exclusão por alcance.
- [x] Exclusão lógica em fila até a confirmação na nuvem. Após confirmar, a linha local retém a chave e os horários de exclusão e de atualização.
- [x] Série de despesa guarda `tipo`, categoria e classificações; a restauração preserva `tipo = 'despesa'`.
- [x] Leitura exclui despesas apagadas da lista e do total.
- [x] Migrations versionadas 001–005, com `user_version`, validação estrutural, rollback transacional e idempotência.
- [x] Migration 005 adiciona `excluido_em` às séries de despesa e de receita, preservando os dados existentes.
- [x] Instalação nova e bancos legados v4 terminam na versão 5, sem migração ad hoc.

### Sincronização
- [x] Disparo em segundo plano após registrar, editar e excluir, e no foco da lista.
- [x] Falha de sincronização não desfaz a operação local (EX03).
- [x] Payload sem campos opcionais nulos; falha em um registro não bloqueia os demais.
- [x] Contador de pendentes inclui despesas.
- [x] `restaurarDaNuvem` restaura despesas avulsas e séries, é idempotente e não ressuscita exclusões locais.
- [x] Categoria indisponível no catálogo vira `NULL` ao restaurar ou aplicar uma edição remota (EX08).
- [x] Categorias ativas do UC06 são consultadas pelo formulário, pela lista e pelos filtros; os slugs históricos da UC02 são convertidos para IDs reais na semeadura e na sincronização.
- [x] Exclusão de categoria desvincula despesas e séries de despesa na mesma transação, sem apagar lançamentos.
- [x] Marcador de exclusão na nuvem contém apenas `excluido_em` e `atualizado_em`, prevalece sobre edição pendente e evita regenerar ocorrência restaurada (EX04).
- [x] Tombstone remoto de despesa é terminal; tombstone local é publicado e nunca é substituído por documento ativo.
- [x] Séries excluídas não geram novas ocorrências; ocorrências existentes preservam valores, datas, títulos, classificações e vínculos.
- [x] Retry após falha entre confirmação remota e atualização SQLite reconcilia a pendência sem duplicar registros.

### Segurança
- [x] `firestore.rules` valida despesas e séries de despesa (dono, campos, limites), com testes no Emulator.
- [x] Teste do caso de outro usuário nas despesas.
- [x] Tombstones de despesas e séries não podem ser reativados e a exclusão física é negada pelo cliente.
- [x] Receitas avulsas continuam com exclusão física no cliente; essa é uma limitação residual fora da integração UC02/UC06.

### Interface
- [x] A tela inicial abre Despesas. Para um registro simples, o caminho tem três etapas (RNF27): Despesas → Nova despesa → preencher e salvar.
- [x] Lista com data, título, valor e categoria; mês corrente, mais recente primeiro.
- [x] Filtros por dia, mês, período e categoria; estado vazio de FA04 ("Nenhum registro" com sugestão).
- [x] Formulário com seletor das categorias ativas do UC06 (sete padrão e próprias), não mais restrito a slugs provisórios.
- [x] Mensagens de erro do UC (EX01 a EX09) com o texto literal.
- [ ] Prova visual no aparelho (prints ou vídeo): ver `MANUAL-UC02.md`.
- [ ] Migration 005 e fluxos integrados em Android/emulador ou dispositivo físico.
