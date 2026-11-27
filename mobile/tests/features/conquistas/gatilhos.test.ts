import { aoVirarMes, msAteProximoMes } from '@/features/conquistas/gatilhos';

describe('virada do mês com o app aberto (UC13)', () => {
  afterEach(() => jest.useRealTimers());

  it('calcula o tempo até a meia-noite do primeiro dia do mês seguinte', () => {
    expect(msAteProximoMes(new Date(2026, 10, 30, 23, 59, 59))).toBe(1000);
    expect(msAteProximoMes(new Date(2026, 11, 31, 23, 0, 0))).toBe(60 * 60 * 1000);
  });

  it('avisa uma vez na virada e agenda a seguinte', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 30, 23, 59, 59));
    const ouvinte = jest.fn();
    const parar = aoVirarMes(ouvinte);

    jest.advanceTimersByTime(999);
    expect(ouvinte).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(ouvinte).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
    expect(ouvinte).toHaveBeenCalledTimes(2);
    parar();
  });

  it('meses mais longos que o limite do setTimeout são esperados em etapas, sem aviso antes da hora', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 0, 1, 0, 0, 0));
    const ouvinte = jest.fn();
    const parar = aoVirarMes(ouvinte);

    jest.advanceTimersByTime(2 ** 31 - 1);
    expect(ouvinte).not.toHaveBeenCalled();
    jest.advanceTimersByTime(31 * 24 * 60 * 60 * 1000 - (2 ** 31 - 1));
    expect(ouvinte).toHaveBeenCalledTimes(1);
    parar();
  });

  it('cancelar impede o aviso', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 30, 23, 59, 59));
    const ouvinte = jest.fn();
    aoVirarMes(ouvinte)();
    jest.advanceTimersByTime(5000);
    expect(ouvinte).not.toHaveBeenCalled();
  });
});
