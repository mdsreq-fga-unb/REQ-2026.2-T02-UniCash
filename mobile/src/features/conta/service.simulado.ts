import { definirSessao } from './sessao';
import { ErroConta, type ContaService } from './types';

/**
 * Serviço simulado (DoR): permite rodar as telas sem Firebase e sem enviar e-mails reais.
 * Os controles abaixo servem para exercitar as exceções à mão.
 */
export const controlesSimulacao = {
  online: true,
  pendentes: 0,
  /** Contas já cadastradas (EX02): e-mail → { senha, confirmada }. */
  contas: new Map<string, { senha: string; confirmada: boolean }>([
    ['teste@unicash.app', { senha: 'Senha@123', confirmada: true }],
  ]),
};

const espera = () => new Promise<void>((r) => setTimeout(r, 400));

async function exigirConexao() {
  await espera();
  if (!controlesSimulacao.online) throw new ErroConta('sem-conexao');
}

export function criarServicoSimulado(): ContaService {
  const { contas } = controlesSimulacao;
  return {
    async cadastrar({ email, senha }) {
      await exigirConexao();
      const chave = email.trim().toLowerCase();
      if (contas.has(chave)) throw new ErroConta('email-em-uso');
      contas.set(chave, { senha, confirmada: false });
    },
    async verificarConfirmacao(email) {
      await exigirConexao();
      const chave = email.trim().toLowerCase();
      const conta = contas.get(chave);
      if (!conta) throw new ErroConta('ligacao-invalida');
      // Na simulação, "Já confirmei" confirma na segunda tentativa.
      if (!conta.confirmada) {
        conta.confirmada = true;
        return false;
      }
      definirSessao({ status: 'ativa', uid: chave, email: chave });
      return true;
    },
    async reenviarConfirmacao() {
      await exigirConexao();
    },
    async enviarDadosDoAparelho() {
      await exigirConexao();
    },
    async entrar({ email, senha }) {
      await exigirConexao();
      const chave = email.trim().toLowerCase();
      const conta = contas.get(chave);
      if (!conta || conta.senha !== senha) throw new ErroConta('credenciais');
      if (!conta.confirmada) throw new ErroConta('email-nao-confirmado');
      definirSessao({ status: 'ativa', uid: chave, email: chave });
    },
    async enviarRecuperacao() {
      await exigirConexao();
    },
    async redefinirSenha({ codigo }) {
      await exigirConexao();
      if (!codigo || codigo === 'expirado') throw new ErroConta('ligacao-invalida');
    },
    async contarPendentes() {
      return controlesSimulacao.pendentes;
    },
    async sincronizarAgora() {
      await exigirConexao();
      controlesSimulacao.pendentes = 0;
    },
    async sair() {
      await espera();
      definirSessao({ status: 'sem-sessao' });
    },
  };
}
