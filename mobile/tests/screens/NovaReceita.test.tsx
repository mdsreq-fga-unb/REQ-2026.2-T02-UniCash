import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Nova from '@/app/receitas/nova';
import { FalhaPersistencia, registrarReceita } from '@/features/receitas/service';
import { consumirFeedback } from '@/features/receitas/feedback';
import { sincronizarEmSegundoPlano } from '@/features/receitas/sync';
import { MSG } from '@/features/receitas/validation';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  registrarReceita: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const registrar = registrarReceita as jest.Mock;
const digitar = (rotulo: string, texto: string) => fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const salvar = () => fireEvent.press(screen.getByText('Salvar receita'));

async function preencherValido() {
  await digitar('Título', 'Freela de design');
  await digitar('Valor', '150,00');
  await digitar('Data', '16102026');
}

describe('Nova receita (fluxo A, protótipo F4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
  });

  it('apresenta o formulário de nova receita', async () => {
    await render(<Nova />);
    expect(screen.getByText('Nova receita')).toBeTruthy();
    expect(screen.getByText('Salvar receita')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('salva com dados válidos, avisa que a sincronização está pendente e volta à lista', async () => {
    registrar.mockResolvedValue(undefined);
    await render(<Nova />);
    await preencherValido();
    await salvar();

    await waitFor(() =>
      expect(registrar).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Freela de design', valorCentavos: 15000, data: '2026-10-16' }),
      ),
    );
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(sincronizarEmSegundoPlano).toHaveBeenCalledTimes(1);
    expect(consumirFeedback()).toEqual({
      tipo: 'sucesso',
      texto: 'Salvo no dispositivo. Sincronização pendente.',
    });
  });

  it('EX01: dados inválidos não chamam o registro nem saem da tela', async () => {
    await render(<Nova />);
    await salvar();
    expect(screen.getByText('Informe o título da receita.')).toBeTruthy();
    expect(registrar).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  describe('EX03: falha ao gravar', () => {
    it('mostra a mensagem, preserva os dados e não sai da tela nem sincroniza', async () => {
      registrar.mockRejectedValue(new FalhaPersistencia('disco cheio'));
      await render(<Nova />);
      await preencherValido();
      await salvar();

      expect(await screen.findByText(MSG.falhaSalvar)).toBeTruthy();
      expect(screen.getByLabelText('Título').props.value).toBe('Freela de design');
      expect(screen.getByLabelText('Valor').props.value).toBe('150,00');
      expect(router.back).not.toHaveBeenCalled();
      expect(sincronizarEmSegundoPlano).not.toHaveBeenCalled();
      expect(consumirFeedback()).toBeNull();
    });

    it('permite tentar de novo e a mensagem de erro some em caso de sucesso', async () => {
      registrar.mockRejectedValueOnce(new FalhaPersistencia('disco')).mockResolvedValue(undefined);
      await render(<Nova />);
      await preencherValido();
      await salvar();
      await screen.findByText(MSG.falhaSalvar);

      await salvar(); // o botão volta a ficar disponível após o erro
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(registrar).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(MSG.falhaSalvar)).toBeNull();
    });
  });

  it('cancelar volta à lista sem gravar', async () => {
    await render(<Nova />);
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(registrar).not.toHaveBeenCalled();
  });

  it('o botão voltar do cabeçalho também volta sem gravar', async () => {
    await render(<Nova />);
    await fireEvent.press(screen.getByLabelText('Voltar'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(registrar).not.toHaveBeenCalled();
  });
});
