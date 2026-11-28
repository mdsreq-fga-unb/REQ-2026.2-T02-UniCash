import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconePrototipo } from '@/components/IconePrototipo';
import { cores } from '@/lib/theme';

const abas = [
  { rota: '/', rotulo: 'Resumo', icone: 'resumo' },
  { rota: '/movimentacoes', rotulo: 'Movimentações', icone: 'movimentacoes' },
  { rota: '/metas', rotulo: 'Metas', icone: 'metas' },
  { rota: '/perfil', rotulo: 'Perfil', icone: 'perfil' },
] as const;

export function MenuInferior() {
  const caminho = usePathname();
  if (!abas.some(({ rota }) => rota === caminho)) return null;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={estilos.menu}>
      {abas.map(({ rota, rotulo, icone }) => {
        const ativa = rota === caminho;
        return (
          <Pressable
            key={rota}
            accessibilityRole="tab"
            accessibilityLabel={rotulo}
            accessibilityState={{ selected: ativa }}
            onPress={() => {
              if (ativa) return;
              if (rota === '/') router.dismissTo('/');
              else if (caminho === '/') router.push(rota);
              else router.replace(rota);
            }}
            style={estilos.aba}
          >
            <IconePrototipo nome={icone} />
            <Text style={[estilos.rotulo, ativa && estilos.ativa]}>{rotulo}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  menu: {
    flexDirection: 'row', backgroundColor: cores.fundo,
    borderTopColor: cores.borda, borderTopWidth: 1,
  },
  aba: { flex: 1, minHeight: 63, gap: 5, padding: 4, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 9, color: cores.primaria, textAlign: 'center' },
  ativa: { fontWeight: '700', color: cores.marinho },
});
