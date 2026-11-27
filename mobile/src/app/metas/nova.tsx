import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MetaForm } from '@/components/metas/MetaForm';
import {
  CategoriaMetaIndisponivel,
  criarMeta,
  FalhaPersistenciaMeta,
} from '@/features/metas/service';
import { EntradaMetaInvalida, MSG_META } from '@/features/metas/validation';
import { META_CRIADA, setFeedback } from '@/features/metas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import type { MetaInput } from '@/features/metas/types';
import { cores } from '@/lib/theme';

export default function NovaMeta() {
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function salvar(dados: MetaInput) {
    if (salvando) return;
    setSalvando(true);
    setErroGeral(null);
    try {
      await criarMeta(dados);
      sincronizarEmSegundoPlano();
      setFeedback(META_CRIADA);
      router.dismissTo('/metas');
    } catch (e) {
      if (e instanceof EntradaMetaInvalida || e instanceof CategoriaMetaIndisponivel) {
        setErroGeral(e.message);
      } else if (e instanceof FalhaPersistenciaMeta) {
        setErroGeral(MSG_META.falhaSalvar);
      } else {
        setErroGeral(MSG_META.falhaSalvar);
      }
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <MetaForm
        titulo="Nova meta"
        textoSalvar="Salvar meta"
        salvando={salvando}
        erroGeral={erroGeral}
        onSalvar={salvar}
        onCancelar={() => router.back()}
      />
    </SafeAreaView>
  );
}
