
import { useState } from 'react';
import { router } from 'expo-router';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import {
  excluirDespesa,
  DespesaIndisponivel,
} from '@/features/despesas/service';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type { EscopoSerie } from '@/features/despesas/types';

const ALCANCE: Record<EscopoSerie, string> = {
  esta: 'Será excluída apenas esta despesa.',
  proximas: 'Serão excluídas esta despesa e as próximas da série.',
  todas: 'Serão excluídas todas as despesas da série.',
};

export interface AlvoExclusaoDespesa {
  id: string;
  titulo: string;
  valorCentavos: number;
  data: string;
  emSerie: boolean;
}

/** Fluxo de exclusão de despesas, incluindo o alcance da recorrência. */
export function useExclusaoDespesas(alvo: AlvoExclusaoDespesa | null) {
  const [etapa, setEtapa] = useState<null | 'alcance' | 'confirmar'>(null);
  const [escopo, setEscopo] = useState<EscopoSerie>('esta');

  function iniciar() {
    if (!alvo) return;
    setEscopo('esta');
    setEtapa(alvo.emSerie ? 'alcance' : 'confirmar');
  }

  async function excluir() {
    if (!alvo) return;

    setEtapa(null);

    try {
      await excluirDespesa(alvo.id, escopo);
      sincronizarEmSegundoPlano(); // falha aqui não afeta a exclusão (EX03)
      setFeedback({ tipo: 'sucesso', texto: 'Despesa excluída.' });
    } catch (e) {
      setFeedback({
        tipo: 'erro',
        texto:
          e instanceof DespesaIndisponivel
            ? MSG_DESPESA.indisponivel
            : MSG_DESPESA.falhaSalvar,
      });
    }

    router.dismissTo('/despesas');
  }

  const dialogos = alvo ? (
    <>
      <OpcoesModal
        visivel={etapa === 'alcance'}
        titulo="Excluir quais despesas?"
        opcoes={(['esta', 'proximas', 'todas'] as const).map((e) => ({
          rotulo:
            e === 'esta'
              ? 'Só esta'
              : e === 'proximas'
                ? 'Esta e as próximas'
                : 'Todas',
          onPress: () => {
            setEscopo(e);
            setEtapa('confirmar');
          },
        }))}
        onCancelar={() => setEtapa(null)}
      />

      <OpcoesModal
        visivel={etapa === 'confirmar'}
        titulo="Excluir despesa?"
        mensagem={`“${alvo.titulo}” — ${formatarBRL(alvo.valorCentavos)} em ${formatarBR(alvo.data)}.\n\n${ALCANCE[escopo]}`}
        opcoes={[
          {
            rotulo: 'Excluir',
            onPress: excluir,
          },
        ]}
        onCancelar={() => setEtapa(null)}
      />
    </>
  ) : null;

  return { iniciar, dialogos };
}
