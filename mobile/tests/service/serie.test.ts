import {
  completarRecorrencias,
  editarReceita,
  excluirReceita,
  listarReceitas,
  registrarReceita,
} from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

/** Série mensal de R$ 100,00: 16/10, 16/11, 16/12 e 16/01. */
describe('Série recorrente: editar e excluir nos três alcances (FA08)', () => {
  let banco: BancoFalso;
  let recId: string;
  const idDe = (data: string) => `${recId}_${data}`;
  // O formulário de uma ocorrência já vem com a repetição da série; sem mudá-la, só os dados são propagados.
  const base = () =>
    input({
      data: '2026-11-16',
      titulo: 'Mesada',
      valorCentavos: 10000,
      recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' },
    });
  const ativas = () => banco.receitas().filter((r) => !r.excluido_em);
  const total = async () => (await listarReceitas('0000-01-01', '9999-12-31')).total;

  beforeEach(async () => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
    await registrarReceita(
      input({ data: '2026-10-16', titulo: 'Mesada', valorCentavos: 10000, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2027-01-16' } }),
    );
    recId = banco.recorrencias()[0].id;
  });
  afterEach(restaurarTempo);

  it('parte de 4 ocorrências somando R$ 400,00', async () => {
    expect(ativas()).toHaveLength(4);
    expect(await total()).toBe(40000);
  });

  describe('editar', () => {
    it('só esta: altera apenas a ocorrência selecionada', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), titulo: 'Só novembro', valorCentavos: 25000 }, 'esta');
      const por = Object.fromEntries(banco.receitas().map((r) => [r.data, r]));
      expect(por['2026-11-16']).toMatchObject({ titulo: 'Só novembro', valor_centavos: 25000, sync_status: 'pendente' });
      expect(por['2026-10-16']).toMatchObject({ titulo: 'Mesada', valor_centavos: 10000 });
      expect(por['2026-12-16']).toMatchObject({ titulo: 'Mesada', valor_centavos: 10000 });
      expect(await total()).toBe(55000);
    });

    it('esta e as próximas: aplica da data selecionada em diante', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), titulo: 'Reajuste', valorCentavos: 20000 }, 'proximas');
      const por = Object.fromEntries(banco.receitas().map((r) => [r.data, r]));
      expect(por['2026-10-16']).toMatchObject({ titulo: 'Mesada', valor_centavos: 10000 });
      for (const d of ['2026-11-16', '2026-12-16', '2027-01-16']) {
        expect(por[d]).toMatchObject({ titulo: 'Reajuste', valor_centavos: 20000 });
      }
      expect(await total()).toBe(70000);
    });

    it('todas: aplica a toda a série', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), titulo: 'Nova mesada', valorCentavos: 12500 }, 'todas');
      expect(ativas().every((r) => r.titulo === 'Nova mesada' && r.valor_centavos === 12500)).toBe(true);
      expect(await total()).toBe(50000);
    });

    it('todas também atualiza o modelo da série (ocorrências futuras seguem os novos dados)', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), titulo: 'Nova mesada', valorCentavos: 12500 }, 'todas');
      expect(banco.recorrencias()[0]).toMatchObject({ titulo: 'Nova mesada', valor_centavos: 12500, sync_status: 'pendente' });
    });

    it('só esta com mudança de mês recalcula os dois meses', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), data: '2027-02-10' }, 'esta');
      expect((await listarReceitas('2026-11-01', '2026-12-01')).total).toBe(0);
      expect((await listarReceitas('2027-02-01', '2027-03-01')).total).toBe(10000);
    });

    it('só esta ignora alterações na repetição', async () => {
      await editarReceita(
        idDe('2026-11-16'),
        { ...base(), recorrencia: { intervalo: 2, unidade: 'mes', termino: null } },
        'esta',
      );
      expect(ativas()).toHaveLength(4);
      expect(banco.recorrencias()[0].intervalo).toBe(1);
    });
  });

  describe('editar a repetição', () => {
    it('esta e as próximas: encerra a série antiga e cria uma nova a partir da data editada', async () => {
      await editarReceita(
        idDe('2026-11-16'),
        { ...base(), recorrencia: { intervalo: 15, unidade: 'dia', termino: '2026-12-31' } },
        'proximas',
      );
      const antigas = banco.receitas().filter((r) => r.recorrencia_id === recId);
      expect(antigas.filter((r) => !r.excluido_em).map((r) => r.data)).toEqual(['2026-10-16']);

      const antiga = banco.recorrencias().find((r) => r.id === recId);
      expect(antiga.termino).toBe('2026-11-15');

      const nova = banco.recorrencias().find((r) => r.id !== recId);
      expect(nova).toMatchObject({ intervalo: 15, unidade: 'dia', inicio: '2026-11-16', termino: '2026-12-31' });
      const datasNovas = banco.receitas().filter((r) => r.recorrencia_id === nova.id).map((r) => r.data);
      expect(datasNovas).toEqual(['2026-11-16', '2026-12-01', '2026-12-16', '2026-12-31']);
    });

    it('todas: refaz a série preservando o início original', async () => {
      await editarReceita(
        idDe('2026-12-16'),
        { ...base(), data: '2026-12-16', recorrencia: { intervalo: 2, unidade: 'mes', termino: '2027-04-16' } },
        'todas',
      );
      expect(banco.recorrencias().find((r) => r.id === recId).ativa).toBe(0);
      const nova = banco.recorrencias().find((r) => r.id !== recId);
      expect(nova.inicio).toBe('2026-10-16');
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16', '2026-12-16', '2027-02-16', '2027-04-16']);
    });

    it('esta e as próximas, deixando de repetir: remove as seguintes e mantém a selecionada', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), recorrencia: null }, 'proximas');
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16', '2026-11-16']);
      expect(banco.recorrencias()[0].termino).toBe('2026-11-16');
    });

    it('todas, deixando de repetir: só a ocorrência selecionada permanece, como receita única', async () => {
      await editarReceita(idDe('2026-11-16'), { ...base(), recorrencia: null }, 'todas');
      const sobra = ativas();
      expect(sobra).toHaveLength(1);
      expect(sobra[0]).toMatchObject({ data: '2026-11-16', recorrencia_id: null });
      expect(banco.recorrencias()[0].ativa).toBe(0);
    });
  });

  describe('excluir', () => {
    it('só esta: remove apenas a ocorrência, mantendo lápide para não ser regerada', async () => {
      await excluirReceita(idDe('2026-11-16'), 'esta');
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16', '2026-12-16', '2027-01-16']);
      expect(banco.receitas().find((r) => r.data === '2026-11-16')).toMatchObject({ sync_status: 'pendente' });
      expect(await total()).toBe(30000);
    });

    it('esta e as próximas: remove da data em diante e encerra a série no dia anterior', async () => {
      await excluirReceita(idDe('2026-11-16'), 'proximas');
      expect(ativas().map((r) => r.data)).toEqual(['2026-10-16']);
      expect(banco.recorrencias()[0].termino).toBe('2026-11-15');
      expect(await total()).toBe(10000);
    });

    it('esta e as próximas na primeira ocorrência desativa a série', async () => {
      await excluirReceita(idDe('2026-10-16'), 'proximas');
      expect(ativas()).toHaveLength(0);
      expect(banco.recorrencias()[0].ativa).toBe(0);
    });

    it('todas: remove a série inteira e a desativa', async () => {
      await excluirReceita(idDe('2026-12-16'), 'todas');
      expect(ativas()).toHaveLength(0);
      expect(banco.recorrencias()[0].ativa).toBe(0);
      expect(await total()).toBe(0);
    });

    it('depois de excluir, a conclusão ao abrir o app não recria nada', async () => {
      await excluirReceita(idDe('2026-11-16'), 'todas');
      fixarHoje('2027-06-01');
      await completarRecorrencias();
      expect(ativas()).toHaveLength(0);
    });
  });

  describe('série sem término', () => {
    it('excluir esta e as próximas encerra a geração futura', async () => {
      await registrarReceita(
        input({ data: '2026-10-20', titulo: 'Aberta', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
      );
      const aberta = banco.recorrencias().find((r) => r.termino === null);
      await excluirReceita(`${aberta.id}_2026-12-20`, 'proximas');

      fixarHoje('2027-08-01');
      await completarRecorrencias();
      const dela = banco.receitas().filter((r) => r.recorrencia_id === aberta.id && !r.excluido_em);
      expect(dela.map((r) => r.data)).toEqual(['2026-10-20', '2026-11-20']);
    });
  });
});
