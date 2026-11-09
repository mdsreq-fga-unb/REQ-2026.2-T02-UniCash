import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';
import { registrarReceita } from '@/features/receitas/service';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { ReceitaInput } from '@/features/receitas/types';
import { cores } from '@/lib/theme';

export default function NovaReceita() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: ReceitaInput) {
    setSalvando(true);
    setErro(null);
    try {
      await registrarReceita(dados); // só confirma após o commit (RNF35)
      setFeedback({ tipo: 'sucesso', texto: 'Salvo no dispositivo. Sincronização pendente.' });
      sincronizarEmSegundoPlano(); // falha aqui não afeta o registro (EX04)
      router.back();
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
        onSalvar={salvar}
        onCancelar={() => router.back()}
      />
    </SafeAreaView>
  );
}
