import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { CampoSenha } from '@/components/conta/CampoSenha';
import { TelaConta } from '@/components/conta/TelaConta';
import { Campo } from '@/components/receitas/Campo';
import { criarAuthFirebase } from '@/features/conta/auth.firebase';
import { obterSessao } from '@/features/conta/sessao';
import { ErroConta, type SessionState } from '@/features/conta/types';
import { MSG, validarEmail, validarSenhaNova } from '@/features/conta/validation';

type Perfil = Extract<SessionState, { status: 'ativa' }>;

export function EditarPerfil({ perfil, voltar }: { perfil: Perfil; voltar: () => void }) {
  const chave = `@unicash/email-pendente:${perfil.uid}`;
  const [email, setEmail] = useState(perfil.email);
  const [pendente, setPendente] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroEmail, setErroEmail] = useState<string>();
  const [erroSenha, setErroSenha] = useState<string>();
  const [erroAtual, setErroAtual] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const executando = useRef(false);

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(chave).then(
      (valor) => { if (ativo) setPendente(valor); },
      () => { if (ativo) setErro('Não foi possível carregar a troca de e-mail pendente.'); },
    ).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [chave]);

  async function executar(acao: 'salvar' | 'reenviar' | 'confirmar') {
    if (carregando || executando.current) return;
    const sessao = obterSessao();
    if (sessao.status !== 'ativa' || sessao.uid !== perfil.uid) return;

    const destino = acao === 'salvar' ? email.trim() : pendente;
    const trocarEmail = acao === 'reenviar' ||
      (acao === 'salvar' && destino?.toLowerCase() !== perfil.email.toLowerCase());
    const senha = acao === 'salvar' ? novaSenha : '';
    const emailInvalido = acao === 'salvar' ? validarEmail(email) : undefined;
    const senhaInvalida = senha ? validarSenhaNova(senha) : undefined;
    const atualInvalida = (trocarEmail || senha) && !senhaAtual ? MSG.senhaVazia : undefined;

    setErroEmail(emailInvalido);
    setErroSenha(senhaInvalida);
    setErroAtual(atualInvalida);
    setErro(undefined);
    setAviso(undefined);
    if (emailInvalido || senhaInvalida || atualInvalida) {
      setSenhaAtual('');
      setNovaSenha('');
      return;
    }
    if (acao === 'salvar' && !trocarEmail && !senha) {
      voltar();
      return;
    }

    executando.current = true;
    setCarregando(true);
    let enviou = false;
    const auth = criarAuthFirebase();
    try {
      if (acao === 'confirmar' && destino) {
        await auth.confirmEmailChange(undefined, destino);
        await AsyncStorage.removeItem(chave);
        setPendente(null);
        setEmail(destino);
        setAviso('Novo e-mail confirmado.');
        return;
      }
      if (trocarEmail && destino) {
        await AsyncStorage.setItem(chave, destino);
        try {
          await auth.requestEmailChange({ novoEmail: destino, senhaAtual });
        } catch (falha) {
          if (pendente) await AsyncStorage.setItem(chave, pendente);
          else await AsyncStorage.removeItem(chave);
          throw falha;
        }
        enviou = true;
        setPendente(destino);
        setAviso('Ligação enviada ao novo e-mail. O e-mail atual continua valendo até a confirmação.');
      }
      if (senha) {
        await auth.changePassword({ senhaAtual, novaSenha: senha });
        setAviso(enviou
          ? 'Senha alterada. A ligação foi enviada ao novo e-mail, que ainda aguarda confirmação.'
          : 'Senha alterada.');
      }
    } catch (falha) {
      const codigo = falha instanceof ErroConta ? falha.codigo : undefined;
      if (enviou) setErro('A ligação foi enviada, mas não foi possível confirmar a alteração da senha.');
      else if (codigo === 'email-em-uso') setErroEmail(MSG.emailEmUso);
      else if (codigo === 'credenciais') setErroAtual('Confira a senha atual e tente novamente.');
      else if (codigo === 'sem-conexao') setErro('Sem conexão. Conecte-se à internet para alterar o perfil.');
      else if (codigo === 'ligacao-invalida') setErro(MSG.ligacaoInvalida);
      else if (codigo === 'email-nao-confirmado') {
        setErro('Este e-mail ainda não foi confirmado. Abra a ligação enviada ao novo e-mail ou peça um reenvio.');
      } else {
        setErro('Não foi possível concluir a operação. Tente novamente.');
      }
    } finally {
      setSenhaAtual('');
      setNovaSenha('');
      setCarregando(false);
      executando.current = false;
    }
  }

  return (
    <TelaConta titulo="Editar perfil" onVoltar={() => { if (!carregando) voltar(); }}>
      <Campo rotulo="E-mail" value={email} onChangeText={setEmail} erro={erroEmail}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!carregando} />
      <CampoSenha rotulo="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual}
        erro={erroAtual} editable={!carregando} />
      <CampoSenha rotulo="Nova senha (opcional)" value={novaSenha} onChangeText={setNovaSenha}
        erro={erroSenha} editable={!carregando} />
      {erro && <Aviso tipo="erro" texto={erro} />}
      {aviso && <Aviso tipo="info" texto={aviso} />}
      <Botao rotulo="Salvar" onPress={() => void executar('salvar')} carregando={carregando} />
      {pendente && (
        <>
          <Aviso tipo="info" texto={`Confirmação pendente para ${pendente}.`} />
          <Botao rotulo="Já confirmei" tipo="contorno" onPress={() => void executar('confirmar')} desabilitado={carregando} />
          <Botao rotulo="Reenviar" tipo="link" onPress={() => void executar('reenviar')} desabilitado={carregando} />
        </>
      )}
      <Botao rotulo="Cancelar" tipo="link" onPress={voltar} desabilitado={carregando} />
    </TelaConta>
  );
}
