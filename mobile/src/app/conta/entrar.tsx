import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Campo } from '@/components/receitas/Campo';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { CampoSenha } from '@/components/conta/CampoSenha';
import { CartaoSemConta } from '@/components/conta/CartaoSemConta';
import { RodapeSemConta } from '@/components/conta/RodapeSemConta';
import { TelaConta } from '@/components/conta/TelaConta';
import { mensagemDoErro } from '@/features/conta/erros';
import { obterServicoConta } from '@/features/conta/service';
import { ErroConta } from '@/features/conta/types';
import { validarEntrada, type ErrosConta } from '@/features/conta/validation';
import { cores } from '@/lib/theme';

/** [A1] Login · acesso opcional — fluxo B (RF02). */
export default function Entrar() {
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosConta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setErroGeral(null);
    const e = validarEntrada({ email, senha });
    setErros(e);
    if (Object.keys(e).length > 0) return;

    setEntrando(true);
    try {
      await obterServicoConta().entrar({ email: email.trim(), senha });
      router.replace('/'); // B5: tela inicial
    } catch (err) {
      if (err instanceof ErroConta && err.codigo === 'email-nao-confirmado') {
        // EX11: volta à tela de confirmação, com a opção de reenviar
        router.push({ pathname: '/conta/confirmar-email', params: { email: email.trim(), aviso: 'nao-confirmado' } });
      } else {
        setErroGeral(mensagemDoErro(err, { entrando: true })); // EX04 e EX05: e-mail preservado
      }
      setSenha('');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <TelaConta
      titulo="Entre do seu jeito"
      subtitulo="Use o UniCash sem login ou entre para sincronizar entre dispositivos."
      rodape={<RodapeSemConta />}
    >
      {aviso === 'senha-redefinida' ? (
        <Aviso tipo="sucesso" texto="Senha redefinida. Entre com a nova senha." />
      ) : null}

      <CartaoSemConta onContinuar={() => router.replace('/')} />

      <Text style={estilos.secao}>OU ENTRE NA SUA CONTA</Text>
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        erro={erros.email}
      />
      <CampoSenha
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        placeholder="Digite sua senha"
        autoComplete="current-password"
        erro={erros.senha}
        abaixo={
          <View style={{ alignSelf: 'flex-start' }}>
            <Botao rotulo="Esqueci minha senha" tipo="link" onPress={() => router.push('/conta/recuperar-senha')} />
          </View>
        }
      />
      <Text style={estilos.dica}>É preciso internet para entrar. Sem conexão? Continue sem conta.</Text>

      {erroGeral ? <Aviso tipo="erro" texto={erroGeral} /> : null}

      <Botao rotulo="Entrar" tipo="contorno" onPress={entrar} carregando={entrando} testID="entrar" />
      <View style={{ marginTop: 8 }}>
        <Botao rotulo="Não tenho conta · Criar conta" tipo="link" onPress={() => router.replace('/conta/cadastro')} />
      </View>
    </TelaConta>
  );
}

const estilos = StyleSheet.create({
  secao: { fontSize: 12, fontWeight: '700', color: cores.primaria, marginBottom: 12, letterSpacing: 0.3 },
  dica: { fontSize: 12, color: cores.primaria, marginBottom: 16, lineHeight: 17 },
});
