import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CartaoPontos } from '@/components/conquistas/CartaoPontos';
import { ItemPontuacao } from '@/components/conquistas/ItemPontuacao';
import { ItemSelo } from '@/components/conquistas/ItemSelo';
import { avaliarEEmitir } from '@/features/conquistas/emissao';
import { MSG } from '@/features/conquistas/mensagens';
import { useConquistas } from '@/features/conquistas/useConquistas';
import { useSessao } from '@/features/conta/sessao';
import { cores, raio } from '@/lib/theme';

/** UC13 fluxo B: área "Conquistas" (protótipo CQ1, CQ3, CQ4 e CQ6). */
export default function Conquistas() {
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const sessao = useSessao();
  const donoAtual = sessao.status === 'ativa' ? sessao.uid : null;
  // EX04 (RNF03): só o próprio usuário vê as conquistas; os dados já vêm do banco do dono.
  const negado = !!uid && uid !== donoAtual;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.cabecalho}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={estilos.voltar}>Voltar</Text>
        </Pressable>
        <Text style={estilos.tituloTela} accessibilityRole="header">{MSG.titulo}</Text>
      </View>
      {negado ? <AcessoNegado /> : <ConteudoConquistas />}
    </SafeAreaView>
  );
}

function ConteudoConquistas() {
  const { estado, recarregar } = useConquistas();

  // Reavalia ao abrir a área, para que um selo novo seja notificado na mesma sessão (SC-004).
  useFocusEffect(
    useCallback(() => {
      void avaliarEEmitir();
    }, []),
  );

  if (estado.status === 'carregando') return null;

  if (estado.status === 'erro') {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.mensagem}>{MSG.erroLeitura}</Text>
        <Text style={estilos.detalhe}>{MSG.erroLeituraDetalhe}</Text>
        <Pressable accessibilityRole="button" onPress={recarregar} style={estilos.botao}>
          <Text style={estilos.botaoTexto}>{MSG.tentarNovamente}</Text>
        </Pressable>
      </View>
    );
  }

  const { resumo } = estado;
  const semNada = resumo.selos.length === 0 && resumo.pontuacoes.length === 0;

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <CartaoPontos total={resumo.totalPontos} metas={resumo.metasConcluidas} pontosPorMeta={resumo.pontosPorMeta} />

      {semNada ? (
        <View style={estilos.vazio}>
          <Text style={estilos.mensagem}>{MSG.vazio}</Text>
          <Text style={estilos.detalhe}>{MSG.vazioIncentivo}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/metas')} style={estilos.botao}>
            <Text style={estilos.botaoTexto}>{MSG.verMetas}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {resumo.selos.length > 0 && (
            <View>
              <Text style={estilos.secao} accessibilityRole="header">{MSG.selosConquistados(resumo.selos.length)}</Text>
              {resumo.selos.map((s) => (
                <ItemSelo key={s.chave} selo={s} />
              ))}
            </View>
          )}
          {resumo.pontuacoes.length > 0 && (
            <View>
              <Text style={estilos.secao} accessibilityRole="header">{MSG.pontosPorMeta}</Text>
              {resumo.pontuacoes.map((p) => (
                <ItemPontuacao key={p.metaId} pontuacao={p} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function AcessoNegado() {
  return (
    <View style={estilos.centro}>
      <Text style={estilos.mensagem}>{MSG.acessoNegado}</Text>
      <Text style={estilos.detalhe}>{MSG.acessoNegadoDetalhe}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/conquistas')} style={estilos.botao}>
        <Text style={estilos.botaoTexto}>{MSG.irParaMinhas}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  voltar: { color: cores.primaria, fontSize: 15, fontWeight: '600' },
  tituloTela: { fontSize: 22, fontWeight: '700', color: cores.marinho },
  conteudo: { padding: 16, gap: 20 },
  secao: { fontSize: 17, fontWeight: '700', color: cores.marinho, marginBottom: 4 },
  vazio: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  mensagem: { fontSize: 16, fontWeight: '600', color: cores.marinho, textAlign: 'center' },
  detalhe: { fontSize: 14, color: cores.textoSuave, textAlign: 'center' },
  botao: { marginTop: 8, backgroundColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 12, paddingHorizontal: 20 },
  botaoTexto: { color: cores.branco, fontWeight: '600', fontSize: 15 },
});
