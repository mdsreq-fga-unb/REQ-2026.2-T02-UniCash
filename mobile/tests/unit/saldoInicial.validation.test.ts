
import { validarSaldoInicial } from '../../src/features/saldoInicial/validation';

describe('UC08 — validação do saldo inicial', () => {
  it.each([150000, 0, -50000])(
    'aceita saldo de %i centavos',
    (valorCentavos) => {
      expect(
        validarSaldoInicial({
          valorCentavos,
          mesReferencia: '2026-11',
        }),
      ).toBeNull();
    },
  );

  it.each([
    10.5,
    -10.5,
    NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  ])('rejeita valor inválido: %s', (valorCentavos) => {
    expect(
      validarSaldoInicial({
        valorCentavos,
        mesReferencia: '2026-11',
      }),
    ).toBe('Informe um valor monetário válido.');
  });

  it('rejeita mês de referência vazio', () => {
    expect(
      validarSaldoInicial({
        valorCentavos: 1000,
        mesReferencia: '',
      }),
    ).toBe('Informe o mês de referência.');
  });

  it.each([
    '2026-00',
    '2026-13',
    '2026-1',
    '11-2026',
    '2026/11',
    'abc',
  ])('rejeita mês inválido: %s', (mesReferencia) => {
    expect(
      validarSaldoInicial({
        valorCentavos: 1000,
        mesReferencia,
      }),
    ).toBe('Informe um mês e ano válidos.');
  });

  it('rejeita ano zero', () => {
    expect(
      validarSaldoInicial({
        valorCentavos: 1000,
        mesReferencia: '0000-01',
      }),
    ).toBe('Informe um ano válido.');
  });

  it.each(['2026-01', '2026-12'])(
    'aceita mês válido: %s',
    (mesReferencia) => {
      expect(
        validarSaldoInicial({
          valorCentavos: 1000,
          mesReferencia,
        }),
      ).toBeNull();
    },
  );
});
describe('UC08 — Limite monetário do saldo inicial', () => {
  it.each([
    -99_999_999_999,
    0,
    99_999_999_999,
  ])('aceita o valor %s dentro do limite', (valor) => {
    expect(
      validarSaldoInicial({
        valorCentavos: valor,
        mesReferencia: '2026-11',
      }),
    ).toBeNull();
  });

  it.each([
    -100_000_000_000,
    100_000_000_000,
  ])('rejeita o valor %s fora do limite', (valor) => {
    expect(
      validarSaldoInicial({
        valorCentavos: valor,
        mesReferencia: '2026-11',
      }),
    ).toBe(
      'O saldo inicial deve estar entre -R$ 999.999.999,99 e R$ 999.999.999,99.',
    );
  });
});
