import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AcaoTutorial, estilos, TelaTutorial } from '@/components/tutorial/Interface';

export default function ExemploMeta() {
  return (
    <TelaTutorial>
      <Text accessibilityRole="header" style={estilos.titulo}>Nova meta</Text>
      <Text style={estilos.texto}>Veja um exemplo dos dados que você pode usar para criar uma meta.</Text>
      <View style={estilos.cartao}>
        <Text style={estilos.termo}>Nome da meta</Text>
        <Text style={estilos.texto}>Notebook novo</Text>
        <Text style={estilos.termo}>Valor que quero guardar</Text>
        <Text style={estilos.texto}>R$ 2.000,00</Text>
        <Text style={estilos.termo}>Prazo</Text>
        <Text style={estilos.texto}>Em 12 meses</Text>
      </View>
      <AcaoTutorial texto="Voltar ao tutorial" principal onPress={() => router.dismissTo('/tutorial')} />
    </TelaTutorial>
  );
}
