import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import {
  adicionarDias,
  hojeISO,
  primeiroDiaDoMes,
  proximoMes,
} from '@/features/receitas/dates';
import type {
  MetaTipo,
  SituacaoPrazo,
  SituacaoProgresso,
  SituacaoVigencia,
} from '@/features/metas/types';
import {
  situacaoDoPrazo,
  situacaoDoProgresso,
} from '@/features/metas/progresso';
import { periodoDoMes, situacaoDaVigencia } from '@/features/metas/periodo';

/**
 * Cálculos do resumo financeiro (UC03, RF11, RF40).
 *
 * Tudo é calculado na hora a partir da base local (RN06, RN07): nada é persistido,
 * nada é lido da nuvem. Valores somados como inteiros em centavos (RNF07).
 */

/** Falha ao ler ou calcular os totais (UC03 EX01). */
export class FalhaCalculo extends Error {}

export const MSG_FALHA_CALCULO = 'Não foi possível calcular os totais. Tente novamente.';

export interface TotalDoDia {
  /** Data ISO (AAAA-MM-DD). */
  data: string;
  totalCentavos: number;
}

/**
 * Progresso de uma meta no resumo (RF36/RF40).
 *
 * `gasto` representa consumo mensal do limite, nunca conquista. `investimento`
 * representa o valor acumulado declarado e só aparece no mês corrente, pois
 * não há histórico mensal nem snapshots nesta versão.
 */
export interface ProgressoMeta {
  id: string;
  titulo: string;
  tipo: MetaTipo;
  alvoCentavos: number;
  /** Nulo quando o cálculo está indisponível; nunca zero artificial. */
  realizadoCentavos: number | null;
  situacaoProgresso: SituacaoProgresso;
  situacaoPrazo: SituacaoPrazo;
  situacaoVigencia: SituacaoVigencia;
}

export interface ResumoMensal {
  ano: number;
  mes: number;
  totalReceitasCentavos: number;
  totalDespesasCentavos: number;
  /** Saldo do mês = receitas − despesas (RN15). O saldo anterior (RF35) fica no UC04. */
  saldoCentavos: number;
  /** Só os dias do mês que têm ao menos uma receita, em ordem crescente (RF11). */
  receitasPorDia: TotalDoDia[];
  metas: ProgressoMeta[];
  /** Nenhuma receita nem despesa em toda a base (FA02 → estado vazio com tutorial). */
  semLancamentos: boolean;
}

type Tabela = 'receitas' | 'despesas';

/** Intervalo [inicio, fim) do mês. Inclui datas futuras do próprio mês (RN12, FA04). */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const p = proximoMes(ano, mes);
  return { inicio: primeiroDiaDoMes(ano, mes), fim: primeiroDiaDoMes(p.ano, p.mes) };
}

async function calculo<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaCalculo(String(e));
  }
}

// ------------------------------------------------- funções base (recebem a conexão)

