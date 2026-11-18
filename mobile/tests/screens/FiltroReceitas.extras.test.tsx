import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { FiltroReceitas } from '@/components/receitas/FiltroReceitas';
import type { Filtro } from '@/features/receitas/types';

async function montar(filtro: Filtro) {
  const onChange = jest.fn();
  await render(<FiltroReceitas filtro={filtro} onChange={onChange} />);
  return { onChange };
}
const abrir = () => fireEvent.press(screen.getByLabelText('Filtrar receitas'));

describe('Filtro de receitas: reabertura, botão voltar e plataformas', () => {
  it('reabrir com período personalizado traz "De" e "Até" preenchidos', async () => {
    await montar({ modo: 'periodo', de: '2026-10-01', ate: '2026-10-16' });
    await abrir();
    expect(screen.getByLabelText('De').props.value).toBe('01/10/2026');
    expect(screen.getByLabelText('Até').props.value).toBe('16/10/2026');
  });

  it('reabrir com data única traz o dia preenchido', async () => {
    await montar({ modo: 'data', data: '2026-10-16' });
    await abrir();
    expect(screen.getByLabelText('Data').props.value).toBe('16/10/2026');
  });

  it('o botão voltar do sistema (Android) fecha a folha sem aplicar', async () => {
    const { onChange } = await montar({ modo: 'mes', ano: 2026, mes: 10 });
    await abrir();
    expect(screen.getByTestId('modal-filtro').props.visible).toBe(true);

    await fireEvent(screen.getByTestId('modal-filtro'), 'requestClose');

    const modal = screen.queryByTestId('modal-filtro');
    expect(modal === null || modal.props.visible === false).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  describe.each(['ios', 'android'] as const)('em %s', (so) => {
    const original = Platform.OS;
    beforeEach(() => {
      (Platform as { OS: string }).OS = so;
    });
    afterEach(() => {
      (Platform as { OS: string }).OS = original;
    });

    it('abre a folha de filtro', async () => {
      await montar({ modo: 'mes', ano: 2026, mes: 10 });
      await abrir();
      expect(screen.getByText('Filtrar receitas')).toBeTruthy();
    });
  });
});

describe('Filtro personalizado: cada data inválida é recusada', () => {
  const MENSAGEM = 'Informe uma data válida no formato DD/MM/AAAA.';
  const preparar = async (de: string, ate: string) => {
    const { onChange } = await montar({ modo: 'mes', ano: 2026, mes: 10 });
    await abrir();
    await fireEvent.press(screen.getByText('Personalizado'));
    await fireEvent.changeText(screen.getByLabelText('De'), de);
    await fireEvent.changeText(screen.getByLabelText('Até'), ate);
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    return onChange;
  };

  it('data inicial inválida', async () => {
    const onChange = await preparar('99/99/9999', '16/10/2026');
    expect(screen.getByText(MENSAGEM)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('data final inválida', async () => {
    const onChange = await preparar('01/10/2026', '99/99/9999');
    expect(screen.getByText(MENSAGEM)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});