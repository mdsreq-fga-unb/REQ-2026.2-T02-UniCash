import { MARCOS, PONTOS_POR_META } from './config';
import type { MetaConcluida, PontuacaoMeta, ResumoConquistas, Selo, TotaisMes } from './types';

/** "2026-02" -> "2026-02-28" */
function ultimoDiaDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  const dia = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

export const compararDatasDecrescente = (a: string | null, b: string | null) =>
  (b ?? '').localeCompare(a ?? '');

/**
 * UC13 fluxo A (RF44, RF45): selos e pontos derivados dos dados atuais. Pura, sem I/O.
 * Por ser derivada, cobre FA02 e FA03 (sem duplicidade), FA07 (sem contador) e FA08 (selo some e volta com os dados).
 */
export function avaliar({ meses, metas }: { meses: TotaisMes[]; metas: MetaConcluida[] }): ResumoConquistas {
  const selos = new Map<string, Selo>();

  for (const t of meses) {
    const saldo = t.receitasCentavos - t.despesasCentavos;
    if (saldo <= 0) continue;
    const chave = `no-verde:${t.mes}`;
    if (selos.has(chave)) continue;
    selos.set(chave, {
      chave,
      marco: 'no-verde',
      nome: MARCOS['no-verde'].nome(t.mes),
      descricao: MARCOS['no-verde'].descricao,
      data: ultimoDiaDoMes(t.mes),
      referencia: {
        tipo: 'mes',
        mes: t.mes,
        receitasCentavos: t.receitasCentavos,
        despesasCentavos: t.despesasCentavos,
        saldoCentavos: saldo,
      },
    });
  }

  const unicas = [...new Map(metas.map((m) => [m.id, m])).values()];
  const pontuacoes: PontuacaoMeta[] = unicas
    .map((m) => ({ metaId: m.id, titulo: m.titulo, concluidaEm: m.concluidaEm, pontos: PONTOS_POR_META }))
    .sort((a, b) => compararDatasDecrescente(a.concluidaEm, b.concluidaEm));

  const primeira = [...pontuacoes].reverse().find((p) => p.concluidaEm !== null) ?? pontuacoes[0];
  if (primeira) {
    selos.set('primeira-meta', {
      chave: 'primeira-meta',
      marco: 'primeira-meta',
      nome: MARCOS['primeira-meta'].nome(primeira.titulo),
      descricao: MARCOS['primeira-meta'].descricao,
      data: primeira.concluidaEm,
      referencia: { tipo: 'meta', metaId: primeira.metaId, titulo: primeira.titulo },
    });
  }

  return {
    totalPontos: pontuacoes.length * PONTOS_POR_META,
    metasConcluidas: pontuacoes.length,
    pontosPorMeta: PONTOS_POR_META,
    selos: [...selos.values()].sort((a, b) => compararDatasDecrescente(a.data, b.data)),
    pontuacoes,
  };
}
