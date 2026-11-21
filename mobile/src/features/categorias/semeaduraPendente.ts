import { CATEGORIAS_PADRAO } from './types';
import { normalizarNome } from './validation';

/**
 * Sinal de reavaliação única da semeadura após uma exclusão bem-sucedida.
 * Só é marcado quando o nome excluído pertence ao conjunto reservado; o próximo
 * foco da lista consome o sinal e tenta a semeadura uma única vez.
 */
let pendente = false;

export function solicitarSemeaduraAposExclusao(nomeNormalizado: string): void {
  const alvo = normalizarNome(nomeNormalizado);
  if (CATEGORIAS_PADRAO.some((nome) => normalizarNome(nome) === alvo)) {
    pendente = true;
  }
}

/** Consome a solicitação; retorna true no máximo uma vez. */
export function consumirSolicitacaoSemeadura(): boolean {
  const valor = pendente;
  pendente = false;
  return valor;
}

/** Uso restrito a testes: limpa o sinal entre cenários. */
export function limparSolicitacaoSemeadura(): void {
  pendente = false;
}
