import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import type { Receita } from '@/features/receitas/types';

export function ReceitaItem({ receita, onPress }: { receita: Receita; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={estilos.linha} accessibilityRole="button">
      <View style={estilos.avatar}>
        <Text style={estilos.avatarTexto}>{receita.titulo.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={estilos.meio}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {receita.titulo}
        </Text>
        <Text style={estilos.sub}>
          Receita · {formatarBR(receita.data)}
          {receita.recorrencia_id ? ' · Recorrente' : ''}
        </Text>
        {receita.sync_status === 'pendente' ? (
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>Sincronização pendente</Text>
          </View>
        ) : null}
      </View>
      <Text style={estilos.valor}>+ {formatarBRL(receita.valor_centavos)}</Text>
      <Text style={estilos.seta}>›</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTexto: { color: cores.marinho, fontWeight: '700', fontSize: 13 },
  meio: { flex: 1 },
  titulo: { fontSize: 14, fontWeight: '600', color: cores.marinho },
  sub: { fontSize: 12, color: cores.textoSuave, marginTop: 2 },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.primaria,
    borderRadius: raio.pilula,
    paddingHorizontal: 8,
    paddingVertical: 1,
    marginTop: 4,
  },
  chipTexto: { fontSize: 10, color: cores.primaria },
  valor: { fontSize: 14, fontWeight: '700', color: cores.sucesso, marginLeft: 8 },
  seta: { fontSize: 20, color: cores.primaria, marginLeft: 6 },
});
