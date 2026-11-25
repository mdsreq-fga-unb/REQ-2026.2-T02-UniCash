import { router } from 'expo-router';
import { Text } from 'react-native';
import { AcaoTutorial, estilos, TelaTutorial } from '@/components/tutorial/Interface';
import { EntradaTutorial } from '@/components/tutorial/EntradaTutorial';

export default function Ajuda() {
  return (
    <TelaTutorial>
      <Text accessibilityRole="header" style={estilos.titulo}>Ajuda</Text>
      <EntradaTutorial texto="Tutorial" />
      <AcaoTutorial texto="Voltar" onPress={() => router.back()} />
    </TelaTutorial>
  );
}
