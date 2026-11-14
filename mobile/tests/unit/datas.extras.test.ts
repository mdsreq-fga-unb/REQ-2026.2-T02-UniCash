import { formatarDataHora, mesAnterior, nomeMes, parseBR } from '@/features/receitas/dates';

describe('datas: limites e formatos restantes', () => {
  it.each(['16/10/1899', '16/10/2201'])('rejeita ano fora do intervalo aceito (%s)', (texto) => {
    expect(parseBR(texto)).toBeNull();
  });

  it('aceita os anos-limite', () => {
    expect(parseBR('01/01/1900')).toBe('1900-01-01');
    expect(parseBR('31/12/2200')).toBe('2200-12-31');
  });

  it('mesAnterior: dentro do ano e em janeiro', () => {
    expect(mesAnterior(2026, 10)).toEqual({ ano: 2026, mes: 9 });
    expect(mesAnterior(2026, 1)).toEqual({ ano: 2025, mes: 12 });
  });

  it('nomeMes: primeiro e último mês', () => {
    expect(nomeMes(2026, 1)).toBe('Janeiro/2026');
    expect(nomeMes(2026, 12)).toBe('Dezembro/2026');
  });

  describe('formatarDataHora', () => {
    it('formata no horário local como DD/MM/AAAA HH:MM', () => {
      const iso = new Date(2026, 9, 16, 14, 5).toISOString(); // 16/10/2026 14:05 local
      expect(formatarDataHora(iso)).toBe('16/10/2026 14:05');
    });

    it('completa com zero à esquerda', () => {
      const iso = new Date(2026, 0, 2, 3, 4).toISOString();
      expect(formatarDataHora(iso)).toBe('02/01/2026 03:04');
    });

    it('timestamp inválido vira traço', () => {
      expect(formatarDataHora('não é data')).toBe('—');
    });
  });
});
