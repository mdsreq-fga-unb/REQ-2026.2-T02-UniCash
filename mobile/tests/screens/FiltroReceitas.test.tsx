import { fireEvent, render, screen } from '@testing-library/react-native';
import { FiltroReceitas } from '@/components/receitas/FiltroReceitas';
import type { Filtro } from '@/features/receitas/types';

const mesFiltro: Filtro = { modo: 'mes', ano: 2026, mes: 10 };

function montar(filtro: Filtro = mesFiltro) {
  const onChange = jest.fn();
  render(<FiltroReceitas filtro={filtro} onChange={onChange} />);
  return { onChange };
}
const abrir = () => fireEvent.press(screen.getByLabelText('Filtrar receitas'));
const digitar = (rotulo: string, texto: string) => fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const aplicar = () => fireEvent.press(screen.getByText('Aplicar filtros'));

describe('Filtro de receitas (fluxo B)', () => {
  it('o chip mostra o período aplicado', () => {
    montar();
    expect(screen.getByText('Outubro/2026')).toBeTruthy();
  });

  it('chip de data única e de período', () => {
    montar({ modo: 'data', data: '2026-10-16' });
    expect(screen.getByText('16/10/2026')).toBeTruthy();
  });

  it('chip de período personalizado', () => {
    montar({ modo: 'periodo', de: '2026-10-01', ate: '2026-10-16' });
    expect(screen.getByText('01/10/2026 – 16/10/2026')).toBeTruthy();
  });

  it('navega para o mês seguinte', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.press(screen.getByLabelText('Próximo mês'));
    aplicar();
    expect(onChange).toHaveBeenCalledWith({ modo: 'mes', ano: 2026, mes: 11 });
  });

  it('navega para o mês anterior atravessando o ano', () => {
    const { onChange } = montar({ modo: 'mes', ano: 2026, mes: 1 });
    abrir();
    fireEvent.press(screen.getByLabelText('Mês anterior'));
    aplicar();
    expect(onChange).toHaveBeenCalledWith({ modo: 'mes', ano: 2025, mes: 12 });
  });

  it('data única', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.press(screen.getByText('Dia'));
    digitar('Data', '16102026');
    aplicar();
    expect(onChange).toHaveBeenCalledWith({ modo: 'data', data: '2026-10-16' });
  });

  it('data única inválida não aplica o filtro', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.press(screen.getByText('Dia'));
    digitar('Data', '31022026');
    aplicar();
    expect(screen.getByText('Informe uma data válida no formato DD/MM/AAAA.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('período válido', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.press(screen.getByText('Personalizado'));
    digitar('De', '10102026');
    digitar('Até', '20102026');
    aplicar();
    expect(onChange).toHaveBeenCalledWith({ modo: 'periodo', de: '2026-10-10', ate: '2026-10-20' });
  });

  it('período com as duas datas iguais é válido', () => {
    const { onChange } = montar();
    abrir();
    fireEvent.press(screen.getByText('Personalizado'));
    digitar('De', '10102026');
    digitar('Até', '10102026');
    aplicar();
    expect(onChange).toHaveBeenCalledWith({ modo: 'periodo', de: '2026-10-10', ate: '2026-10-10' });
  });

  describe('EX02: período inválido', () => {
    it('não aplica o filtro, informa o motivo e preserva as datas digitadas', () => {
      const { onChange } = montar();
      abrir();
      fireEvent.press(screen.getByText('Personalizado'));
      digitar('De', '20102026');
      digitar('Até', '10102026');
      aplicar();

      expect(screen.getByText('A data inicial deve ser anterior ou igual à data final.')).toBeTruthy();
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByLabelText('De').props.value).toBe('20/10/2026');
      expect(screen.getByLabelText('Até').props.value).toBe('10/10/2026');
    });

    it('depois de corrigir, o filtro é aplicado', () => {
      const { onChange } = montar();
      abrir();
      fireEvent.press(screen.getByText('Personalizado'));
      digitar('De', '20102026');
      digitar('Até', '10102026');
      aplicar();
      digitar('Até', '25102026');
      aplicar();
      expect(onChange).toHaveBeenCalledWith({ modo: 'periodo', de: '2026-10-20', ate: '2026-10-25' });
    });
  });

  it('"Limpar" volta ao mês corrente', () => {
    const { onChange } = montar({ modo: 'data', data: '2020-01-01' });
    abrir();
    fireEvent.press(screen.getByText('Limpar'));
    const n = new Date();
    expect(onChange).toHaveBeenCalledWith({ modo: 'mes', ano: n.getFullYear(), mes: n.getMonth() + 1 });
  });
});
