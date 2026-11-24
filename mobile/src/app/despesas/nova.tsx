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
  // Veio do formulário de receita pelo seletor Despesa/Receita: a tela anterior é a lista de receitas.
  const { trocouTipo } = useLocalSearchParams<{ trocouTipo?: string }>();
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
      if (trocouTipo) router.replace('/despesas');
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
        onSalvar={salvar}
        onCancelar={() => router.back()}
        onTrocarTipo={() => router.replace({ pathname: '/receitas/nova', params: { trocouTipo: '1' } })}
      />
    </SafeAreaView>
  );
}