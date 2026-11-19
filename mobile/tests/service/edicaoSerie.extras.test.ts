import { buscarReceita, editarReceita, excluirReceita, registrarReceita } from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

/** Série mensal de R$ 100,00: 16/10, 16/11, 16/12 e 16/01. */
describe('Série recorrente: ramos restantes de leitura, edição e exclusão', () => {
  let banco: BancoFalso;
  let recId: string;
  const idDe = (data: string) => `${recId}_${data}`;
  const base = () =>
    input({
      data: '2026-11-16',
      titulo: 'Mesada',
      valorCentavos: 10000,
      recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' },
    });
  const ativas = () => banco.receitas().filter((r) => !r.excluido_em);

  beforeEach(async () => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    await registrarReceita(
      input({ data: '2026-10-16', titulo: 'Mesada', valorCentavos: 10000, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' } }),
    );
    recId = banco.recorrencias()[0].id;
  });
  afterEach(restaurarTempo);

  it('buscarReceita de uma ocorrência devolve também a série', async () => {
    const r = await buscarReceita(idDe('2026-11-16'));
    expect(r?.receita.id).toBe(idDe('2026-11-16'));
    expect(r?.recorrencia?.id).toBe(recId);
  });

  describe('mudança na repetição refaz a série', () => {
    it('só a unidade mudou (esta e as próximas)', async () => {
      await editarReceita(
        idDe('2026-11-16'),
        { ...base(), recorrencia: { intervalo: 1, unidade: 'ano', termino: '2027-01-16' } },
        'proximas',
      );
      expect(banco.recorrencias().some((r) => r.unidade === 'ano' && r.ativa === 1)).toBe(true);
    });

    it('só o término mudou (todas)', async () => {
      await editarReceita(
        idDe('2026-11-16'),
        { ...base(), recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-02-16' } },
        'todas',
      );
      expect(banco.recorrencias().some((r) => r.termino === '2027-02-16' && r.ativa === 1)).toBe(true);
      expect(banco.recorrencias().some((r) => r.id === recId && r.ativa === 0)).toBe(true);
    });
  });

  describe('série deixa de repetir (esta e as próximas)', () => {
    it('mudando a data para depois, o término passa a ser a nova data e a receita editada permanece', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), data: '2026-11-20', recorrencia: null }, 'proximas');

      expect(banco.recorrencias().find((r) => r.id === recId).termino).toBe('2026-11-20');
      const editada = banco.receitas().find((r) => r.id === idDe('2026-11-16'));
      expect(editada).toMatchObject({ data: '2026-11-20', excluido_em: null });
      // as ocorrências seguintes à data original foram removidas
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16', '2026-11-20']);
    });

    it('mantendo a data, o término é a própria data', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), recorrencia: null }, 'proximas');
      expect(banco.recorrencias().find((r) => r.id === recId).termino).toBe('2026-11-16');
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16', '2026-11-16']);
    });
  });

  it('excluir esta e as próximas com a série ausente na base remove as ocorrências mesmo assim', async () => {
    banco.sqlite.pragma('foreign_keys = OFF');
    banco.sqlite.prepare('DELETE FROM recorrencias WHERE id = ?').run(recId);

    await excluirReceita(idDe('2026-11-16'), 'proximas');

    expect(ativas().map((r) => r.data)).toEqual(['2026-10-16']);
  });
});
