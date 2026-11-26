import { fireEvent, render, screen } from '@testing-library/react-native';
import { IndicadoresConsumo } from '@/components/consumo/IndicadoresConsumo';
import { consultarConsumoMensal } from '@/features/consumo/consulta';

describe('Indicadores do UC09', () => {
  it('mostra faixa em texto, limite indisponível e rótulo opcional para categoria sem limite', async () => {
    const ler = jest.fn(async () => ({
      rendaCentavos: 0,
      categorias: [
        { categoriaId: 'a', nome: 'Alimentação', gastoCentavos: 8000, limite: { tipo: 'reais' as const, centavos: 10000 } },
        { categoriaId: 'b', nome: 'Transporte', gastoCentavos: 0, limite: { tipo: 'percentual' as const, centesimosDePercentual: 1000 } },
        { categoriaId: 'c', nome: 'Lazer', gastoCentavos: 0, limite: null },
      ],
    }));
    const itens = await consultarConsumoMensal('2026-12', ler);
    expect(ler).toHaveBeenCalledWith('2026-12-01', '2027-01-01');
    const estado = { tipo: 'pronto' as const, itens };
    const tela = await render(<IndicadoresConsumo estado={estado} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText('80% · Próximo do limite')).toBeTruthy();
    expect(screen.getByText('R$ 80,00 de R$ 100,00')).toBeTruthy();
    expect(screen.getByText('Limite indisponível')).toBeTruthy();
    expect(screen.queryByText('Lazer')).toBeNull();
    await tela.rerender(<IndicadoresConsumo estado={estado} aoTentarNovamente={jest.fn()} exibirSemLimite />);
    expect(screen.getByText('Sem limite')).toBeTruthy();
  });

  it('informa a falha e oferece nova tentativa', async () => {
    const tentar = jest.fn();
    const falha = new Error('falha local');
    const ler = jest.fn().mockRejectedValue(falha);
    await expect(consultarConsumoMensal('2026-13', ler)).rejects.toThrow('Mês inválido');
    expect(ler).not.toHaveBeenCalled();
    await expect(consultarConsumoMensal('2026-12', ler)).rejects.toBe(falha);
    await render(<IndicadoresConsumo estado={{ tipo: 'erro' }} aoTentarNovamente={tentar} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('mostra carregamento e lista vazia', async () => {
    const tentar = jest.fn();
    const tela = await render(<IndicadoresConsumo estado={{ tipo: 'carregando' }} aoTentarNovamente={tentar} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    await tela.rerender(<IndicadoresConsumo estado={{ tipo: 'pronto', itens: [] }} aoTentarNovamente={tentar} />);
    expect(screen.getByText('Nenhuma categoria com limite.')).toBeTruthy();
    await tela.rerender(<IndicadoresConsumo estado={{ tipo: 'pronto', itens: [] }} aoTentarNovamente={tentar} exibirSemLimite />);
    expect(screen.getByText('Nenhuma categoria cadastrada.')).toBeTruthy();
  });
});
