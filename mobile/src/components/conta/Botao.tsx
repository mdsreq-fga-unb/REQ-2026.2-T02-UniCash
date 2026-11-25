import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { cores, raio } from '@/lib/theme';

type Tipo = 'primario' | 'contorno' | 'link' | 'perigo';

interface Props {
  rotulo: string;
  onPress: () => void;
  tipo?: Tipo;
  carregando?: boolean;
  desabilitado?: boolean;
  testID?: string;
}

export function Botao({ rotulo, onPress, tipo = 'primario', carregando, desabilitado, testID }: Props) {
  const inativo = desabilitado || carregando;
  const corTexto = tipo === 'primario' || tipo === 'perigo' ? cores.branco : cores.primaria;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      style={[estilos.base, estilos[tipo], inativo && { opacity: 0.6 }]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <Text style={[estilos.texto, { color: corTexto }, tipo === 'link' && estilos.textoLink]}>{rotulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: raio.botao, paddingVertical: 14, minHeight: 48 },
  primario: { backgroundColor: cores.primaria },
  perigo: { backgroundColor: cores.erro },
  contorno: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.primaria },
  link: { paddingVertical: 10, minHeight: 44 },
  texto: { fontSize: 15, fontWeight: '700' },
  textoLink: { fontWeight: '600', fontSize: 14 },
});
