import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { DialogoConta } from '@/components/conta/DialogoConta';
import { TelaConta } from '@/components/conta/TelaConta';
import { mensagemDoErro } from '@/features/conta/erros';
import { obterServicoConta } from '@/features/conta/service';
import { ErroConta } from '@/features/conta/types';
import { MSG } from '@/features/conta/validation';

/** Fluxo E (RF01): confirmar o e-mail, reenviar a ligação (FA07) e decidir sobre os dados do aparelho (E5). */
export default function ConfirmarEmail() {
  const { email = '', aviso } = useLocalSearchParams<{ email?: string; aviso?: string }>();
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [erro, setErro] = useState<string | null>(aviso === 'nao-confirmado' ? MSG.emailNaoConfirmado : null);
  const [info, setInfo] = useState<string | null>(null);
  const [perguntarEnvio, setPerguntarEnvio] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function jaConfirmei() {
    setErro(null);
    setInfo(null);
    setVerificando(true);
    try {
      const confirmado = await obterServicoConta().verificarConfirmacao(email);
      if (confirmado) setPerguntarEnvio(true); // E4-E5: cadastro confirmado, sessão iniciada
      else setErro(MSG.emailNaoConfirmado); // EX11
    } catch (e) {
      setErro(mensagemDoErro(e)); // EX03 e EX06 (a ligação pode ser reenviada)
    } finally {
      setVerificando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setInfo(null);
    setReenviando(true);
    try {
      await obterServicoConta().reenviarConfirmacao(email);
      setInfo(`Enviamos uma nova ligação para ${email}. Ela tem prazo de validade.`);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setReenviando(false);
    }
  }

  async function enviarDados() {
    setEnviando(true);
    try {
      await obterServicoConta().enviarDadosDoAparelho();
    } catch (e) {
      if (!(e instanceof ErroConta) || e.codigo !== 'sem-conexao') {
        setErro(mensagemDoErro(e));
        setPerguntarEnvio(false);
        return;
      }
    } finally {
      setEnviando(false);
    }
    concluir();
  }

  function concluir() {
    setPerguntarEnvio(false);
    router.replace('/');
  }

  return (
    <TelaConta
      titulo="Confirme seu e-mail"
      subtitulo={`Enviamos uma ligação de confirmação para ${email}. Confirme o e-mail para ativar a conta. A ligação tem prazo de validade.`}
      onVoltar={() => router.replace('/conta/entrar')}
    >
      {info ? <Aviso tipo="sucesso" texto={info} /> : null}
      {erro ? <Aviso tipo="erro" texto={erro} /> : null}

      <Botao rotulo="Já confirmei" onPress={jaConfirmei} carregando={verificando} testID="ja-confirmei" />
      <Botao rotulo="Reenviar ligação" tipo="contorno" onPress={reenviar} carregando={reenviando} testID="reenviar" />

      <DialogoConta
        testID="dialogo-enviar-dados"
        visivel={perguntarEnvio}
        titulo="Enviar seus dados para a conta?"
        texto="Você já tem registros neste aparelho. Quer enviá-los para a conta, para ter uma cópia e poder restaurá-los em outro aparelho?"
        acoes={[
          { rotulo: 'Enviar meus dados', onPress: enviarDados, carregando: enviando },
          { rotulo: 'Não enviar', tipo: 'link', onPress: concluir }, // FA01: dados só no aparelho
        ]}
      />
    </TelaConta>
  );
}
