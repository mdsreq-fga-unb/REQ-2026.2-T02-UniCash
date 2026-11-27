import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Selo } from '@/features/conquistas/types';
import { cores, raio } from '@/lib/theme';

/** "2026-10-31" -> "31/10" */
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Item da lista "Selos conquistados" [CQ1]; abre o detalhe [CQ2]. */
export function ItemSelo({ selo }: { selo: Selo }) {
  const data = selo.data ? diaMes(selo.data) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={data ? `${selo.nome}, ${data}` : selo.nome}
      onPress={() => router.push({ pathname: '/conquistas/[chave]', params: { chave: selo.chave } })}
      style={estilos.item}
    >
      <View style={estilos.icone}>
        <Text style={estilos.iconeTexto}>★</Text>
      </View>
      <View style={estilos.textos}>
        <Text style={estilos.nome}>{selo.nome}</Text>
        <Text style={estilos.descricao}>{selo.descricao}</Text>
      </View>
      {data && <Text style={estilos.data}>{data}</Text>}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: cores.borda },
  icone: { width: 36, height: 36, borderRadius: raio.pilula, backgroundColor: cores.claro, alignItems: 'center', justifyContent: 'center' },
  iconeTexto: { fontSize: 18, color: cores.marinho },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: 15, fontWeight: '600', color: cores.marinho },
  descricao: { fontSize: 13, color: cores.textoSuave },
  data: { fontSize: 13, color: cores.textoSuave },
});
