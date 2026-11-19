import { formatarBRL } from '@/features/receitas/money';

/** Saldo com sinal explícito, sempre com 2 casas (RNF07): "+ R$ 10,00", "− R$ 10,00", "R$ 0,00". */
export function formatarSaldo(centavos: number): string {
  if (centavos === 0) return formatarBRL(0);
  return `${centavos > 0 ? '+' : '−'} ${formatarBRL(Math.abs(centavos))}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "2026-10-16" -> "Sex, 16/10". */
export function rotuloDia(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const semana = DIAS_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${semana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** Percentual inteiro de progresso de uma meta, limitado a 0–100. */
export function percentualMeta(realizadoCentavos: number, alvoCentavos: number): number {
  if (alvoCentavos <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((realizadoCentavos * 100) / alvoCentavos)));
}
