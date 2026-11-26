import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MetaForm } from '@/components/metas/MetaForm';
import {
  buscarMeta,
  CategoriaMetaIndisponivel,
  editarMeta,
  FalhaPersistenciaMeta,
  MetaIndisponivel,
} from '@/features/metas/service';
import { EntradaMetaInvalida, MSG_META } from '@/features/metas/validation';
import { META_SALVA, setFeedback } from '@/features/metas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import type { Meta, MetaInput } from '@/features/metas/types';
import { cores, raio } from '@/lib/theme';

export default function EditarMeta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLeitura, setErroLeitura] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const emOperacao = useRef(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLeitura(false);
    try {
      const encontrada = await buscarMeta(id);
      if (!encontrada) {
        setFeedback({ tipo: 'erro', texto: MSG_META.indisponivel });
        router.replace('/metas');
        return;
      }
      setMeta(encontrada);
    } catch {
      setErroLeitura(true);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function gravar(dados: MetaInput) {
    if (emOperacao.current) return;
    emOperacao.current = true;
    setSalvando(true);
    setErroGeral(null);
    try {
      await editarMeta(id, dados);
      sincronizarEmSegundoPlano();
      setFeedback(META_SALVA);
      router.dismissTo('/metas');
    } catch (e) {
      if (e instanceof MetaIndisponivel) {
        setFeedback({ tipo: 'erro', texto: MSG_META.indisponivel });
        router.replace('/metas');
        return;
      }
      if (e instanceof EntradaMetaInvalida || e instanceof CategoriaMetaIndisponivel) {
        setErroGeral(e.message);
      } else if (e instanceof FalhaPersistenciaMeta) setErroGeral(MSG_META.falhaSalvar);
      else setErroGeral(MSG_META.falhaSalvar);
      emOperacao.current = false;
      setSalvando(false);
    }
  }

  if (!meta) {
    if (carregando || !erroLeitura) {
      return (
        <View style={estilos.centro}>
          <ActivityIndicator color={cores.primaria} />
        </View>
      );
    }
    return (
      <SafeAreaView style={estilos.centro} edges={['top', 'bottom']}>
        <Text style={estilos.erro}>{MSG_META.falhaLeitura}</Text>
        <Pressable onPress={() => void carregar()} style={estilos.tentar} accessibilityRole="button">
          <Text style={estilos.tentarTexto}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const inicial: MetaInput = {
    objetivo: meta.objetivo,
    tipo: meta.tipo,
    valorAlvoCentavos: meta.valor_alvo_centavos,
    prazo: meta.prazo,
    categoriaId: meta.categoria_id,
    valorAcumuladoCentavos: meta.valor_acumulado_centavos,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <MetaForm
        titulo="Editar meta"
        textoSalvar="Salvar alterações"
        inicial={inicial}
        tipoImutavel
        salvando={salvando}
        erroGeral={erroGeral}
        onSalvar={gravar}
        onCancelar={() => router.back()}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cores.fundo,
    padding: 24,
  },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
  tentar: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
});
