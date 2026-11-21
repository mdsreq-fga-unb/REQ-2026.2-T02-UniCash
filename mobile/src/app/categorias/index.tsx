import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { cores, raio } from '@/lib/theme';
import { useCategorias } from '@/features/categorias/useCategorias';
import { consumirFeedback, type Feedback } from '@/features/categorias/feedback';
import { centesimosParaTextoPercentual } from '@/features/categorias/formato';
import { formatarBRL } from '@/features/receitas/money';
import { MSG_CAT, mensagemConflitoSemeadura } from '@/features/categorias/validation';
import { adicionarMeses, hojeISO, nomeMes } from '@/features/receitas/dates';
import { consultarConsumoMensal } from '@/features/consumo/consulta';
import { lerTotaisLocais } from '@/features/consumo/sqlite';
import { IndicadorCategoria, IndicadoresConsumo, type EstadoConsumo } from '@/components/consumo/IndicadoresConsumo';
import type { Categoria } from '@/features/categorias/types';

/** Limite do item (RF65/RF66): texto discreto, sem contagem de lançamentos (UC02 futura). */
function textoLimite(c: Categoria): string {
  if (!c.limite_tipo) return 'Sem limite de gastos';
  if (c.limite_tipo === 'valor') return `Limite: ${formatarBRL(c.limite_centavos ?? 0)}`;
  return `Limite: ${centesimosParaTextoPercentual(c.limite_percentual_centesimos ?? 0)} da renda`;
}

function CategoriaItem({ categoria, onPress, indicador }: {
  categoria: Categoria;
  onPress: () => void;
  indicador?: Extract<EstadoConsumo, { tipo: 'pronto' }>['itens'][number];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={estilos.item}
      accessibilityRole="button"
      accessibilityLabel={`Categoria ${categoria.nome}`}
    >
      <View style={estilos.itemLinha}>
        <Text style={estilos.itemNome}>{categoria.nome}</Text>
        {categoria.padrao ? <Text style={estilos.etiqueta}>Padrão</Text> : null}
      </View>
      <Text style={estilos.itemLimite}>{textoLimite(categoria)}</Text>
      {indicador && indicador.status !== 'sem_limite' ? <IndicadorCategoria item={indicador} /> : null}
    </Pressable>
  );
}

/** Fluxo A do UC06: consultar categorias (RF19). */
export default function ListaCategorias() {
  const { itens, carregando, erroLeitura, erroSemeadura, conflitosSemeadura, recarregar } = useCategorias();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [periodo, setPeriodo] = useState(() => ({ mes: hojeISO().slice(0, 7) }));
  const [consumo, setConsumo] = useState<EstadoConsumo>({ tipo: 'carregando' });
  const [ano, mes] = periodo.mes.split('-').map(Number);

  useFocusEffect(useCallback(() => {
    if (carregando || erroLeitura) return;
    let ativo = true;
    setConsumo({ tipo: 'carregando' });
    consultarConsumoMensal(periodo.mes, lerTotaisLocais).then(
      (itens) => { if (ativo) setConsumo({ tipo: 'pronto', itens }); },
      () => { if (ativo) setConsumo({ tipo: 'erro' }); },
    );
    return () => { ativo = false; };
  }, [periodo, carregando, erroLeitura]));

  const indicadores = new Map(consumo.tipo === 'pronto' ? consumo.itens.map((item) => [item.categoriaId, item]) : []);

  function mudarMes(direcao: number) {
    setPeriodo(({ mes }) => ({ mes: adicionarMeses(`${mes}-01`, direcao).slice(0, 7) }));
  }

  // Ao voltar de outra tela: mensagem pendente (uma única vez) e recarrega (EX05).
  useFocusEffect(
    useCallback(() => {
      setFeedback(consumirFeedback());
      void recarregar();
    }, [recarregar]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Categorias</Text>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(c) => c.id}
        contentContainerStyle={estilos.conteudo}
        renderItem={({ item }) => (
          <CategoriaItem
            categoria={item}
            indicador={indicadores.get(item.id)}
            onPress={() => router.push({ pathname: '/categorias/[id]/editar', params: { id: item.id } })}
          />
        )}
        ListHeaderComponent={
          <>
            <View style={estilos.consumo}>
              <Text accessibilityRole="header" style={estilos.itemNome}>Consumo por categoria</Text>
              <View style={estilos.periodo}>
                <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => mudarMes(-1)} hitSlop={8}>
                  <Text style={estilos.mudarMes}>‹</Text>
                </Pressable>
                <Text>{nomeMes(ano, mes)}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => mudarMes(1)} hitSlop={8}>
                  <Text style={estilos.mudarMes}>›</Text>
                </Pressable>
              </View>
              {!erroLeitura && !carregando && consumo.tipo !== 'pronto' ? (
                <IndicadoresConsumo estado={consumo} aoTentarNovamente={() => setPeriodo(({ mes }) => ({ mes }))} />
              ) : null}
            </View>
            {feedback ? (
              <View style={[estilos.banner, feedback.tipo === 'erro' ? estilos.bannerErro : estilos.bannerOk]}>
                <Text style={estilos.bannerTexto}>
                  {feedback.tipo === 'erro' ? '!  ' : '✓  '}
                  {feedback.texto}
                </Text>
              </View>
            ) : null}
            {conflitosSemeadura.length > 0 ? (
              <View style={[estilos.banner, estilos.bannerErro]}>
                <Text style={estilos.bannerTexto}>
                  !  {mensagemConflitoSemeadura(conflitosSemeadura)}
                </Text>
              </View>
            ) : null}
            {erroSemeadura ? (
              <View style={[estilos.banner, estilos.bannerErro]}>
                <Text style={estilos.bannerTexto}>!  {MSG_CAT.falhaSemeadura}</Text>
              </View>
            ) : null}
            {erroLeitura && itens.length > 0 ? (
              // Falha de ATUALIZAÇÃO com dados já carregados: mantém a lista e avisa no banner.
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
        ListFooterComponent={
          itens.length > 0 ? (
            <Text style={estilos.dica}>Toque em uma categoria para consultar, editar o limite ou excluir.</Text>
          ) : undefined
        }
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator color={cores.primaria} style={{ marginTop: 32 }} />
          ) : erroLeitura ? (
            <View style={estilos.vazio}>
              <Text style={estilos.erro}>{MSG_CAT.falhaLeitura}</Text>
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
              <Text style={estilos.vazioTitulo}>Nenhuma categoria</Text>
              <Text style={estilos.vazioTexto}>Toque em + para criar uma categoria.</Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={() => router.push('/categorias/nova')}
        style={estilos.fab}
        accessibilityRole="button"
        accessibilityLabel="Nova categoria"
      >
        <Text style={estilos.fabTexto}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  consumo: { padding: 14, marginBottom: 14, gap: 10, backgroundColor: cores.fundoSuave, borderRadius: raio.cartao },
  periodo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mudarMes: { color: cores.primaria, fontSize: 24, paddingHorizontal: 12 },
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
  itemLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemNome: { fontSize: 15, fontWeight: '700', color: cores.marinho, flexShrink: 1 },
  etiqueta: {
    fontSize: 11,
    fontWeight: '600',
    color: cores.primaria,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.primaria,
    borderRadius: raio.pilula,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemLimite: { fontSize: 13, color: cores.textoSuave, marginTop: 4 },
  dica: { fontSize: 12, color: cores.textoSuave, textAlign: 'center', marginTop: 16 },
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
