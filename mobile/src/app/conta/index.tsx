import { useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { DialogoConta } from '@/components/conta/DialogoConta';
import { EditarPerfil } from '@/components/conta/EditarPerfil';
import { TelaConta } from '@/components/conta/TelaConta';
import { AutorizacaoDeRemocaoIndisponivel, remocaoConta } from '@/features/conta/remocao';
import { salvarContinuidadeSemConta } from '@/features/conta/onboarding';
import { obterServicoConta } from '@/features/conta/service';
import { useSessao } from '@/features/conta/sessao';
import { MSG } from '@/features/conta/validation';
import { cores } from '@/lib/theme';

/**
 * Área "Conta" (fluxo principal). Com sessão: encerrar sessão (fluxo D, RF06).
 * Sem sessão: segue para a entrada (A1), de onde se cria conta ou recupera a senha (FA06 vale ao contrário).
 */
export default function Conta() {
  const sessao = useSessao();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [excluida, setExcluida] = useState(false);
  const exclusaoEmAndamento = useRef(false);
  const [editando, setEditando] = useState(false);
  const [encerrada, setEncerrada] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<number | null>(null); // FA03
  const [sincronizando, setSincronizando] = useState(false);
  const [erroDialogo, setErroDialogo] = useState<string | null>(null);

  async function sair() {
    setErro(null);
    setErroDialogo(null);
    setSaindo(true);
    try {
      await obterServicoConta().sair();
      setPendentes(null);
      setEncerrada(true); // D3: informa que a sessão foi encerrada
    } catch {
      setErro(MSG.falhaSair); // EX09: a sessão continua ativa
    } finally {
      setSaindo(false);
    }
  }

  async function aoAcionarSair() {
    const n = await obterServicoConta()
      .contarPendentes()
      .catch(() => 0);
    if (n > 0) setPendentes(n);
    else await sair();
  }

  async function sincronizarESair() {
    setErroDialogo(null);
    setSincronizando(true);
    try {
      await obterServicoConta().sincronizarAgora();
      await sair();
    } catch {
      // Sem conexão, o usuário pode sair mesmo assim; as alterações ficam no aparelho.
      setErroDialogo('Não foi possível sincronizar agora. Você pode sair mesmo assim: as alterações continuam neste aparelho.');
    } finally {
      setSincronizando(false);
    }
  }

  async function excluirConta() {
    if (sessao.status !== 'ativa' || exclusaoEmAndamento.current) return;
    exclusaoEmAndamento.current = true;
    setExcluindo(true);
    setErro(null);
    try {
      await remocaoConta.excluir(sessao.uid);
      await salvarContinuidadeSemConta();
      setExcluida(true);
    } catch (falha) {
      setErro(falha instanceof AutorizacaoDeRemocaoIndisponivel
        ? 'Não foi possível autorizar a exclusão. Conecte-se à internet e tente novamente.'
        : 'Não foi possível excluir a conta. Nenhuma alteração foi feita. Tente novamente.');
    } finally {
      exclusaoEmAndamento.current = false;
      setConfirmandoExclusao(false);
      setExcluindo(false);
    }
  }

  if (excluida) {
    return (
      <TelaConta titulo="Conta excluída neste aparelho"
        subtitulo="A base local foi apagada. O pedido de remoção no servidor será enviado assim que houver conexão.">
        <Botao rotulo="Continuar sem conta" onPress={() => router.replace('/')} />
      </TelaConta>
    );
  }

  if (confirmandoExclusao && (sessao.status === 'ativa' || excluindo)) {
    return (
      <TelaConta titulo="Excluir conta" onVoltar={() => {
        if (!exclusaoEmAndamento.current) setConfirmandoExclusao(false);
      }}>
        <Aviso tipo="info" texto="Serão removidos o perfil, lançamentos, categorias, metas, conquistas, pontuação, preferências e participações em grupos." />
        <Aviso tipo="info" texto="A base deste aparelho será apagada na confirmação. A remoção no servidor ocorre em até 30 dias e nos backups em até 60 dias." />
        <Aviso tipo="erro" texto="A exclusão é definitiva." />
        <Botao rotulo="Excluir conta definitivamente" tipo="perigo" onPress={excluirConta} carregando={excluindo} />
        <Botao rotulo="Cancelar" tipo="link" onPress={() => setConfirmandoExclusao(false)} desabilitado={excluindo} />
      </TelaConta>
    );
  }

  if (encerrada) {
    return (
      <TelaConta titulo="Sessão encerrada" subtitulo="Seus dados continuam disponíveis neste aparelho.">
        <Botao rotulo="Voltar ao início" onPress={() => router.replace('/')} />
        <Botao rotulo="Entrar de novo" tipo="contorno" onPress={() => router.replace('/conta/entrar')} />
      </TelaConta>
    );
  }

  if (sessao.status === 'sem-sessao') return <Redirect href="/conta/entrar" />;

  if (editando) {
    return <EditarPerfil key={sessao.uid} perfil={sessao} voltar={() => setEditando(false)} />;
  }

  return (
    <TelaConta titulo="Perfil" subtitulo="Sincronização ativa neste aparelho." onVoltar={() => router.back()}>
      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>E-mail</Text>
        <Text style={estilos.email}>{sessao.email}</Text>
      </View>

      {erro ? <Aviso tipo="erro" texto={erro} /> : null}

      <Botao rotulo="Editar perfil" onPress={() => setEditando(true)} />
      <Botao rotulo="Sair" tipo="contorno" onPress={aoAcionarSair} carregando={saindo} testID="sair" />

      <Botao rotulo="Excluir conta" tipo="perigo" onPress={() => setConfirmandoExclusao(true)} desabilitado={saindo} />

      <DialogoConta
        testID="dialogo-pendentes"
        visivel={pendentes !== null}
        titulo="Alterações pendentes"
        texto={`Há ${pendentes ?? 0} ${pendentes === 1 ? 'alteração' : 'alterações'} pendente${pendentes === 1 ? '' : 's'} de sincronização. Quer sincronizar antes de sair?`}
        erro={erroDialogo}
        onFechar={() => setPendentes(null)}
        acoes={[
          { rotulo: 'Sincronizar e sair', onPress: sincronizarESair, carregando: sincronizando },
          { rotulo: 'Sair mesmo assim', tipo: 'contorno', onPress: sair },
          { rotulo: 'Cancelar', tipo: 'link', onPress: () => setPendentes(null) },
        ]}
      />
    </TelaConta>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    backgroundColor: cores.fundoSuave,
    padding: 14,
    marginBottom: 20,
  },
  rotulo: { fontSize: 12, fontWeight: '600', color: cores.primaria },
  email: { fontSize: 15, fontWeight: '600', color: cores.marinho, marginTop: 2 },
});