async function somaNoIntervalo(db: SQLiteDatabase, tabela: Tabela, inicio: string, fim: string) {
  const r = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(valor_centavos) AS total FROM ${tabela}
     WHERE excluido_em IS NULL AND data >= ? AND data < ?`,
    [inicio, fim],
  );
  return r?.total ?? 0;
}

async function receitasPorDiaNoIntervalo(db: SQLiteDatabase, inicio: string, fim: string) {
  const linhas = await db.getAllAsync<{ data: string; total: number }>(
    `SELECT data, SUM(valor_centavos) AS total FROM receitas
     WHERE excluido_em IS NULL AND data >= ? AND data < ?
     GROUP BY data
     ORDER BY data`,
    [inicio, fim],
  );
  return linhas.map((l) => ({ data: l.data, totalCentavos: l.total }));
}

interface MetaResumo {
  id: string;
  objetivo: string;
  tipo: MetaTipo;
  valor_alvo_centavos: number;
  prazo: string;
  inicio: string | null;
  categoria_id: string | null;
  valor_acumulado_centavos: number | null;
}

async function metasDoPeriodo(
  db: SQLiteDatabase,
  inicio: string,
  fim: string,
): Promise<ProgressoMeta[]> {
  const ultimoDia = adicionarDias(fim, -1);
  const ano = Number(inicio.slice(0, 4));
  const mes = Number(inicio.slice(5, 7));
  const hoje = hojeISO();
  const mesCorrente = inicio.slice(0, 7) === hoje.slice(0, 7);

  const metas = await db.getAllAsync<MetaResumo>(
    `SELECT id, objetivo, tipo, valor_alvo_centavos, prazo, inicio,
            categoria_id, valor_acumulado_centavos
       FROM metas
      WHERE excluido_em IS NULL
        AND (
          (tipo = 'gasto' AND inicio IS NOT NULL AND inicio <= ? AND prazo >= ?)
          OR (tipo = 'investimento' AND ? = 1)
        )
      ORDER BY prazo ASC, criado_em ASC, id ASC`,
    [ultimoDia, inicio, mesCorrente ? 1 : 0],
  );

  const resultado: ProgressoMeta[] = [];

  for (const meta of metas) {
    const situacaoPrazo = situacaoDoPrazo(meta.prazo, hoje);
    const situacaoVigencia = situacaoDaVigencia(meta.inicio, meta.prazo, hoje);
    const futura = situacaoVigencia === 'futura';

    if (meta.tipo === 'investimento') {
      const realizado = futura ? null : meta.valor_acumulado_centavos;
      resultado.push({
        id: meta.id,
        titulo: meta.objetivo,
        tipo: meta.tipo,
        alvoCentavos: meta.valor_alvo_centavos,
        realizadoCentavos: realizado,
        situacaoProgresso:
          realizado === null
            ? 'indisponivel'
            : situacaoDoProgresso('investimento', meta.valor_alvo_centavos, realizado),
        situacaoPrazo,
        situacaoVigencia,
      });
      continue;
    }

    if (futura) {
      resultado.push({
        id: meta.id,
        titulo: meta.objetivo,
        tipo: meta.tipo,
        alvoCentavos: meta.valor_alvo_centavos,
        realizadoCentavos: null,
        situacaoProgresso: 'indisponivel',
        situacaoPrazo,
        situacaoVigencia,
      });
      continue;
    }

    const periodo = periodoDoMes(meta, ano, mes);
    if (!periodo) continue;

    let realizado: number | null = null;
    if (meta.categoria_id) {
      const categoria = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM categorias WHERE id = ? AND excluido_em IS NULL',
        [meta.categoria_id],
      );
      if (categoria) {
        const soma = await db.getFirstAsync<{ total: number | null }>(
          `SELECT COALESCE(SUM(valor_centavos), 0) AS total
             FROM despesas
            WHERE excluido_em IS NULL
              AND categoria_id = ?
              AND data >= ?
              AND data <= ?`,
          [meta.categoria_id, periodo.inicio, periodo.fim],
        );
        realizado = soma?.total ?? 0;
      }
    }

    resultado.push({
      id: meta.id,
      titulo: meta.objetivo,
      tipo: meta.tipo,
      alvoCentavos: meta.valor_alvo_centavos,
      realizadoCentavos: realizado,
      situacaoProgresso:
        realizado === null
          ? 'indisponivel'
          : situacaoDoProgresso('gasto', meta.valor_alvo_centavos, realizado),
      situacaoPrazo,
      situacaoVigencia,
    });
  }

  return resultado;
}

// ------------------------------------------------- funções públicas compartilhadas

/** Total de receitas do mês (RF11). */
export function totalReceitasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => somaNoIntervalo(db, 'receitas', inicio, fim));
}

/** Total de despesas do mês (RF40). */
export function totalDespesasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => somaNoIntervalo(db, 'despesas', inicio, fim));
}

/** Total de receitas de cada dia do mês que tem lançamento (RF11). */
export function receitasPorDia(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => receitasPorDiaNoIntervalo(db, inicio, fim));
}

/** Saldo do mês: receitas − despesas (RN15, UC04). */
export function saldoDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo(async (db) => {
    const receitas = await somaNoIntervalo(db, 'receitas', inicio, fim);
    const despesas = await somaNoIntervalo(db, 'despesas', inicio, fim);
    return receitas - despesas;
  });
}

/** Progresso das metas do período (RF40). Vazio enquanto não houver metas (RF12). */
export function progressoMetasDoMes(ano: number, mes: number) {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  return calculo((db) => metasDoPeriodo(db, inicio, fim));
}

/**
 * Tudo o que a tela de resumo mostra, numa só leitura da base local (UC03 passo 3). Somente leitura.
 *
 * Os totais, a visão por dia e a existência de lançamentos vêm de uma única instrução SQL. O SQLite
 * executa cada instrução sobre um retrato consistente da base: se a geração de recorrências ou a
 * sincronização gravarem ao mesmo tempo, o total do mês não diverge da soma por dia. E, por ser só
 * leitura, não bloqueia essas gravações (no modo WAL, leitores e escritores não se esperam).
 */
export function calcularResumo(ano: number, mes: number): Promise<ResumoMensal> {
  const { inicio, fim } = intervaloDoMes(ano, mes);
  const filtro = 'excluido_em IS NULL AND data >= ? AND data < ?';
  return calculo(async (db) => {
    const r = await db.getFirstAsync<{
      receitas: number;
      despesas: number;
      por_dia: string;
      existe: number;
    }>(
      `SELECT
         (SELECT COALESCE(SUM(valor_centavos), 0) FROM receitas WHERE ${filtro}) AS receitas,
         (SELECT COALESCE(SUM(valor_centavos), 0) FROM despesas WHERE ${filtro}) AS despesas,
         (SELECT json_group_array(json_object('data', data, 'total', total))
            FROM (SELECT data, SUM(valor_centavos) AS total FROM receitas
                  WHERE ${filtro} GROUP BY data)) AS por_dia,
         (EXISTS (SELECT 1 FROM receitas WHERE excluido_em IS NULL)
          OR EXISTS (SELECT 1 FROM despesas WHERE excluido_em IS NULL)) AS existe`,
      [inicio, fim, inicio, fim, inicio, fim],
    );
    if (!r) throw new Error('consulta do resumo sem resultado');

    const receitasPorDia = (JSON.parse(r.por_dia) as { data: string; total: number }[])
      .map((d) => ({ data: d.data, totalCentavos: d.total }))
      .sort((x, y) => x.data.localeCompare(y.data));
    const metas = await metasDoPeriodo(db, inicio, fim);

    return {
      ano,
      mes,
      totalReceitasCentavos: r.receitas,
      totalDespesasCentavos: r.despesas,
      saldoCentavos: r.receitas - r.despesas,
      receitasPorDia,
      metas,
      semLancamentos: r.existe !== 1,
    };
  });
}
