import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
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
import { validarCadastro, type ErrosConta } from '@/features/conta/validation';
import { salvarContinuidadeSemConta } from '@/features/conta/onboarding';
import { cores } from '@/lib/theme';

/** [A2] Cadastro · acesso opcional — fluxo A (RF01). */
export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosConta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  async function criar() {
    setErroGeral(null);
    const e = validarCadastro({ email, senha }); // A4: validação no aparelho, antes de enviar (RNF04)
    setErros(e);
    if (Object.keys(e).length > 0) {
      setSenha(''); // EX01: dados preservados, exceto a senha
      return;
    }

    setCriando(true);
    try {
      await obterServicoConta().cadastrar({ email: email.trim(), senha, nome: nome.trim() || undefined });
      // A6: a sessão só começa depois da confirmação (fluxo E)
      router.replace({ pathname: '/conta/confirmar-email', params: { email: email.trim() } });
    } catch (err) {
      if (err instanceof ErroConta && err.codigo === 'email-em-uso') {
        setErros({ email: mensagemDoErro(err) }); // EX02
      } else {
        setErroGeral(mensagemDoErro(err)); // EX03, EX07 e EX10
      }
      setSenha(''); // dados preservados, exceto a senha
      setCriando(false);
    }
  }

  return (
    <TelaConta
      titulo="Uma conta, se você quiser"
      subtitulo="Criar conta é opcional. Comece a organizar seu dinheiro sem cadastro."
      rodape={<RodapeSemConta />}
    >
      <CartaoSemConta
        onContinuar={() => {
          void salvarContinuidadeSemConta();
          router.replace('/');
        }}
      />

      <Text style={estilos.secao}>OU CRIE UMA CONTA</Text>
      <Campo
        rotulo="Nome (opcional)"
        value={nome}
        onChangeText={setNome}
        placeholder="Como você quer ser chamado?"
        autoComplete="name"
        maxLength={80}
      />
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
        placeholder="Crie uma senha (mín. 8 caracteres)"
        autoComplete="new-password"
        erro={erros.senha}
      />
      <Text style={estilos.dica}>É preciso internet para criar a conta. Seus dados locais serão mantidos.</Text>
      {/* RNF32: finalidade do tratamento dos dados pessoais (texto a validar com a equipe) */}
      <Text style={estilos.dica}>
        Usamos seu e-mail só para criar a conta, confirmar seu acesso, recuperar a senha e sincronizar seus dados.
        Não pedimos CPF.
      </Text>

      {erroGeral ? <Aviso tipo="erro" texto={erroGeral} /> : null}

      <Botao rotulo="Criar conta" tipo="contorno" onPress={criar} carregando={criando} testID="criar-conta" />
      <Botao rotulo="Já tenho conta · Entrar" tipo="link" onPress={() => router.replace('/conta/entrar')} />
    </TelaConta>
  );
}

const estilos = StyleSheet.create({
  secao: { fontSize: 12, fontWeight: '700', color: cores.primaria, marginBottom: 12, letterSpacing: 0.3 },
  dica: { fontSize: 12, color: cores.primaria, marginBottom: 12, lineHeight: 17 },
});
