import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cores } from '@/lib/theme';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /** Área fixa abaixo do conteúdo (ex.: RodapeSemConta). */
  rodape?: ReactNode;
  onVoltar?: () => void;
}

/** Estrutura comum das telas do UC10: marca, título, conteúdo rolável e rodapé fixo. */
export function TelaConta({ titulo, subtitulo, children, rodape, onVoltar }: Props) {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.topo}>
            {onVoltar ? (
              <Pressable onPress={onVoltar} accessibilityRole="button" accessibilityLabel="Voltar" style={estilos.voltar}>
                <Text style={estilos.voltarTexto}>‹</Text>
              </Pressable>
            ) : null}
            <Text style={estilos.marca}>UniCash</Text>
          </View>
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
          {children}
        </ScrollView>
        {rodape}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  voltar: { paddingRight: 12 },
  voltarTexto: { fontSize: 30, color: cores.primaria, fontWeight: '700', lineHeight: 32 },
  marca: { fontSize: 15, fontWeight: '700', color: cores.marinho },
  titulo: { fontSize: 22, fontWeight: '700', color: cores.marinho, marginBottom: 6 },
  subtitulo: { fontSize: 14, color: cores.primaria, lineHeight: 20, marginBottom: 18 },
});
