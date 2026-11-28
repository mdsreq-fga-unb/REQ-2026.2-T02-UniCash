import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EstadoConsumo } from '@/components/consumo/IndicadoresConsumo';
import { formatarBRL } from '@/features/receitas/money';
import { cores, raio } from '@/lib/theme';

const paleta = [cores.marinho, cores.primaria, '#22C55E', cores.claro, cores.fundoSuave];
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const diametro = 116;
const metade = diametro / 2;

export function GastosPorCategoria({ estado, total, onRelatorios, onTentarNovamente }: {
  estado: EstadoConsumo;
  total: number;
  onRelatorios?: () => void;
  onTentarNovamente: () => void;
}) {
  const gastos = estado.tipo === 'pronto'
    ? estado.itens.filter((item) => item.gastoCentavos > 0).sort((a, b) => b.gastoCentavos - a.gastoCentavos)
    : [];
  const soma = gastos.reduce((valor, item) => valor + item.gastoCentavos, 0);
  const semCategoria = Math.max(0, total - soma);
  const categorias = semCategoria
    ? [...gastos, { categoriaId: null, nome: 'Sem categoria ativa', gastoCentavos: semCategoria }]
    : gastos;
  const relatorio = !onRelatorios;
  const itens = relatorio || categorias.length <= paleta.length ? categorias : [
    ...categorias.slice(0, paleta.length - 1),
    {
      categoriaId: null,
      nome: 'Outras',
      gastoCentavos: categorias.slice(paleta.length - 1).reduce((valor, item) => valor + item.gastoCentavos, 0),
    },
  ];
  const totalExibido = Math.max(soma, total);
  const fatias = itens.map((item, indice) => ({
    ...item,
    proporcao: item.gastoCentavos / totalExibido,
    inicio: relatorio ? 0 : itens.slice(0, indice)
      .reduce((total, anterior) => total + anterior.gastoCentavos, 0) / totalExibido * 360,
    cor: paleta[indice % paleta.length],
  }));

  return (
    <View style={estilos.cartao}>
      <View style={estilos.topo}>
        <Text accessibilityRole="header" style={estilos.titulo}>
          {relatorio ? 'Despesas por categoria' : 'Gastos por categoria'}
        </Text>
        {onRelatorios && (
          <Pressable accessibilityRole="button" onPress={onRelatorios} hitSlop={8}>
            <Text style={estilos.link}>Relatórios ›</Text>
          </Pressable>
        )}
      </View>
      {estado.tipo === 'erro' ? (
        <>
          <Text accessibilityRole="alert" style={estilos.texto}>Não foi possível carregar os gastos por categoria.</Text>
          <Pressable accessibilityRole="button" onPress={onTentarNovamente}>
            <Text style={estilos.link}>Tentar novamente</Text>
          </Pressable>
        </>
      ) : estado.tipo === 'carregando' ? (
        <Text style={estilos.texto}>Calculando gastos…</Text>
      ) : fatias.length === 0 ? (
        <Text style={estilos.texto}>Nenhuma despesa neste mês.</Text>
      ) : relatorio ? (
        <>
          <Text style={estilos.total}>Total: {formatarBRL(totalExibido)}</Text>
          {fatias.map(({ nome, proporcao, gastoCentavos }, indice) => (
            <View key={`${indice}:${nome}`} style={estilos.categoria}>
              <View style={estilos.linhaRelatorio}>
                <Text style={[estilos.texto, estilos.nome]}>{nome}</Text>
                <Text style={estilos.texto}>{formatarBRL(gastoCentavos)}</Text>
                <Text style={estilos.percentual}>{percentual.format(proporcao)}</Text>
              </View>
              <View style={estilos.trilha}>
                <View style={[estilos.barra, { width: `${proporcao * 100}%` }]} />
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={estilos.dados}>
          <View style={estilos.disco} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {fatias.map(({ nome, cor, proporcao, inicio }, indice) => {
              const angulo = proporcao * 360;
              return (
                <View key={`${indice}:${nome}`} style={StyleSheet.absoluteFill}>
                  <MeiaFatia cor={cor} inicio={inicio} angulo={Math.min(180, angulo)} />
                  {angulo > 180 ? <MeiaFatia cor={cor} inicio={inicio + 180} angulo={angulo - 180} /> : null}
                </View>
              );
            })}
          </View>
          <View style={estilos.legenda}>
            {fatias.map(({ nome, cor, proporcao }, indice) => (
              <View key={`${indice}:${nome}`} style={estilos.linha}>
                <View style={[estilos.marcador, { backgroundColor: cor }]} />
                <Text style={[estilos.texto, estilos.nome]}>{nome}</Text>
                <Text style={estilos.texto}>{percentual.format(proporcao)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/** A metade direita da máscara recorta o semicírculo girado em até 180°. */
function MeiaFatia({ cor, inicio, angulo }: { cor: string; inicio: number; angulo: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${inicio}deg` }] }]}>
      <View style={estilos.mascara}>
        <View style={[estilos.giro, { transform: [{ rotate: `${angulo}deg` }] }]}>
          <View style={[estilos.semicirculo, { backgroundColor: cor }]} />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { borderRadius: raio.cartao, borderWidth: 1, borderColor: cores.borda, padding: 14, gap: 10, marginBottom: 12 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  titulo: { color: cores.marinho, fontWeight: '700', fontSize: 15 },
  link: { color: cores.primaria, fontWeight: '600', fontSize: 13 },
  texto: { color: cores.marinho, fontSize: 13 },
  total: { color: cores.marinho, fontSize: 20, fontWeight: '700' },
  categoria: { gap: 4 },
  linhaRelatorio: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  percentual: { minWidth: 40, textAlign: 'right', color: cores.marinho, fontSize: 13, fontWeight: '600' },
  trilha: { height: 8, backgroundColor: cores.claro, borderRadius: 4, overflow: 'hidden' },
  barra: { height: 8, backgroundColor: cores.primaria, borderRadius: 4 },
  dados: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  disco: { width: diametro, height: diametro },
  mascara: { position: 'absolute', left: metade, width: metade, height: diametro, overflow: 'hidden' },
  giro: { position: 'absolute', left: -metade, width: diametro, height: diametro },
  semicirculo: { width: metade, height: diametro, borderTopLeftRadius: metade, borderBottomLeftRadius: metade },
  legenda: { flex: 1, minWidth: 128, gap: 5 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nome: { flex: 1 },
  marcador: { width: 10, height: 10, borderRadius: 2 },
});
