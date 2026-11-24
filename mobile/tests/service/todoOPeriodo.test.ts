import { listarReceitas, registrarReceita } from '@/features/receitas/service';
import { listarDespesas, registrarDespesa } from '@/features/despesas/service';
import { intervaloDoFiltro as intervaloReceitas } from '@/features/receitas/useReceitas';
import { intervaloDoFiltro as intervaloDespesas } from '@/features/despesas/useDespesas';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

describe('Filtro "Todo o período" nas listas', () => {
  beforeEach(() => {
    instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  it('receitas: lista as de qualquer data, passadas e futuras, com o total', async () => {
    for (const data of ['1999-01-01', '2026-10-16', '2031-12-31']) {
      await registrarReceita(input({ data, valorCentavos: 1000 }));
    }
    const { inicio, fim } = intervaloReceitas({ modo: 'tudo' });
    const r = await listarReceitas(inicio, fim);
    expect(r.itens.map((x) => x.data)).toEqual(['2031-12-31', '2026-10-16', '1999-01-01']);
    expect(r.total).toBe(3000);
  });

  it('despesas: lista as de qualquer data, passadas e futuras, com o total', async () => {
    for (const data of ['1999-01-01', '2026-10-16', '2031-12-31']) {
      await registrarDespesa({
        data,
        titulo: 'Conta',
        valorCentavos: 500,
        descricao: null,
        categoriaId: null,
        fixaOuVariavel: null,
        essencial: null,
        recorrencia: null,
      });
    }
    const { inicio, fim } = intervaloDespesas({ modo: 'tudo' });
    const r = await listarDespesas(inicio, fim);
    expect(r.itens).toHaveLength(3);
    expect(r.total).toBe(1500);
  });
});
