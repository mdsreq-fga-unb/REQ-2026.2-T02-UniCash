type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function avisarAlertasPendentes() {
  for (const ouvinte of ouvintes) ouvinte();
}

export function ouvirAlertasPendentes(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
