import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { cores, raio } from '@/lib/theme';
import { lerMesDeParametros, mesAnterior, nomeMes, primeiroDiaDoMes, proximoMes } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { MSG_FALHA_CALCULO, type ResumoMensal } from '@/features/resumo/service';
import { percentualMeta, rotuloDia } from '@/features/resumo/format';
import { useResumo } from '@/features/resumo/useResumo';
import { IndicadoresConsumo } from '@/components/consumo/IndicadoresConsumo';
import { useConsumoMensal } from '@/features/consumo/useConsumoMensal';
import { AcaoTutorial } from '@/components/tutorial/Interface';
import { EntradaTutorial } from '@/components/tutorial/EntradaTutorial';
import { MSG_ABERTURA_TUTORIAL } from '@/features/tutorial/conteudo';
import { useOfertaTutorial } from '@/features/tutorial/useOfertaTutorial';
import { PainelSaldo } from '@/components/saldo/PainelSaldo';

import { useSessao } from '@/features/conta/sessao';
import { continuarSemContaNestaSessao } from '@/features/conta/onboarding';

function mesCorrente() {
  const n = new Date();
  return { ano: n.getFullYear(), mes: n.getMonth() + 1 };
}

/** Resumo financeiro inicial (UC03, RF11, RF40). Somente leitura; calculado na base local. */
export default function Home() {
  const sessao = useSessao();
  if (sessao.status !== 'ativa' && !continuarSemContaNestaSessao()) return <Redirect href="/conta/cadastro" />;
  return <ResumoFinanceiro key={sessao.status === 'ativa' ? sessao.uid : 'local'} />;
}

