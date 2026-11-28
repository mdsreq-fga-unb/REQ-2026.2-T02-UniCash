import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { IconePrototipo } from '@/components/IconePrototipo';
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
        <IconePrototipo nome="metas" tamanho={17} />
        <Text style={estilos.itemObjetivo}>{meta.objetivo}</Text>
        {!indisponivel && <Text style={estilos.percentual}>{formatarPercentual(progresso.percentual!)}</Text>}
        <IconePrototipo nome="direita" tamanho={9} />
      </View>
      {indisponivel ? (
        <>
          <Text style={estilos.itemPrazo}>Valor-alvo: {formatarBRL(meta.valor_alvo_centavos)}</Text>
          <Text style={estilos.progressoPendente}>
            {futura
              ? `Meta ainda não iniciada${meta.inicio ? ` · início em ${formatarBR(meta.inicio)}` : ''}`
              : meta.tipo === 'investimento'
                ? 'Valor acumulado não informado'
                : 'Progresso indisponível'}
          </Text>
        </>
      ) : (
        <>
          <View style={estilos.trilha}>
            <View style={[estilos.progresso, { width: `${Math.min(100, Math.max(0, progresso.percentual!))}%` }]} />
          </View>
          <View style={estilos.valores}>
            <Text style={estilos.progressoTexto}>
              {meta.tipo === 'gasto' ? 'Consumo: ' : ''}
              {formatarBRL(progresso.valorRealizadoCentavos!)} de {formatarBRL(progresso.valorAlvoCentavos)}
            </Text>
            <Text style={estilos.restante}>Restam {formatarBRL(progresso.valorRestanteCentavos!)}</Text>
          </View>
        </>
      )}
      <Text style={estilos.itemPrazo}>Prazo: {textoPrazo(meta.prazo)}</Text>
      <Text style={estilos.progressoPendente}>
        {rotuloTipo(meta.tipo)}
        {!indisponivel ? ` · ${rotuloSituacaoProgresso(progresso.situacaoProgresso)} · ${rotuloSituacaoVigencia(progresso.situacaoVigencia)} · ${rotuloSituacaoPrazo(progresso.situacaoPrazo)}` : ''}
      </Text>
      <Text style={[estilos.sync, pendente ? estilos.syncPendente : estilos.syncOk]}>
        {pendente ? 'Pendente de sincronização' : 'Sincronizado'}
      </Text>
    </Pressable>
  );
}

/** Lista de metas (UC12). */
export default function ListaMetas() {
  const { itens, progressos, carregando, erroLeitura, recarregar } = useMetas();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const criarMeta = () => router.push('/metas/nova');
  const investimentosAtivos = itens.flatMap((meta) => {
    const progresso = progressos?.[meta.id];
    return meta.tipo === 'investimento' && progresso?.situacaoVigencia === 'em_vigor'
      ? [progresso]
      : [];
  });
  const totalGuardado = investimentosAtivos.reduce(
    (total, progresso) => total + (progresso.valorRealizadoCentavos ?? 0), 0,
  );
  const totalAlvo = investimentosAtivos.reduce((total, progresso) => total + progresso.valorAlvoCentavos, 0);
  const valoresConhecidos = investimentosAtivos.every((progresso) => progresso.valorRealizadoCentavos !== null);

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
          <IconePrototipo nome="mais" tamanho={15} />
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
            {investimentosAtivos.length > 0 && (
              <View style={estilos.resumo}>
                <Text style={estilos.progressoTexto}>
                  {investimentosAtivos.length} {investimentosAtivos.length === 1 ? 'meta de investimento ativa' : 'metas de investimento ativas'}
                </Text>
                {valoresConhecidos && (
                  <Text style={estilos.resumoValor}>
                    {formatarBRL(totalGuardado)} guardados de {formatarBRL(totalAlvo)}
                  </Text>
                )}
              </View>
            )}
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
              <View style={estilos.vazioIcone}>
                <IconePrototipo nome="metaVazia" tamanho={27} />
              </View>
              <Text style={estilos.vazioTitulo}>Nenhuma meta ainda</Text>
              <Text style={estilos.vazioTexto}>
                Crie uma meta com valor-alvo e prazo, como uma reserva de emergência, e acompanhe o progresso aqui.
              </Text>
              <Pressable onPress={criarMeta} style={estilos.criar} accessibilityRole="button">
                <IconePrototipo nome="mais" tamanho={13} style={estilos.iconeBranco} />
                <Text style={estilos.criarTexto}>Criar primeira meta</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={itens.length > 0 ? (
          <Pressable onPress={criarMeta} style={estilos.novaMeta} accessibilityRole="button">
            <IconePrototipo nome="mais" tamanho={13} />
            <Text style={estilos.novaMetaTexto}>Nova meta</Text>
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
    paddingHorizontal: 16, minHeight: 50,
  },
  titulo: { fontSize: 18, fontWeight: '600', color: cores.marinho },
  conteudo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  banner: { borderRadius: raio.cartao, padding: 14, marginBottom: 12 },
  bannerOk: { backgroundColor: cores.primaria },
  bannerErro: { backgroundColor: cores.erro },
  bannerTexto: { color: cores.branco, fontSize: 13, fontWeight: '600' },
  resumo: { backgroundColor: cores.fundoSuave, borderRadius: 10, padding: 12, marginBottom: 16, gap: 2 },
  resumoValor: { fontSize: 15, fontWeight: '600', color: cores.marinho },
  item: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 14, marginBottom: 16, gap: 5 },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemObjetivo: { flex: 1, fontSize: 15, fontWeight: '600', color: cores.marinho },
  percentual: { fontSize: 14, fontWeight: '600', color: cores.marinho },
  itemPrazo: { fontSize: 12, color: cores.primaria },
  sync: { fontSize: 11, fontWeight: '600' },
  syncPendente: { color: cores.erro },
  syncOk: { color: cores.sucesso },
  trilha: { height: 8, backgroundColor: cores.claro, borderRadius: 4, overflow: 'hidden', marginVertical: 3 },
  progresso: { height: '100%', backgroundColor: cores.primaria, borderRadius: 4 },
  valores: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 8 },
  progressoTexto: { fontSize: 12, color: cores.primaria },
  restante: { fontSize: 12, fontWeight: '600', color: cores.marinho },
  progressoPendente: { fontSize: 12, color: cores.textoSuave },
  vazio: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  vazioIcone: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: cores.claro, alignItems: 'center', justifyContent: 'center',
  },
  vazioTitulo: { fontSize: 17, fontWeight: '600', color: cores.marinho },
  vazioTexto: { fontSize: 14, lineHeight: 20, color: cores.primaria, textAlign: 'center' },
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
  criar: {
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: cores.primaria,
    borderRadius: 8, minHeight: 44, marginTop: 14, paddingHorizontal: 8,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  criarTexto: { color: cores.branco, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  iconeBranco: { tintColor: cores.branco },
  novaMeta: {
    flexDirection: 'row', minHeight: 46, alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: cores.borda, borderRadius: 8,
  },
  novaMetaTexto: { color: cores.marinho, fontSize: 15, fontWeight: '600' },
});
