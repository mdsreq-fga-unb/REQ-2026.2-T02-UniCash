import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { cores, raio } from '@/lib/theme';
import { useMetas } from '@/features/metas/useMetas';
import { consumirFeedback, type Feedback } from '@/features/metas/feedback';
import { MSG_META } from '@/features/metas/validation';
import type { Meta } from '@/features/metas/types';
import type { ProgressoMeta } from '@/features/metas/progresso';
import {
  rotuloSituacaoPrazo,
  rotuloSituacaoProgresso,
} from '@/features/metas/progresso';
import { formatarPercentual } from '@/features/metas/formato';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';

export function rotuloTipo(tipo: Meta['tipo']): string {
  return tipo === 'gasto' ? 'Gasto' : 'Investimento';
}

export function textoPrazo(prazo: string): string {
  return formatarBR(prazo);
}

function MetaItem({
  meta,
  progresso,
  onPress,
}: {
  meta: Meta;
  progresso?: ProgressoMeta;
  onPress: () => void;
}) {
  const pendente = meta.sync_status === 'pendente';
  const indisponivel = !progresso || progresso.progressoIndisponivel;

  return (
    <Pressable
      onPress={onPress}
      style={estilos.item}
      accessibilityRole="button"
      accessibilityLabel={`Meta ${meta.objetivo}`}
    >
      <View style={estilos.itemTopo}>
        <Text style={estilos.itemObjetivo}>{meta.objetivo}</Text>
        <Text style={estilos.tipo}>{rotuloTipo(meta.tipo)}</Text>
      </View>
      <Text style={estilos.itemValor}>{formatarBRL(meta.valor_alvo_centavos)}</Text>
      <Text style={estilos.itemPrazo}>Prazo: {textoPrazo(meta.prazo)}</Text>
      <Text style={[estilos.sync, pendente ? estilos.syncPendente : estilos.syncOk]}>
        {pendente ? 'Pendente de sincronização' : 'Sincronizado'}
      </Text>
      {indisponivel ? (
        <Text style={estilos.progressoPendente}>
          {meta.tipo === 'investimento'
            ? 'Valor acumulado não informado'
            : 'Progresso indisponível'}
        </Text>
      ) : (
        <>
          <Text style={estilos.progressoTexto}>
            {meta.tipo === 'gasto' ? 'Consumo do limite' : 'Valor acumulado'}:{' '}
            {formatarBRL(progresso.valorRealizadoCentavos!)} de{' '}
            {formatarBRL(progresso.valorAlvoCentavos)} ({formatarPercentual(progresso.percentual!)})
          </Text>
          <Text style={estilos.progressoPendente}>
            {rotuloSituacaoProgresso(progresso.situacaoProgresso)} ·{' '}
            {rotuloSituacaoPrazo(progresso.situacaoPrazo)}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Lista de metas (UC12). */
export default function ListaMetas() {
  const { itens, progressos, carregando, erroLeitura, recarregar } = useMetas();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFeedback(consumirFeedback());
      void recarregar();
    }, [recarregar]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Metas</Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(m) => m.id}
        contentContainerStyle={estilos.conteudo}
        renderItem={({ item }) => (
          <MetaItem
            meta={item}
            progresso={progressos?.[item.id]}
            onPress={() =>
              router.push({ pathname: '/metas/[id]', params: { id: item.id } })
            }
          />
        )}
        ListHeaderComponent={
          <>
            {feedback ? (
              <View style={[estilos.banner, feedback.tipo === 'erro' ? estilos.bannerErro : estilos.bannerOk]}>
                <Text style={estilos.bannerTexto}>
                  {feedback.tipo === 'erro' ? '!  ' : '✓  '}
                  {feedback.texto}
                </Text>
              </View>
            ) : null}
            {erroLeitura && itens.length > 0 ? (
              <View style={[estilos.banner, estilos.bannerErro]}>
                <Text style={estilos.bannerTexto}>!  Não foi possível atualizar a lista.</Text>
                <Pressable
                  onPress={() => void recarregar()}
                  style={estilos.tentarBanner}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente"
                >
                  <Text style={estilos.tentarBannerTexto}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: 32 }} />
          ) : erroLeitura ? (
            <View style={estilos.vazio}>
              <Text style={estilos.erro}>{MSG_META.falhaLeitura}</Text>
              <Pressable
                onPress={() => void recarregar()}
                style={estilos.tentar}
                accessibilityRole="button"
              >
                <Text style={estilos.tentarTexto}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>Nenhuma meta</Text>
              <Text style={estilos.vazioTexto}>Toque em + para criar uma meta.</Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => router.push('/metas/nova')}
        style={estilos.fab}
        accessibilityRole="button"
        accessibilityLabel="Nova meta"
      >
        <Text style={estilos.fabTexto}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingBottom: 110 },
  banner: { borderRadius: raio.cartao, padding: 14, marginBottom: 12 },
  bannerOk: { backgroundColor: cores.primaria },
  bannerErro: { backgroundColor: cores.erro },
  bannerTexto: { color: cores.branco, fontSize: 13, fontWeight: '600' },
  item: {
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.cartao,
    padding: 14,
    marginBottom: 10,
  },
  itemTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemObjetivo: { fontSize: 16, fontWeight: '700', color: cores.marinho, flexShrink: 1 },
  tipo: {
    fontSize: 11,
    fontWeight: '700',
    color: cores.primaria,
    borderWidth: 1,
    borderColor: cores.primaria,
    borderRadius: raio.pilula,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemValor: { fontSize: 18, fontWeight: '800', color: cores.marinho, marginTop: 6 },
  itemPrazo: { fontSize: 13, color: cores.textoSuave, marginTop: 4 },
  sync: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  syncPendente: { color: cores.erro },
  syncOk: { color: cores.sucesso },
  progressoTexto: { fontSize: 12, color: cores.marinho, marginTop: 6, fontWeight: '600' },
  progressoPendente: { fontSize: 12, color: cores.textoSuave, marginTop: 4 },
  vazio: { alignItems: 'center', paddingVertical: 40 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: cores.marinho },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, marginTop: 6, textAlign: 'center' },
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
  tentarBanner: {
    alignSelf: 'flex-start',
    backgroundColor: cores.branco,
    borderRadius: raio.botao,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  tentarBannerTexto: { color: cores.erro, fontWeight: '700', fontSize: 13 },
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
