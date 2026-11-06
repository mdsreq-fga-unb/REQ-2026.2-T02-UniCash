import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';
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
          {formatarBR(receita.data)}
          {receita.recorrencia_id ? ' · Recorrente' : ''}
        </Text>
        {receita.sync_status === 'pendente' ? <Text style={estilos.pendente}>● Pendente de sincronização</Text> : null}
      </View>
      <Text style={estilos.valor}>+ {formatarBRL(receita.valor_centavos)}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cores.branco,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.claro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTexto: { color: cores.marinho, fontWeight: '700', fontSize: 16 },
  meio: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: '600', color: cores.marinho },
  sub: { fontSize: 13, color: cores.textoSuave, marginTop: 2 },
  pendente: { fontSize: 12, color: cores.primaria, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '700', color: cores.sucesso, marginLeft: 8 },
});
