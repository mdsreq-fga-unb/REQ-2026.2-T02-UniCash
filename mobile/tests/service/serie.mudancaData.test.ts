import { editarDespesa, registrarDespesa } from '@/features/despesas/service';
import { editarReceita, registrarReceita } from '@/features/receitas/service';
import type { DespesaInput } from '@/features/despesas/types';
import type { EscopoSerie } from '@/features/despesas/types';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const MENSAL_ATE_DEZEMBRO = { intervalo: 1, unidade: 'mes', termino: '2026-12-10' } as const;

function despesa(extra: Partial<DespesaInput> = {}): DespesaInput {
  return {
    data: '2026-08-10',
    titulo: 'Academia',
    valorCentavos: 9000,
    descricao: null,
    categoriaId: null,
    fixaOuVariavel: 'fixa',
    essencial: 0,
    recorrencia: MENSAL_ATE_DEZEMBRO,
    ...extra,
  };
}

const datasAtivas = (linhas: any[]) =>
  linhas.filter((l) => l.excluido_em === null).map((l) => l.data).sort();

const MARCO_A_DEZEMBRO = [
  '2026-03-10', '2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10',
  '2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10',
];

describe('Série: mudar a data da ocorrência refaz a repetição a partir da nova data', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-08-01');
  });
  afterEach(restaurarTempo);

  describe.each<EscopoSerie>(['todas', 'proximas'])('escopo "%s"', (escopo) => {
    it('despesa mensal de agosto a dezembro: início em março passa a valer de março a dezembro', async () => {
      await registrarDespesa(despesa());
      expect(datasAtivas(banco.despesas())).toEqual(MARCO_A_DEZEMBRO.slice(5));

      const agosto = banco.despesas().find((d) => d.data === '2026-08-10');
      await editarDespesa(agosto.id, despesa({ data: '2026-03-10' }), escopo);

      expect(datasAtivas(banco.despesas())).toEqual(MARCO_A_DEZEMBRO);
      const ativas = banco.despesas().filter((d) => d.excluido_em === null);
      expect(new Set(ativas.map((d) => d.recorrencia_id)).size).toBe(1);
      expect(ativas.every((d) => d.recorrencia_id !== null)).toBe(true);
    });

    it('receita mensal de agosto a dezembro: início em março passa a valer de março a dezembro', async () => {
      await registrarReceita(input({ data: '2026-08-10', recorrencia: MENSAL_ATE_DEZEMBRO }));
      const agosto = banco.receitas().find((r) => r.data === '2026-08-10');
      await editarReceita(agosto.id, input({ data: '2026-03-10', recorrencia: MENSAL_ATE_DEZEMBRO }), escopo);

      expect(datasAtivas(banco.receitas())).toEqual(MARCO_A_DEZEMBRO);
    });

    it('adiar o início também refaz a série (agosto → outubro, até dezembro)', async () => {
      await registrarDespesa(despesa());
      const agosto = banco.despesas().find((d) => d.data === '2026-08-10');
      await editarDespesa(agosto.id, despesa({ data: '2026-10-10' }), escopo);

      expect(datasAtivas(banco.despesas())).toEqual(['2026-10-10', '2026-11-10', '2026-12-10']);
    });
  });

  it('"todas" a partir de uma ocorrência do meio desloca a série inteira pelo mesmo intervalo', async () => {
    await registrarDespesa(despesa());
    const outubro = banco.despesas().find((d) => d.data === '2026-10-10');
    // outubro (3ª ocorrência) vai para setembro: a série passa a começar em julho
    await editarDespesa(outubro.id, despesa({ data: '2026-09-10' }), 'todas');

    expect(datasAtivas(banco.despesas())).toEqual([
      '2026-07-10', '2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10',
    ]);
  });

  it('"esta" continua movendo só a ocorrência escolhida', async () => {
    await registrarDespesa(despesa());
    const agosto = banco.despesas().find((d) => d.data === '2026-08-10');
    await editarDespesa(agosto.id, despesa({ data: '2026-03-10' }), 'esta');

    expect(datasAtivas(banco.despesas())).toEqual(['2026-03-10', '2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10']);
  });

  it('sem mudar a data, editar o valor de todas não refaz a série', async () => {
    await registrarDespesa(despesa());
    const idsAntes = banco.despesas().map((d) => d.id).sort();
    const agosto = banco.despesas().find((d) => d.data === '2026-08-10');
    await editarDespesa(agosto.id, despesa({ valorCentavos: 9900 }), 'todas');

    expect(banco.despesas().map((d) => d.id).sort()).toEqual(idsAntes);
    expect(banco.despesas().every((d) => d.valor_centavos === 9900)).toBe(true);
  });

  describe('revisão do PR do UC07: sobreposição e meses de durações diferentes', () => {
    it.each(['receita', 'despesa'] as const)(
      '%s: "esta e as próximas" movendo 10/10 para 10/09 não duplica setembro',
      async (tipo) => {
        if (tipo === 'receita') {
          await registrarReceita(input({ data: '2026-08-10', valorCentavos: 9000, recorrencia: MENSAL_ATE_DEZEMBRO }));
          const outubro = banco.receitas().find((r) => r.data === '2026-10-10');
          await editarReceita(outubro.id, input({ data: '2026-09-10', valorCentavos: 9000, recorrencia: MENSAL_ATE_DEZEMBRO }), 'proximas');
        } else {
          await registrarDespesa(despesa());
          const outubro = banco.despesas().find((d) => d.data === '2026-10-10');
          await editarDespesa(outubro.id, despesa({ data: '2026-09-10' }), 'proximas');
        }
        const linhas = tipo === 'receita' ? banco.receitas() : banco.despesas();
        const datas = datasAtivas(linhas);
        expect(datas).toEqual(['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10', '2026-12-10']);
        // nenhuma data aparece duas vezes (o total de setembro continua R$ 90,00)
        expect(new Set(datas).size).toBe(datas.length);
        const setembro = linhas.filter((l) => l.excluido_em === null && l.data === '2026-09-10');
        expect(setembro.reduce((s, l) => s + l.valor_centavos, 0)).toBe(9000);
      },
    );

    it.each(['receita', 'despesa'] as const)(
      '%s: "todas" movendo a 2ª ocorrência (28/02) para 31/05 mantém 31/05 em série iniciada em 31/01',
      async (tipo) => {
        const mensalAteAgosto = { intervalo: 1, unidade: 'mes', termino: '2026-08-31' } as const;
        if (tipo === 'receita') {
          await registrarReceita(input({ data: '2026-01-31', recorrencia: mensalAteAgosto }));
          expect(datasAtivas(banco.receitas()).slice(0, 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
          const fevereiro = banco.receitas().find((r) => r.data === '2026-02-28');
          await editarReceita(fevereiro.id, input({ data: '2026-05-31', recorrencia: mensalAteAgosto }), 'todas');
        } else {
          await registrarDespesa(despesa({ data: '2026-01-31', recorrencia: mensalAteAgosto }));
          const fevereiro = banco.despesas().find((d) => d.data === '2026-02-28');
          await editarDespesa(fevereiro.id, despesa({ data: '2026-05-31', recorrencia: mensalAteAgosto }), 'todas');
        }
        const datas = datasAtivas(tipo === 'receita' ? banco.receitas() : banco.despesas());
        // a ocorrência editada fica exatamente em 31/05; a anterior a ela, um mês antes
        expect(datas).toEqual(['2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31']);
      },
    );
  });
});
