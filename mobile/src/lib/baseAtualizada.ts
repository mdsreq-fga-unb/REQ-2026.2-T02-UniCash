/**
 * Sinal de que a base local mudou por fora da tela em foco: a preparação inicial terminou
 * (guard liberado) ou as rotinas posteriores (recorrências, restauração da nuvem e sincronização)
 * concluíram. Telas que calculam a partir da base, como o resumo do UC03, recalculam ao receber.
 */
type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function avisarBaseAtualizada(): void {
  // Cópia: um ouvinte pode se remover durante o aviso.
  for (const ouvinte of [...ouvintes]) ouvinte();
}

/** Registra o ouvinte e devolve a função que o remove. */
export function ouvirBaseAtualizada(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
