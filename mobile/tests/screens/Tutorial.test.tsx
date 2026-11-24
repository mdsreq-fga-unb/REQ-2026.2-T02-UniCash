import { fireEvent, render, screen } from '@testing-library/react-native';
import Tutorial from '@/app/tutorial';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));

describe('Tutorial (placeholder do RF55, atalho do UC03 FA02)', () => {
  it('avisa que o tutorial ainda não existe e volta para o resumo', async () => {
    await render(<Tutorial />);
    expect(screen.getByText('Tutorial em breve.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Voltar'));
    expect(router.back).toHaveBeenCalled();
  });
});
