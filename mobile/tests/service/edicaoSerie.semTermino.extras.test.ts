import { editarReceita, registrarReceita } from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

/** Série mensal SEM término (gera 12 meses à frente a partir de 16/10/2026). */
describe('Série sem término: comparação da repetição ao editar', () => {
  let banco: BancoFalso;
  let recId: string;
  const idDe = (data: string) => `${recId}_${data}`;
  const base = (termino: string | null) =>
    input({
      data: '2026-11-16',
      titulo: 'Mesada',
      valorCentavos: 10000,
      recorrencia: { intervalo: 1, unidade: 'mes', termino },
    });

  beforeEach(async () => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    await registrarReceita(
      input({ data: '2026-10-16', titulo: 'Mesada', valorCentavos: 10000, recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
    );
    recId = banco.recorrencias()[0].id;
  });
  afterEach(restaurarTempo);

  it('passar a ter término refaz a série', async () => {
    await editarReceita(idDe('2026-11-16'), base('2027-03-16'), 'proximas');
    expect(banco.recorrencias().some((r) => r.termino === '2027-03-16' && r.ativa === 1)).toBe(true);
    // a série antiga termina no dia anterior à ocorrência editada
    expect(banco.recorrencias().find((r) => r.id === recId)).toMatchObject({ termino: '2026-11-15', ativa: 1 });
    expect(banco.recorrencias()).toHaveLength(2);
  });

  it('continuar sem término e sem outra mudança na repetição não refaz a série', async () => {
    await editarReceita(idDe('2026-11-16'), { ...base(null), titulo: 'Mesada nova' }, 'proximas');
    expect(banco.recorrencias()).toHaveLength(1);
    expect(banco.recorrencias()[0]).toMatchObject({ id: recId, ativa: 1 });
    expect(banco.receitas().find((r) => r.id === idDe('2026-11-16')).titulo).toBe('Mesada nova');
  });
});