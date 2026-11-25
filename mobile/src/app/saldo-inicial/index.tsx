
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { SaldoInicialForm } from '@/components/saldoInicial/SaldoInicialForm';
import { useSaldoInicial } from '@/features/saldoInicial/useSaldoInicial';
import { cores, raio } from '@/lib/theme';

// Identificador provisório da base local.
// Não corresponde ao UID do Firebase.
// A integração definitiva será realizada com o UC10.
const UID_LOCAL = 'local';

export default function TelaSaldoInicial() {
  const {
  saldo,
  carregando,
  salvando,
  erro,
  erroConsulta,
  sucesso,
  carregar,
  salvar,
} = useSaldoInicial(UID_LOCAL);

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['top', 'bottom']}
    >
      {carregando ? (
        <View style={estilos.centralizado}>
          <ActivityIndicator
            size="large"
            color={cores.primaria}
          />

          <Text style={estilos.texto}>
            Carregando saldo inicial...
          </Text>
        </View>
      ) : erroConsulta ? (
        <View style={estilos.centralizado}>
          <Text
            style={estilos.erro}
            accessibilityRole="alert"
          >
            {erro}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={estilos.botao}
            onPress={() => void carregar()}
          >
            <Text style={estilos.botaoTexto}>
              Tentar novamente
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Text style={estilos.voltar}>
              Voltar
            </Text>
          </Pressable>
        </View>
      ) : (
        <SaldoInicialForm
          saldo={saldo}
          salvando={salvando}
          erro={erro}
          sucesso={sucesso}
          onSalvar={salvar}
          onCancelar={() => router.back()}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  texto: {
    color: cores.textoSuave,
    fontSize: 15,
    textAlign: 'center',
  },
  erro: {
    color: cores.erro,
    fontSize: 15,
    textAlign: 'center',
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  botaoTexto: {
    color: cores.branco,
    fontWeight: '700',
  },
  voltar: {
    color: cores.primaria,
    fontWeight: '600',
    padding: 12,
  },
});
