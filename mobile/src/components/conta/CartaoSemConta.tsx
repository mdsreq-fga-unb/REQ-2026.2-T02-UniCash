import { StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { Botao } from './Botao';

/** Cartão "Seus dados ficam com você" dos protótipos A1 e A2 (RN06: o uso local não exige conta). */
export function CartaoSemConta({ onContinuar }: { onContinuar: () => void }) {
  return (
    <View style={estilos.cartao}>
      <Text style={estilos.titulo}>Seus dados ficam com você</Text>
      <Text style={estilos.texto}>
        Registre e consulte mesmo sem internet. Tudo é salvo primeiro neste dispositivo.
      </Text>
      <Botao rotulo="Continuar sem conta" onPress={onContinuar} testID="continuar-sem-conta" />
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.cartao,
    backgroundColor: cores.branco,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  titulo: { fontSize: 14, fontWeight: '700', color: cores.marinho },
  texto: { fontSize: 13, color: cores.primaria, lineHeight: 18, marginBottom: 6 },
});
