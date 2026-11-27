import type { SyncStatus } from '@/features/receitas/types';
import type { MetaTipo } from './types';

export function rotuloTipoMeta(tipo: MetaTipo): string {
  return tipo === 'gasto' ? 'Gasto' : 'Investimento';
}

export function rotuloSync(status: SyncStatus): string {
  return status === 'pendente' ? 'Pendente de sincronização' : 'Sincronizado';
}

/** Percentual com uma casa decimal, em pt-BR. */
export function formatarPercentual(percentual: number): string {
  return `${percentual.toFixed(1).replace('.', ',')}%`;
}
