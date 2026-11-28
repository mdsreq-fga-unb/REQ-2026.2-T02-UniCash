import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import type { Receita } from '@/features/receitas/types';

export function ReceitaItem({ receita, onPress, compacto = false }: {
  receita: Receita;
  onPress: () => void;
  compacto?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[estilos.linha, compacto && estilos.linhaCompacta]} accessibilityRole="button">
      <View style={[estilos.avatar, compacto && estilos.avatarCompacto]}>
        <Text style={estilos.avatarTexto}>{receita.titulo.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={estilos.meio}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {receita.titulo}
        </Text>
        <Text style={[estilos.sub, compacto && estilos.subCompacto]}>
          Receita · {formatarBR(receita.data)}
          {receita.recorrencia_id ? ' · Recorrente' : ''}
        </Text>
        {(!compacto || receita.sync_status === 'pendente') && (
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>
              {receita.sync_status === 'pendente' ? 'Sincronização pendente' : 'Sincronizado'}
            </Text>
          </View>
        )}
      </View>
      <Text style={estilos.valor}>+ {formatarBRL(receita.valor_centavos)}</Text>
      {!compacto && <Text style={estilos.seta}>›</Text>}
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
  linhaCompacta: { minHeight: 59, borderBottomColor: cores.borda, paddingVertical: 10 },
  avatarCompacto: { width: 36, height: 36, borderRadius: 18 },
  subCompacto: { color: cores.primaria },
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
