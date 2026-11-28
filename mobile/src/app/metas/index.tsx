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
  rotuloSituacaoVigencia,
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
  const futura = progresso?.situacaoVigencia === 'futura';

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
          {futura
            ? `Meta ainda não iniciada${meta.inicio ? ` · início em ${formatarBR(meta.inicio)}` : ''}`
            : meta.tipo === 'investimento'
              ? 'Valor acumulado não informado'
              : 'Progresso indisponível'}
        </Text>
      ) : (
        <>
          <View style={estilos.trilha}>
            <View style={[estilos.progresso, { width: `${Math.min(100, Math.max(0, progresso.percentual!))}%` }]} />
          </View>
          <Text style={estilos.progressoTexto}>
            {meta.tipo === 'gasto' ? 'Consumo do limite' : 'Valor acumulado'}:{' '}
            {formatarBRL(progresso.valorRealizadoCentavos!)} de{' '}
            {formatarBRL(progresso.valorAlvoCentavos)} ({formatarPercentual(progresso.percentual!)})
          </Text>
          <Text style={estilos.progressoPendente}>
            {rotuloSituacaoProgresso(progresso.situacaoProgresso)} ·{' '}
            {rotuloSituacaoVigencia(progresso.situacaoVigencia)} ·{' '}
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
  const criarMeta = () => router.push('/metas/nova');

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
        <Pressable onPress={criarMeta} style={estilos.adicionar} accessibilityRole="button" accessibilityLabel="Nova meta">
          <Text style={estilos.adicionarTexto}>+</Text>
        </Pressable>
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
              <Text style={estilos.vazioTitulo}>Nenhuma meta ainda</Text>
              <Text style={estilos.vazioTexto}>Crie uma meta e acompanhe seu progresso.</Text>
              <Pressable onPress={criarMeta} style={estilos.criar} accessibilityRole="button">
                <Text style={estilos.criarTexto}>+ Criar primeira meta</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={itens.length > 0 ? (
          <Pressable onPress={criarMeta} style={estilos.tentar} accessibilityRole="button">
            <Text style={[estilos.tentarTexto, estilos.centralizado]}>+ Nova meta</Text>
          </Pressable>
        ) : undefined}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8,
  },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  conteudo: { paddingHorizontal: 20, paddingBottom: 24 },
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
  trilha: { height: 6, backgroundColor: cores.claro, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progresso: { height: '100%', backgroundColor: cores.primaria, borderRadius: 3 },
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
  adicionar: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  adicionarTexto: { color: cores.primaria, fontSize: 25 },
  criar: {
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: cores.primaria,
    borderRadius: raio.botao, padding: 12, marginTop: 16,
  },
  criarTexto: { color: cores.branco, fontWeight: '700' },
  centralizado: { textAlign: 'center' },
});
