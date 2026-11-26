import { Modal, StyleSheet, Text, View } from 'react-native';
import { cores } from '@/lib/theme';
import { Aviso } from './Aviso';
import { Botao } from './Botao';

export interface AcaoDialogo {
  rotulo: string;
  onPress: () => void;
  tipo?: 'primario' | 'contorno' | 'link' | 'perigo';
  carregando?: boolean;
}

interface Props {
  visivel: boolean;
  titulo: string;
  texto: string;
  erro?: string | null;
  acoes: AcaoDialogo[];
  onFechar?: () => void;
  testID?: string;
}

/** Diálogo de decisão: enviar dados do aparelho (E5) e alterações pendentes ao sair (FA03). */
export function DialogoConta({ visivel, titulo, texto, erro, acoes, onFechar, testID }: Props) {
  return (
    <Modal testID={testID} visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <View style={estilos.cartao}>
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          <Text style={estilos.texto}>{texto}</Text>
          {erro ? <Aviso tipo="erro" texto={erro} /> : null}
          <View style={{ gap: 4 }}>
            {acoes.map((a) => (
              <Botao key={a.rotulo} rotulo={a.rotulo} onPress={a.onPress} tipo={a.tipo} carregando={a.carregando} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(8,47,73,0.55)', justifyContent: 'center', padding: 24 },
  cartao: { backgroundColor: cores.branco, borderRadius: 16, padding: 20 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho, marginBottom: 8 },
  texto: { fontSize: 14, color: cores.textoSuave, lineHeight: 20, marginBottom: 16 },
});
