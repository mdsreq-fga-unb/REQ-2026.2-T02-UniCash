import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';

export interface OpcaoSegmento<T extends string> {
  valor: T;
  rotulo: string;
  /** Visível, mas sem ação (ex.: Despesa, fora do escopo deste caso de uso). */
  inerte?: boolean;
}

interface Props<T extends string> {
  opcoes: OpcaoSegmento<T>[];
  valor: T;
  onChange?: (v: T) => void;
}

export function Segmentado<T extends string>({ opcoes, valor, onChange }: Props<T>) {
  return (
    <View style={estilos.caixa}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            disabled={o.inerte}
            onPress={() => onChange?.(o.valor)}
            style={[estilos.segmento, ativo && estilos.ativo]}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
          >
            <Text style={[estilos.texto, ativo && estilos.textoAtivo]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { flexDirection: 'row', backgroundColor: cores.claro, borderRadius: raio.campo, padding: 3 },
  segmento: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: raio.campo - 2, borderWidth: 1.5, borderColor: 'transparent' },
  ativo: { backgroundColor: cores.branco, borderColor: cores.primaria },
  texto: { color: cores.marinho, fontSize: 14 },
  textoAtivo: { fontWeight: '700' },
});
