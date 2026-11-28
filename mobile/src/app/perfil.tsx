import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconePrototipo, type NomeIcone } from '@/components/IconePrototipo';
import { SecaoNotificacoes } from '@/components/perfil/SecaoNotificacoes';
import { EntradaTutorial } from '@/components/tutorial/EntradaTutorial';
import { useSessao } from '@/features/conta/sessao';
import { mensagensSincronizacao } from '@/features/sincronizacao/contrato';
import { syncService } from '@/features/sincronizacao/service';
import { useEstadoSincronizacao } from '@/features/sincronizacao/useEstadoSincronizacao';
import { cores, raio } from '@/lib/theme';

const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Perfil() {
  const sessao = useSessao();
  const ativa = sessao.status === 'ativa';
  const nome = ativa ? sessao.nome : undefined;
  const iniciais = nome
    ? nome.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()
    : ativa ? sessao.email.slice(0, 2).toUpperCase() : null;
  const abrirConta = () => router.push('/conta');

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <Text style={estilos.tituloTela} accessibilityRole="header">Perfil e configurações</Text>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cartaoUsuario}>
          <View style={estilos.avatar}>
            {iniciais ? <Text style={estilos.iniciais}>{iniciais}</Text> : <IconePrototipo nome="perfil" />}
          </View>
          <View style={estilos.dadosUsuario}>
            <Text style={estilos.usuario}>{nome ?? (ativa ? 'Minha conta' : 'Usando sem conta')}</Text>
            {ativa ? <Text style={estilos.textoSuave}>{sessao.email}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ativa ? 'Editar perfil' : 'Entrar ou criar conta'}
            onPress={() => {
              if (ativa) router.push({ pathname: '/conta', params: { editar: '1' } });
              else abrirConta();
            }}
            style={estilos.editar}
          >
            <IconePrototipo nome={ativa ? 'editar' : 'direita'} tamanho={16} />
          </Pressable>
        </View>

        <CartaoSincronizacao key={ativa ? `sincronizacao-${sessao.uid}` : 'sincronizacao-local'} contaAtiva={ativa} />
        <SecaoNotificacoes key={ativa ? `notificacoes-${sessao.uid}` : 'notificacoes-local'} />

        <View>
          <Text style={estilos.tituloSecao} accessibilityRole="header">Geral</Text>
          <Linha rotulo="Ajuda" icone="ajuda" onPress={() => router.push('/ajuda')} />
          <EntradaTutorial texto="Ver tutorial novamente"
            renderAcao={({ texto, desabilitada, onPress }) => (
              <Linha rotulo={texto} icone="tutorial" desabilitada={desabilitada} onPress={onPress} />
            )}
          />
        </View>

        <View>
          <Text style={estilos.tituloSecao} accessibilityRole="header">Conta</Text>
          <Linha rotulo={ativa ? 'Gerenciar conta' : 'Entrar ou criar conta'} onPress={abrirConta} />
          <Linha rotulo="Conquistas" testID="abrir-conquistas" onPress={() => router.push('/conquistas')} />
        </View>

        <View>
          <Text style={estilos.tituloSecao} accessibilityRole="header">Finanças</Text>
          <Linha rotulo="Categorias" onPress={() => router.push('/categorias')} />
          <Linha rotulo="Configurações financeiras" onPress={() => router.push('/configuracoes-financeiras')} />
          <Linha rotulo="Preferências de alertas" onPress={() => router.push('/preferencias-alertas')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CartaoSincronizacao({ contaAtiva }: { contaAtiva: boolean }) {
  const { estado, falhou, recarregar } = useEstadoSincronizacao();
  const abrirDetalhes = () => router.push('/sincronizacao');
  const status = estado?.sincronizando ? 'Sincronizando…'
    : estado?.status === 'sem-conexao' ? 'Offline'
    : !contaAtiva ? 'Inativa'
    : estado?.status === 'erro' || falhou ? 'Falha na sincronização'
    : estado?.codigo === 'EX02' ? 'Sessão expirada'
    : estado?.status === 'sincronizado' ? 'Sincronizado' : 'Pendente';
  const ultima = estado?.ultimaSincronizacao;
  const descricao = falhou ? mensagensSincronizacao.EX07
    : !contaAtiva ? 'Seus dados continuam salvos neste dispositivo.'
    : estado?.codigo ? mensagensSincronizacao[estado.codigo] : null;
  const tentarDeNovo = falhou || estado?.status === 'erro';
  const entrar = estado?.codigo === 'EX02' || !contaAtiva;
  const acao = tentarDeNovo ? 'Tentar novamente'
    : entrar ? 'Entrar' : estado?.sincronizando ? 'Sincronizando…' : 'Sincronizar agora';

  function agir() {
    if (falhou) recarregar();
    else if (entrar) router.push('/conta/entrar');
    else void syncService.sincronizarAgora();
  }

  return (
    <View style={estilos.cartaoSync}>
      <Pressable accessibilityRole="button" accessibilityLabel="Detalhes da sincronização"
        onPress={abrirDetalhes} style={estilos.linhaSync}>
        <Text style={estilos.tituloSecao}>Sincronização</Text>
        {estado || falhou ? <Text style={estilos.status}>{status}</Text> : null}
      </Pressable>
      {!estado && !falhou ? <ActivityIndicator color={cores.primaria} /> : (
        <>
          {descricao ? <Text style={estilos.textoSuave}>{descricao}</Text> : null}
          {contaAtiva && !falhou ? (
            <Text style={estilos.textoSuave}>
              Última sincronização: {ultima ? dataHora.format(new Date(ultima)) : 'ainda não realizada'}
            </Text>
          ) : null}
          <Pressable accessibilityRole="button" disabled={estado?.sincronizando}
            onPress={agir} style={estilos.botaoSync}>
            <IconePrototipo nome="sincronizar" tamanho={15} />
            <Text style={estilos.usuario}>{acao}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Linha({ rotulo, icone, testID, desabilitada, onPress }: {
  rotulo: string;
  icone?: NomeIcone;
  testID?: string;
  desabilitada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" testID={testID} disabled={desabilitada}
      onPress={onPress} style={estilos.linha}>
      {icone ? <IconePrototipo nome={icone} tamanho={18} /> : null}
      <Text style={estilos.linhaTexto}>{rotulo}</Text>
      <IconePrototipo nome="direita" tamanho={12} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  tituloTela: { fontSize: 18, fontWeight: '600', color: cores.marinho, paddingHorizontal: 16, paddingVertical: 10 },
  conteudo: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  cartaoUsuario: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 14,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: cores.claro,
    alignItems: 'center', justifyContent: 'center',
  },
  iniciais: { fontSize: 19, fontWeight: '600', color: cores.primaria },
  dadosUsuario: { flex: 1 },
  usuario: { fontSize: 15, fontWeight: '600', color: cores.marinho },
  editar: { minHeight: 44, minWidth: 36, justifyContent: 'center', alignItems: 'center' },
  textoSuave: { fontSize: 13, color: cores.primaria, lineHeight: 18 },
  cartaoSync: {
    padding: 14, gap: 8, borderWidth: 1, borderColor: cores.primaria,
    borderRadius: raio.cartao, backgroundColor: cores.fundoSuave,
  },
  linhaSync: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  status: {
    color: cores.branco, backgroundColor: cores.primaria, fontSize: 11, borderRadius: raio.pilula,
    paddingVertical: 4, paddingHorizontal: 8, overflow: 'hidden',
  },
  botaoSync: {
    flexDirection: 'row', minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.borda, borderRadius: raio.botao,
  },
  tituloSecao: { fontSize: 16, fontWeight: '600', color: cores.marinho },
  linha: {
    minHeight: 44, alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: cores.borda,
  },
  linhaTexto: { flex: 1, fontSize: 15, color: cores.marinho },
});
