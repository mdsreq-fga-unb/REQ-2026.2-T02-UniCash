import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Campo } from '@/components/receitas/Campo';
import { cores } from '@/lib/theme';

type Props = Omit<ComponentProps<typeof Campo>, 'secureTextEntry' | 'acao'>;

/** Campo de senha com "Mostrar/Ocultar". Reaproveita o Campo dos formulários existentes. */
export function CampoSenha(props: Props) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visivel}
      acao={
        <Pressable
          onPress={() => setVisivel((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          hitSlop={8}
        >
          <Text style={estilos.mostrar}>{visivel ? 'Ocultar' : 'Mostrar'}</Text>
        </Pressable>
      }
    />
  );
}

const estilos = StyleSheet.create({
  mostrar: { color: cores.primaria, fontSize: 13, fontWeight: '600', marginLeft: 8 },
});
