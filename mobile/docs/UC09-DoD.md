# UC09 — Monitorar consumo por categoria

[Issue #46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/46) · [Decisões aprovadas](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-UniCash/issues/46#issuecomment-6980605277)

## Contrato compartilhado com o UC05

`consultarConsumoMensal(mes, lerTotaisLocais)` recebe o mês em `AAAA-MM` e consulta o intervalo do primeiro dia do mês, inclusive, ao primeiro dia do mês seguinte, exclusivo. O leitor deve carregar um único snapshot SQLite da conta ativa, com receitas e gastos do mês. Deve incluir categorias sem despesas com gasto zero e excluir as despesas sem categoria da agregação.

Valores monetários usam centavos e limites percentuais usam centésimos de ponto percentual. O limite efetivo pode conter fração de centavo. A classificação usa a fração exata do consumo. A tela arredonda o percentual a até duas casas decimais, por isso 90,004% pode aparecer como 90% na faixa vermelha e 49,996% como 50% na faixa verde. Se o cálculo receber um dado inválido, a consulta falha e a tela pede nova tentativa para evitar exibir totais parciais. A tela deve consultar novamente após gravar alterações em receitas, despesas ou categorias.

## Rastreabilidade

| Requisito ou fluxo | Código | Evidência |
| --- | --- | --- |
| RF39, RN02, RN14 e EX01 | `src/features/consumo/calculo.ts` | `tests/unit/consumo.test.ts` |
| RN06, RN07, RN13 e RN14 | `src/features/consumo/sqlite.ts` | `tests/service/consumo.test.ts` verifica recálculo com o esquema real, período e exclusões. |
| RF39, FA06, EX01 e EX02 na lista de categorias | `src/app/categorias/index.tsx` | `tests/screens/ListaCategorias.test.tsx` verifica período, retorno de foco, descarte de resposta anterior, limite indisponível e nova tentativa. |
| UC06 FA04 — categoria sem limite | `src/features/consumo/calculo.ts`, `src/app/categorias/index.tsx` | `tests/service/consumo.test.ts` e `tests/screens/IndicadoresConsumo.test.tsx` verificam o estado sem limite e a ausência de indicador. |
| FA06 | `src/features/consumo/consulta.ts` | `tests/screens/IndicadoresConsumo.test.tsx` verifica a virada de ano. |
| RNF38, FA01 e EX02 | `src/components/consumo/IndicadoresConsumo.tsx` | `tests/screens/IndicadoresConsumo.test.tsx` verifica rótulos, erro e nova tentativa. |

O Jest exige 100% de instruções, ramos, funções e linhas nos módulos de consumo. O workflow Mobile CI publica o relatório no artefato `coverage`.

## Avaliação do DoD

- [x] Cálculo, consulta SQLite e indicadores integrados à lista de categorias com seleção mensal. Os testes exercitam alterações de despesa e limite, exclusões lógicas, mês sem receita e mudança de período.
- [ ] Integrar o indicador no seletor do Resumo Financeiro após a entrada da tela na develop. Validar isolamento entre contas (EX03) quando o SQLite estiver vinculado à conta ativa. A consulta desta entrega usa o banco local existente e funciona sem consulta à nuvem.
- [ ] Executar o CI em PR, obter revisão técnica e anexar evidências de tela e cobertura à issue. Publicar documentação e decisões no GitHub Pages.
- [ ] Realizar UAT com a cliente, integrar à branch principal e validar o deploy em homologação.
