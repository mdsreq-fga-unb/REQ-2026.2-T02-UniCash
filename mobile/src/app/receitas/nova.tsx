import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';
import { registrarReceita } from '@/features/receitas/service';
import { setFeedback } from '@/lib/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { ReceitaInput } from '@/features/receitas/types';
import { cores } from '@/lib/theme';

export default function NovaReceita() {
  // tutorial=1: aberto pelo tutorial (UC15); salvar volta a ele pela pilha de telas.
  // trocouTipo=1: veio do formulário de despesa pelo seletor Despesa/Receita; fora do tutorial,
  // salvar leva à lista deste tipo, e não à lista de despesas de onde se veio.
  const { tutorial, trocouTipo } = useLocalSearchParams<{ tutorial?: string; trocouTipo?: string }>();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: ReceitaInput) {
    setSalvando(true);
    setErro(null);
    try {
      await registrarReceita(dados); // só confirma após o commit (RNF35)
      setFeedback({ tipo: 'sucesso', texto: 'Salvo no dispositivo. Sincronização pendente.' });
      sincronizarEmSegundoPlano(); // falha aqui não afeta o registro (EX04)
      // Depois de trocar o tipo, volta para a lista de receitas, não para a lista de onde veio.
      if (trocouTipo && tutorial !== '1') router.replace('/receitas');
      else router.back();
    } catch {
      setErro(MSG.falhaSalvar); // EX03: volta ao passo 3 com os dados preservados
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <ReceitaForm
        titulo="Nova receita"
        textoSalvar="Salvar receita"
        salvando={salvando}
        erroGeral={erro}
        textoCancelar={tutorial === '1' && erro ? 'Voltar à etapa' : undefined}
        onSalvar={salvar}
        onCancelar={() => router.back()}
        onTrocarTipo={() =>
          router.replace({
            pathname: '/despesas/nova',
            params: tutorial === '1' ? { tutorial, trocouTipo: '1' } : { trocouTipo: '1' },
          })
        }
      />
    </SafeAreaView>
  );
}
