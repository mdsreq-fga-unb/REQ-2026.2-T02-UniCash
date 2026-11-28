import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { nomeMes, NOMES_MES } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { consultarResumoMensal, type TotaisDoMes } from '@/features/saldo/service';
import { FormularioSaldo } from '@/components/saldo/FormularioSaldo';
import { consultarAlertas, dispensarAlerta, type AlertaSaldo } from '@/features/saldo/alertas';
import { cores, raio } from '@/lib/theme';

type Resumo = Awaited<ReturnType<typeof consultarResumoMensal>>;

export function PainelSaldo({ inicio, receitas, despesas, compacto = false }: { inicio: string; compacto?: boolean } & TotaisDoMes) {
  const consultaAtual = useRef(0);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [alertas, setAlertas] = useState<AlertaSaldo[]>([]);
  const [erroAlerta, setErroAlerta] = useState(false);
  const [editandoInicial, setEditandoInicial] = useState(false);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(() => {
    const consulta = ++consultaAtual.current;
    setResumo(null);
    setErro(false);
    setErroAlerta(false);
    consultarAlertas().then(
      (resultado) => { if (consulta === consultaAtual.current) setAlertas(resultado); },
      () => { if (consulta === consultaAtual.current) setErroAlerta(true); },
    );
    consultarResumoMensal(inicio, { receitas, despesas }).then(
      (resultado) => { if (consulta === consultaAtual.current) setResumo(resultado); },
      () => { if (consulta === consultaAtual.current) setErro(true); },
    );
  }, [inicio, receitas, despesas]);

  useFocusEffect(
    useCallback(() => {
      recarregar();
      return () => { consultaAtual.current += 1; };
    }, [recarregar]),
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

  function concluirFormulario() {
    setEditandoInicial(false);
    recarregar();
  }

  return (
    <View style={styles.painel}>
      {alertas.slice(0, 1).map((alerta) => (
        <View key={alerta.id} style={styles.cartao}>
          <Text style={styles.rotulo}>{nomeMes(Number(alerta.mes.slice(0, 4)), Number(alerta.mes.slice(5)))}</Text>
          {alertas.length > 1 && <Text style={styles.rotulo}>{alertas.length} avisos pendentes</Text>}
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
      {resumo && (
        <View style={[styles.cartao, compacto && styles.cartaoCompacto]}>
          <Text style={styles.rotulo}>
            {compacto ? `Saldo de ${NOMES_MES[Number(inicio.slice(5, 7)) - 1].toLowerCase()}` : 'Saldo do mês'}
          </Text>
          <Text style={[
            styles.valor,
            compacto && { color: resumo.saldo < 0 ? cores.erro : resumo.saldo > 0 ? cores.sucesso : cores.marinho },
          ]} testID="saldo">{formatarBRL(resumo.saldo)}</Text>
          <Text style={[styles.indicador, compacto && styles.indicadorCompacto, { color: resumo.indicador.cor }]}>
            {resumo.indicador.texto}
          </Text>
          {compacto ? <Totais receitas={receitas} despesas={despesas} /> : null}
          <Text style={styles.rotulo}>
            Saldo {compacto ? 'do mês anterior' : 'anterior'} {resumo.saldoAnterior === null ? '· sem dados' : `· ${formatarBRL(resumo.saldoAnterior)}`}
          </Text>
        </View>
      )}
      {erro && (
        <View style={styles.cartao}>
          <Text accessibilityRole="alert" style={styles.rotulo}>Não foi possível calcular o saldo.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tentar calcular o saldo novamente" onPress={recarregar}>
            <Text style={styles.acao}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}
      {!resumo && !erro && <ActivityIndicator accessibilityLabel="Calculando saldo" color={cores.primaria} />}
      {compacto && !resumo ? <Totais receitas={receitas} despesas={despesas} /> : null}
      {resumo && (editandoInicial ? (
        <FormularioSaldo inicio={inicio}
          valorInicial={resumo.inicial?.mes === inicio.slice(0, 7) ? resumo.inicial.centavos : undefined}
          aoSalvar={concluirFormulario} aoCancelar={() => setEditandoInicial(false)} />
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setEditandoInicial(true)}>
          <Text style={compacto ? styles.acaoCompacta : styles.acao}>
            {resumo.inicial ? 'Alterar saldo inicial' : 'Informar saldo inicial'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Totais({ receitas, despesas }: TotaisDoMes) {
  return (
    <View style={styles.totais}>
      <View style={styles.totalCartao}>
        <Text style={styles.rotulo}>↑ Receitas</Text>
        <Text style={[styles.total, { color: cores.sucesso }]} testID="total-receitas">{formatarBRL(receitas)}</Text>
      </View>
      <View style={styles.totalCartao}>
        <Text style={styles.rotulo}>↓ Despesas</Text>
        <Text style={[styles.total, { color: cores.erro }]} testID="total-despesas">{formatarBRL(despesas)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  acaoCompacta: { color: cores.primaria, fontSize: 13, fontWeight: '600' },
  painel: { gap: 12, marginBottom: 12 },
  acao: { color: cores.primaria, fontSize: 18, fontWeight: '600' },
  cartao: { backgroundColor: cores.fundoSuave, borderColor: cores.borda, borderWidth: 1, borderRadius: raio.cartao, padding: 16, gap: 10 },
  cartaoCompacto: { backgroundColor: cores.branco, padding: 14, gap: 5 },
  indicadorCompacto: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: raio.pilula,
    overflow: 'hidden', backgroundColor: cores.fundoSuave, fontSize: 12,
  },
  totais: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  totalCartao: { flexGrow: 1, flexBasis: 120, padding: 10, borderRadius: 8, backgroundColor: cores.fundoSuave },
  valor: { color: cores.marinho, fontSize: 32, fontWeight: '700' },
  indicador: { fontSize: 15, fontWeight: '600' },
  total: { color: cores.marinho, fontSize: 17, fontWeight: '600' },
  rotulo: { color: cores.primaria, fontSize: 13 },
});