export function ResumoFinanceiro({ noTutorial = false }: { noTutorial?: boolean }) {

  // Passo 2: o mês corrente é o período padrão (RN12).
  const ofertaTutorial = useOfertaTutorial(!noTutorial);
  // UC13: "Ver resumo do mês" no detalhe do selo abre o resumo já no mês do selo.
  const params = useLocalSearchParams<{ ano?: string; mes?: string }>();
  const [periodo, setPeriodo] = useState(() => lerMesDeParametros(params.ano, params.mes) ?? mesCorrente());
  const inicio = primeiroDiaDoMes(periodo.ano, periodo.mes);
  const consumo = useConsumoMensal(inicio.slice(0, 7));
  const { resumo, falhou, recarregar } = useResumo(periodo.ano, periodo.mes);
  // Só exibe valores calculados para o mês selecionado: ao trocar de mês, os do mês anterior
  // não podem aparecer sob o título novo enquanto o recálculo não termina.
  const resumoDoPeriodo = resumo && resumo.ano === periodo.ano && resumo.mes === periodo.mes ? resumo : null;

  // Passos 3 e 6, FA05: recalcula ao abrir, ao voltar de outra tela e ao trocar de mês.
  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  if (ofertaTutorial.verificando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Preparando resumo" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.titulo} accessibilityRole="header">
            Resumo financeiro
          </Text>
          {noTutorial ? (
            <Pressable onPress={() => router.back()} style={estilos.ajuda} accessibilityRole="button">
              <Text style={estilos.botaoContornoTexto}>Voltar ao tutorial</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/ajuda')} style={estilos.ajuda} accessibilityRole="button">
              <Text style={estilos.botaoContornoTexto}>Ajuda</Text>
            </Pressable>
          )}
        </View>
        {ofertaTutorial.falhou && (
          <View style={estilos.secao}>
            <Text style={estilos.erro} accessibilityRole="alert">{MSG_ABERTURA_TUTORIAL}</Text>
            <AcaoTutorial texto="Tentar novamente" onPress={ofertaTutorial.tentarNovamente} />
          </View>
        )}

        <View style={estilos.seletor}>
          <Pressable
            onPress={() => setPeriodo((p) => mesAnterior(p.ano, p.mes))}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={estilos.seta}
            hitSlop={8}
          >
            <Text style={estilos.setaTexto}>‹</Text>
          </Pressable>
          <Text style={estilos.mes} testID="mes-selecionado">
            {nomeMes(periodo.ano, periodo.mes)}
          </Text>
          <Pressable
            onPress={() => setPeriodo((p) => proximoMes(p.ano, p.mes))}
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            style={estilos.seta}
            hitSlop={8}
          >
            <Text style={estilos.setaTexto}>›</Text>
          </Pressable>
        </View>

        {resumoDoPeriodo && !falhou && (
          <PainelSaldo
            key={inicio}
            inicio={inicio}
            receitas={resumoDoPeriodo.totalReceitasCentavos}
            despesas={resumoDoPeriodo.totalDespesasCentavos}
          />
        )}

        {falhou ? (
          <View style={estilos.vazio}>
            <Text style={estilos.erro}>{MSG_FALHA_CALCULO}</Text>
            <Pressable onPress={() => void recarregar()} style={estilos.botaoContorno} accessibilityRole="button">
              <Text style={estilos.botaoContornoTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : !resumoDoPeriodo ? (
          <ActivityIndicator color={cores.primaria} style={{ marginTop: 32 }} testID="carregando" />
        ) : resumoDoPeriodo.semLancamentos && !noTutorial ? (
          <EstadoVazio />
        ) : (
          <Conteudo resumo={resumoDoPeriodo} />
        )}

        {!noTutorial && (
          <View style={estilos.vazio}>
            <Text accessibilityRole="header" style={estilos.titulo}>Consumo por categoria</Text>
            <IndicadoresConsumo estado={consumo.estado} aoTentarNovamente={consumo.tentarNovamente} />
          </View>
        )}

        {!noTutorial && <Atalhos ano={periodo.ano} mes={periodo.mes} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Conteudo({ resumo }: { resumo: ResumoMensal }) {
  return (
    <View>
      <View style={estilos.linha}>
        <View style={estilos.cartao}>
          <Text style={estilos.rotulo}>Receitas</Text>
          <Text style={[estilos.valor, { color: cores.sucesso }]} testID="total-receitas">
            {formatarBRL(resumo.totalReceitasCentavos)}
          </Text>
        </View>
        <View style={estilos.cartao}>
          <Text style={estilos.rotulo}>Despesas</Text>
          <Text style={[estilos.valor, { color: cores.erro }]} testID="total-despesas">
            {formatarBRL(resumo.totalDespesasCentavos)}
          </Text>
        </View>
      </View>

      <View style={estilos.secao}>
        <Text style={estilos.secaoTitulo}>Metas do período</Text>
        {resumo.metas.length === 0 ? (
          <Text style={estilos.textoSuave}>Nenhuma meta no período.</Text>
        ) : (
          resumo.metas.map((m) => {
            const pct = percentualMeta(m.realizadoCentavos, m.alvoCentavos);
            return (
              <View key={m.id} style={estilos.meta} accessibilityLabel={`${m.titulo}: ${pct}%`}>
                <View style={estilos.metaTopo}>
                  <Text style={estilos.metaTitulo}>{m.titulo}</Text>
                  <Text style={estilos.textoSuave}>{pct}%</Text>
                </View>
                <View style={estilos.barra}>
                  <View style={[estilos.barraCheia, { width: `${pct}%` }]} />
                </View>
                <Text style={estilos.textoSuave}>
                  {formatarBRL(m.realizadoCentavos)} de {formatarBRL(m.alvoCentavos)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={estilos.secao}>
        <Text style={estilos.secaoTitulo}>Receitas por dia</Text>
        {resumo.receitasPorDia.length === 0 ? (
          <Text style={estilos.textoSuave}>Nenhuma receita neste mês.</Text>
        ) : (
          resumo.receitasPorDia.map((d) => (
            <View key={d.data} style={estilos.dia} testID={`dia-${d.data}`}>
              <Text style={estilos.diaRotulo}>{rotuloDia(d.data)}</Text>
              <Text style={estilos.diaValor}>+ {formatarBRL(d.totalCentavos)}</Text>
            </View>
          ))
        )}
      </View>

    </View>
  );
}

/**
 * Atalhos para as listas e categorias, visíveis em todos os estados da tela (carregando, resumo,
 * estado vazio e EX01), como na tela inicial anterior. Receitas e Despesas abrem no mês selecionado,
 * para o usuário achar (e editar ou excluir) os lançamentos dele.
 */
function Atalhos({ ano, mes }: { ano: number; mes: number }) {
  const doMes = { ano: String(ano), mes: String(mes) };
  return (
    <View style={estilos.linha}>
      <Pressable
        onPress={() => router.push({ pathname: '/receitas', params: doMes })}
        style={estilos.botao}
        accessibilityRole="button"
      >
        <Text style={estilos.botaoTexto}>Receitas</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: '/despesas', params: doMes })}
        style={estilos.botao}
        accessibilityRole="button"
      >
        <Text style={estilos.botaoTexto}>Despesas</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/categorias')} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Categorias</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/sincronizacao')} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Sincronização</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/configuracoes-financeiras')} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Configurações financeiras</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/perfil')} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Perfil</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/conta')} style={estilos.botao} accessibilityRole="button">
        <Text style={estilos.botaoTexto}>Conta</Text>
      </Pressable>
    </View>
  );
}

/** FA02: nenhum lançamento na base → estado vazio com atalho para o tutorial (RF55). */
function EstadoVazio() {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioTitulo}>Nenhum lançamento ainda</Text>
      <Text style={estilos.vazioTexto}>
        Registre receitas e despesas para ver aqui o saldo e os totais do mês.
      </Text>
      <EntradaTutorial texto="Ver tutorial" />
      <View style={estilos.linha}>
        <Pressable onPress={() => router.push('/receitas/nova')} style={estilos.botaoContorno} accessibilityRole="button">
          <Text style={estilos.botaoContornoTexto}>Registrar receita</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/despesas/nova')} style={estilos.botaoContorno} accessibilityRole="button">
          <Text style={estilos.botaoContornoTexto}>Registrar despesa</Text>
        </Pressable>
      </View>
    </View>
  );
}

/*
 * RNF20 (telas adaptadas a diferentes tamanhos de celular): conteúdo em ScrollView; cartões e botões
 * em linhas com `flexWrap` + `flexBasis: 140`, que viram uma coluna em telas estreitas; o nome do mês
 * encolhe (`flexShrink`) sem empurrar as setas; setas com área de toque mínima de 44×44.
 * Verificação manual: tests/MANUAL.md, roteiro do UC03.
 */
const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ajuda: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, marginBottom: 12 },
  titulo: { flexShrink: 1, fontSize: 20, fontWeight: '700', color: cores.marinho, marginBottom: 12 },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.pilula,
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  seta: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  setaTexto: { fontSize: 26, color: cores.primaria, fontWeight: '700' },
  mes: { fontSize: 16, fontWeight: '700', color: cores.marinho, flexShrink: 1, textAlign: 'center' },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  cartao: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: cores.fundoSuave,
    borderRadius: raio.cartao,
    padding: 14,
  },
  rotulo: { fontSize: 12, color: cores.textoSuave },
  valor: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  secao: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 14, marginBottom: 12, gap: 8 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: cores.marinho },
  textoSuave: { fontSize: 13, color: cores.textoSuave },
  meta: { gap: 4 },
  metaTopo: { flexDirection: 'row', justifyContent: 'space-between' },
  metaTitulo: { fontSize: 14, fontWeight: '600', color: cores.marinho, flexShrink: 1 },
  barra: { height: 8, borderRadius: raio.pilula, backgroundColor: cores.fundoSuave, overflow: 'hidden' },
  barraCheia: { height: 8, backgroundColor: cores.primaria },
  dia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.borda,
  },
  diaRotulo: { fontSize: 14, color: cores.marinho },
  diaValor: { fontSize: 14, fontWeight: '700', color: cores.sucesso },
  botao: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
  botaoContorno: {
    flexGrow: 1,
    flexBasis: 140,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoContornoTexto: { color: cores.primaria, fontWeight: '700' },
  vazio: { alignItems: 'stretch', paddingVertical: 32 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', color: cores.marinho, textAlign: 'center' },
  vazioTexto: { fontSize: 14, color: cores.textoSuave, marginTop: 6, textAlign: 'center' },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center' },
});
