export interface Feedback {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

let atual: Feedback | null = null;

/** Mensagens de confirmação exibidas na lista ao voltar de outra tela (EX05). */
export const CATEGORIA_CRIADA: Feedback = { tipo: 'sucesso', texto: 'Categoria criada no dispositivo.' };
export const CATEGORIA_SALVA: Feedback = { tipo: 'sucesso', texto: 'Alterações salvas no dispositivo.' };
export const CATEGORIA_EXCLUIDA: Feedback = { tipo: 'sucesso', texto: 'Categoria excluída.' };

/** Mensagem exibida uma única vez na lista de categorias ao voltar de outra tela. */
export function setFeedback(f: Feedback) {
  atual = f;
}

export function consumirFeedback(): Feedback | null {
  const f = atual;
  atual = null;
  return f;
}
