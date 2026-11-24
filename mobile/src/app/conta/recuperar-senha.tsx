import { useState } from 'react';
import { router } from 'expo-router';
import { Campo } from '@/components/receitas/Campo';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { TelaConta } from '@/components/conta/TelaConta';
import { mensagemDoErro } from '@/features/conta/erros';
import { obterServicoConta } from '@/features/conta/service';
import { validarEmail } from '@/features/conta/validation';

/** Fluxo C, passos 1-2 (RF31): pedir a ligação temporária de redefinição. */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setErroGeral(null);
    const e = validarEmail(email);
    setErroEmail(e);
    if (e) return;

    setEnviando(true);
    try {
      await obterServicoConta().enviarRecuperacao(email.trim());
      setEnviado(true); // resposta neutra: não revela se a conta existe
    } catch (err) {
      setErroGeral(mensagemDoErro(err)); // EX03: dados preservados
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaConta
      titulo="Recuperar senha"
      subtitulo="Informe o e-mail da conta para receber uma ligação de redefinição."
      onVoltar={() => router.back()}
    >
      {enviado ? (
        <>
          <Aviso
            tipo="sucesso"
            texto={`Se existir uma conta com esse e-mail, a ligação foi enviada. Ela tem prazo de validade e só pode ser usada uma vez.`}
          />
          <Botao rotulo="Voltar para entrar" onPress={() => router.replace('/conta/entrar')} />
        </>
      ) : (
        <>
          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            erro={erroEmail}
          />
          {erroGeral ? <Aviso tipo="erro" texto={erroGeral} /> : null}
          <Botao rotulo="Enviar ligação" onPress={enviar} carregando={enviando} testID="enviar-recuperacao" />
          <Botao rotulo="Cancelar" tipo="link" onPress={() => router.back()} />
        </>
      )}
    </TelaConta>
  );
}
