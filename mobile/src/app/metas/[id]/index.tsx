import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { cores, raio } from '@/lib/theme';
import { OpcoesModal } from '@/components/receitas/OpcoesModal';
import { useMeta, type ReferenciaMes } from '@/features/metas/useMetas';
import { excluirMeta } from '@/features/metas/service';
import { MSG_META } from '@/features/metas/validation';
import { META_EXCLUIDA, setFeedback } from '@/features/metas/feedback';
import { formatarPercentual, rotuloSync, rotuloTipoMeta } from '@/features/metas/formato';
import {
  rotuloSituacaoPrazo,
  rotuloSituacaoProgresso,
  situacaoDoPrazo,
} from '@/features/metas/progresso';
import {
  periodoAnterior,
  periodoAtualDaMeta,
  periodoDoMes,
  periodoSeguinte,
  rotuloPeriodo,
} from '@/features/metas/periodo';
import { formatarBR, formatarDataHora, hojeISO } from '@/features/receitas/dates';
import { formatarBRL } from '@/features/receitas/money';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';

export default function DetalheMeta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mes, setMes] = useState<ReferenciaMes | null>(null);
  const { meta, progresso, carregando, erroLeitura, recarregar } = useMeta(
    id,
    undefined,
    mes,
  );
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const emOperacao = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  useEffect(() => {
    if (!carregando && !erroLeitura && !meta) {
      setFeedback({ tipo: 'erro', texto: MSG_META.indisponivel });
      router.replace('/metas');
    }
  }, [carregando, erroLeitura, meta]);

  async function confirmarExclusao() {
    if (emOperacao.current) return;
    emOperacao.current = true;
    setConfirmando(false);
    setExcluindo(true);
    setErroGeral(null);
    try {
      await excluirMeta(id);
      sincronizarEmSegundoPlano();
      setFeedback(META_EXCLUIDA);
      router.dismissTo('/metas');
    } catch {
      setErroGeral(MSG_META.falhaExcluir);
      emOperacao.current = false;
      setExcluindo(false);
    }
  }

  if (!meta) {
    if (carregando || !erroLeitura) {
      return (
        <View style={estilos.centro}>
          <ActivityIndicator color={cores.primaria} />
        </View>
      );
    }
    return (
      <SafeAreaView style={estilos.centro} edges={['top', 'bottom']}>
        <Text style={estilos.erro}>{MSG_META.falhaLeitura}</Text>
        <Pressable onPress={() => void recarregar()} style={estilos.tentar} accessibilityRole="button">
          <Text style={estilos.tentarTexto}>Tentar novamente</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const pendente = meta.sync_status === 'pendente';
  const semCategoria = meta.tipo === 'gasto' && !meta.categoria_id;
  const categoriaExcluida = meta.categoria_excluida_em != null;
  const categoriaIndisponivel =
    meta.tipo === 'gasto' &&
    (semCategoria || categoriaExcluida || !meta.categoria_nome);
  const indisponivel = !progresso || progresso.progressoIndisponivel;
  const situacaoPrazo =
    progresso?.situacaoPrazo ?? situacaoDoPrazo(meta.prazo, hojeISO());
  const periodo = progresso?.periodo ?? (meta.tipo === 'gasto' ? periodoAtualDaMeta(meta) : null);
  const anterior = periodo ? periodoAnterior(periodo) : null;
  const seguinte = periodo ? periodoSeguinte(periodo) : null;
  const temAnterior = !!(periodo && anterior && periodoDoMes(meta, anterior.ano, anterior.mes));
  const temSeguinte = !!(periodo && seguinte && periodoDoMes(meta, seguinte.ano, seguinte.mes));

  function irParaPeriodo(destino: { ano: number; mes: number } | null) {
    if (!destino) return;
    setMes(destino);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Pressable onPress={() => router.back()} accessibilityLabel="Voltar" style={estilos.voltar}>
            <Text style={estilos.voltarTexto}>‹</Text>
          </Pressable>
          <Text style={estilos.titulo}>Detalhe da meta</Text>
        </View>

        <View style={estilos.cartaoPrincipal}>
          <View style={estilos.linhaTopo}>
            <Text style={estilos.objetivo}>{meta.objetivo}</Text>
            <Text style={estilos.tipo}>{rotuloTipoMeta(meta.tipo)}</Text>
          </View>
          <Text style={estilos.valor}>{formatarBRL(meta.valor_alvo_centavos)}</Text>
          <Text style={estilos.textoClaro}>
            {meta.tipo === 'gasto' ? 'Limite mensal' : 'Valor alvo'}
          </Text>
          <Text style={estilos.textoClaro}>Prazo: {formatarBR(meta.prazo)}</Text>
          <Text style={estilos.textoClaro}>
            Início: {meta.inicio ? formatarBR(meta.inicio) : 'não disponível'}
          </Text>
          <Text style={[estilos.sync, pendente ? estilos.syncPendente : estilos.syncOk]}>
            {rotuloSync(meta.sync_status)}
          </Text>
        </View>

        {meta.tipo === 'gasto' ? (
          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Categoria</Text>
            <Text style={estilos.textoSuave}>
              {meta.categoria_nome
                ? meta.categoria_nome
                : semCategoria
                  ? 'Não vinculada'
                  : 'Categoria indisponível'}
            </Text>
            {categoriaIndisponivel ? (
              <Text style={estilos.aviso}>{MSG_META.categoriaRemovida}</Text>
            ) : null}
          </View>
        ) : null}

        {periodo ? (
          <View style={estilos.navegacaoPeriodo}>
            <Pressable
              onPress={() => irParaPeriodo(anterior)}
              disabled={!temAnterior}
              accessibilityLabel="Mês anterior"
              style={[estilos.seta, !temAnterior && estilos.setaInativa]}
            >
              <Text style={estilos.setaTexto}>‹</Text>
            </Pressable>
            <Text style={estilos.periodoTexto}>{rotuloPeriodo(periodo)}</Text>
            <Pressable
              onPress={() => irParaPeriodo(seguinte)}
              disabled={!temSeguinte}
              accessibilityLabel="Próximo mês"
              style={[estilos.seta, !temSeguinte && estilos.setaInativa]}
            >
              <Text style={estilos.setaTexto}>›</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={estilos.secao}>
          <Text style={estilos.secaoTitulo}>Progresso</Text>
          {indisponivel ? (
            <>
              <Text style={estilos.textoSuave}>
                {meta.tipo === 'investimento'
                  ? MSG_META.valorNaoInformado
                  : categoriaIndisponivel
                    ? MSG_META.categoriaRemovida
                    : 'Progresso indisponível para o período.'}
              </Text>
              <Text style={estilos.textoSuave}>Valor realizado: indisponível</Text>
              <Text style={estilos.textoSuave}>Valor restante: indisponível</Text>
              <Text style={estilos.textoSuave}>Percentual: indisponível</Text>
              <Text style={estilos.textoSuave}>
                Situação do progresso: {rotuloSituacaoProgresso('indisponivel')}
              </Text>
              <Text style={estilos.textoSuave}>
                Situação do prazo: {rotuloSituacaoPrazo(situacaoPrazo)}
              </Text>
            </>
          ) : (
            <>
              <View style={estilos.progressoTopo}>
                <Text style={estilos.percentual}>{formatarPercentual(progresso.percentual!)}</Text>
                <Text style={estilos.textoSuave}>
                  {rotuloSituacaoProgresso(progresso.situacaoProgresso)}
                </Text>
              </View>
              <View style={estilos.barra}>
                <View
                  style={[
                    estilos.barraCheia,
                    { width: `${Math.min(100, progresso.percentual!)}%` },
                  ]}
                />
              </View>
              <Text style={estilos.textoSuave}>
                Valor realizado: {formatarBRL(progresso.valorRealizadoCentavos!)}
              </Text>
              <Text style={estilos.textoSuave}>
                Valor restante: {formatarBRL(progresso.valorRestanteCentavos!)}
              </Text>
              <Text style={estilos.textoSuave}>
                Situação do progresso: {rotuloSituacaoProgresso(progresso.situacaoProgresso)}
              </Text>
              <Text style={estilos.textoSuave}>
                Situação do prazo: {rotuloSituacaoPrazo(progresso.situacaoPrazo)}
              </Text>
              {meta.tipo === 'investimento' ? (
                <>
                  <Text style={estilos.aviso}>Valor informado pelo usuário.</Text>
                  <Text style={estilos.textoSuave}>
                    Atualizado em:{' '}
                    {meta.valor_acumulado_atualizado_em
                      ? formatarDataHora(meta.valor_acumulado_atualizado_em)
                      : 'não informado'}
                  </Text>
                </>
              ) : null}
              {periodo ? (
                <Text style={estilos.textoSuave}>
                  Período: {formatarBR(periodo.inicio)} a {formatarBR(periodo.fim)}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {erroGeral ? (
          <Text style={estilos.erro} accessibilityRole="alert">
            {erroGeral}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push({ pathname: '/metas/[id]/editar', params: { id } })}
          style={estilos.botao}
          accessibilityRole="button"
        >
          <Text style={estilos.botaoTexto}>
            {categoriaIndisponivel ? 'Corrigir categoria' : 'Editar meta'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setConfirmando(true)}
          disabled={excluindo}
          style={estilos.excluir}
          accessibilityRole="button"
        >
          <Text style={estilos.excluirTexto}>
            {excluindo ? 'Excluindo…' : 'Excluir meta'}
          </Text>
        </Pressable>
      </ScrollView>

      <OpcoesModal
        visivel={confirmando}
        titulo="Excluir meta?"
        mensagem={MSG_META.exclusaoMantemLancamentos}
        opcoes={[{ rotulo: 'Excluir', destrutiva: true, onPress: () => void confirmarExclusao() }]}
        onCancelar={() => setConfirmando(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: cores.fundo,
    padding: 24,
  },
  conteudo: { paddingHorizontal: 20, paddingBottom: 32 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  voltar: { paddingHorizontal: 10, marginLeft: -10 },
  voltarTexto: { fontSize: 30, color: cores.primaria, fontWeight: '700', lineHeight: 32 },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.marinho },
  cartaoPrincipal: {
    backgroundColor: cores.marinho,
    borderRadius: raio.cartao,
    padding: 18,
    marginBottom: 14,
  },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  objetivo: { fontSize: 20, fontWeight: '800', color: cores.branco, flexShrink: 1 },
  tipo: {
    fontSize: 11,
    fontWeight: '700',
    color: cores.claro,
    borderWidth: 1,
    borderColor: cores.claro,
    borderRadius: raio.pilula,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  valor: { fontSize: 26, fontWeight: '800', color: cores.branco, marginTop: 8 },
  textoSuave: { fontSize: 13, color: cores.textoSuave, marginTop: 4 },
  textoClaro: { fontSize: 13, color: cores.claro, marginTop: 4 },
  sync: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  syncPendente: { color: cores.claro },
  syncOk: { color: '#86EFAC' },
  secao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.cartao,
    padding: 14,
    marginBottom: 14,
    gap: 4,
  },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: cores.marinho, marginBottom: 4 },
  progressoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percentual: { fontSize: 24, fontWeight: '800', color: cores.primaria },
  barra: {
    height: 10,
    borderRadius: raio.pilula,
    backgroundColor: cores.fundoSuave,
    overflow: 'hidden',
    marginVertical: 8,
  },
  barraCheia: { height: 10, backgroundColor: cores.primaria },
  aviso: { fontSize: 12, color: cores.primaria, marginTop: 6, lineHeight: 17 },
  navegacaoPeriodo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seta: { paddingHorizontal: 14, paddingVertical: 6 },
  setaInativa: { opacity: 0.25 },
  setaTexto: { fontSize: 28, color: cores.primaria, fontWeight: '700', lineHeight: 30 },
  periodoTexto: { fontSize: 15, fontWeight: '700', color: cores.marinho },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoTexto: { color: cores.branco, fontWeight: '700', fontSize: 15 },
  excluir: { alignItems: 'center', paddingVertical: 14 },
  excluirTexto: { color: cores.erro, fontWeight: '600', fontSize: 15 },
  erro: { color: cores.erro, fontSize: 14, textAlign: 'center', marginVertical: 8 },
  tentar: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: cores.primaria,
    borderRadius: raio.botao,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tentarTexto: { color: cores.primaria, fontWeight: '700' },
});
