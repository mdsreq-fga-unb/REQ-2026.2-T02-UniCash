import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adicionarMeses, formatarBR, hojeISO, nomeMes } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { consultarResumoMensal, listarDespesas, type Despesa } from '@/features/saldo/service';
import { FormularioSaldo } from '@/components/saldo/FormularioSaldo';
import { consultarAlertas, dispensarAlerta, type AlertaSaldo } from '@/features/saldo/alertas';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { cores, raio } from '@/lib/theme';

type Resumo = Awaited<ReturnType<typeof consultarResumoMensal>>;

export default function Home() {
  const [consulta, setConsulta] = useState(() => ({ inicio: `${hojeISO().slice(0, 7)}-01` }));
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [alertas, setAlertas] = useState<AlertaSaldo[]>([]);
  const [erroAlerta, setErroAlerta] = useState(false);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesaEmEdicao, setDespesaEmEdicao] = useState<Despesa>();
  const [formulario, setFormulario] = useState<'despesa' | 'inicial' | null>(null);
  const [erro, setErro] = useState(false);
  const [ano, mes] = consulta.inicio.split('-').map(Number);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      setResumo(null);
      setErro(false);
      setErroAlerta(false);
      consultarAlertas().then(
        (resultado) => { if (ativo) setAlertas(resultado); },
        () => { if (ativo) setErroAlerta(true); },
      );
      Promise.all([consultarResumoMensal(consulta.inicio), listarDespesas(consulta.inicio)]).then(
        ([resultado, itens]) => {
          if (!ativo) return;
          setResumo(resultado);
          setDespesas(itens);
        },
        () => { if (ativo) setErro(true); },
      );
      return () => { ativo = false; };
    }, [consulta]),
  );

  async function fecharAlerta(id: string) {
    try {
      await dispensarAlerta(id);
      setAlertas((atuais) => atuais.filter((alerta) => alerta.id !== id));
      setErroAlerta(false);
    } catch {
      setErroAlerta(true);
    }
  }

  function recarregar() {
    setConsulta((atual) => ({ ...atual }));
  }

  function fecharFormulario() {
    setFormulario(null);
    setDespesaEmEdicao(undefined);
  }

  function concluirFormulario() {
    fecharFormulario();
    recarregar();
    sincronizarEmSegundoPlano();
  }

  function mudarMes(direcao: number) {
    setResumo(null);
    setErro(false);
    setConsulta(({ inicio }) => ({ inicio: adicionarMeses(inicio, direcao) }));
  }

  return (
    <SafeAreaView style={styles.pagina}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text accessibilityRole="header" style={styles.titulo}>Resumo financeiro</Text>
        {alertas.slice(0, 1).map((alerta) => (
          <View key={alerta.id} style={styles.cartao}>
            <Text accessibilityRole="alert" style={styles.total}>
              {formatarBRL(alerta.anterior_centavos)} → {formatarBRL(alerta.saldo_centavos)}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void fecharAlerta(alerta.id)}>
              <Text style={styles.acao}>Dispensar aviso</Text>
            </Pressable>
          </View>
        ))}
        {erroAlerta && (
          <Pressable accessibilityRole="button" onPress={recarregar}>
            <Text style={styles.acao}>Atualizar avisos</Text>
          </Pressable>
        )}
        <View style={styles.meses}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={formulario !== null} onPress={() => mudarMes(-1)} style={styles.botaoMes}>
            <Text style={styles.acao}>‹</Text>
          </Pressable>
          <Text style={styles.mes}>{nomeMes(ano, mes)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" disabled={formulario !== null} onPress={() => mudarMes(1)} style={styles.botaoMes}>
            <Text style={styles.acao}>›</Text>
          </Pressable>
        </View>
        {resumo && (
          <View style={styles.cartao}>
            <Text style={styles.rotulo}>Saldo do mês</Text>
            <Text style={styles.valor}>{formatarBRL(resumo.saldo)}</Text>
            <Text style={[styles.indicador, { color: resumo.indicador.cor }]}>{resumo.indicador.texto}</Text>
            <View style={styles.totais}>
              <View>
                <Text style={styles.rotulo}>Receitas</Text>
                <Text style={styles.total}>{formatarBRL(resumo.receitas)}</Text>
              </View>
              <View>
                <Text style={styles.rotulo}>Despesas</Text>
                <Text style={styles.total}>{formatarBRL(resumo.despesas)}</Text>
              </View>
            </View>
            <Text style={styles.rotulo}>
              Saldo anterior {resumo.saldoAnterior === null ? '· sem dados' : `· ${formatarBRL(resumo.saldoAnterior)}`}
            </Text>
          </View>
        )}
        {erro && (
          <View style={styles.cartao}>
            <Text accessibilityRole="alert" style={styles.rotulo}>Não foi possível calcular o saldo.</Text>
            <Pressable accessibilityRole="button" onPress={recarregar}>
              <Text style={styles.acao}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}
        {!resumo && !erro && <ActivityIndicator accessibilityLabel="Calculando saldo" color={cores.primaria} />}
        {resumo && (formulario ? (
          <FormularioSaldo modo={formulario} inicio={consulta.inicio}
            despesaEmEdicao={despesaEmEdicao}
            valorInicial={despesaEmEdicao?.valor_centavos ?? (formulario === 'inicial' &&
              resumo.inicial?.mes === consulta.inicio.slice(0, 7) ? resumo.inicial.centavos : undefined)}
            aoSalvar={concluirFormulario} aoCancelar={fecharFormulario} />
        ) : (
          <>
            <Pressable accessibilityRole="button" onPress={() => setFormulario('despesa')}>
              <Text style={styles.acao}>Nova despesa</Text>
            </Pressable>
            {despesas.map((despesa) => {
              const descricao = `${formatarBR(despesa.data)} · ${formatarBRL(despesa.valor_centavos)}`;
              return (
                <Pressable key={despesa.id} accessibilityRole="button" accessibilityLabel={`Editar despesa de ${descricao}`}
                  style={styles.cartao} onPress={() => { setDespesaEmEdicao(despesa); setFormulario('despesa'); }}>
                  <Text style={styles.acao}>{descricao}</Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setFormulario('inicial')}>
              <Text style={styles.acao}>{resumo.inicial ? 'Alterar saldo inicial' : 'Informar saldo inicial'}</Text>
            </Pressable>
          </>
        ))}
        <Link href="/receitas" style={styles.acao}>Ver receitas</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 20, gap: 20 },
  titulo: { color: cores.marinho, fontSize: 28, fontWeight: '700' },
  meses: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mes: { color: cores.marinho, fontSize: 18, fontWeight: '600' },
  botaoMes: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  acao: { color: cores.primaria, fontSize: 18, fontWeight: '600' },
  cartao: { backgroundColor: cores.fundoSuave, borderColor: cores.borda, borderWidth: 1, borderRadius: raio.cartao, padding: 16, gap: 10 },
  valor: { color: cores.marinho, fontSize: 32, fontWeight: '700' },
  indicador: { fontSize: 15, fontWeight: '600' },
  totais: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 28, rowGap: 8, paddingVertical: 10 },
  total: { color: cores.marinho, fontSize: 17, fontWeight: '600' },
  rotulo: { color: cores.textoSuave, fontSize: 15 },
});
