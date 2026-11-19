# Checklist técnico e DoD (Nível 1) – UC02 Gerenciar despesas

Legenda: ✅ feito e verificável · ⚠️ parcial ou dependente de outro caso de uso · ⏳ pendente (precisa de ação humana).
O resultado do commit atual está nos [checks do PR #55](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/pull/55/checks).

## DoD – Nível 1

| Item | Situação | Evidência / observação |
|---|---|---|
| Fluxos 100% implementados | ⚠️ | Principal, A, B, C e D implementados. Faltam por dependência: recálculo de saldo, totais, limites e alertas (UC04, UC05, UC09) e integração do catálogo de categorias próprias ([UC06, #43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/43)). Ver `RASTREABILIDADE-UC02.md`, seção 4. |
| Exceções com feedback amigável | ✅ | EX01 a EX07 e EX09 com a mensagem do caso de uso; EX05 em editar e EX06 na lista incluídos. |
| CI verde (build, testes, lint) | Verificar no PR | Mobile CI: "Lint, typecheck, testes e build" e "Security Rules (Firebase Emulator)". |
| Tabela fluxo/RN → teste, sem item sem teste | ✅ | `tests/RASTREABILIDADE-UC02.md`. Os itens ⏳ da tabela são dependências declaradas, não lacunas de teste. |
| RN com teste válido, inválido e valor-limite | ✅ | RN09, RN10, RN12, RN13, RN19 em `unit/despesas.validation.test.ts`, `service/despesas.*.test.ts`. |
| Checklists técnicos preenchidos | ✅ | Este documento e a seção "Mapa" da matriz. |
| Evidência de precisão e isolamento (`test:rules`) | ✅ | [Testes e cobertura](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44630861300/job/135936792573) e [regras no emulador](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/actions/runs/44630861300/job/135936792234). |
| Evidência de persistência e sincronização | ⚠️ | Automatizada: ✅ (`service/sync.test.ts`). Manual no Expo Go/APK: ⏳ (`MANUAL-UC02.md`, 2.1 a 2.3). Sincronização real: depende da [autenticação, #61](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/61) (2.4). |
| Rastreabilidade na ferramenta de gestão | ⏳ | Copiar a matriz para a ferramenta da equipe. |
| Documentação técnica no GitPages | ⏳ | Fora do repositório; atualizar com o UC02 (esquema de despesas, sincronização, categorias provisórias). |

## Checklist técnico

### Persistência e dados
- [x] Valores em centavos inteiros (`valor_centavos`); sem ponto flutuante nas somas.
- [x] Gravação em transação única; falha reverte tudo (RN11), inclusive na exclusão por alcance.
- [x] Exclusão lógica em fila até a confirmação na nuvem. Após confirmar, a linha local retém a chave e os horários de exclusão e de atualização.
- [x] Série de despesa guarda `tipo`, categoria e classificações; a restauração preserva `tipo = 'despesa'`.
- [x] Leitura exclui despesas apagadas da lista e do total.

### Sincronização
- [x] Disparo em segundo plano após registrar, editar e excluir, e no foco da lista.
- [x] Falha de sincronização não desfaz a operação local (EX03).
- [x] Payload sem campos opcionais nulos; falha em um registro não bloqueia os demais.
- [x] Contador de pendentes inclui despesas.
- [x] `restaurarDaNuvem` restaura despesas avulsas e séries, é idempotente e não ressuscita exclusões locais.
- [x] Categoria indisponível no catálogo padrão vira `NULL` ao restaurar ou aplicar uma edição remota (EX08).
- [ ] Consultar categorias próprias e migrar IDs padrão após a integração com UC06.
- [x] Marcador de exclusão na nuvem contém apenas `excluido_em` e `atualizado_em` e prevalece sobre edição pendente e evita regenerar ocorrência restaurada (EX04).

### Segurança
- [x] `firestore.rules` valida despesas e séries de despesa (dono, campos, limites), com testes no Emulator.
- [x] Teste do caso de outro usuário nas despesas.

### Interface
- [x] A tela inicial abre Despesas. Para um registro simples, o caminho tem três etapas (RNF27): Despesas → Nova despesa → preencher e salvar.
- [x] Lista com data, título, valor e categoria; mês corrente, mais recente primeiro.
- [x] Filtros por dia, mês, período e categoria; estado vazio de FA04 ("Nenhum registro" com sugestão).
- [x] Formulário com seletor das 7 categorias padrão (RN13), provisórias até o UC06.
- [x] Mensagens de erro do UC (EX01 a EX09) com o texto literal.
- [ ] Prova visual no aparelho (prints ou vídeo): ver `MANUAL-UC02.md`.
