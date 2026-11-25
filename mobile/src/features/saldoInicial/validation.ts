export const LIMITE_SALDO_INICIAL_CENTAVOS = 99_999_999_999;

export interface DadosSaldoInicial {
  valorCentavos: number;
  mesReferencia: string;
}

export function validarSaldoInicial(
  dados: DadosSaldoInicial,
): string | null {
  if (!Number.isSafeInteger(dados.valorCentavos)) {
    return 'Informe um valor monetário válido.';
  }

  if (
    Math.abs(dados.valorCentavos) >
    LIMITE_SALDO_INICIAL_CENTAVOS
  ) {
    return 'O saldo inicial deve estar entre -R$ 999.999.999,99 e R$ 999.999.999,99.';
  }

  if (!dados.mesReferencia) {
    return 'Informe o mês de referência.';
  }

  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(dados.mesReferencia)) {
    return 'Informe um mês e ano válidos.';
  }

  if (dados.mesReferencia.startsWith('0000-')) {
    return 'Informe um ano válido.';
  }

  return null;
}
