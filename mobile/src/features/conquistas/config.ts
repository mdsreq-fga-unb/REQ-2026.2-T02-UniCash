import { NOMES_MES } from '@/features/receitas/dates';
import type { MarcoId } from './types';

/**
 * Valores de teste do protótipo (07 · Conquistas e pontuação), pendentes de validação com as
 * clientes (ata R07). Trocar aqui não exige mudança no restante do UC13 (FR-005, FR-006).
 */
export const PONTOS_POR_META = 100;

/** "2026-10" -> "outubro" */
export function nomeMesMinusculo(mes: string): string {
  return NOMES_MES[Number(mes.slice(5, 7)) - 1].toLowerCase();
}

export interface DefinicaoMarco {
  nome(ref: string): string;
  descricao: string;
  /** Rótulo "Marco atingido" no detalhe do selo. */
  marcoAtingido: string;
  fraseNotificacao(ref: string): string;
}

export const MARCOS: Record<MarcoId, DefinicaoMarco> = {
  'no-verde': {
    nome: (mes) => `No verde em ${nomeMesMinusculo(mes)}`,
    descricao: 'Fechou o mês com saldo positivo',
    marcoAtingido: 'Saldo positivo no mês',
    fraseNotificacao: (mes) => `Você fechou ${nomeMesMinusculo(mes)} com saldo positivo. Toque para ver.`,
  },
  'primeira-meta': {
    nome: () => 'Primeira meta concluída',
    descricao: 'Concluiu a primeira meta financeira',
    marcoAtingido: 'Primeira meta concluída',
    fraseNotificacao: (titulo) => `Você concluiu a meta "${titulo}". Toque para ver.`,
  },
};
