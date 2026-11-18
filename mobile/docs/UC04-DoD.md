# UC04 — Definition of Done técnica

Issue [#31](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/31).
Os níveis 2 e 3 ficam para a etapa com a cliente.

- [x] Edição e exclusão de despesas com recálculo imediato e alertas (FA05).
- [x] Precisão da exibição percentual conforme a RN21.
- [x] Testes de caminhos de falha e cobertura de 100% no escopo do UC04.
- [ ] CI com lint, typecheck, testes, Security Rules e bundle Android.
- [ ] Validação em aparelho e anexos de evidência visual e cobertura.
- [ ] Rastreabilidade na issue e documentação técnica publicada no GitHub Pages.
- [ ] Checklist da issue conferido e aprovação técnica registrada no PR.

## Rastreabilidade

| Requisito | Fluxo | Código | Evidência automatizada |
|---|---|---|---|
| RF34, RN06, RN07, RN15 | Resumo, mês vazio, offline, recálculo e EX02 | `src/features/saldo/service.ts`, `src/app/index.tsx` | `tests/service/saldo.test.ts`, `tests/screens/ResumoFinanceiro.test.tsx` |
| RF35, RN16 | Saldo anterior, meses sem dados e mês de referência | `src/features/saldo/calculo.ts`, `src/features/saldo/service.ts` | `tests/unit/saldo.test.ts`, `tests/service/saldo.test.ts` |
| RN17, RN21, RNF38 | Indicador, cor, texto e precisão de exibição | `src/features/saldo/calculo.ts`, `src/app/index.tsx` | `tests/unit/saldo.test.ts` |
| RF15, RF17, RF18 | FA05, cadastro, edição, mudança de mês e exclusão de despesas | `src/components/saldo/FormularioSaldo.tsx`, `src/features/saldo/service.ts` | `tests/screens/ResumoFinanceiro.test.tsx`, `tests/service/saldo.test.ts` |
| RN18 | FA06, FA08, EX03 e reenvio | `src/features/saldo/alertas.ts`, `src/features/receitas/sync.ts`, `firestore.rules` na raiz | `tests/service/saldo.test.ts`, `tests/service/sync.test.ts`, `tests/rules/firestore.rules.test.ts` |
| RNF29 | Testes das regras financeiras e cobertura | `jest.uc04.config.js`, workflow Mobile CI | Relatório HTML no subpasta `uc04` do artefato `coverage` |

O saldo é calculado ao consultar o mês. Receitas excluídas e lançamentos anteriores à referência do saldo inicial ficam fora do cálculo. O saldo inicial é exibido como saldo anterior somente em seu mês de referência. A edição de despesa pode mover o lançamento entre meses.

O alerta é um aviso no app. Na transação de um lançamento, uma passagem de saldo maior ou igual a zero para negativo gera um registro. Reenvios ao Firestore usam o ID do mesmo registro. A sincronização atual envia alertas e as despesas e o saldo inicial ficam armazenados no dispositivo. A validação da integração em dois aparelhos permanece pendente.

## Evidências locais

- Lint, TypeScript e exportação do bundle Android aprovados.
- 340 testes do app e 32 testes de Security Rules no emulador aprovados.
- 100% de linhas, instruções, funções e ramos na tela inicial, nos componentes de saldo e no módulo de saldo. As demais suítes também são executadas pelo CI.
- Workflow configurado. O resultado remoto fica pendente até a execução no GitHub Actions.

## Roteiro de validação em aparelho

1. Registrar receita de R$ 100,00 e despesa de R$ 48,00 no mês de referência. Conferir saldo de R$ 52,00 e indicador laranja com «52,0%».
2. Editar a despesa para R$ 110,00. Conferir saldo de −R$ 10,00 e aviso monetário. Dispensar o aviso, aumentar a despesa e confirmar que o aviso não se repete.
3. Excluir a despesa, confirmar a recuperação e criar outra despesa de R$ 110,00. Conferir a emissão de um novo aviso.
4. Informar saldo inicial de −R$ 20,00. Conferir que ele aparece como saldo anterior no mês de referência e que o saldo do mês permanece calculado pelos lançamentos.
5. Ativar modo avião, abrir o app novamente, navegar entre meses, editar e excluir uma despesa. Conferir a persistência e fotografar ou gravar a execução. Voltar à rede e verificar o reenvio do alerta com uma conta de teste.
6. Anexar os registros à issue com ambiente, data, versão e resultado. Registrar a aprovação técnica no PR depois da revisão.
