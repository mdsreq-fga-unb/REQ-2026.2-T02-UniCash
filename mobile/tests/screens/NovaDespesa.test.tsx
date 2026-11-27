
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import NovaDespesa from '@/app/despesas/nova';
import { registrarDespesa } from '@/features/despesas/service';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { setFeedback } from '@/lib/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';

import { router, useLocalSearchParams } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/features/despesas/service', () => ({
  registrarDespesa: jest.fn(),
}));

jest.mock('@/lib/feedback', () => ({
  setFeedback: jest.fn(),
}));

jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
  consumirAcessoNegado: jest.fn().mockReturnValue(false),
}));

jest.mock('@/components/despesas/DespesaForm', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const dados = {
    titulo: 'Conta de energia',
    valorCentavos: 15000,
    data: '2026-10-16',
    descricao: '',
    categoriaId: null,
    fixaOuVariavel: 'fixa',
    essencial: 1,
    recorrencia: null,
  };

  return {
    DespesaForm: ({
      titulo,
      textoSalvar,
      salvando,
      erroGeral,
      onSalvar,
      onCancelar,
      textoCancelar = 'Cancelar',
      onTrocarTipo,
    }: {
      titulo: string;
      textoSalvar: string;
      salvando: boolean;
      erroGeral?: string | null;
      onSalvar: (valores: typeof dados) => void;
      onCancelar: () => void;
      textoCancelar?: string;
      onTrocarTipo?: () => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, titulo),
        erroGeral
          ? React.createElement(Text, null, erroGeral)
          : null,
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: textoSalvar,
            disabled: salvando,
            onPress: () => onSalvar(dados),
          },
          React.createElement(
            Text,
            null,
            salvando ? 'Salvando...' : textoSalvar,
          ),
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            onPress: onCancelar,
          },
          React.createElement(Text, null, textoCancelar),
        ),
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            disabled: !onTrocarTipo,
            onPress: onTrocarTipo,
          },
          React.createElement(Text, null, 'Receita'),
        ),
      ),
  };
});

const registrar = registrarDespesa as jest.Mock;

describe('Tela de nova despesa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mostra o formulário de nova despesa', async () => {
    await render(<NovaDespesa />);

    expect(screen.getByText('Nova despesa')).toBeTruthy();
    expect(screen.getByText('Salvar despesa')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('volta ao cancelar', async () => {
    await render(<NovaDespesa />);

    fireEvent.press(screen.getByText('Cancelar'));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('dispara a sincronização em segundo plano depois de gravar (A7)', async () => {
    registrar.mockResolvedValue(undefined);

    await render(<NovaDespesa />);
    fireEvent.press(screen.getByText('Salvar despesa'));

    await waitFor(() => {
      expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
    });
    expect(registrar.mock.invocationCallOrder[0]).toBeLessThan(
      (sincronizarEmSegundoPlano as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('não sincroniza quando a gravação falha', async () => {
    registrar.mockRejectedValue(new Error('disco'));

    await render(<NovaDespesa />);
    fireEvent.press(screen.getByText('Salvar despesa'));

    expect(await screen.findByText(MSG_DESPESA.falhaSalvar)).toBeTruthy();
    expect(sincronizarEmSegundoPlano).not.toHaveBeenCalled();
  });

  it('cadastra a despesa e apresenta feedback de sucesso', async () => {
    registrar.mockResolvedValue(undefined);

    await render(<NovaDespesa />);

    fireEvent.press(screen.getByText('Salvar despesa'));

    await waitFor(() => {
      expect(registrar).toHaveBeenCalledTimes(1);
    });

    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Conta de energia',
        valorCentavos: 15000,
        data: '2026-10-16',
      }),
    );

    await waitFor(() => {
      expect(setFeedback).toHaveBeenCalledWith({
        tipo: 'sucesso',
        texto: 'Despesa cadastrada com sucesso!',
      });
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  it('mostra erro quando o cadastro falha', async () => {
    registrar.mockRejectedValue(new Error('Falha no banco'));

    await render(<NovaDespesa />);

    fireEvent.press(screen.getByText('Salvar despesa'));

    expect(
      await screen.findByText(MSG_DESPESA.falhaSalvar),
    ).toBeTruthy();

    expect(router.back).not.toHaveBeenCalled();
    expect(setFeedback).not.toHaveBeenCalled();
  });

  it('tocar em "Receita" troca para o formulário de nova receita', async () => {
    await render(<NovaDespesa />);
    await fireEvent.press(screen.getByRole('button', { name: 'Receita' }));
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/receitas/nova', params: { trocouTipo: '1' } });
  });

  it('depois de trocar o tipo (veio de "Nova receita"), salvar leva à lista de despesas', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ trocouTipo: '1' });
    try {
      registrar.mockResolvedValue(undefined);
      await render(<NovaDespesa />);
      await fireEvent.press(screen.getByText('Salvar despesa'));

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/despesas'));
      expect(router.back).not.toHaveBeenCalled();
    } finally {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    }
  });

  it('sem trocar o tipo, salvar volta para a tela anterior', async () => {
    registrar.mockResolvedValue(undefined);
    await render(<NovaDespesa />);
    await fireEvent.press(screen.getByText('Salvar despesa'));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
  });

  describe('quando aberta pelo tutorial', () => {
    beforeEach(() => {
      useLocalSearchParams.mockImplementation(() => ({ id: 'abc', tutorial: '1' }));
    });

    afterEach(() => {
      useLocalSearchParams.mockImplementation(() => ({ id: 'abc' }));
    });

    it('permite voltar à etapa após uma falha ao salvar', async () => {
      registrar.mockRejectedValueOnce(new Error('Falha no banco'));

      await render(<NovaDespesa />);
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar despesa' }));

      expect(await screen.findByText(MSG_DESPESA.falhaSalvar)).toBeTruthy();
      expect(router.back).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: 'Voltar à etapa' }));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it('mantém a origem ao trocar para o formulário de receita', async () => {
      await render(<NovaDespesa />);
      await fireEvent.press(screen.getByRole('button', { name: 'Receita' }));

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/receitas/nova',
        params: { tutorial: '1', trocouTipo: '1' },
      });
    });
    it('com o tipo trocado, salvar volta ao tutorial e não vai para a lista', async () => {
      useLocalSearchParams.mockImplementation(() => ({ id: 'abc', tutorial: '1', trocouTipo: '1' }));
      registrar.mockResolvedValue(undefined);
      await render(<NovaDespesa />);
      await fireEvent.press(screen.getByRole('button', { name: 'Salvar despesa' }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(router.replace).not.toHaveBeenCalled();
    });
  });
});
