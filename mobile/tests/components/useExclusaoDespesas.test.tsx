
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import { useExclusaoDespesas } from '@/components/despesas/useExclusaoDespesas';
import type { AlvoExclusaoDespesa } from '@/components/despesas/useExclusaoDespesas';

import {
  excluirDespesa,
  DespesaIndisponivel,
} from '@/features/despesas/service';
import { setFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { router } from 'expo-router';
import { MSG_DESPESA } from '@/features/despesas/validation';

jest.mock('@/components/receitas/OpcoesModal', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    OpcoesModal: ({
      visivel,
      titulo,
      mensagem,
      opcoes,
      onCancelar,
    }: {
      visivel: boolean;
      titulo: string;
      mensagem?: string;
      opcoes: { rotulo: string; onPress: () => void }[];
      onCancelar: () => void;
    }) => {
      if (!visivel) return null;

      return React.createElement(
        View,
        null,
        React.createElement(Text, null, titulo),
        mensagem
          ? React.createElement(Text, null, mensagem)
          : null,
        ...opcoes.map((opcao) =>
          React.createElement(
            Pressable,
            {
              key: opcao.rotulo,
              onPress: opcao.onPress,
            },
            React.createElement(Text, null, opcao.rotulo),
          ),
        ),
        React.createElement(
          Pressable,
          { onPress: onCancelar },
          React.createElement(Text, null, 'Cancelar'),
        ),
      );
    },
  };
});

jest.mock('@/features/despesas/service', () => ({
  excluirDespesa: jest.fn(),
  DespesaIndisponivel: class DespesaIndisponivel extends Error {},
}));

jest.mock('@/features/receitas/feedback', () => ({
  setFeedback: jest.fn(),
}));

jest.mock('@/features/receitas/sync', () => ({
  sincronizarEmSegundoPlano: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
  },
}));

const excluirMock = excluirDespesa as jest.Mock;
const feedbackMock = setFeedback as jest.Mock;
const dismissMock = router.dismissTo as jest.Mock;

const alvo: AlvoExclusaoDespesa = {
  id: 'despesa-1',
  titulo: 'Conta de energia',
  valorCentavos: 15000,
  data: '2026-11-18',
  emSerie: false,
};

const alvoSerie: AlvoExclusaoDespesa = {
  ...alvo,
  emSerie: true,
};

function Harness({
  alvoAtual = alvo,
}: {
  alvoAtual?: AlvoExclusaoDespesa | null;
}) {
  const estado = useExclusaoDespesas(alvoAtual);

  return (
    <View>
      <Pressable onPress={estado.iniciar}>
        <Text>Iniciar exclusão</Text>
      </Pressable>

      {estado.dialogos}
    </View>
  );
}

describe('useExclusaoDespesas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    excluirMock.mockResolvedValue(undefined);
  });

  it('não inicia a exclusão quando não existe despesa selecionada', async () => {
    const { getByText, queryByText } = await render(
      <Harness alvoAtual={null} />,
    );

    await fireEvent.press(getByText('Iniciar exclusão'));

    expect(queryByText('Excluir despesa?')).toBeNull();
    expect(queryByText('Excluir quais despesas?')).toBeNull();
    expect(excluirMock).not.toHaveBeenCalled();
  });

  it('abre diretamente a confirmação para despesa não recorrente', async () => {
    const { getByText, queryByText } = await render(<Harness />);

    await fireEvent.press(getByText('Iniciar exclusão'));

    expect(getByText('Excluir despesa?')).toBeTruthy();
    expect(getByText('Excluir')).toBeTruthy();
    expect(queryByText('Excluir quais despesas?')).toBeNull();
    expect(getByText(/Conta de energia/)).toBeTruthy();
  });

  it('apresenta as opções de alcance para despesa recorrente', async () => {
    const { getByText, queryByText } = await render(
      <Harness alvoAtual={alvoSerie} />,
    );

    await fireEvent.press(getByText('Iniciar exclusão'));

    expect(getByText('Excluir quais despesas?')).toBeTruthy();
    expect(getByText('Só esta')).toBeTruthy();
    expect(getByText('Esta e as próximas')).toBeTruthy();
    expect(getByText('Todas')).toBeTruthy();
    expect(queryByText('Excluir despesa?')).toBeNull();
  });

  it.each([
    ['Só esta', 'esta'],
    ['Esta e as próximas', 'proximas'],
    ['Todas', 'todas'],
  ] as const)(
    'exclui a despesa recorrente com o alcance "%s"',
    async (opcao, escopo) => {
      const { getByText } = await render(
        <Harness alvoAtual={alvoSerie} />,
      );

      await fireEvent.press(getByText('Iniciar exclusão'));
      await fireEvent.press(getByText(opcao));

      expect(getByText('Excluir despesa?')).toBeTruthy();

      await fireEvent.press(getByText('Excluir'));

      await waitFor(() => {
        expect(excluirMock).toHaveBeenCalledWith(
          alvo.id,
          escopo,
        );
      });

      expect(feedbackMock).toHaveBeenCalledWith({
        tipo: 'sucesso',
        texto: 'Despesa excluída.',
      });

      expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
      expect(dismissMock).toHaveBeenCalledWith('/despesas');
    },
  );

  it('cancela a seleção do alcance sem excluir a despesa', async () => {
    const { getByText, queryByText } = await render(
      <Harness alvoAtual={alvoSerie} />,
    );

    await fireEvent.press(getByText('Iniciar exclusão'));

    expect(getByText('Excluir quais despesas?')).toBeTruthy();

    await fireEvent.press(getByText('Cancelar'));

    expect(queryByText('Excluir quais despesas?')).toBeNull();
    expect(queryByText('Excluir despesa?')).toBeNull();
    expect(excluirMock).not.toHaveBeenCalled();
  });

  it('registra erro quando a despesa está indisponível', async () => {
    excluirMock.mockRejectedValue(
      new DespesaIndisponivel(),
    );

    const { getByText } = await render(<Harness />);

    await fireEvent.press(getByText('Iniciar exclusão'));
    await fireEvent.press(getByText('Excluir'));

    await waitFor(() => {
      expect(feedbackMock).toHaveBeenCalledWith({
        tipo: 'erro',
        texto: MSG_DESPESA.indisponivel,
      });
    });

    expect(sincronizarEmSegundoPlano).not.toHaveBeenCalled();
    expect(dismissMock).toHaveBeenCalledWith('/despesas');
  });

  it('registra erro genérico quando ocorre uma falha inesperada', async () => {
    excluirMock.mockRejectedValue(
      new Error('Falha inesperada'),
    );

    const { getByText } = await render(<Harness />);

    await fireEvent.press(getByText('Iniciar exclusão'));
    await fireEvent.press(getByText('Excluir'));

    await waitFor(() => {
      expect(feedbackMock).toHaveBeenCalledWith({
        tipo: 'erro',
        texto: MSG_DESPESA.falhaSalvar,
      });
    });

    expect(dismissMock).toHaveBeenCalledWith('/despesas');
  });
});
