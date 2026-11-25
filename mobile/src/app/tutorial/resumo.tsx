import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AcaoTutorial, estilos, TelaTutorial } from '@/components/tutorial/Interface';

export default function ExemploResumo() {
  return (
    <TelaTutorial>
      <Text accessibilityRole="header" style={estilos.titulo}>Resumo financeiro</Text>
      <Text style={estilos.texto}>Exemplo de um mês sem lançamentos.</Text>
      <View style={estilos.cartao}>
        <Text style={estilos.termo}>Saldo do mês</Text>
        <Text style={estilos.titulo}>R$ 0,00</Text>
        <Text style={estilos.texto}>Quanto entrou menos quanto saiu.</Text>
      </View>
      <View style={estilos.cartao}>
        <Text style={estilos.termo}>Receitas · R$ 0,00</Text>
        <Text style={estilos.texto}>Tudo que entrou no mês.</Text>
        <Text style={estilos.termo}>Despesas · R$ 0,00</Text>
        <Text style={estilos.texto}>Tudo que saiu no mês.</Text>
      </View>
      <AcaoTutorial texto="Voltar ao tutorial" principal onPress={() => router.dismissTo('/tutorial')} />
    </TelaTutorial>
  );
}
