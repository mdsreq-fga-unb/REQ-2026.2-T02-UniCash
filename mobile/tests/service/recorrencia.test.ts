import {
  completarRecorrencias,
  excluirReceita,
  listarReceitas,
  registrarReceita,
} from '@/features/receitas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import { input } from '../helpers/dados';

describe('Receita recorrente (RN19)', () => {
  let banco: BancoFalso;
  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });
  afterEach(restaurarTempo);

  const datas = () => banco.receitas().filter((r) => !r.excluido_em).map((r) => r.data);
  const tudo = () => listarReceitas('0000-01-01', '9999-12-31');

  describe('com data de término', () => {
    it('em dias: gera e soma cada ocorrência individualmente', async () => {
      await registrarReceita(
        input({ data: '2026-10-01', valorCentavos: 1000, recorrencia: { intervalo: 10, unidade: 'dia', termino: '2026-10-31' } }),
      );
      expect(datas()).toEqual(['2026-10-01', '2026-10-11', '2026-10-21', '2026-10-31']);
      expect((await tudo()).total).toBe(4000);
    });

    it('em meses: usa o último dia do mês quando o dia não existe', async () => {
      await registrarReceita(
        input({ data: '2026-01-31', recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-05-31' } }),
      );
      expect(datas()).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    });

    it('em meses, com intervalo 2', async () => {
      await registrarReceita(
        input({ data: '2026-01-15', recorrencia: { intervalo: 2, unidade: 'mes', termino: '2026-07-15' } }),
      );
      expect(datas()).toEqual(['2026-01-15', '2026-03-15', '2026-05-15', '2026-07-15']);
    });

    it('em anos: ano bissexto cai em 28/02 nos anos comuns', async () => {
      await registrarReceita(
        input({ data: '2024-02-29', recorrencia: { intervalo: 1, unidade: 'ano', termino: '2027-12-31' } }),
      );
      expect(datas()).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28']);
    });

    it('término igual ao início gera só a primeira ocorrência', async () => {
      await registrarReceita(
        input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-10-16' } }),
      );
      expect(datas()).toEqual(['2026-10-16']);
    });

    it('cada ocorrência é uma linha com ID derivado <recorrenciaId>_AAAA-MM-DD', async () => {
      await registrarReceita(
        input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }),
      );
      const rec = banco.recorrencias()[0];
      for (const r of banco.receitas()) {
        expect(r.recorrencia_id).toBe(rec.id);
        expect(r.id).toBe(`${rec.id}_${r.data}`);
      }
    });

    it('grava os dados-modelo da série', async () => {
      await registrarReceita(
        input({ valorCentavos: 7000, titulo: 'Mesada', descricao: 'pai', recorrencia: { intervalo: 3, unidade: 'mes', termino: '2027-10-16' } }),
      );
      expect(banco.recorrencias()[0]).toMatchObject({
        intervalo: 3, unidade: 'mes', inicio: '2026-10-16', termino: '2027-10-16', ativa: 1,
        valor_centavos: 7000, titulo: 'Mesada', descricao: 'pai',
      });
    });
  });

  describe('sem data de término', () => {
    it('gera até 12 meses à frente (inclusive)', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      const d = datas();
      expect(d).toHaveLength(13);
      expect(d[0]).toBe('2026-10-16');
      expect(d[12]).toBe('2027-10-16');
    });

    it('início além de 12 meses ainda gera a primeira ocorrência', async () => {
      await registrarReceita(input({ data: '2028-01-01', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      expect(datas()).toEqual(['2028-01-01']);
    });

    it('ao abrir o app completa a geração sem duplicar', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      expect(datas()).toHaveLength(13);

      fixarHoje('2027-01-16'); // 3 meses depois
      await completarRecorrencias();
      const d = datas();
      expect(d).toHaveLength(16);
      expect(d[15]).toBe('2028-01-16');
      expect(new Set(banco.receitas().map((r) => r.id)).size).toBe(banco.receitas().length);
    });

    it('rodar a conclusão várias vezes não duplica', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      await completarRecorrencias();
      await completarRecorrencias();
      await completarRecorrencias();
      expect(banco.receitas()).toHaveLength(13);
    });

    it('não duplica ocorrência que voltou da nuvem (INSERT OR IGNORE pelo ID derivado, RNF26)', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      const antes = banco.receitas().length;
      const rec = banco.recorrencias()[0];

      // simula restauração: linha já existente com o mesmo ID derivado
      banco.sqlite.prepare("UPDATE receitas SET sync_status = 'sincronizado' WHERE id = ?").run(`${rec.id}_2026-11-16`);
      await completarRecorrencias();

      expect(banco.receitas()).toHaveLength(antes);
    });

    it('ocorrência excluída (tombstone) não é recriada', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      const rec = banco.recorrencias()[0];
      await excluirReceita(`${rec.id}_2026-12-16`);
      await completarRecorrencias();
      expect(datas()).not.toContain('2026-12-16');
      expect(datas()).toHaveLength(12);
    });

    it('séries inativas não geram novas ocorrências', async () => {
      await registrarReceita(input({ data: '2026-10-16', recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }));
      banco.sqlite.prepare('UPDATE recorrencias SET ativa = 0').run();
      fixarHoje('2028-01-01');
      await completarRecorrencias();
      expect(banco.receitas()).toHaveLength(13);
    });
  });

  it('as ocorrências são somadas por mês, cada uma no seu mês', async () => {
    await registrarReceita(
      input({ data: '2026-10-16', valorCentavos: 5000, recorrencia: { intervalo: 1, unidade: 'mes', termino: '2026-12-16' } }),
    );
    expect((await listarReceitas('2026-10-01', '2026-11-01')).total).toBe(5000);
    expect((await listarReceitas('2026-11-01', '2026-12-01')).total).toBe(5000);
    expect((await listarReceitas('2026-10-01', '2027-01-01')).total).toBe(15000);
  });
});
