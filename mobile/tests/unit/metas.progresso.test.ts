import {
  calcularProgresso,
  calcularProgressoDaMeta,
  calculadoraIndisponivel,
  rotuloSituacao,
  type ValorRealizadoCalculator,
} from '@/features/metas/progresso';
import type { Meta } from '@/features/metas/types';

const meta = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2030-12-31',
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  ...extra,
});

describe('cálculo puro de progresso (UC12)', () => {
  it('79,9% fica em andamento', () => {
    const p = calcularProgresso(meta(), 79_900, '2026-11-25');
    expect(p).toMatchObject({
      valorAlvoCentavos: 100_000,
      valorRealizadoCentavos: 79_900,
      valorRestanteCentavos: 20_100,
      percentual: 79.9,
      situacao: 'em_andamento',
      progressoIndisponivel: false,
    });
  });

  it('80,0% gera atenção', () => {
    const p = calcularProgresso(meta(), 80_000, '2026-11-25');
    expect(p.percentual).toBe(80.0);
    expect(p.situacao).toBe('atencao');
  });

  it('100,0% atinge a meta e zera o restante', () => {
    const p = calcularProgresso(meta(), 100_000, '2026-11-25');
    expect(p.percentual).toBe(100.0);
    expect(p.valorRestanteCentavos).toBe(0);
    expect(p.situacao).toBe('atingida');
  });

  it('acima de 100% não deixa restante negativo e fica ultrapassada', () => {
    const p = calcularProgresso(meta(), 100_100, '2026-11-25');
    expect(p.percentual).toBe(100.1);
    expect(p.valorRestanteCentavos).toBe(0);
    expect(p.situacao).toBe('ultrapassada');
  });

  it('sem valor realizado fica em 0,0%', () => {
    const p = calcularProgresso(meta(), 0, '2026-11-25');
    expect(p.percentual).toBe(0);
    expect(p.valorRestanteCentavos).toBe(100_000);
    expect(p.situacao).toBe('em_andamento');
  });

  it('prazo vencido fica vencida somente se ainda não atingiu 100%', () => {
    expect(calcularProgresso(meta({ prazo: '2026-01-01' }), 10_000, '2026-11-25').situacao).toBe(
      'vencida',
    );
    expect(calcularProgresso(meta({ prazo: '2026-01-01' }), 100_000, '2026-11-25').situacao).toBe(
      'atingida',
    );
  });

  it('rejeita alvo não positivo e valor realizado inválido', () => {
    expect(() => calcularProgresso(meta({ valor_alvo_centavos: 0 }), 0)).toThrow(RangeError);
    expect(() => calcularProgresso(meta(), -1)).toThrow(RangeError);
    expect(() => calcularProgresso(meta(), 1.5)).toThrow(RangeError);
  });

  it('sem calculadora aprovada, não inventa valor realizado', async () => {
    const p = await calcularProgressoDaMeta(meta(), calculadoraIndisponivel, '2026-11-25');
    expect(p).toMatchObject({
      valorRealizadoCentavos: null,
      valorRestanteCentavos: null,
      percentual: null,
      situacao: 'indefinida',
      progressoIndisponivel: true,
    });
    expect(rotuloSituacao(p.situacao)).toMatch(/defini/i);
  });

  it('usa o adaptador substituível para calcular o valor realizado', async () => {
    const calculadora: ValorRealizadoCalculator = {
      calcular: jest.fn().mockResolvedValue(25_000),
    };
    const p = await calcularProgressoDaMeta(meta(), calculadora, '2026-11-25');
    expect(calculadora.calcular).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(p.percentual).toBe(25.0);
    expect(p.situacao).toBe('em_andamento');
    expect(p.progressoIndisponivel).toBe(false);
  });
});
