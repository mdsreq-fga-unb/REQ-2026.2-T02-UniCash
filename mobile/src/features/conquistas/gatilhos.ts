/**
 * UC13 passo 1: aviso de que um lançamento foi registrado, editado ou excluído.
 * Os services de receitas e despesas avisam depois do commit; o layout raiz reavalia as conquistas.
 * Fica sem dependências para não criar ciclo de importação com os services.
 */
type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function avisarMudancaLancamentos(): void {
  for (const ouvinte of [...ouvintes]) ouvinte();
}

/** Registra o ouvinte e devolve a função que o remove. */
export function aoMudarLancamentos(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
