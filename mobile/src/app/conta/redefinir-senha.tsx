import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Aviso } from '@/components/conta/Aviso';
import { Botao } from '@/components/conta/Botao';
import { CampoSenha } from '@/components/conta/CampoSenha';
import { TelaConta } from '@/components/conta/TelaConta';
import { mensagemDoErro } from '@/features/conta/erros';
import { obterServicoConta } from '@/features/conta/service';
import { ErroConta } from '@/features/conta/types';
import { MSG, validarSenhaNova } from '@/features/conta/validation';

/**
 * Fluxo C, passos 3-5 (RF31): aberta pela ligação do e-mail (unicash://conta/redefinir-senha?codigo=...).
 * Sem código, a ligação é tratada como inválida (EX06).
 */
export default function RedefinirSenha() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [senha, setSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | undefined>();
  const [erroGeral, setErroGeral] = useState<string | null>(codigo ? null : MSG.ligacaoInvalida);
  const [ligacaoInvalida, setLigacaoInvalida] = useState(!codigo);
  const [salvando, setSalvando] = useState(false);

  async function redefinir() {
    setErroGeral(null);
    const e = validarSenhaNova(senha); // mesma política do cadastro (fluxo A, passo 4)
    setErroSenha(e);
    if (e || !codigo) return;

    setSalvando(true);
    try {
      await obterServicoConta().redefinirSenha({ codigo, novaSenha: senha });
      router.replace({ pathname: '/conta/entrar', params: { aviso: 'senha-redefinida' } }); // C5
    } catch (err) {
      if (err instanceof ErroConta && err.codigo === 'ligacao-invalida') setLigacaoInvalida(true); // EX06
      setErroGeral(mensagemDoErro(err));
      setSenha('');
      setSalvando(false);
    }
  }

  return (
    <TelaConta
      titulo="Nova senha"
      subtitulo="Escolha uma senha nova para a sua conta."
      onVoltar={() => router.replace('/conta/entrar')}
    >
      {erroGeral ? <Aviso tipo="erro" texto={erroGeral} /> : null}

      {ligacaoInvalida ? (
        <Botao rotulo="Solicitar nova ligação" onPress={() => router.replace('/conta/recuperar-senha')} />
      ) : (
        <>
          <CampoSenha
            rotulo="Nova senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Mín. 8 caracteres"
            autoComplete="new-password"
            erro={erroSenha}
          />
          <Botao rotulo="Redefinir senha" onPress={redefinir} carregando={salvando} testID="redefinir" />
        </>
      )}
    </TelaConta>
  );
}
