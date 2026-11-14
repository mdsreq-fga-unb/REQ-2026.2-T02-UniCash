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
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={estilos.fundo}>
        <View style={estilos.cartao}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {mensagem ? <Text style={estilos.mensagem}>{mensagem}</Text> : null}
          {opcoes.map((o) => (
            <Pressable
              key={o.rotulo}
              onPress={o.onPress}
              style={[estilos.botao, o.destrutiva ? estilos.botaoDestrutivo : null]}
              accessibilityRole="button"
            >
              <Text style={[estilos.botaoTexto, o.destrutiva ? estilos.botaoTextoDestrutivo : null]}>
                {o.rotulo}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onCancelar} style={estilos.cancelar} accessibilityRole="button">
            <Text style={estilos.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(8,47,73,0.55)', justifyContent: 'center', padding: 24 },
  cartao: { backgroundColor: cores.branco, borderRadius: 16, padding: 20 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho, marginBottom: 6 },
  mensagem: { fontSize: 14, color: cores.textoSuave, marginBottom: 14, lineHeight: 20 },
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
  cancelar: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelarTexto: { color: cores.textoSuave, fontWeight: '600', fontSize: 15 },
});
