export interface Feedback {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

let atual: Feedback | null = null;

/** Mensagem exibida uma única vez na lista de receitas ao voltar de outra tela. */
export function setFeedback(f: Feedback) {
  atual = f;
}

export function consumirFeedback(): Feedback | null {
  const f = atual;
  atual = null;
  return f;
}
