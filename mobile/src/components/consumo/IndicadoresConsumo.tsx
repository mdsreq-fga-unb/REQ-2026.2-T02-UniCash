import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConsumoMensal } from '@/features/consumo/consulta';
import { formatarBRL } from '@/features/receitas/money';
import { cores } from '@/lib/theme';

const apresentacao = {
  verde: { cor: '#166534', texto: 'Consumo baixo' },
  amarela: { cor: '#854D0E', texto: 'Atenção' },
  laranja: { cor: '#9A3412', texto: 'Próximo do limite' },
  vermelha: { cor: '#B91C1C', texto: 'Acima de 90% do limite' },
};

const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export type EstadoConsumo = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'pronto'; itens: ConsumoMensal };

type Props = {
  estado: EstadoConsumo;
  exibirSemLimite?: boolean;
  aoTentarNovamente: () => void;
};

export function IndicadoresConsumo({ estado, exibirSemLimite = false, aoTentarNovamente }: Props) {
  if (estado.tipo === 'carregando') return <Text accessibilityRole="progressbar">Calculando consumo…</Text>;
  if (estado.tipo === 'erro') {
    return (
      <View style={styles.lista}>
        <Text accessibilityRole="alert">Não foi possível atualizar o indicador de consumo.</Text>
        <Pressable accessibilityRole="button" onPress={aoTentarNovamente}>
          <Text style={styles.acao}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const itens = estado.itens.filter((item) => exibirSemLimite || item.status !== 'sem_limite');
  if (!itens.length) return <Text>Nenhuma categoria {exibirSemLimite ? 'cadastrada' : 'com limite'}.</Text>;
  return (
    <View style={styles.lista}>
      {itens.map((item) => (
        <View key={item.categoriaId}>
          <Text style={styles.nome}>{item.nome}</Text>
          <IndicadorCategoria item={item} />
        </View>
      ))}
    </View>
  );
}

export function IndicadorCategoria({ item }: { item: ConsumoMensal[number] }) {
  if (item.status !== 'ok') {
    return <Text>{item.status === 'sem_limite' ? 'Sem limite' : 'Limite indisponível'}</Text>;
  }
  const faixa = apresentacao[item.faixa];
  return (
    <>
      <Text style={{ color: faixa.cor }}>
        {percentual.format(item.consumoPercentual)}% · {faixa.texto}
      </Text>
      <Text>{formatarBRL(item.gastoCentavos)} de {formatarBRL(Math.round(item.limiteEfetivoCentavos))}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 12 },
  nome: { color: cores.marinho, fontWeight: '600' },
  acao: { color: cores.primaria, fontWeight: '600' },
});
