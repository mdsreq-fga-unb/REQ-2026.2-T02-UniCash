import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Aviso } from './Aviso';
import { Botao } from './Botao';
import { CampoSenha } from './CampoSenha';
import { TelaConta } from './TelaConta';
import { solicitarExclusaoConta } from '@/features/conta/remocao';
import { ErroConta } from '@/features/conta/types';

export function ExcluirConta({ voltar }: { voltar: () => void }) {
  const ocupada = useRef(false);
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [recebido, setRecebido] = useState(false);
  const [erro, setErro] = useState('');

  async function confirmar() {
    if (ocupada.current || !senha) return;
    ocupada.current = true;
    setEnviando(true);
    setErro('');
    try {
      await solicitarExclusaoConta(senha, () => setRecebido(true));
    } catch (falha) {
      const codigo = falha instanceof ErroConta ? falha.codigo : null;
      setErro(codigo === 'credenciais'
        ? 'A senha atual está incorreta.'
        : codigo === 'sem-conexao'
          ? 'Conecte-se à internet para confirmar o pedido.'
          : 'Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setEnviando(false);
      setSenha('');
      ocupada.current = false;
    }
  }

  if (recebido) {
    return (
      <TelaConta titulo="Solicitação de exclusão recebida"
        subtitulo="A exclusão na nuvem está pendente de processamento.">
        {erro ? <Aviso tipo="erro" texto="A limpeza local será retomada ao reabrir o app." /> : null}
        <Botao rotulo="Voltar à entrada" desabilitado={enviando}
          onPress={() => router.replace('/conta/entrar')} />
      </TelaConta>
    );
  }

  return (
    <TelaConta titulo="Excluir conta"
      subtitulo="Confirme com a senha atual. Esta operação apaga os dados desta conta neste aparelho e solicita a exclusão na nuvem.">
      {erro ? <Aviso tipo="erro" texto={erro} /> : null}
      <CampoSenha rotulo="Senha atual" value={senha} onChangeText={setSenha} editable={!enviando} />
      <Botao rotulo="Confirmar exclusão" onPress={confirmar} carregando={enviando} desabilitado={!senha} />
      <Botao rotulo="Cancelar" onPress={voltar} tipo="link" desabilitado={enviando} />
    </TelaConta>
  );
}
