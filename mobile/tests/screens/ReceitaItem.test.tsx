import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReceitaItem } from '@/components/receitas/ReceitaItem';
import { receitaLinha } from '../helpers/dados';

describe('Item da lista de receitas', () => {
  it('receita única não mostra "Recorrente"', async () => {
    await render(<ReceitaItem receita={receitaLinha()} onPress={jest.fn()} />);
    expect(screen.getByText(/Receita · 16\/10\/2026/)).toBeTruthy();
    expect(screen.queryByText(/Recorrente/)).toBeNull();
  });

  it('ocorrência de série mostra "Recorrente"', async () => {
    await render(<ReceitaItem receita={receitaLinha({ recorrencia_id: 'serie1' })} onPress={jest.fn()} />);
    expect(screen.getByText(/Receita · 16\/10\/2026 · Recorrente/)).toBeTruthy();
  });

  it('receita pendente mostra o chip de sincronização', async () => {
    await render(<ReceitaItem receita={receitaLinha({ sync_status: 'pendente' })} onPress={jest.fn()} />);
    expect(screen.getByText('Sincronização pendente')).toBeTruthy();
  });

  it('tocar no item chama onPress', async () => {
    const onPress = jest.fn();
    await render(<ReceitaItem receita={receitaLinha()} onPress={onPress} />);
    await fireEvent.press(screen.getByText('Freela de design'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
