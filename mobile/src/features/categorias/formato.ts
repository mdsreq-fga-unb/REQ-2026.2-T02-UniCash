/**
 * Formata centésimos de percentual em texto exato, sem arredondamento nem
 * perda de precisão (conversão via BigInt, válida até Number.MAX_SAFE_INTEGER):
 * 1 → "0,01%", 100 → "1%", 1250 → "12,5%", 10000 → "100%", 10100 → "101%".
 */
export function centesimosParaTextoPercentual(centesimos: number): string {
  if (!Number.isSafeInteger(centesimos) || centesimos < 0) {
    throw new RangeError(`centesimos deve ser inteiro seguro não negativo, recebido: ${String(centesimos)}`);
  }

  const inteiro = BigInt(centesimos);
  const parteInteira = (inteiro / 100n).toString();
  const resto = inteiro % 100n;

  if (resto === 0n) return `${parteInteira}%`;

  // '05' permanece '05'; '50' vira '5' (remove apenas zeros à direita da fração).
  const fracao = resto.toString().padStart(2, '0').replace(/0+$/, '');
  return `${parteInteira},${fracao}%`;
}
