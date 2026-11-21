import { fireEvent, render, screen } from '@testing-library/react-native';

import Home from '@/app';

const mockAbrirRota = jest.fn();

jest.mock('expo-router', () => {
  const { Text } = require('react-native');

  return {
    ...require('../helpers/expoRouterMock'),
    Link: ({ href, children }: { href: string; children: string }) => (
      <Text accessibilityRole="link" onPress={() => mockAbrirRota(href)}>
        {children}
      </Text>
    ),
  };
});

it('RNF27: permite abrir a lista de despesas diretamente da tela inicial', async () => {
  await render(<Home />);

  await fireEvent.press(screen.getByRole('link', { name: 'Despesas' }));

  expect(mockAbrirRota).toHaveBeenCalledWith('/despesas');
});
