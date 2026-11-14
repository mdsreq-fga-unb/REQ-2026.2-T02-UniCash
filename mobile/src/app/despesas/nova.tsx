import { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DespesaForm } from '@/components/despesas/DespesaForm';
import { registrarDespesa } from '@/features/despesas/service';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type { DespesaInput } from '@/features/despesas/types';
import { cores } from '@/lib/theme';

export default function NovaDespesa() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: DespesaInput) {
    setSalvando(true);
    setErro(null);

    try {
      await registrarDespesa(dados);
      router.back();
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
      />
    </SafeAreaView>
  );
}