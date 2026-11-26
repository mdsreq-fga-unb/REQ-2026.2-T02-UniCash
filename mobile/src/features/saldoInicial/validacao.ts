export interface DadosSaldoInicial {
  valor_centavos: number;
  mes_referencia: string;
}

export function mesReferenciaValido(mes: string): boolean {
  return /^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])$/.test(mes);
}

/** Aceita reais em pt-BR e converte para centavos inteiros, incluindo zero e negativos. */
export function valorSaldoInicial(texto: string): number | null {
  const valor = texto.trim();
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(valor)) return null;
  const [reais, fracao = ''] = valor.replace(/\./g, '').replace(/^-/, '').split(',');
  const centavos = Number(reais) * 100 + Number(fracao.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos)) return null;
  return valor.startsWith('-') && centavos !== 0 ? -centavos : centavos;
}

export function dadosSaldoValidos(dados: Record<string, unknown>): dados is DadosSaldoInicial & Record<string, unknown> {
  return Number.isSafeInteger(dados.valor_centavos)
    && typeof dados.mes_referencia === 'string'
    && mesReferenciaValido(dados.mes_referencia);
}
