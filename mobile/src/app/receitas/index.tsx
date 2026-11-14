import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { cores, raio } from '@/lib/theme';
import { FiltroReceitas } from '@/components/receitas/FiltroReceitas';
import { ReceitaItem } from '@/components/receitas/ReceitaItem';
import { formatarBRL } from '@/features/receitas/money';
import { consumirFeedback, type Feedback } from '@/features/receitas/feedback';
import { contarPendentes } from '@/features/receitas/pendencias';
import { useReceitas } from '@/features/receitas/useReceitas';
import { consumirAcessoNegado, sincronizarPendentes } from '@/features/receitas/sync';
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
  const [pendentes, setPendentes] = useState(0);

  const atualizarPendentes = useCallback(async () => {
    try {
      setPendentes(await contarPendentes());
    } catch {
      // indicador é informativo
    }
  }, []);

  // Ao voltar de outra tela: mostra mensagem pendente, recarrega e tenta sincronizar (EX05).
  useFocusEffect(
    useCallback(() => {
      setFeedback(consumirFeedback());
      void recarregar();
      void atualizarPendentes();
      void sincronizarPendentes().then((mudou) => {
        if (mudou) void recarregar();
        // EX07: a nuvem negou o acesso; os dados locais seguem intactos.
        if (consumirAcessoNegado()) setFeedback({ tipo: 'erro', texto: MSG.acessoNegado });
        void atualizarPendentes();
      });
    }, [recarregar, atualizarPendentes]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Receitas</Text>
        {pendentes > 0 ? (
          <View style={estilos.pendentes}>
            <Text style={estilos.pendentesTexto}>
              ↻ {pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(r) => r.id}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View>
            {feedback ? (
              <View style={[estilos.banner, feedback.tipo === 'erro' ? estilos.bannerErro : estilos.bannerOk]}>
                <Text style={estilos.bannerTexto}>
                  {feedback.tipo === 'erro' ? '!  ' : '✓  '}
                  {feedback.texto}
                </Text>
              </View>
            ) : null}

            <View style={estilos.chips}>
              <FiltroReceitas filtro={filtro} onChange={setFiltro} />
            </View>

            <View style={estilos.total}>
              <Text style={estilos.totalRotulo}>Receitas</Text>
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
        ListFooterComponent={
          itens.length > 0 ? (
            <Text style={estilos.dica}>Toque em uma receita para consultar, editar ou excluir.</Text>
          ) : undefined
        }
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
              <Text style={estilos.vazioTexto}>Toque em + para registrar uma receita.</Text>
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
        <Text style={estilos.fabTexto}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  pendentes: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.primaria,
    borderRadius: raio.pilula,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendentesTexto: { fontSize: 12, color: cores.primaria, fontWeight: '600' },
  conteudo: { paddingHorizontal: 20, paddingBottom: 110 },
  banner: { borderRadius: raio.cartao, padding: 14, marginBottom: 12 },
  bannerOk: { backgroundColor: cores.primaria },
  bannerErro: { backgroundColor: cores.erro },
  bannerTexto: { color: cores.branco, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', marginBottom: 12 },
  total: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.cartao,
    padding: 14,
    marginBottom: 6,
  },
  totalRotulo: { fontSize: 12, color: cores.textoSuave },
  totalValor: { fontSize: 18, fontWeight: '800', color: cores.sucesso, marginTop: 2 },
  dica: { fontSize: 12, color: cores.textoSuave, textAlign: 'center', marginTop: 16 },
  vazio: { alignItems: 'center', paddingVertical: 40 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: cores.marinho },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, marginTop: 6, textAlign: 'center' },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
  tentar: { marginTop: 12, borderWidth: 1.5, borderColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 10, paddingHorizontal: 20 },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabTexto: { color: cores.branco, fontSize: 30, lineHeight: 34, fontWeight: '400' },
});
