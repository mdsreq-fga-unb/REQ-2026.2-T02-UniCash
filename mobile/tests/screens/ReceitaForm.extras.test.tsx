import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';

async function montar() {
  await render(
    <ReceitaForm
      titulo="Nova receita"
      textoSalvar="Salvar receita"
      salvando={false}
      onSalvar={jest.fn()}
      onCancelar={jest.fn()}
    />,
  );
}
const abrirRepeticao = () => fireEvent.press(screen.getByLabelText('Repetição'));

describe('Formulário: folha de repetição', () => {
  it('o botão voltar do sistema (Android) fecha a folha de repetição', async () => {
    await montar();
    await abrirRepeticao();
    expect(screen.getByTestId('modal-repeticao').props.visible).toBe(true);

    await fireEvent(screen.getByTestId('modal-repeticao'), 'requestClose');

    const modal = screen.queryByTestId('modal-repeticao');
    expect(modal === null || modal.props.visible === false).toBe(true);
  });

  describe.each(['ios', 'android'] as const)('em %s', (so) => {
    const original = Platform.OS;
    beforeEach(() => {
      (Platform as { OS: string }).OS = so;
    });
    afterEach(() => {
      (Platform as { OS: string }).OS = original;
    });

    it('abre a folha de repetição', async () => {
      await montar();
      await abrirRepeticao();
      expect(screen.getByText('Concluir')).toBeTruthy();
    });
  });
});

describe('Formulário: resumo da repetição', () => {
  const digitarIntervalo = (texto: string) => fireEvent.changeText(screen.getByLabelText('Repetir a cada'), texto);

  it('usa singular com 1, plural com mais e "?" com o campo vazio', async () => {
    await montar();
    await abrirRepeticao();
    await fireEvent.press(screen.getByText('Repete'));

    await digitarIntervalo('1');
    expect(screen.getByText('A cada 1 mês')).toBeTruthy();

    await digitarIntervalo('2');
    expect(screen.getByText('A cada 2 meses')).toBeTruthy();

    await digitarIntervalo('');
    expect(screen.getByText('A cada ? meses')).toBeTruthy();
  });
});