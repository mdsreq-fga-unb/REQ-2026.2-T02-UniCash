import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';

export interface OpcaoSegmento<T extends string> {
  valor: T;
  rotulo: string;
  /** Visível, mas sem ação (ex.: trocar o tipo de um lançamento que está sendo editado). */
  inerte?: boolean;
}

interface Props<T extends string> {
  opcoes: OpcaoSegmento<T>[];
  valor: T;
  variante?: 'compacto' | 'pilulas';
  onChange?: (v: T) => void;
}

export function Segmentado<T extends string>({ opcoes, valor, variante, onChange }: Props<T>) {
  const pilulas = variante === 'pilulas';
  const compacto = variante === 'compacto';
  return (
    <View style={[estilos.caixa, pilulas && estilos.caixaPilulas]}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            disabled={o.inerte}
            onPress={() => onChange?.(o.valor)}
            style={[
              estilos.segmento,
              ativo && estilos.ativo,
              compacto && estilos.segmentoCompacto,
              pilulas && estilos.pilula,
              pilulas && ativo && estilos.pilulaAtiva,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
          >
            <Text style={[estilos.texto, ativo && estilos.textoAtivo, pilulas && ativo && estilos.textoPilulaAtiva]}>{o.rotulo}</Text>
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
  caixaPilulas: { backgroundColor: 'transparent', padding: 0, gap: 8 },
  segmentoCompacto: { paddingVertical: 7, borderColor: 'transparent' },
  pilula: { paddingVertical: 5, borderRadius: raio.pilula, borderColor: cores.borda, borderWidth: 1 },
  pilulaAtiva: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  textoPilulaAtiva: { color: cores.branco },
  texto: { color: cores.marinho, fontSize: 14 },
  textoAtivo: { fontWeight: '700' },
});
