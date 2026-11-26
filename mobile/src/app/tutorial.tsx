import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { cores, raio } from '@/lib/theme';

/** Placeholder do tutorial inicial (RF55), usado pelo estado vazio do resumo (UC03 FA02). */
export default function Tutorial() {
  return (
    <View style={estilos.tela}>
      <Text style={estilos.titulo}>Tutorial</Text>
      <Text style={estilos.texto}>Tutorial em breve.</Text>
      <Pressable onPress={() => router.back()} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Voltar</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo, padding: 20, gap: 12 },
  titulo: { fontSize: 20, fontWeight: '700', color: cores.marinho },
  texto: { fontSize: 14, color: cores.textoSuave, textAlign: 'center' },
  botao: { backgroundColor: cores.primaria, borderRadius: raio.botao, paddingVertical: 12, paddingHorizontal: 24 },
  botaoTexto: { color: cores.branco, fontWeight: '700' },
});
