import {
  calcularProgresso,
  calcularProgressoDaMeta,
  calculadoraIndisponivel,
  rotuloSituacaoPrazo,
  rotuloSituacaoProgresso,
  situacaoDoPrazo,
  situacaoDoProgresso,
  type ValorRealizadoCalculator,
} from '@/features/metas/progresso';
import type { PeriodoMensal } from '@/features/metas/periodo';
import type { Meta } from '@/features/metas/types';

const meta = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2030-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  ...extra,
});

const periodo: PeriodoMensal = {
  ano: 2026,
  mes: 11,
  inicio: '2026-11-01',
  fim: '2026-11-30',
};

describe('cálculo puro de progresso (UC12)', () => {
  it('investimento abaixo do alvo fica em andamento', () => {
    const p = calcularProgresso(meta(), 79_900, '2026-11-25');
    expect(p).toMatchObject({
      valorAlvoCentavos: 100_000,
      valorRealizadoCentavos: 79_900,
      valorRestanteCentavos: 20_100,
      percentual: 79.9,
      situacaoProgresso: 'em_andamento',
      situacaoPrazo: 'em_vigor',
      progressoIndisponivel: false,
    });
  });

  it('investimento no alvo ou acima é alcançado', () => {
    expect(calcularProgresso(meta(), 100_000).situacaoProgresso).toBe('alcancada');
    expect(calcularProgresso(meta(), 150_000).situacaoProgresso).toBe('alcancada');
    expect(calcularProgresso(meta(), 150_000).valorRestanteCentavos).toBe(0);
  });

  it('gasto usa as fronteiras exatas de 80% e 100%', () => {
    const gasto = meta({ tipo: 'gasto', categoria_id: 'c1' });
    expect(situacaoDoProgresso('gasto', 100_000, 79_999)).toBe('dentro_do_limite');
    expect(situacaoDoProgresso('gasto', 100_000, 80_000)).toBe('proximo_do_limite');
    expect(situacaoDoProgresso('gasto', 100_000, 99_999)).toBe('proximo_do_limite');
    expect(situacaoDoProgresso('gasto', 100_000, 100_000)).toBe('limite_atingido');
    expect(situacaoDoProgresso('gasto', 100_000, 100_001)).toBe('limite_ultrapassado');
    expect(calcularProgresso(gasto, 80_000).percentual).toBe(80.0);
  });

  it('percentual arredondado não muda a classificação exata', () => {
    const gasto = meta({ tipo: 'gasto', categoria_id: 'c1' });
    const abaixo = calcularProgresso(gasto, 79_950);
    expect(abaixo.percentual).toBe(80.0);
    expect(abaixo.situacaoProgresso).toBe('dentro_do_limite');

    const quase = calcularProgresso(gasto, 99_950);
    expect(quase.percentual).toBe(100.0);
    expect(quase.situacaoProgresso).toBe('proximo_do_limite');
  });

  it('a barra pode ser limitada a 100%, mas o percentual ultrapassa', () => {
    const p = calcularProgresso(meta({ tipo: 'gasto', categoria_id: 'c1' }), 125_000);
    expect(p.percentual).toBe(125.0);
    expect(p.situacaoProgresso).toBe('limite_ultrapassado');
  });

  it('prazo final é inclusivo e vence no dia seguinte', () => {
    expect(situacaoDoPrazo('2026-11-25', '2026-11-25')).toBe('em_vigor');
    expect(situacaoDoPrazo('2026-11-24', '2026-11-25')).toBe('vencida');
    const p = calcularProgresso(meta({ prazo: '2026-01-01' }), 10_000, '2026-11-25');
    expect(p.situacaoProgresso).toBe('em_andamento');
    expect(p.situacaoPrazo).toBe('vencida');
  });

  it('rejeita alvo não positivo e valor realizado inválido', () => {
    expect(() => calcularProgresso(meta({ valor_alvo_centavos: 0 }), 0)).toThrow(RangeError);
    expect(() => calcularProgresso(meta(), -1)).toThrow(RangeError);
    expect(() => calcularProgresso(meta(), 1.5)).toThrow(RangeError);
  });

  it('sem calculadora não inventa valor realizado', async () => {
    const p = await calcularProgressoDaMeta(
      meta({ tipo: 'gasto', categoria_id: 'c1' }),
      calculadoraIndisponivel,
      '2026-11-25',
      periodo,
    );
    expect(p).toMatchObject({
      valorRealizadoCentavos: null,
      valorRestanteCentavos: null,
      percentual: null,
      situacaoProgresso: 'indisponivel',
      situacaoPrazo: 'em_vigor',
      progressoIndisponivel: true,
      periodo,
    });
    expect(rotuloSituacaoProgresso(p.situacaoProgresso)).toBe('Indisponível');
  });

  it('usa o adaptador substituível e envia o período', async () => {
    const calculadora: ValorRealizadoCalculator = {
      calcular: jest.fn().mockResolvedValue(25_000),
    };
    const p = await calcularProgressoDaMeta(
      meta({ tipo: 'gasto', categoria_id: 'c1' }),
      calculadora,
      '2026-11-25',
      periodo,
    );
    expect(calculadora.calcular).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1' }),
      periodo,
    );
    expect(p.percentual).toBe(25.0);
    expect(p.situacaoProgresso).toBe('dentro_do_limite');
    expect(p.progressoIndisponivel).toBe(false);
  });

  it('rótulos separam progresso e prazo', () => {
    expect(rotuloSituacaoProgresso('limite_ultrapassado')).toBe('Limite ultrapassado');
    expect(rotuloSituacaoProgresso('alcancada')).toBe('Alcançada');
    expect(rotuloSituacaoPrazo('em_vigor')).toBe('Prazo em vigor');
    expect(rotuloSituacaoPrazo('vencida')).toBe('Prazo vencido');
  });
});
