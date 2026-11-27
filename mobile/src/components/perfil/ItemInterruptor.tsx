import { StyleSheet, Switch, Text, View } from 'react-native';
import { cores } from '@/lib/theme';

interface Props {
  rotulo: string;
  valor: boolean;
  desabilitado?: boolean;
  onAlternar: () => void;
  /** Seletor estável para os testes E2E (Maestro). */
  testID?: string;
}

export function ItemInterruptor({ rotulo, valor, desabilitado, onAlternar, testID }: Props) {
  return (
    <View style={estilos.item}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Switch
        value={valor}
        testID={testID}
        disabled={desabilitado}
        onValueChange={onAlternar}
        accessibilityRole="switch"
        accessibilityLabel={rotulo}
        accessibilityState={{ checked: valor, disabled: !!desabilitado }}
        trackColor={{ false: cores.borda, true: cores.primaria }}
        thumbColor={cores.branco}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  rotulo: { flex: 1, fontSize: 15, color: cores.marinho },
});
