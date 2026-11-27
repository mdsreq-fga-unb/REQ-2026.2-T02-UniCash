import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import {
  calculadoraReal,
  calcularRealizadoGasto,
  calcularRealizadoInvestimento,
} from '@/features/metas/calculadoras';
import { calcularProgresso } from '@/features/metas/progresso';
import { buscarMeta, criarMeta, editarMeta } from '@/features/metas/service';
import { periodoDoMes, type PeriodoMensal } from '@/features/metas/periodo';
import type { Meta } from '@/features/metas/types';
import { instalarBanco } from '../helpers/fakeDb';

const periodo: PeriodoMensal = {
  ano: 2026,
  mes: 11,
  inicio: '2026-11-25',
  fim: '2026-11-30',
};

const meta = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Mercado',
  tipo: 'gasto',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-11-25',
  categoria_id: 'c1',
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-11-25T00:00:00Z',
  atualizado_em: '2026-11-25T00:00:00Z',
  revisao: 1,
  campos_revisao: '{}',
  base_sincronizacao: null,
  ...extra,
});

describe('calculadoras reais de metas (UC12)', () => {
  let banco: ReturnType<typeof instalarBanco>;
  let db: SQLiteDatabase;

  beforeEach(async () => {
    banco = instalarBanco();
    db = (await getDb()) as unknown as SQLiteDatabase;

    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES ('c1', 'Mercado', 'mercado', 0, NULL, NULL, NULL, 'sincronizado', NULL, 't', 't')`,
      )
      .run();
    banco.sqlite
      .prepare(
        `INSERT INTO categorias
          (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
           limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES ('c2', 'Lazer', 'lazer', 0, NULL, NULL, NULL, 'sincronizado', NULL, 't', 't')`,
      )
      .run();
  });

  function despesa(id: string, valor: number, data: string, categoria = 'c1', excluida = false) {
    banco.sqlite
      .prepare(
        `INSERT INTO despesas
          (id, valor_centavos, data, titulo, categoria_id, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, 'Despesa', ?, 'sincronizado', ?, 't', 't')`,
      )
      .run(id, valor, data, categoria, excluida ? '2026-11-01T00:00:00Z' : null);
  }

  it('soma despesas ativas da categoria no intervalo inclusivo', async () => {
    despesa('antes', 999, '2026-11-24');
    despesa('inicio', 100, '2026-11-25');
    despesa('meio', 200, '2026-11-28');
    despesa('fim', 300, '2026-11-30');
    despesa('depois', 999, '2026-12-01');
    despesa('outra-categoria', 999, '2026-11-26', 'c2');
    despesa('excluida', 999, '2026-11-26', 'c1', true);

    expect(await calcularRealizadoGasto(meta(), periodo, db)).toBe(600);
  });

  it('mês sem despesas retorna zero real, não indisponível', async () => {
    expect(await calcularRealizadoGasto(meta(), periodo, db)).toBe(0);
  });

  it('categoria ausente, excluída ou período nulo deixam o progresso indisponível', async () => {
    expect(await calcularRealizadoGasto(meta({ categoria_id: null }), periodo, db)).toBeNull();
    expect(await calcularRealizadoGasto(meta({ categoria_id: 'inexistente' }), periodo, db)).toBeNull();
    expect(await calcularRealizadoGasto(meta(), null, db)).toBeNull();

    banco.sqlite
      .prepare("UPDATE categorias SET excluido_em = '2026-11-01T00:00:00Z' WHERE id = 'c1'")
      .run();
    expect(await calcularRealizadoGasto(meta(), periodo, db)).toBeNull();
  });

  it('investimento usa o valor declarado, inclusive zero e nulo', () => {
    expect(
      calcularRealizadoInvestimento(meta({ tipo: 'investimento', categoria_id: null })),
    ).toBeNull();
    expect(
      calcularRealizadoInvestimento(
        meta({ tipo: 'investimento', categoria_id: null, valor_acumulado_centavos: 0 }),
      ),
    ).toBe(0);
    expect(
      calcularRealizadoInvestimento(
        meta({ tipo: 'investimento', categoria_id: null, valor_acumulado_centavos: 250_000 }),
      ),
    ).toBe(250_000);
  });

  it('calculadora real despacha por tipo e respeita o período', async () => {
    despesa('d1', 400, '2026-11-26');
    expect(await calculadoraReal.calcular(meta(), periodo)).toBe(400);

    expect(
      await calculadoraReal.calcular(
        meta({
          tipo: 'investimento',
          categoria_id: null,
          valor_acumulado_centavos: 42_000,
        }),
        null,
      ),
    ).toBe(42_000);
  });

  it('usa a conexão padrão quando nenhum banco é injetado', async () => {
    despesa('d1', 700, '2026-11-27');
    expect(await calcularRealizadoGasto(meta(), periodo)).toBe(700);
  });

  it('editar alvo ou categoria recalcula o realizado consultável, sem snapshot', async () => {
    despesa('c1', 50_000, '2026-11-26', 'c1');
    despesa('c2', 80_000, '2026-11-26', 'c2');

    const id = await criarMeta({
      objetivo: 'Mercado',
      tipo: 'gasto',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
      categoriaId: 'c1',
    });
    banco.sqlite
      .prepare("UPDATE metas SET inicio = '2026-11-01' WHERE id = ?")
      .run(id);

    let atual = (await buscarMeta(id))!;
    expect(await calcularRealizadoGasto(atual, periodo, db)).toBe(50_000);
    expect(calcularProgresso(atual, 50_000, '2026-11-26', periodo).percentual).toBe(50.0);

    await editarMeta(id, {
      objetivo: 'Mercado',
      tipo: 'gasto',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
      categoriaId: 'c2',
    });
    atual = (await buscarMeta(id))!;
    expect(await calcularRealizadoGasto(atual, periodo, db)).toBe(80_000);
    expect(
      calcularProgresso(atual, 80_000, '2026-11-26', periodo).situacaoProgresso,
    ).toBe('proximo_do_limite');

    await editarMeta(id, {
      objetivo: 'Mercado',
      tipo: 'gasto',
      valorAlvoCentavos: 200_000,
      prazo: '2027-12-31',
      categoriaId: 'c2',
    });
    atual = (await buscarMeta(id))!;
    expect(calcularProgresso(atual, 80_000, '2026-11-26', periodo).percentual).toBe(40.0);
  });

  it('alterar o prazo recalcula o fim do período consultável', async () => {
    despesa('antes', 10_000, '2026-11-10', 'c1');
    despesa('depois', 20_000, '2026-11-20', 'c1');

    const id = await criarMeta({
      objetivo: 'Mercado',
      tipo: 'gasto',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
      categoriaId: 'c1',
    });
    banco.sqlite
      .prepare("UPDATE metas SET inicio = '2026-11-01' WHERE id = ?")
      .run(id);

    let atual = (await buscarMeta(id))!;
    expect(
      await calcularRealizadoGasto(atual, periodoDoMes(atual, 2026, 11), db),
    ).toBe(30_000);

    await editarMeta(id, {
      objetivo: 'Mercado',
      tipo: 'gasto',
      valorAlvoCentavos: 100_000,
      prazo: '2026-11-15',
      categoriaId: 'c1',
    });
    atual = (await buscarMeta(id))!;
    const novoPeriodo = periodoDoMes(atual, 2026, 11)!;
    expect(novoPeriodo.fim).toBe('2026-11-15');
    expect(await calcularRealizadoGasto(atual, novoPeriodo, db)).toBe(10_000);
  });
});
