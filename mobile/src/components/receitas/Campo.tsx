import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { cores } from '@/lib/theme';

interface Props extends TextInputProps {
  rotulo: string;
  erro?: string;
  prefixo?: string;
  acao?: React.ReactNode;
}

export function Campo({ rotulo, erro, prefixo, acao, style, ...rest }: Props) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={[estilos.entrada, erro ? estilos.entradaErro : null]}>
        {prefixo ? <Text style={estilos.prefixo}>{prefixo}</Text> : null}
        <TextInput
          style={[estilos.input, style]}
          placeholderTextColor="#94A3B8"
          accessibilityLabel={rotulo}
          {...rest}
        />
        {acao}
      </View>
      {erro ? (
        <Text style={estilos.erro} accessibilityRole="alert">
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { marginBottom: 16 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.marinho, marginBottom: 6 },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: cores.borda,
    borderRadius: 12,
    backgroundColor: cores.branco,
    paddingHorizontal: 14,
  },
  entradaErro: { borderColor: cores.erro },
  prefixo: { fontSize: 16, color: cores.textoSuave, marginRight: 6 },
  input: { flex: 1, fontSize: 16, color: cores.marinho, paddingVertical: 12 },
  erro: { color: cores.erro, fontSize: 13, marginTop: 4 },
});
