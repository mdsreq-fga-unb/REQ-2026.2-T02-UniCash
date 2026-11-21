import { excluirReceita, registrarReceita } from '@/features/receitas/service';
import { consultarAlertas, dispensarAlerta } from '@/features/saldo/alertas';
import { consultarResumoMensal, salvarSaldoInicial } from '@/features/saldo/service';
import { editarDespesa, excluirDespesa, registrarDespesa } from '@/features/despesas/service';
import { input } from '../helpers/dados';
import { instalarBanco } from '../helpers/fakeDb';

const despesa = (data: string, valorCentavos: number) => ({
  data, valorCentavos, titulo: 'Despesa de teste', descricao: null,
  categoriaId: null, fixaOuVariavel: null, essencial: null, recorrencia: null,
});

describe('consulta local do resumo mensal', () => {
  let banco: ReturnType<typeof instalarBanco>;
  beforeEach(() => { banco = instalarBanco(); });

  it('separa os meses na virada do ano e recalcula após exclusão', async () => {
    await registrarReceita(input({ data: '2026-12-31', valorCentavos: 3000 }));
    await registrarReceita(input({ data: '2027-01-01', valorCentavos: 8000 }));
    await registrarReceita(input({ data: '2027-02-01', valorCentavos: 7000 }));

    expect(await consultarResumoMensal('2027-01-01')).toMatchObject({
      receitas: 8000,
      saldo: 8000,
      saldoAnterior: 3000,
    });

    await excluirReceita(banco.receitas().find((receita) => receita.data === '2027-01-01').id);
    expect(await consultarResumoMensal('2027-01-01')).toMatchObject({
      receitas: 0,
      saldo: 0,
      saldoAnterior: 3000,
      indicador: { texto: 'Sem receitas no mês' },
    });
    expect(await consultarResumoMensal('2027-02-01')).toMatchObject({
      saldo: 7000,
      saldoAnterior: null,
    });
  });
  it('calcula com despesas e usa o saldo inicial apenas como referência', async () => {
    await registrarReceita(input({ data: '2026-10-31', valorCentavos: 5000 }));
    await registrarReceita(input({ data: '2026-11-01', valorCentavos: 10000 }));
    await registrarDespesa(despesa('2026-11-02', 4800));
    await salvarSaldoInicial({ mes: '2026-11', centavos: -1000 });
    expect(await consultarResumoMensal('2026-10-01')).toMatchObject({ saldo: 0, saldoAnterior: null });
    expect(await consultarResumoMensal('2026-11-01')).toMatchObject({
      receitas: 10000,
      despesas: 4800,
      saldo: 5200,
      saldoAnterior: -1000,
      indicador: { cor: '#9A3412' },
    });
    expect(await consultarResumoMensal('2026-12-01')).toMatchObject({ saldo: 0, saldoAnterior: 5200 });
  });

  it('avisa uma vez por transição e emite novo alerta após o saldo voltar a zero', async () => {
    await registrarDespesa(despesa('2026-11-01', 1000));
    const [primeiro] = await consultarAlertas();
    expect(primeiro).toMatchObject({ anterior_centavos: 0, saldo_centavos: -1000 });
    await dispensarAlerta(primeiro.id);
    await registrarDespesa(despesa('2026-11-02', 500));
    expect(await consultarAlertas()).toEqual([]);

    await registrarReceita(input({ data: '2026-11-03', valorCentavos: 1500 }));
    await excluirReceita(banco.receitas()[0].id);
    const alertas = await consultarAlertas();
    expect(alertas).toHaveLength(1);
    expect(alertas[0].id).not.toBe(primeiro.id);
    expect(banco.sqlite.prepare('SELECT id, transicao FROM alertas_emitidos ORDER BY transicao').all())
      .toEqual([{ id: primeiro.id, transicao: 1 }, { id: alertas[0].id, transicao: 2 }]);
    expect(alertas[0]).toMatchObject({ anterior_centavos: 0, saldo_centavos: -1500 });
  });

  it('preserva lançamentos e saldo anteriores se a gravação do alerta falhar', async () => {
    banco.falharNaOperacao(2);
    await expect(registrarDespesa(despesa('2026-11-01', 1000))).rejects.toThrow();
    expect(await consultarResumoMensal('2026-11-01')).toMatchObject({ despesas: 0, saldo: 0 });
    expect(await consultarAlertas()).toEqual([]);

    await registrarDespesa(despesa('2026-11-01', 1000));
    expect(await consultarAlertas()).toHaveLength(1);
  });

  it('recalcula ambos os meses quando a despesa muda de data', async () => {
    await registrarDespesa(despesa('2026-11-01', 1000));
    const [{ id }] = banco.despesas();
    await editarDespesa(id, despesa('2026-12-01', 2000));
    expect(await consultarResumoMensal('2026-11-01')).toMatchObject({ saldo: 0 });
    expect(await consultarResumoMensal('2026-12-01')).toMatchObject({ saldo: -2000 });
    await excluirDespesa(id);
    expect(await consultarResumoMensal('2026-12-01')).toMatchObject({ saldo: 0 });
  });

  it('rejeita saldo inicial inválido', async () => {
    await expect(salvarSaldoInicial({ mes: '2026-13', centavos: 0 })).rejects.toThrow('Saldo inicial inválido');
    await expect(salvarSaldoInicial({ mes: '2026-11', centavos: 1.5 })).rejects.toThrow('Saldo inicial inválido');
    await expect(salvarSaldoInicial({ mes: '2026-11', centavos: Number.MAX_SAFE_INTEGER })).rejects.toThrow('Saldo inicial inválido');
  });

});
