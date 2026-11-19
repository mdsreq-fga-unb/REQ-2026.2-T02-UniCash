
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DespesaItem } from '@/components/despesas/DespesaItem';
import type { Despesa } from '@/features/despesas/types';

jest.mock('@/features/receitas/dates', () => ({
  formatarBR: jest.fn(() => '18/11/2026'),
}));

jest.mock('@/features/receitas/money', () => ({
  formatarBRL: jest.fn(() => '150,00'),
}));

const despesaBase: Despesa = {
  id: 'despesa-1',
  titulo: 'Aluguel',
  valor_centavos: 15000,
  data: '2026-11-18',
  descricao: '',
  categoria_id: null,
  fixa_ou_variavel: 'fixa',
  essencial: 1,
  recorrencia_id: null,
  sync_status: 'sincronizado',
  excluido_em: null,
  criado_em: '2026-11-18T10:00:00.000Z',
  atualizado_em: '2026-11-18T10:00:00.000Z',
};

describe('DespesaItem', () => {
  it('exibe os dados principais da despesa', async () => {
    await render(
      <DespesaItem despesa={despesaBase} onPress={jest.fn()} />,
    );

    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Despesa · 18/11/2026')).toBeTruthy();
    expect(screen.getByText('− 150,00')).toBeTruthy();
    expect(screen.getByText('›')).toBeTruthy();
  });

  it('exibe classificação fixa e essencial', async () => {
    await render(
      <DespesaItem despesa={despesaBase} onPress={jest.fn()} />,
    );

    expect(screen.getByText('Fixa · Essencial')).toBeTruthy();
  });

  it('exibe classificação variável e não essencial', async () => {
    await render(
      <DespesaItem
        despesa={{
          ...despesaBase,
          fixa_ou_variavel: 'variavel',
          essencial: 0,
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Variável · Não essencial')).toBeTruthy();
  });

  it('exibe classificação sem importância definida', async () => {
    await render(
      <DespesaItem
        despesa={{
          ...despesaBase,
          essencial: null,
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Fixa')).toBeTruthy();
  });

  it('não exibe classificação quando ela não está definida', async () => {
    await render(
      <DespesaItem
        despesa={{
          ...despesaBase,
          fixa_ou_variavel: null,
          essencial: null,
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText('Fixa')).toBeNull();
    expect(screen.queryByText('Variável')).toBeNull();
  });

  it('indica quando a despesa é recorrente', async () => {
    await render(
      <DespesaItem
        despesa={{
          ...despesaBase,
          recorrencia_id: 'serie-1',
        }}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Despesa · 18/11/2026 · Recorrente'),
    ).toBeTruthy();
  });

  it('indica sincronização pendente', async () => {
    await render(
      <DespesaItem
        despesa={{
          ...despesaBase,
          sync_status: 'pendente',
        }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Sincronização pendente')).toBeTruthy();
  });

  it('não exibe aviso quando já está sincronizada', async () => {
    await render(
      <DespesaItem despesa={despesaBase} onPress={jest.fn()} />,
    );

    expect(
      screen.queryByText('Sincronização pendente'),
    ).toBeNull();
  });

  it('chama onPress ao tocar no item', async () => {
    const onPress = jest.fn();

    await render(
      <DespesaItem despesa={despesaBase} onPress={onPress} />,
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('usa a primeira letra maiúscula no avatar', async () => {
    await render(
      <DespesaItem
        despesa={{ ...despesaBase, titulo: 'mercado' }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('M')).toBeTruthy();
  });
});
