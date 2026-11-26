import { ErroConta } from './types';
import { MSG } from './validation';

/** Traduz o erro do serviço na mensagem do caso de uso. `entrando` troca o texto de EX03/EX05. */
export function mensagemDoErro(e: unknown, opts: { entrando?: boolean } = {}): string {
  const codigo = e instanceof ErroConta ? e.codigo : 'falha';
  switch (codigo) {
    case 'sem-conexao':
      return opts.entrando ? MSG.semConexaoEntrar : MSG.semConexaoContinuar;
    case 'email-em-uso':
      return MSG.emailEmUso;
    case 'credenciais':
      return MSG.credenciaisRejeitadas;
    case 'email-nao-confirmado':
      return MSG.emailNaoConfirmado;
    case 'ligacao-invalida':
      return MSG.ligacaoInvalida;
    case 'regras-recusadas':
      return (e as ErroConta).motivo ?? MSG.falhaCriarConta;
    default:
      return MSG.falhaCriarConta;
  }
}
