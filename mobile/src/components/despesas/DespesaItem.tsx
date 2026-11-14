import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { formatarBR } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import type { Despesa } from '@/features/despesas/types';

export function DespesaItem({
  despesa,
  onPress,
}: {
  despesa: Despesa;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={estilos.linha} accessibilityRole="button">
      <View style={estilos.avatar}>
        <Text style={estilos.avatarTexto}>
          {despesa.titulo.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={estilos.meio}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {despesa.titulo}
        </Text>

        <Text style={estilos.sub}>
          Despesa · {formatarBR(despesa.data)}
          {despesa.recorrencia_id ? ' · Recorrente' : ''}
        </Text>

        {despesa.fixa_ou_variavel ? (
          <Text style={estilos.classificacao}>
            {despesa.fixa_ou_variavel === 'fixa' ? 'Fixa' : 'Variável'}
            {despesa.essencial !== null
              ? despesa.essencial === 1
                ? ' · Essencial'
                : ' · Não essencial'
              : ''}
          </Text>
        ) : null}

        {despesa.sync_status === 'pendente' ? (
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>Sincronização pendente</Text>
          </View>
        ) : null}
      </View>

      <Text style={estilos.valor}>− {formatarBRL(despesa.valor_centavos)}</Text>
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
  avatarTexto: {
    color: cores.marinho,
    fontWeight: '700',
    fontSize: 13,
  },
  meio: { flex: 1 },
  titulo: { fontSize: 14, fontWeight: '600', color: cores.marinho },
  sub: { fontSize: 12, color: cores.textoSuave, marginTop: 2 },
  classificacao: { fontSize: 11, color: cores.textoSuave, marginTop: 3 },
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
  valor: {
    fontSize: 14,
    fontWeight: '700',
    color: cores.erro,
    marginLeft: 8,
  },
  seta: { fontSize: 20, color: cores.primaria, marginLeft: 6 },
});