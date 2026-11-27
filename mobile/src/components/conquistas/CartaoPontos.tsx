import { StyleSheet, Text, View } from 'react-native';
import { MSG } from '@/features/conquistas/mensagens';
import { cores, raio } from '@/lib/theme';

/** Cartão "Total de pontos" do protótipo [CQ1]. */
export function CartaoPontos({ total, metas, pontosPorMeta }: { total: number; metas: number; pontosPorMeta: number }) {
  return (
    <View style={estilos.cartao} accessible accessibilityLabel={`${MSG.totalPontos}: ${total}`}>
      <Text style={estilos.rotulo}>{MSG.totalPontos}</Text>
      <Text style={estilos.total}>{String(total)}</Text>
      <Text style={estilos.detalhe}>{MSG.resumoMetas(metas, pontosPorMeta)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: cores.fundoSuave, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 16, gap: 4 },
  rotulo: { fontSize: 14, color: cores.textoSuave },
  total: { fontSize: 32, fontWeight: '700', color: cores.marinho },
  detalhe: { fontSize: 14, color: cores.textoSuave },
});
