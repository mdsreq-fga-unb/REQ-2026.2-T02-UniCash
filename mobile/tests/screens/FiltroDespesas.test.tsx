
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FiltroDespesas } from '@/components/despesas/FiltroDespesas';
import { MSG_DESPESA } from '@/features/despesas/validation';
import type { FiltroDespesa } from '@/features/despesas/types';

const mesFiltro: FiltroDespesa = {
  modo: 'mes',
  ano: 2026,
  mes: 10,
};

async function montar(filtro: FiltroDespesa = mesFiltro) {
  const onChange = jest.fn();
  await render(<FiltroDespesas filtro={filtro} onChange={onChange} />);
  return { onChange };
}

const abrir = async () => {
  await fireEvent.press(screen.getByLabelText('Filtrar despesas'));
};

const digitar = async (rotulo: string, texto: string) => {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
};

const aplicar = async () => {
  await fireEvent.press(screen.getByText('Aplicar filtros'));
};

describe('Filtro de despesas', () => {
  it('mostra o mês aplicado no chip', async () => {
    await montar();
    expect(screen.getByText('Outubro/2026')).toBeTruthy();
  });

  it('mostra data única no chip', async () => {
    await montar({ modo: 'data', data: '2026-10-16' });
    expect(screen.getByText('16/10/2026')).toBeTruthy();
  });

  it('mostra período personalizado no chip', async () => {
    await montar({
      modo: 'periodo',
      de: '2026-10-01',
      ate: '2026-10-16',
    });
    expect(screen.getByText('01/10/2026 – 16/10/2026')).toBeTruthy();
  });

  it('navega para o mês seguinte', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByLabelText('Próximo mês'));
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'mes',
      ano: 2026,
      mes: 11,
    });
  });

  it('navega para o mês anterior atravessando o ano', async () => {
    const { onChange } = await montar({
      modo: 'mes',
      ano: 2026,
      mes: 1,
    });

    await abrir();
    await fireEvent.press(screen.getByLabelText('Mês anterior'));
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'mes',
      ano: 2025,
      mes: 12,
    });
  });

  it('aplica filtro de data única', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Dia'));
    await digitar('Data', '16102026');
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'data',
      data: '2026-10-16',
    });
  });

  it('não aplica data única inválida', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Dia'));
    await digitar('Data', '31022026');
    await aplicar();

    expect(screen.getByText(MSG_DESPESA.dataInvalida)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('aplica período personalizado válido', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Personalizado'));
    await digitar('De', '10102026');
    await digitar('Até', '20102026');
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'periodo',
      de: '2026-10-10',
      ate: '2026-10-20',
    });
  });

  it('aceita período com datas iguais', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Personalizado'));
    await digitar('De', '10102026');
    await digitar('Até', '10102026');
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'periodo',
      de: '2026-10-10',
      ate: '2026-10-10',
    });
  });

  it('rejeita período com data inicial posterior à final', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Personalizado'));
    await digitar('De', '20102026');
    await digitar('Até', '10102026');
    await aplicar();

    expect(screen.getByText(MSG_DESPESA.periodoInvalido)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('De').props.value).toBe('20/10/2026');
    expect(screen.getByLabelText('Até').props.value).toBe('10/10/2026');
  });

  it('permite corrigir período inválido e aplicar', async () => {
    const { onChange } = await montar();

    await abrir();
    await fireEvent.press(screen.getByText('Personalizado'));
    await digitar('De', '20102026');
    await digitar('Até', '10102026');
    await aplicar();

    await digitar('Até', '25102026');
    await aplicar();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'periodo',
      de: '2026-10-20',
      ate: '2026-10-25',
    });
  });

  it('limpa o filtro e volta ao mês atual', async () => {
    const { onChange } = await montar({
      modo: 'data',
      data: '2020-01-01',
    });

    await abrir();
    await fireEvent.press(screen.getByText('Limpar'));

    const hoje = new Date();

    expect(onChange).toHaveBeenCalledWith({
      modo: 'mes',
      ano: hoje.getFullYear(),
      mes: hoje.getMonth() + 1,
    });
  });
});
