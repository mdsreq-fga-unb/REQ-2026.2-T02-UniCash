import type { FormValores, ReceitaInput } from '@/features/receitas/types';

export function input(extra: Partial<ReceitaInput> = {}): ReceitaInput {
  return {
    data: '2026-10-16',
    titulo: 'Freela de design',
    valorCentavos: 15000,
    descricao: null,
    recorrencia: null,
    ...extra,
  };
}

export function form(extra: Partial<FormValores> = {}): FormValores {
  return {
    valor: '150,00',
    data: '16/10/2026',
    titulo: 'Freela de design',
    descricao: '',
    recorrente: false,
    intervalo: '1',
    unidade: 'mes',
    termino: '',
    ...extra,
  };
}

import type { Receita, Recorrencia } from '@/features/receitas/types';

export function receitaLinha(extra: Partial<Receita> = {}): Receita {
  return {
    id: 'abc',
    valor_centavos: 15000,
    data: '2026-10-16',
    titulo: 'Freela de design',
    descricao: 'Logo para a empresa júnior',
    recorrencia_id: null,
    sync_status: 'sincronizado',
    excluido_em: null,
    criado_em: '2026-10-16T12:00:00.000Z',
    atualizado_em: '2026-10-16T12:00:00.000Z',
    ...extra,
  };
}

export function serieLinha(extra: Partial<Recorrencia> = {}): Recorrencia {
  return {
    id: 'serie1',
    intervalo: 1,
    unidade: 'mes',
    inicio: '2026-10-16',
    termino: null,
    ativa: 1,
    valor_centavos: 10000,
    titulo: 'Mesada',
    descricao: null,
    sync_status: 'sincronizado',
    atualizado_em: '2026-10-16T12:00:00.000Z',
    ...extra,
  };
}
