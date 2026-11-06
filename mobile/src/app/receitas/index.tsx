import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { cores } from '@/lib/theme';
import { FiltroReceitas } from '@/components/receitas/FiltroReceitas';
import { ReceitaItem } from '@/components/receitas/ReceitaItem';
import { formatarBRL } from '@/features/receitas/money';
import { consumirFeedback, type Feedback } from '@/features/receitas/feedback';
import { useReceitas } from '@/features/receitas/useReceitas';
import { sincronizarPendentes } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import type { Filtro } from '@/features/receitas/types';

function filtroMesCorrente(): Filtro {
  const n = new Date();
  return { modo: 'mes', ano: n.getFullYear(), mes: n.getMonth() + 1 };
}

export default function ListaReceitas() {
  const [filtro, setFiltro] = useState<Filtro>(filtroMesCorrente);
  const { itens, total, carregando, erroLeitura, recarregar } = useReceitas(filtro);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Ao voltar de outra tela: mostra mensagem pendente, recarrega e tenta sincronizar (EX05).
  useFocusEffect(
    useCallback(() => {
      setFeedback(consumirFeedback());
      void recarregar();
      void sincronizarPendentes().then((mudou) => {
        if (mudou) void recarregar();
      });
    }, [recarregar]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Text style={estilos.titulo}>Receitas</Text>

      <FlatList
        data={itens}
        keyExtractor={(r) => r.id}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View>
            <FiltroReceitas filtro={filtro} onChange={setFiltro} />
            {feedback ? (
              <Text style={[estilos.feedback, feedback.tipo === 'erro' ? estilos.feedbackErro : estilos.feedbackOk]}>
                {feedback.texto}
              </Text>
            ) : null}
            <View style={estilos.total}>
              <Text style={estilos.totalRotulo}>Total do período</Text>
              <Text style={estilos.totalValor}>+ {formatarBRL(total)}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ReceitaItem
            receita={item}
            onPress={() => router.push({ pathname: '/receitas/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: 32 }} />
          ) : erroLeitura ? (
            <View style={estilos.vazio}>
              <Text style={estilos.erro}>{MSG.falhaLeitura}</Text>
              <Pressable onPress={() => void recarregar()} style={estilos.tentar} accessibilityRole="button">
                <Text style={estilos.tentarTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>Nenhuma receita neste período</Text>
              <Text style={estilos.vazioTexto}>Toque em “Nova receita” para registrar a primeira.</Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => router.push('/receitas/nova')}
        style={estilos.fab}
        accessibilityRole="button"
        accessibilityLabel="Nova receita"
      >
        <Text style={estilos.fabTexto}>+ Nova receita</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  titulo: { fontSize: 24, fontWeight: '700', color: cores.marinho, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  conteudo: { paddingHorizontal: 20, paddingBottom: 100 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: cores.marinho,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  totalRotulo: { color: cores.claro, fontSize: 14 },
  totalValor: { color: cores.branco, fontSize: 16, fontWeight: '700' },
  feedback: { padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 14, fontWeight: '600', overflow: 'hidden' },
  feedbackOk: { backgroundColor: '#DCFCE7', color: cores.sucesso },
  feedbackErro: { backgroundColor: '#FEE2E2', color: cores.erro },
  vazio: { alignItems: 'center', paddingVertical: 40 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: cores.marinho },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, marginTop: 6, textAlign: 'center' },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
  tentar: { marginTop: 12, borderWidth: 1.5, borderColor: cores.primaria, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: cores.primaria,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 22,
    elevation: 4,
  },
  fabTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
});
