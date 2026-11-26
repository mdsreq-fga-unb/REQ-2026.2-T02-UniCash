import { StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';

interface Props {
  tipo: 'erro' | 'sucesso' | 'info';
  texto: string;
}

export function Aviso({ tipo, texto }: Props) {
  const cor = tipo === 'erro' ? cores.erro : tipo === 'sucesso' ? cores.sucesso : cores.primaria;
  return (
    <View
      style={[estilos.caixa, { borderColor: cor }]}
      accessibilityRole={tipo === 'erro' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Text style={[estilos.texto, { color: tipo === 'info' ? cores.marinho : cor }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    borderWidth: 1,
    borderRadius: raio.campo,
    backgroundColor: cores.fundoSuave,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  texto: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
