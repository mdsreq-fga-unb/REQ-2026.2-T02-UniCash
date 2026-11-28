import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DespesaForm } from '@/components/despesas/DespesaForm';
import { registrarDespesa } from '@/features/despesas/service';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { setFeedback } from '@/lib/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import type { DespesaInput } from '@/features/despesas/types';
import { cores } from '@/lib/theme';

export default function NovaDespesa() {
  // tutorial=1: aberto pelo tutorial (UC15); salvar volta a ele pela pilha de telas.
  // trocouTipo=1: veio do formulário de receita pelo seletor Despesa/Receita; fora do tutorial,
  // salvar leva à lista deste tipo, e não à lista de receitas de onde se veio.
  const { tutorial, trocouTipo, origem } = useLocalSearchParams<{ tutorial?: string; trocouTipo?: string; origem?: string }>();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: DespesaInput) {
    setSalvando(true);
    setErro(null);

    try {
      await registrarDespesa(dados);
      sincronizarEmSegundoPlano(); // falha aqui não afeta o registro (EX03)

      setFeedback({
        tipo: 'sucesso',
        texto: 'Despesa cadastrada com sucesso!',
      });

      // Depois de trocar o tipo, volta para a lista de despesas, não para a lista de onde veio.
      if (trocouTipo && tutorial !== '1' && origem !== 'movimentacoes') router.replace('/despesas');
      else router.back();
    } catch {
      setErro(MSG_DESPESA.falhaSalvar);
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: cores.fundo }}
      edges={['top', 'bottom']}
    >
      <DespesaForm
        titulo="Nova despesa"
        textoSalvar="Salvar despesa"
        salvando={salvando}
        erroGeral={erro}
        textoCancelar={tutorial === '1' && erro ? 'Voltar à etapa' : undefined}
        onSalvar={salvar}
        onCancelar={() => router.back()}
        onTrocarTipo={() =>
          router.replace({
            pathname: '/receitas/nova',
            params: {
              trocouTipo: '1',
              ...(tutorial === '1' ? { tutorial } : {}),
              ...(origem === 'movimentacoes' ? { origem } : {}),
            },
          })
        }
      />
    </SafeAreaView>
  );
}