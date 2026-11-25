export interface Feedback {
  tipo: 'sucesso' | 'erro';
  texto: string;
}

let atual: Feedback | null = null;

export const META_CRIADA: Feedback = { tipo: 'sucesso', texto: 'Meta criada no dispositivo.' };
export const META_SALVA: Feedback = { tipo: 'sucesso', texto: 'Alterações salvas no dispositivo.' };
export const META_EXCLUIDA: Feedback = { tipo: 'sucesso', texto: 'Meta excluída.' };

export function setFeedback(f: Feedback) {
  atual = f;
}

export function consumirFeedback(): Feedback | null {
  const f = atual;
  atual = null;
  return f;
}
