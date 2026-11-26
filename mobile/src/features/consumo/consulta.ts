import { adicionarMeses } from '@/features/receitas/dates';
import { calcularConsumoPorCategoria, type DadosCategoria } from './calculo';

export type TotaisMensaisPorCategoria = {
  rendaCentavos: number;
  categorias: readonly (DadosCategoria & { nome: string })[];
};

/**
 * A integração deve ler um único snapshot SQLite da conta ativa com datas
 * no intervalo [inicio, fim). Inclui categorias sem despesas com gasto zero.
 */
export type LerTotaisLocais = (inicio: string, fim: string) => Promise<TotaisMensaisPorCategoria>;

export async function consultarConsumoMensal(mes: string, lerTotaisLocais: LerTotaisLocais) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new RangeError('Mês inválido');
  const inicio = `${mes}-01`;
  const { rendaCentavos, categorias } = await lerTotaisLocais(inicio, adicionarMeses(inicio, 1));
  const consumos = calcularConsumoPorCategoria(categorias, rendaCentavos);
  return consumos.map((consumo, indice) => ({ ...consumo, nome: categorias[indice].nome }));
}

export type ConsumoMensal = Awaited<ReturnType<typeof consultarConsumoMensal>>;
