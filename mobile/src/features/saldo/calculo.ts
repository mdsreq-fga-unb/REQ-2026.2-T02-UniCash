import { corAbaixoDasFaixas, faixas, indicadorSemReceitas } from './config';

type TotaisMensais = {
  receitas: number;
  despesas: number;
};

type SaldoInicial = {
  mes: string;
  centavos: number;
};

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
