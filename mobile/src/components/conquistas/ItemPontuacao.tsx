import { StyleSheet, Text, View } from 'react-native';
import { formatarBR } from '@/features/receitas/dates';
import type { PontuacaoMeta } from '@/features/conquistas/types';
import { cores } from '@/lib/theme';

/** Linha de "Pontos por meta concluída" [CQ1]. */
export function ItemPontuacao({ pontuacao }: { pontuacao: PontuacaoMeta }) {
  return (
    <View style={estilos.item}>
      {pontuacao.concluidaEm && <Text style={estilos.data}>{formatarBR(pontuacao.concluidaEm)}</Text>}
      <Text style={estilos.texto}>{`${pontuacao.titulo} · +${pontuacao.pontos}`}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  item: { paddingVertical: 8, gap: 2, borderBottomWidth: 1, borderColor: cores.borda },
  data: { fontSize: 13, color: cores.textoSuave },
  texto: { fontSize: 15, color: cores.marinho },
});
