import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { DialogoConta } from '@/components/conta/DialogoConta';
import { apagarBancoSemConta } from '@/db/database';
import { semearCategoriasPadrao } from '@/features/categorias/service';
import { avisarBaseAtualizada } from '@/lib/baseAtualizada';
import { SecaoNotificacoes } from '@/components/perfil/SecaoNotificacoes';
import { useSessao } from '@/features/conta/sessao';
import { cores, raio } from '@/lib/theme';

/** Tela de Perfil (protótipo 06). Nesta entrega: cabeçalho do usuário e seção "Notificações" (UC14, D25). */
export default function Perfil() {
  const sessao = useSessao();
  const ocupado = useRef(false);
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState('');
  const [versaoLocal, setVersaoLocal] = useState(0);

  async function confirmarLimpeza() {
    if (ocupado.current) return;
    ocupado.current = true;
    setApagando(true);
    setErro('');
    try {
      await apagarBancoSemConta();
    } catch {
      setErro('Não foi possível concluir a limpeza. Tente novamente.');
      return;
    } finally {
      ocupado.current = false;
      setApagando(false);
    }
    setConfirmando(false);
    setVersaoLocal(versao => versao + 1);
    try {
      await semearCategoriasPadrao();
    } catch {
      // A abertura da lista de categorias pode repetir a semeadura.
    } finally {
      avisarBaseAtualizada();
    }
  }

  const chave = sessao.status === 'ativa' ? sessao.uid : `local:${versaoLocal}`;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={estilos.voltar}>Voltar</Text>
          </Pressable>
          <View style={estilos.linhaTitulo}>
            <Text style={estilos.tituloTela} accessibilityRole="header">Perfil</Text>
            {/* UC13: entrada da área Conquistas (protótipo 06, "Ação · Conquistas"). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conquistas"
              testID="abrir-conquistas"
              onPress={() => router.push('/conquistas')}
              hitSlop={8}
              style={estilos.acaoConquistas}
            >
              <Text style={estilos.acaoConquistasIcone}>★</Text>
            </Pressable>
          </View>
        </View>

        <View style={estilos.cartao}>
          <Text style={estilos.usuario}>{sessao.status === 'ativa' ? sessao.email : 'Usando sem conta'}</Text>
        </View>

        {/* A chave recarrega as preferências quando o dono muda (RNF03). */}
        <SecaoNotificacoes key={chave} />
        {sessao.status === 'sem-sessao' ? (
          <>
            {versaoLocal > 0 ? <Aviso tipo="sucesso" texto="Dados locais apagados." /> : null}
            <Botao rotulo="Apagar dados deste aparelho" tipo="contorno" onPress={() => {
              setErro('');
              setConfirmando(true);
            }} />
            <DialogoConta
              visivel={confirmando}
              titulo="Apagar dados deste aparelho?"
              texto="As informações salvas no modo sem conta serão removidas deste aparelho."
              erro={erro}
              onFechar={() => { if (!ocupado.current) setConfirmando(false); }}
              acoes={apagando
                ? [{ rotulo: 'Apagar dados', tipo: 'perigo', carregando: true, onPress: confirmarLimpeza }]
                : [
                    { rotulo: 'Apagar dados', tipo: 'perigo', onPress: confirmarLimpeza },
                    { rotulo: 'Cancelar', tipo: 'link', onPress: () => setConfirmando(false) },
                  ]}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 16, gap: 16 },
  cabecalho: { gap: 8 },
  voltar: { color: cores.primaria, fontSize: 15, fontWeight: '600' },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloTela: { fontSize: 22, fontWeight: '700', color: cores.marinho },
  acaoConquistas: {
    width: 36, height: 36, borderRadius: raio.pilula, borderWidth: 1, borderColor: cores.borda,
    alignItems: 'center', justifyContent: 'center',
  },
  acaoConquistasIcone: { fontSize: 18, color: cores.primaria },
  cartao: { borderWidth: 1, borderColor: cores.borda, borderRadius: raio.cartao, padding: 16 },
  usuario: { fontSize: 15, color: cores.marinho },
});
