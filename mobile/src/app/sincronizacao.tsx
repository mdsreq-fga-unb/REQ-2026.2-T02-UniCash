import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ItemInterruptor } from '@/components/perfil/ItemInterruptor';
import { useSessao } from '@/features/conta/sessao';
import { mensagensSincronizacao, type CodigoSincronizacao, type EstadoSincronizacao } from '@/features/sincronizacao/contrato';
import { alterarSincronizacaoAutomatica, syncService } from '@/features/sincronizacao/service';
import { cores, raio } from '@/lib/theme';

const rotulos: Record<EstadoSincronizacao['status'], string> = {
  sincronizado: 'Sincronizado',
  pendente: 'Pendente',
  'sem-conexao': 'Sem conexão',
  erro: 'Erro de sincronização',
};

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function TelaSincronizacao() {
  const sessao = useSessao();
  return <ConteudoSincronizacao key={sessao.status === 'ativa' ? sessao.uid : 'local'} />;
}

function ConteudoSincronizacao() {
  const [consulta, setConsulta] = useState<Awaited<ReturnType<typeof syncService.consultar>> | null>(null);
  const sessao = useSessao();
  const recarregar = useRef<(() => void) | null>(null);
  const [erro, setErro] = useState<CodigoSincronizacao | null>(null);
  const [salvandoPreferencia, setSalvandoPreferencia] = useState(false);
  const [erroPreferencia, setErroPreferencia] = useState(false);
  const salvando = useRef(false);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    let pedido = 0;
    function carregar() {
      const atual = ++pedido;
      void syncService.consultar().then((resultado) => {
        if (!ativo || pedido !== atual) return;
        setConsulta(resultado);
        setErro(null);
      }).catch((falha: unknown) => {
        if (!ativo || pedido !== atual) return;
        setConsulta(null);
        setErro(falha instanceof Error && falha.message === 'EX08' ? 'EX08' : 'EX07');
      });
    }
    recarregar.current = carregar;
    const cancelar = syncService.assinar(carregar);
    carregar();
    return () => {
      ativo = false;
      recarregar.current = null;
      cancelar();
    };
  }, []));

  const estado = consulta?.estado;
  const automatica = estado?.sincronizacaoAutomatica;
  const mensagem = erro ? mensagensSincronizacao[erro]
    : estado?.codigo === 'EX01' && automatica === false
      ? 'Sem conexão. Suas alterações continuam guardadas no aparelho.'
    : estado?.codigo && estado.codigo !== 'EX04' ? mensagensSincronizacao[estado.codigo] : null;

  async function alternarSincronizacaoAutomatica() {
    if (sessao.status !== 'ativa' || automatica === undefined || salvando.current) return;
    salvando.current = true;
    setSalvandoPreferencia(true);
    setErroPreferencia(false);
    try {
      await alterarSincronizacaoAutomatica(sessao.uid, !automatica);
      setConsulta((atual) => atual && {
        ...atual,
        estado: { ...atual.estado, sincronizacaoAutomatica: !automatica },
      });
    } catch {
      setErroPreferencia(true);
    } finally {
      salvando.current = false;
      setSalvandoPreferencia(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <FlatList
        data={consulta?.pendencias ?? []}
        keyExtractor={({ tipo, id }) => `${tipo}:${id}`}
        contentContainerStyle={estilos.conteudo}
        ListHeaderComponent={
          <View style={estilos.cabecalho}>
            <Pressable accessibilityRole="button" style={estilos.voltar}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <Text style={estilos.voltarTexto}>Voltar</Text>
            </Pressable>
            <Text accessibilityRole="header" style={estilos.titulo}>Sincronização</Text>
            <View style={estilos.cartao} accessibilityLiveRegion="polite">
              {estado ? (
                <>
                  <Text style={estilos.destaque}>
                    {estado.sincronizando ? 'Sincronizando…' : rotulos[estado.status]}
                  </Text>
                  <Text style={estilos.texto}>
                    Última sincronização{'\n'}
                    {estado.ultimaSincronizacao ? dataHora.format(new Date(estado.ultimaSincronizacao)) : 'Ainda não realizada'}
                  </Text>
                  <Text style={estilos.texto}>Pendências: {estado.quantidadePendencias}</Text>
                </>
              ) : !erro ? <ActivityIndicator color={cores.primaria} /> : null}
              {mensagem ? <Text style={estilos.texto}>{mensagem}</Text> : null}
            </View>
            {sessao.status === 'ativa' && automatica !== undefined ? (
              <View>
                <ItemInterruptor
                  rotulo="Sincronização automática"
                  valor={automatica}
                  desabilitado={salvandoPreferencia}
                  onAlternar={() => void alternarSincronizacaoAutomatica()}
                  testID="sincronizacao-automatica"
                />
                {automatica === false ? (
                  <Text style={estilos.texto}>
                    Os novos registros ficam neste aparelho até você tocar em Sincronizar agora.
                  </Text>
                ) : null}
                {erroPreferencia ? (
                  <Text accessibilityRole="alert" style={estilos.erroPreferencia}>
                    Não foi possível salvar a preferência. Tente novamente.
                  </Text>
                ) : null}
              </View>
            ) : null}
            {erro ? (
              <Pressable accessibilityRole="button" style={estilos.botao} onPress={() => recarregar.current?.()}>
                <Text style={estilos.botaoTexto}>Tentar novamente</Text>
              </Pressable>
            ) : null}
            {sessao.status === 'sem-sessao' || estado?.codigo === 'EX02' ? (
              <>
                {sessao.status === 'sem-sessao' ? (
                  <Text style={estilos.texto}>A sincronização está inativa. Seus dados estão só neste aparelho.</Text>
                ) : null}
                <Pressable accessibilityRole="button" style={estilos.botao}
                  onPress={() => router.push('/conta/entrar')}>
                  <Text style={estilos.botaoTexto}>Entrar</Text>
                </Pressable>
                {sessao.status === 'sem-sessao' ? (
                  <Pressable accessibilityRole="button" style={estilos.botao}
                    onPress={() => router.push('/conta/cadastro')}>
                    <Text style={estilos.botaoTexto}>Criar conta</Text>
                  </Pressable>
                ) : null}
              </>
            ) : estado ? (
              <Pressable accessibilityRole="button"
                accessibilityState={{ disabled: estado.sincronizando || salvandoPreferencia, busy: estado.sincronizando }}
                disabled={estado.sincronizando || salvandoPreferencia}
                onPress={() => void syncService.sincronizarAgora()}
                style={estilos.botao}>
                <Text style={estilos.botaoTexto}>
                  {estado.codigo === 'EX03' || estado.codigo === 'EX05' ? 'Tentar de novo' : 'Sincronizar agora'}
                </Text>
              </Pressable>
            ) : null}
            <Text accessibilityRole="header" style={estilos.destaque}>Alterações pendentes</Text>
          </View>
        }
        ListEmptyComponent={estado ? <Text style={estilos.texto}>Nenhuma alteração pendente.</Text> : undefined}
        renderItem={({ item }) => (
          <View style={estilos.cartao}>
            <Text style={estilos.destaque}>{item.titulo}</Text>
            <Text style={estilos.texto}>
              {item.tipo} · {item.alteracao} · {item.estado === 'erro' ? 'Erro' : 'Pendente'}
            </Text>
            {item.estado === 'erro' ? (
              <>
                <Text style={estilos.texto}>{mensagensSincronizacao.EX04}</Text>
                <Pressable accessibilityRole="button" disabled={estado?.sincronizando}
                  accessibilityLabel={`Tentar de novo: ${item.titulo}`}
                  onPress={() => void syncService.sincronizarAgora()} style={estilos.botao}>
                  <Text style={estilos.botaoTexto}>Tentar de novo</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={estilos.separador} />}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, paddingBottom: 32 },
  cabecalho: { gap: 12, marginBottom: 12 },
  voltar: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  voltarTexto: { color: cores.primaria, fontSize: 16, fontWeight: '600' },
  titulo: { color: cores.marinho, fontSize: 26, fontWeight: '700' },
  destaque: { color: cores.marinho, fontSize: 16, fontWeight: '700' },
  texto: { color: cores.textoSuave, fontSize: 15 },
  erroPreferencia: { color: cores.erro, fontSize: 15 },
  cartao: {
    gap: 6, padding: 12, backgroundColor: cores.fundoSuave,
    borderColor: cores.borda, borderWidth: 1, borderRadius: raio.cartao,
  },
  botao: {
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
    padding: 12, borderRadius: raio.botao, backgroundColor: cores.primaria,
  },
  botaoTexto: { color: cores.branco, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  separador: { height: 8 },
});
