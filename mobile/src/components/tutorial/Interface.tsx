import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cores, raio } from '@/lib/theme';

export function TelaTutorial({ children, centralizar = true }: { children: ReactNode; centralizar?: boolean }) {
  return (
    <SafeAreaView style={estilos.tela}>
      <ScrollView contentContainerStyle={[estilos.conteudo, centralizar && estilos.centralizado]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AcaoTutorial({ texto, onPress, principal, disabled }: {
  texto: string;
  onPress: () => void;
  principal?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[estilos.botao, principal && estilos.principal, disabled && estilos.desabilitado]}
    >
      <Text style={[estilos.botaoTexto, principal && estilos.principalTexto]}>{texto}</Text>
    </Pressable>
  );
}

export const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, padding: 20, gap: 16 },
  centralizado: { justifyContent: 'center' },
  titulo: { color: cores.marinho, fontSize: 28, fontWeight: '700' },
  texto: { color: cores.textoSuave, fontSize: 16, lineHeight: 24 },
  progresso: { color: cores.primaria, fontWeight: '700', fontSize: 14 },
  cartao: { gap: 8, padding: 16, borderRadius: raio.cartao, backgroundColor: cores.fundoSuave,
    borderWidth: 1, borderColor: cores.borda },
  termo: { color: cores.marinho, fontWeight: '700', fontSize: 16 },
  erro: { color: cores.erro, fontSize: 16 },
  botao: { minHeight: 48, borderRadius: raio.botao, padding: 12, justifyContent: 'center',
    borderWidth: 1, borderColor: cores.primaria },
  botaoTexto: { color: cores.primaria, fontWeight: '700', textAlign: 'center', fontSize: 16 },
  principal: { backgroundColor: cores.primaria },
  principalTexto: { color: cores.branco },
  desabilitado: { opacity: 0.6 },
});
