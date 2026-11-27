import {
  hojeISO,
  mesAnterior,
  nomeMes,
  primeiroDiaDoMes,
  proximoMes,
} from '@/features/receitas/dates';
import type { Meta, SituacaoVigencia } from './types';

/** Período mensal consultável de uma meta de gasto. Datas ISO inclusivas. */
export interface PeriodoMensal {
  ano: number;
  mes: number;
  /** max(início da meta, primeiro dia do mês). */
  inicio: string;
  /** min(prazo da meta, último dia do mês). */
  fim: string;
}

const p2 = (n: number) => n.toString().padStart(2, '0');

/** Último dia do mês, em data ISO. */
export function ultimoDiaDoMes(ano: number, mes: number): string {
  const dia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${p2(mes)}-${p2(dia)}`;
}

function mesDaData(iso: string): { ano: number; mes: number } {
  return { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) };
}

/**
 * Intervalo consultável de um mês, limitado pela vigência da meta.
 * O alvo mensal não é rateado: o mês parcial usa o alvo integral.
 * Retorna null quando o mês não intersecta a vigência.
 */
export function periodoDoMes(
  meta: Pick<Meta, 'inicio' | 'prazo'>,
  ano: number,
  mes: number,
): PeriodoMensal | null {
  if (!meta.inicio) return null;

  const inicioMes = primeiroDiaDoMes(ano, mes);
  const fimMes = ultimoDiaDoMes(ano, mes);
  const inicio = meta.inicio > inicioMes ? meta.inicio : inicioMes;
  const fim = meta.prazo < fimMes ? meta.prazo : fimMes;

  if (inicio > fim) return null;
  return { ano, mes, inicio, fim };
}

/** Meses consultáveis, do primeiro ao último, sem persistir snapshots. */
export function periodosDaMeta(meta: Pick<Meta, 'inicio' | 'prazo'>): PeriodoMensal[] {
  if (!meta.inicio || meta.inicio > meta.prazo) return [];

  const periodos: PeriodoMensal[] = [];
  let atual = mesDaData(meta.inicio);
  const fim = mesDaData(meta.prazo);

  while (atual.ano < fim.ano || (atual.ano === fim.ano && atual.mes <= fim.mes)) {
    const periodo = periodoDoMes(meta, atual.ano, atual.mes);
    if (periodo) periodos.push(periodo);
    atual = proximoMes(atual.ano, atual.mes);
  }

  return periodos;
}

/** Situação temporal da meta; o início e o prazo final são inclusivos. */
export function situacaoDaVigencia(
  inicio: string | null,
  prazo: string,
  hoje: string = hojeISO(),
): SituacaoVigencia {
  if (!inicio) return 'indefinida';
  if (hoje < inicio) return 'futura';
  if (hoje > prazo) return 'encerrada';
  return 'em_vigor';
}

/**
 * Mês exibido por padrão: o mês corrente, limitado ao último mês da vigência.
 * Metas futuras e legadas sem início não têm período atual; uma meta encerrada
 * permanece consultável no último mês.
 */
export function periodoAtualDaMeta(
  meta: Pick<Meta, 'inicio' | 'prazo'>,
  hoje: string = hojeISO(),
): PeriodoMensal | null {
  if (!meta.inicio) return null;
  if (meta.inicio > meta.prazo) return null;
  if (hoje < meta.inicio) return null;

  const fim = mesDaData(meta.prazo);
  const atual = mesDaData(hoje);
  const alvo = depoisDe(atual, fim) ? fim : atual;

  return periodoDoMes(meta, alvo.ano, alvo.mes);
}

export function periodoAnterior(periodo: PeriodoMensal): { ano: number; mes: number } {
  return mesAnterior(periodo.ano, periodo.mes);
}

export function periodoSeguinte(periodo: PeriodoMensal): { ano: number; mes: number } {
  return proximoMes(periodo.ano, periodo.mes);
}

export function rotuloPeriodo(periodo: Pick<PeriodoMensal, 'ano' | 'mes'>): string {
  return nomeMes(periodo.ano, periodo.mes);
}

function depoisDe(
  a: { ano: number; mes: number },
  b: { ano: number; mes: number },
): boolean {
  return a.ano > b.ano || (a.ano === b.ano && a.mes > b.mes);
}
