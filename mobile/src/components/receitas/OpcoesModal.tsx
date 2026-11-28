import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';

export interface Opcao {
  rotulo: string;
  onPress: () => void;
  destrutiva?: boolean;
}

interface Props {
  visivel: boolean;
  titulo: string;
  mensagem?: string;
  opcoes: Opcao[];
  onCancelar: () => void;
}

/** Diálogo genérico: pergunta de alcance (FA08) e confirmação de exclusão. */
export function OpcoesModal({ visivel, titulo, mensagem, opcoes, onCancelar }: Props) {
  const confirmacaoSimples = opcoes.length === 1 && opcoes[0].destrutiva;
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={estilos.fundo}>
        <View style={estilos.cartao}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {mensagem ? <Text style={estilos.mensagem}>{mensagem}</Text> : null}
          <View style={confirmacaoSimples && estilos.acoes}>
            {confirmacaoSimples && (
              <Pressable onPress={onCancelar} style={estilos.cancelarConfirmacao} accessibilityRole="button">
                <Text style={estilos.cancelarConfirmacaoTexto}>Cancelar</Text>
              </Pressable>
            )}
            {opcoes.map((o) => (
              <Pressable
                key={o.rotulo}
                onPress={o.onPress}
                style={[
                  estilos.botao,
                  o.destrutiva && estilos.botaoDestrutivo,
                  confirmacaoSimples && estilos.confirmar,
                ]}
                accessibilityRole="button"
              >
                <Text style={[estilos.botaoTexto, o.destrutiva && estilos.botaoTextoDestrutivo]}>
                  {o.rotulo}
                </Text>
              </Pressable>
            ))}
            {!confirmacaoSimples && (
              <Pressable onPress={onCancelar} style={estilos.cancelar} accessibilityRole="button">
                <Text style={estilos.cancelarTexto}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(8,47,73,0.44)', justifyContent: 'center', padding: 24 },
  cartao: { backgroundColor: cores.branco, borderRadius: 14, padding: 20 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho, marginBottom: 6 },
  mensagem: { fontSize: 14, color: cores.primaria, marginBottom: 18, lineHeight: 20 },
  botao: {
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoDestrutivo: { backgroundColor: cores.erro, borderColor: cores.erro },
  botaoTexto: { color: cores.primaria, fontWeight: '600', fontSize: 15 },
  botaoTextoDestrutivo: { color: cores.branco },
  acoes: { flexDirection: 'row', gap: 10 },
  confirmar: {
    flex: 1, backgroundColor: cores.primaria, borderColor: cores.primaria, borderRadius: 8, marginTop: 0,
  },
  cancelarConfirmacao: {
    flex: 1, borderWidth: 1, borderColor: cores.borda, borderRadius: 8,
    minHeight: 46, alignItems: 'center', justifyContent: 'center',
  },
  cancelarConfirmacaoTexto: { color: cores.marinho, fontSize: 15, fontWeight: '600' },
  cancelar: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelarTexto: { color: cores.textoSuave, fontWeight: '600', fontSize: 15 },
});
