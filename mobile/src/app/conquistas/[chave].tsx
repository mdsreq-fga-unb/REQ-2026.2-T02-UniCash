import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MARCOS } from '@/features/conquistas/config';
import { consultarSelo } from '@/features/conquistas/consulta';
import { MSG } from '@/features/conquistas/mensagens';
import type { Selo } from '@/features/conquistas/types';
import { formatarBR, nomeMes } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { cores, raio } from '@/lib/theme';

type Estado = { status: 'carregando' } | { status: 'pronto'; selo: Selo | null } | { status: 'erro' };

/** UC13 B3: detalhe do selo (protótipo CQ2). */
export default function DetalheSelo() {
  const { chave } = useLocalSearchParams<{ chave: string }>();
  const [estado, setEstado] = useState<Estado>({ status: 'carregando' });

  useEffect(() => {
    let vivo = true;
    consultarSelo(String(chave))
      .then((selo) => vivo && setEstado({ status: 'pronto', selo }))
      .catch(() => vivo && setEstado({ status: 'erro' }));
    return () => {
      vivo = false;
    };
  }, [chave]);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.cabecalho}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={estilos.voltar}>Voltar</Text>
        </Pressable>
        <Text style={estilos.tituloTela} accessibilityRole="header">{MSG.detalheTitulo}</Text>
      </View>
      {estado.status === 'erro' && (
        <View style={estilos.centro}>
          <Text style={estilos.mensagem}>{MSG.erroLeitura}</Text>
          <Text style={estilos.texto}>{MSG.erroLeituraDetalhe}</Text>
        </View>
      )}
      {estado.status === 'pronto' && estado.selo === null && (
        <View style={estilos.centro}>
          <Text style={estilos.mensagem}>{MSG.seloIndisponivel}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={estilos.botao}>
            <Text style={estilos.botaoTexto}>{MSG.voltarConquistas}</Text>
          </Pressable>
        </View>
      )}
      {estado.status === 'pronto' && estado.selo && <Conteudo selo={estado.selo} />}
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

function Conteudo({ selo }: { selo: Selo }) {
  const ref = selo.referencia;
  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <View style={estilos.topo}>
        <Text style={estilos.nome}>{selo.nome}</Text>
        {selo.data && <Text style={estilos.texto}>{MSG.conquistadoEm(formatarBR(selo.data))}</Text>}
      </View>
      <View style={estilos.cartao}>
        <Linha rotulo={MSG.marcoAtingido} valor={MARCOS[selo.marco].marcoAtingido} />
        {ref.tipo === 'mes' ? (
          <>
            <Linha rotulo={MSG.mesReferencia} valor={nomeMesDe(ref.mes)} />
            <Linha rotulo={MSG.receitas} valor={formatarBRL(ref.receitasCentavos)} />
            <Linha rotulo={MSG.despesas} valor={formatarBRL(ref.despesasCentavos)} />
            <Linha rotulo={MSG.saldoMes} valor={formatarBRL(ref.saldoCentavos)} />
          </>
        ) : (
          <>
            <Linha rotulo={MSG.meta} valor={ref.titulo} />
            {selo.data && <Linha rotulo={MSG.concluidaEm} valor={formatarBR(selo.data)} />}
          </>
        )}
      </View>
      {ref.tipo === 'mes' && (
        <>
          <Text style={estilos.texto}>{MSG.incentivoNoVerde(nomeMesDe(ref.mes).toLowerCase())}</Text>
          <Pressable
            accessibilityRole="button"
            style={estilos.botao}
            onPress={() =>
              router.push({ pathname: '/', params: { ano: ref.mes.slice(0, 4), mes: String(Number(ref.mes.slice(5, 7))) } })
            }
          >
            <Text style={estilos.botaoTexto}>{MSG.verResumo}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

/** "2026-10" -> "Outubro/2026" */
function nomeMesDe(mes: string) {
  return nomeMes(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)));
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  voltar: { color: cores.primaria, fontSize: 15, fontWeight: '600' },
  tituloTela: { fontSize: 22, fontWeight: '700', color: cores.marinho },
  conteudo: { padding: 16, gap: 16 },
  topo: { alignItems: 'center', gap: 4 },
  nome: { fontSize: 20, fontWeight: '700', color: cores.marinho, textAlign: 'center' },
  cartao: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 16, gap: 10 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rotulo: { fontSize: 14, color: cores.textoSuave },
  valor: { fontSize: 14, fontWeight: '600', color: cores.marinho, flexShrink: 1, textAlign: 'right' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  mensagem: { fontSize: 16, fontWeight: '600', color: cores.marinho, textAlign: 'center' },
  texto: { fontSize: 14, color: cores.textoSuave, textAlign: 'center' },
  botao: { backgroundColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  botaoTexto: { color: cores.branco, fontWeight: '600', fontSize: 15 },
});
