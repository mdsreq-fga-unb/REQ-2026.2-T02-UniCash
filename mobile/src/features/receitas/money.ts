export const VALOR_MAXIMO_CENTAVOS = 99_999_999_999; // R$ 999.999.999,99

export type ResultadoValor =
  | { ok: true; centavos: number }
  | { ok: false; erro: 'vazio' | 'invalido' | 'limite' };

/** Converte texto pt-BR ("1.234,56", "1234,5", "10") em centavos, sem usar float. */
export function parseValor(texto: string): ResultadoValor {
  let t = texto.replace(/R\$/g, '').replace(/\s/g, '');
  if (!t) return { ok: false, erro: 'vazio' };

  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // 1.234.567 = milhares

  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, erro: 'invalido' };

  const [inteiro, fracao = ''] = t.split('.');
  if (fracao.length > 2) return { ok: false, erro: 'invalido' };
  if (inteiro.replace(/^0+/, '').length > 12) return { ok: false, erro: 'limite' };

  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'));
  if (centavos <= 0) return { ok: false, erro: 'invalido' };
  if (centavos > VALOR_MAXIMO_CENTAVOS) return { ok: false, erro: 'limite' };
  return { ok: true, centavos };
}

function agrupar(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatarBRL(centavos: number): string {
  const inteiro = Math.floor(centavos / 100).toString();
  const frac = (centavos % 100).toString().padStart(2, '0');
  return `R$ ${agrupar(inteiro)},${frac}`;
}

/** Texto editável para o campo de valor: 123456 -> "1234,56". */
export function centavosParaTexto(centavos: number): string {
  const inteiro = Math.floor(centavos / 100);
  const frac = (centavos % 100).toString().padStart(2, '0');
  return `${inteiro},${frac}`;
}
