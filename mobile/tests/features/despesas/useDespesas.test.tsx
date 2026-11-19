
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { listarDespesas } from '@/features/despesas/service';
import { useDespesas } from '@/features/despesas/useDespesas';
import type { Despesa } from '@/features/despesas/types';

jest.mock('@/features/despesas/service', () => ({
  listarDespesas: jest.fn(),
}));

const listar = listarDespesas as jest.Mock;

const filtro = {
  modo: 'mes' as const,
  ano: 2026,
  mes: 11,
};

const despesa: Despesa = {
  id: 'despesa-1',
  valor_centavos: 150000,
  data: '2026-11-10',
  titulo: 'Aluguel',
  descricao: null,
  categoria_id: null,
  fixa_ou_variavel: null,
  essencial: null,
  recorrencia_id: null,
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-11-10T10:00:00.000Z',
  atualizado_em: '2026-11-10T10:00:00.000Z',
};

function DespesasHarness() {
  const estado = useDespesas(filtro);

  return (
    <View>
      <Text>Carregando: {String(estado.carregando)}</Text>
      <Text>Erro: {String(estado.erroLeitura)}</Text>
      <Text>Total: {estado.total}</Text>
      <Text>
        Itens: {estado.itens.map((item) => item.titulo).join(', ')}
      </Text>

      <Pressable onPress={estado.recarregar}>
        <Text>Recarregar</Text>
      </Pressable>
    </View>
  );
}

describe('useDespesas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carrega despesas e o total', async () => {
    listar.mockResolvedValue({
      itens: [despesa],
      total: 150000,
    });

    render(<DespesasHarness />);

    await waitFor(() => {
      expect(screen.getByText('Carregando: false')).toBeTruthy();
      expect(screen.getByText('Itens: Aluguel')).toBeTruthy();
    });

    expect(screen.getByText('Total: 150000')).toBeTruthy();
    expect(screen.getByText('Erro: false')).toBeTruthy();
  });

  it('limpa despesas e total quando a leitura falha', async () => {
    listar
      .mockResolvedValueOnce({
        itens: [despesa],
        total: 150000,
      })
      .mockRejectedValueOnce(new Error('Falha de leitura'));

    render(<DespesasHarness />);

    await waitFor(() => {
      expect(screen.getByText('Itens: Aluguel')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Recarregar'));

    await waitFor(() => {
      expect(screen.getByText('Erro: true')).toBeTruthy();
      expect(screen.getByText('Itens:')).toBeTruthy();
    });

    expect(screen.getByText('Total: 0')).toBeTruthy();
    expect(screen.getByText('Carregando: false')).toBeTruthy();
  });

  it('recupera a lista depois de uma nova tentativa', async () => {
    listar
      .mockRejectedValueOnce(new Error('Falha de leitura'))
      .mockResolvedValueOnce({
        itens: [despesa],
        total: 150000,
      });

    render(<DespesasHarness />);

    await waitFor(() => {
      expect(screen.getByText('Erro: true')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Recarregar'));

    await waitFor(() => {
      expect(screen.getByText('Erro: false')).toBeTruthy();
      expect(screen.getByText('Itens: Aluguel')).toBeTruthy();
    });

    expect(screen.getByText('Total: 150000')).toBeTruthy();
  });
});
