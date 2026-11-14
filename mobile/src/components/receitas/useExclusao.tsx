import { useState } from 'react';
import { router } from 'expo-router';
import { OpcoesModal } from './OpcoesModal';
import { excluirReceita, ReceitaIndisponivel } from '@/features/receitas/service';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { EscopoSerie } from '@/features/receitas/types';

const ALCANCE: Record<EscopoSerie, string> = {
  esta: 'Será excluída apenas esta receita.',
  proximas: 'Serão excluídas esta receita e as próximas da série.',
  todas: 'Serão excluídas todas as receitas da série.',
};

export interface AlvoExclusao {
  id: string;
  titulo: string;
  valorCentavos: number;
  data: string;
  emSerie: boolean;
}

/** Fluxo D: alcance (se for série), confirmação informando o alcance e exclusão. */
export function useExclusao(alvo: AlvoExclusao | null) {
  const [etapa, setEtapa] = useState<null | 'alcance' | 'confirmar'>(null);
  const [escopo, setEscopo] = useState<EscopoSerie>('esta');

  function iniciar() {
    if (!alvo) return;
    setEscopo('esta');
    setEtapa(alvo.emSerie ? 'alcance' : 'confirmar');
  }

  async function excluir(a: AlvoExclusao) {
    setEtapa(null);
    try {
      await excluirReceita(a.id, escopo);
      sincronizarEmSegundoPlano();
      setFeedback({ tipo: 'sucesso', texto: 'Receita excluída.' });
    } catch (e) {
      // EX06 ou EX03: em ambos o fluxo D volta à lista
      setFeedback({ tipo: 'erro', texto: e instanceof ReceitaIndisponivel ? MSG.indisponivel : MSG.falhaSalvar });
    }
    router.dismissTo('/receitas');
  }

  const montarDialogos = (a: AlvoExclusao) => (
    <>
      <OpcoesModal
        visivel={etapa === 'alcance'}
        titulo="Excluir quais receitas?"
        opcoes={(['esta', 'proximas', 'todas'] as const).map((e) => ({
          rotulo: e === 'esta' ? 'Só esta' : e === 'proximas' ? 'Esta e as próximas' : 'Todas',
          onPress: () => {
            setEscopo(e);
            setEtapa('confirmar');
          },
        }))}
        onCancelar={() => setEtapa(null)}
      />
      <OpcoesModal
        visivel={etapa === 'confirmar'}
        titulo="Excluir lançamento?"
        mensagem={`“${a.titulo}” (+ ${formatarBRL(a.valorCentavos)} em ${formatarBR(a.data)}). ${ALCANCE[escopo]} Esta ação não pode ser desfeita.`}
        opcoes={[{ rotulo: 'Excluir', destrutiva: true, onPress: () => void excluir(a) }]}
        onCancelar={() => setEtapa(null)}
      />
    </>
  );

  const dialogos = alvo ? montarDialogos(alvo) : null;

  return { iniciar, dialogos };
}
