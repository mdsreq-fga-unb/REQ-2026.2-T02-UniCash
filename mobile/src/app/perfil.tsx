import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SecaoNotificacoes } from '@/components/perfil/SecaoNotificacoes';
import { useSessao } from '@/features/conta/sessao';
import { cores, raio } from '@/lib/theme';

/** Tela de Perfil (protótipo 06). Nesta entrega: cabeçalho do usuário e seção "Notificações" (UC14, D25). */
export default function Perfil() {
  const sessao = useSessao();
  const chave = sessao.status === 'ativa' ? sessao.uid : 'local';

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={estilos.voltar}>Voltar</Text>
          </Pressable>
          <Text style={estilos.tituloTela} accessibilityRole="header">Perfil</Text>
        </View>

        <View style={estilos.cartao}>
          <Text style={estilos.usuario}>{sessao.status === 'ativa' ? sessao.email : 'Usando sem conta'}</Text>
        </View>

        {/* A chave recarrega as preferências quando o dono muda (RNF03). */}
        <SecaoNotificacoes key={chave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, gap: 16 },
  cabecalho: { gap: 8 },
  voltar: { color: cores.primaria, fontSize: 15, fontWeight: '600' },
  tituloTela: { fontSize: 22, fontWeight: '700', color: cores.marinho },
  cartao: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 16 },
  usuario: { fontSize: 15, color: cores.marinho },
});
