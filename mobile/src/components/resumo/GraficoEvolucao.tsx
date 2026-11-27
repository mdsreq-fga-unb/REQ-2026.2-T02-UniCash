import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, raio } from '@/lib/theme';
import { nomeMes } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import type { EvolucaoMensal, MesDoGrafico } from '@/features/evolucao/service';

const ALTURA_BARRAS = 120;
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Props {
  evolucao: EvolucaoMensal;
  selecionado: { ano: number; mes: number };
  onSelecionar: (mes: { ano: number; mes: number }) => void;
}

/** Altura proporcional ao maior valor da janela; valores positivos ficam sempre visíveis. */
function altura(centavos: number, maximo: number): number {
  if (centavos <= 0 || maximo <= 0) return 0;
  return Math.max(2, Math.round((centavos / maximo) * ALTURA_BARRAS));
}

/**
 * Gráfico de barras da evolução mensal (UC07, RF68): receitas e despesas de cada mês da janela.
 * Cada mês é um botão: tocar seleciona o mês, que é o mesmo do resumo (passos 5 e 6).
 * Barras nas cores da paleta (RNF38); valores também no rótulo de acessibilidade e no detalhe.
 */
export function GraficoEvolucao({ evolucao, selecionado, onSelecionar }: Props) {
  const maximo = Math.max(0, ...evolucao.meses.flatMap((m) => [m.receitasCentavos, m.despesasCentavos]));
  const doSelecionado = evolucao.meses.find((m) => m.ano === selecionado.ano && m.mes === selecionado.mes);

  return (
    <View>
      <View style={estilos.legenda}>
        <Legenda cor={cores.graficoReceita} rotulo="Receitas" />
        <Legenda cor={cores.graficoDespesa} rotulo="Despesas" />
      </View>

      <View style={estilos.grafico}>
        {evolucao.meses.map((m, i) => {
          const ativo = m === doSelecionado;
          return (
            <Pressable
              key={`${m.ano}-${m.mes}`}
              onPress={() => onSelecionar({ ano: m.ano, mes: m.mes })}
              style={[estilos.coluna, ativo && estilos.colunaAtiva]}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={rotuloAcessivel(m)}
              testID={`barra-${m.ano}-${m.mes}`}
            >
              <View style={estilos.barras}>
                <View
                  style={[estilos.barra, { height: altura(m.receitasCentavos, maximo), backgroundColor: cores.graficoReceita }]}
                  testID={`barra-receitas-${m.ano}-${m.mes}`}
                />
                <View
                  style={[estilos.barra, { height: altura(m.despesasCentavos, maximo), backgroundColor: cores.graficoDespesa }]}
                  testID={`barra-despesas-${m.ano}-${m.mes}`}
                />
              </View>
              <Text style={[estilos.rotuloMes, ativo && estilos.rotuloAtivo]}>{MESES_ABREV[m.mes - 1]}</Text>
              {/* O ano aparece no primeiro mês e em janeiro, para a virada de ano ficar clara. */}
              <Text style={estilos.rotuloAno}>{i === 0 || m.mes === 1 ? String(m.ano) : ' '}</Text>
            </Pressable>
          );
        })}
      </View>

      {doSelecionado ? (
        <View style={estilos.detalhe} testID="evolucao-detalhe">
          <Text style={estilos.detalheMes}>{nomeMes(doSelecionado.ano, doSelecionado.mes)}</Text>
          <Text style={estilos.detalheValor}>
            Receitas {formatarBRL(doSelecionado.receitasCentavos)} · Despesas {formatarBRL(doSelecionado.despesasCentavos)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function rotuloAcessivel(m: MesDoGrafico): string {
  return `${nomeMes(m.ano, m.mes)}: receitas ${formatarBRL(m.receitasCentavos)}, despesas ${formatarBRL(m.despesasCentavos)}`;
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <View style={estilos.itemLegenda}>
      <View style={[estilos.amostra, { backgroundColor: cor }]} />
      <Text style={estilos.textoLegenda}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amostra: { width: 12, height: 12, borderRadius: 3 },
  textoLegenda: { fontSize: 13, color: cores.marinho },
  // RNF20: as 6 colunas dividem a largura disponível (flex: 1), em qualquer tamanho de tela.
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  coluna: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
    borderRadius: raio.campo,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 44,
  },
  colunaAtiva: { backgroundColor: cores.fundoSuave, borderColor: cores.primaria },
  barras: { height: ALTURA_BARRAS, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barra: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  rotuloMes: { fontSize: 12, color: cores.textoSuave, marginTop: 4 },
  rotuloAtivo: { color: cores.marinho, fontWeight: '700' },
  rotuloAno: { fontSize: 10, color: cores.textoSuave },
  detalhe: { marginTop: 8, gap: 2 },
  detalheMes: { fontSize: 13, fontWeight: '700', color: cores.marinho },
  detalheValor: { fontSize: 13, color: cores.textoSuave },
});
