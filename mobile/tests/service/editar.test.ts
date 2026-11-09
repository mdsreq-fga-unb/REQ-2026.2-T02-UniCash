import {
  buscarReceita,
  editarReceita,
  excluirReceita,
  listarReceitas,
  registrarReceita,
  ReceitaIndisponivel,
} from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('Editar receita (fluxo C, RN20)', () => {
  let banco: BancoFalso;
  let id: string;
  const mes = (m: string) => listarReceitas(`2026-${m}-01`, m === '12' ? '2027-01-01' : `2026-${String(Number(m) + 1).padStart(2, '0')}-01`);

  beforeEach(async () => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    await registrarReceita(input({ data: '2026-10-05', titulo: 'Original', valorCentavos: 10000, descricao: 'antes' }));
    id = banco.receitas()[0].id;
    banco.sqlite.prepare("UPDATE receitas SET sync_status = 'sincronizado'").run();
  });
  afterEach(restaurarTempo);

  it.each([
    ['título', { titulo: 'Novo título' }, 'titulo', 'Novo título'],
    ['valor', { valorCentavos: 25050 }, 'valor_centavos', 25050],
    ['descrição', { descricao: 'depois' }, 'descricao', 'depois'],
    ['data (mesmo mês)', { data: '2026-10-20' }, 'data', '2026-10-20'],
  ])('edita o campo %s e marca como pendente de sincronização', async (_nome, mudanca, coluna, esperado) => {
    await editarReceita(id, input({ data: '2026-10-05', titulo: 'Original', valorCentavos: 10000, descricao: 'antes', ...mudanca }));
    const r = banco.receitas()[0];
    expect(r[coluna as string]).toBe(esperado);
    expect(r.sync_status).toBe('pendente');
  });

  it('pode limpar a descrição', async () => {
    await editarReceita(id, input({ data: '2026-10-05', descricao: null }));
    expect(banco.receitas()[0].descricao).toBeNull();
  });

  it('mudança de mês recalcula o mês de origem e o de destino', async () => {
    expect((await mes('10')).total).toBe(10000);
    expect((await mes('11')).total).toBe(0);

    await editarReceita(id, input({ data: '2026-11-03', valorCentavos: 10000 }));

    expect((await mes('10')).total).toBe(0);
    expect((await mes('11')).total).toBe(10000);
  });

  it('mudança de valor recalcula o total do mês', async () => {
    await editarReceita(id, input({ data: '2026-10-05', valorCentavos: 30000 }));
    expect((await mes('10')).total).toBe(30000);
  });

  it('o formulário de edição recebe os dados atuais', async () => {
    const r = await buscarReceita(id);
    expect(r?.receita).toMatchObject({ titulo: 'Original', valor_centavos: 10000, data: '2026-10-05', descricao: 'antes' });
    expect(r?.recorrencia).toBeNull();
  });

  describe('EX06: receita inexistente ou já excluída', () => {
    it('buscar após excluir retorna nulo', async () => {
      await excluirReceita(id);
      expect(await buscarReceita(id)).toBeNull();
    });

    it('editar após excluir lança ReceitaIndisponivel e não altera nada', async () => {
      await excluirReceita(id);
      const antes = banco.instantaneo();
      await expect(editarReceita(id, input({ titulo: 'Tarde demais' }))).rejects.toBeInstanceOf(ReceitaIndisponivel);
      expect(banco.instantaneo()).toEqual(antes);
    });

    it('excluir duas vezes lança ReceitaIndisponivel', async () => {
      await excluirReceita(id);
      await expect(excluirReceita(id)).rejects.toBeInstanceOf(ReceitaIndisponivel);
    });

    it('id que nunca existiu', async () => {
      expect(await buscarReceita('nao-existe')).toBeNull();
      await expect(editarReceita('nao-existe', input())).rejects.toBeInstanceOf(ReceitaIndisponivel);
    });
  });

  describe('Excluir receita única (fluxo D)', () => {
    it('grava marcador de exclusão (tombstone) pendente de sincronização', async () => {
      await excluirReceita(id);
      const r = banco.receitas()[0];
      expect(r.excluido_em).toBeTruthy();
      expect(r.sync_status).toBe('pendente');
    });

    it('recalcula o total do mês na mesma operação', async () => {
      await excluirReceita(id);
      expect((await mes('10')).total).toBe(0);
    });
  });

  describe('transformar receita única em recorrente', () => {
    it('substitui a receita por uma série com ocorrências geradas', async () => {
      await editarReceita(id, input({ data: '2026-10-05', valorCentavos: 10000, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-05' } }));

      const ativas = banco.receitas().filter((r) => !r.excluido_em);
      expect(ativas.map((r) => r.data)).toEqual(['2026-10-05', '2026-11-05', '2026-12-05']);
      expect(banco.receitas().find((r) => r.id === id).excluido_em).toBeTruthy();
      expect(banco.recorrencias()).toHaveLength(1);
      expect((await mes('10')).total).toBe(10000);
    });
  });
});
