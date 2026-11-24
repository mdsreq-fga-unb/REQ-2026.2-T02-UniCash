import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import Home from '@/app/index';
import { definirSessao } from '@/features/conta/sessao';
import { resetarContinuidadeSemConta, salvarContinuidadeSemConta } from '@/features/conta/onboarding';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => {
  const atual = require('../helpers/expoRouterMock');
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    ...atual,
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `redirect:${href}`),
    // O Link real exige o contexto de navegação; este mock preserva o href e
    // encaminha o toque ao router, como o Link do Expo Router faria.
    Link: ({ href, children }: { href: string; children: ReactNode }) =>
      React.createElement(
        Pressable,
        { onPress: () => atual.router.push(href), accessibilityRole: 'link' },
        React.createElement(Text, null, children),
      ),
  };
});

describe('Home (navegação da UC06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    definirSessao({ status: 'sem-sessao' });
    resetarContinuidadeSemConta();
  });

  it('abre o cadastro na primeira inicialização sem sessão', async () => {
    await render(<Home />);
    expect(await screen.findByText('redirect:/conta/cadastro')).toBeTruthy();
  });

  it('oferece acesso a Categorias e navega para /categorias', async () => {
    await salvarContinuidadeSemConta();
    await render(<Home />);

    expect(screen.getByText('Categorias')).toBeTruthy();
    await fireEvent.press(screen.getByText('Categorias'));
    expect(router.push).toHaveBeenCalledWith('/categorias');
  });

  it('mantém o acesso a Receitas', async () => {
    await salvarContinuidadeSemConta();
    await render(<Home />);

    expect(screen.getByText('Receitas')).toBeTruthy();
    await fireEvent.press(screen.getByText('Receitas'));
    expect(router.push).toHaveBeenCalledWith('/receitas');
  });
});
