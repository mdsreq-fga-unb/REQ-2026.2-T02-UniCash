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

/** Maior atraso aceito por setTimeout (cerca de 24,8 dias); meses mais longos são esperados em etapas. */
const ATRASO_MAXIMO = 2 ** 31 - 1;

/** Milissegundos até a meia-noite local do primeiro dia do mês seguinte. */
export function msAteProximoMes(agora: Date): number {
  const virada = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  return virada.getTime() - agora.getTime();
}

/**
 * Checklist do UC13: com o app aberto durante a virada do mês, o mês que acabou de encerrar é
 * avaliado na hora, sem esperar outro evento. Devolve a função que cancela o agendamento.
 */
export function aoVirarMes(ouvinte: Ouvinte, agora: () => Date = () => new Date()): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const agendar = () => {
    const restante = msAteProximoMes(agora());
    timer = setTimeout(() => {
      if (restante <= ATRASO_MAXIMO) ouvinte();
      agendar();
    }, Math.min(restante, ATRASO_MAXIMO));
  };
  agendar();
  return () => clearTimeout(timer);
}
