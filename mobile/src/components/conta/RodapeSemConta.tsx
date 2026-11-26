import { StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';

export function RodapeSemConta() {
  return (
    <View style={estilos.rodape}>
      <Text style={estilos.titulo}>Sem conta, sem cópia na nuvem</Text>
      <Text style={estilos.texto}>
        Exporte seus dados para guardar uma cópia. Você pode criar uma conta depois, em Perfil.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  rodape: { padding: 16, borderTopWidth: 1, borderTopColor: cores.borda, backgroundColor: cores.fundo },
  titulo: { fontSize: 13, fontWeight: '700', color: cores.marinho },
  texto: { fontSize: 12, color: cores.primaria, marginTop: 4, lineHeight: 17 },
});
