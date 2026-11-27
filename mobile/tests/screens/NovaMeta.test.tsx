import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NovaMeta from '@/app/metas/nova';
import {
  criarMeta,
  FalhaPersistenciaMeta,
} from '@/features/metas/service';
import { EntradaMetaInvalida, MSG_META } from '@/features/metas/validation';
import { META_CRIADA, consumirFeedback } from '@/features/metas/feedback';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/sync', () => ({ sincronizarEmSegundoPlano: jest.fn() }));
jest.mock('@/features/categorias/useCategoriasAtivas', () => ({
  useCategoriasAtivas: () => ({
    itens: [{ id: 'c1', nome: 'Mercado' }],
    carregando: false,
    erro: false,
    recarregar: jest.fn(),
  }),
}));
jest.mock('@/features/metas/service', () => ({
  ...jest.requireActual('@/features/metas/service'),
  criarMeta: jest.fn(),
}));

const criar = criarMeta as jest.Mock;

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar meta'));

async function preencher(objetivo = 'Viagem') {
  await digitar('Objetivo', objetivo);
  await digitar('Valor alvo', '1.000,00');
  await digitar('Prazo', '31/12/2027');
  await fireEvent.press(screen.getByText('Mercado'));
}

describe('Nova meta (UC12)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    consumirFeedback();
  });

  it('cria meta e volta para a lista', async () => {
    criar.mockResolvedValue('id-1');
    await render(<NovaMeta />);
    await preencher();
    await salvar();

    expect(criar).toHaveBeenCalledWith({
      objetivo: 'Viagem',
      tipo: 'gasto',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
      categoriaId: 'c1',
      valorAcumuladoCentavos: null,
    });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/metas'));
    expect(consumirFeedback()).toEqual(META_CRIADA);
    expect(consumirFeedback()).toBeNull();
  });

  it('falha de persistência mantém os dados na tela', async () => {
    criar.mockRejectedValue(new FalhaPersistenciaMeta('db fechado'));
    await render(<NovaMeta />);
    await preencher();
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_META.falhaSalvar)).toBeTruthy());
    expect(screen.getByLabelText('Objetivo').props.value).toBe('Viagem');
    expect(screen.getByLabelText('Valor alvo').props.value).toBe('1.000,00');
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('erro de validação do serviço é exibido sem sair da tela', async () => {
    criar.mockRejectedValue(new EntradaMetaInvalida(MSG_META.objetivoLongo));
    await render(<NovaMeta />);
    await preencher();
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_META.objetivoLongo)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('dois envios rápidos criam uma meta só', async () => {
    let resolver!: (v: string) => void;
    criar.mockImplementation(() => new Promise<string>((res) => (resolver = res)));
    await render(<NovaMeta />);
    await preencher();
    const botao = screen.getByLabelText('Salvar meta');
    await fireEvent.press(botao);
    await fireEvent.press(botao);
    expect(criar).toHaveBeenCalledTimes(1);
    resolver('id-2');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/metas'));
  });

  it('cancelar volta à tela anterior', async () => {
    await render(<NovaMeta />);
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(router.back).toHaveBeenCalled();
  });
});
