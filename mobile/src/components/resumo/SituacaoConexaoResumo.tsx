import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { IconePrototipo } from '@/components/IconePrototipo';
import type { EstadoSincronizacao } from '@/features/sincronizacao/contrato';
import { cores, raio } from '@/lib/theme';

export function SituacaoConexaoResumo({ estado }: { estado: EstadoSincronizacao | null }) {
  if (!estado || estado.status !== 'sem-conexao') return null;

  const quantidade = estado.quantidadePendencias;
  const pendencias = quantidade === 1 ? ' 1 alteração aguarda sincronização.'
    : quantidade > 1 ? ` ${quantidade} alterações aguardam sincronização.` : '';

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/sincronizacao')} style={estilos.aviso}>
      <IconePrototipo nome="offline" tamanho={20} />
      <View style={estilos.conteudo}>
        <Text style={estilos.titulo}>Você está offline</Text>
        <Text style={estilos.mensagem}>Consultar e registrar continuam funcionando.{pendencias}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row', gap: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: cores.primaria,
    borderRadius: raio.cartao, backgroundColor: cores.fundoSuave,
  },
  conteudo: { flex: 1 },
  titulo: { color: cores.marinho, fontWeight: '700', fontSize: 13 },
  mensagem: { color: cores.primaria, fontSize: 12 },
});
