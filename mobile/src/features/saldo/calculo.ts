type TotaisMensais = {
  receitas: number;
  despesas: number;
};

type SaldoInicial = {
  mes: string;
  centavos: number;
};

const indicadorSemReceitas = { cor: '#171717', texto: 'Sem receitas no mês' };
const faixas = [
  { limite: 0.9, inclusivo: false, cor: '#166534' },
  { limite: 0.8, inclusivo: false, cor: '#854D0E' },
  { limite: 0.5, inclusivo: true, cor: '#9A3412' },
];
const corAbaixoDasFaixas = '#B91C1C';

export function calcularSaldo({ receitas, despesas }: TotaisMensais) {
  return receitas - despesas;
}

export function calcularSaldoAnterior(
  mes: string,
  anterior: TotaisMensais | null,
  inicial: SaldoInicial | null,
) {
  if (inicial && mes < inicial.mes) return null;
  if (inicial && mes === inicial.mes) return inicial.centavos;
  return anterior ? calcularSaldo(anterior) : null;
}

export function indicadorSaldo(saldo: number, receitas: number) {
  if (receitas === 0) return indicadorSemReceitas;

  const proporcao = saldo / receitas;
  const faixa = faixas.find(({ limite, inclusivo }) =>
    inclusivo ? proporcao >= limite : proporcao > limite,
  );
  const percentual = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(proporcao);

  return {
    cor: faixa?.cor ?? corAbaixoDasFaixas,
    texto: saldo < 0 ? 'Saldo negativo' : `${percentual} da receita disponível`,
  };
}
