import { listarReceitas, registrarReceita, excluirReceita } from '@/features/receitas/service';
import { intervaloDoFiltro } from '@/features/receitas/useReceitas';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('Consulta e filtros (fluxo B, RN12)', () => {
  let banco: BancoFalso;
  beforeEach(async () => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    await registrarReceita(input({ data: '2026-09-30', titulo: 'Setembro', valorCentavos: 3000 }));
    await registrarReceita(input({ data: '2026-10-05', titulo: 'Estágio', valorCentavos: 160000 }));
    await registrarReceita(input({ data: '2026-10-10', titulo: 'Bolsa', valorCentavos: 70000 }));
    await registrarReceita(input({ data: '2026-10-31', titulo: 'Fim do mês', valorCentavos: 1000 }));
    await registrarReceita(input({ data: '2026-11-02', titulo: 'Futura', valorCentavos: 5000 }));
  });
  afterEach(restaurarTempo);

  const consulta = (f: Parameters<typeof intervaloDoFiltro>[0]) => {
    const { inicio, fim } = intervaloDoFiltro(f);
    return listarReceitas(inicio, fim);
  };

  it('sem filtro: lista o mês corrente, da data mais recente para a mais antiga', async () => {
    const r = await consulta({ modo: 'mes', ano: 2026, mes: 10 });
    expect(r.itens.map((i) => i.titulo)).toEqual(['Fim do mês', 'Bolsa', 'Estágio']);
    expect(r.total).toBe(231000);
  });

  it('data futura é contabilizada no mês correto, sem afetar o corrente', async () => {
    const nov = await consulta({ modo: 'mes', ano: 2026, mes: 11 });
    expect(nov.itens.map((i) => i.titulo)).toEqual(['Futura']);
    expect(nov.total).toBe(5000);
    expect((await consulta({ modo: 'mes', ano: 2026, mes: 10 })).total).toBe(231000);
  });

  it('virada de ano: dezembro termina em 1º de janeiro', () => {
    expect(intervaloDoFiltro({ modo: 'mes', ano: 2026, mes: 12 })).toEqual({ inicio: '2026-12-01', fim: '2027-01-01' });
  });

  it('data única', async () => {
    const r = await consulta({ modo: 'data', data: '2026-10-10' });
    expect(r.itens.map((i) => i.titulo)).toEqual(['Bolsa']);
    expect(r.total).toBe(70000);
  });

  it('período inclui as duas pontas', async () => {
    const r = await consulta({ modo: 'periodo', de: '2026-10-05', ate: '2026-10-10' });
    expect(r.itens.map((i) => i.titulo)).toEqual(['Bolsa', 'Estágio']);
    expect(r.total).toBe(230000);
  });

  it('período que atravessa meses', async () => {
    const r = await consulta({ modo: 'periodo', de: '2026-09-30', ate: '2026-11-02' });
    expect(r.itens).toHaveLength(5);
    expect(r.total).toBe(239000);
  });

  it('estado vazio: sem itens e total zero', async () => {
    const r = await consulta({ modo: 'mes', ano: 2027, mes: 1 });
    expect(r).toEqual({ itens: [], total: 0 });
  });

  it('receitas excluídas não aparecem nem entram no total', async () => {
    const id = banco.receitas().find((r) => r.titulo === 'Bolsa').id;
    await excluirReceita(id);
    const r = await consulta({ modo: 'mes', ano: 2026, mes: 10 });
    expect(r.itens.map((i) => i.titulo)).toEqual(['Fim do mês', 'Estágio']);
    expect(r.total).toBe(161000);
  });

  it('ordenação por data decrescente também dentro de um período', async () => {
    const r = await consulta({ modo: 'periodo', de: '2026-09-01', ate: '2026-11-30' });
    const datas = r.itens.map((i) => i.data);
    expect(datas).toEqual([...datas].sort().reverse());
  });
});
