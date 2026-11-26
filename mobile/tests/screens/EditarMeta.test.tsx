import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EditarMeta from '@/app/metas/[id]/editar';
import {
  buscarMeta,
  editarMeta,
  FalhaPersistenciaMeta,
} from '@/features/metas/service';
import { EntradaMetaInvalida, MSG_META } from '@/features/metas/validation';
import { META_SALVA, consumirFeedback } from '@/features/metas/feedback';
import { router, useLocalSearchParams } from '../helpers/expoRouterMock';

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
  buscarMeta: jest.fn(),
  editarMeta: jest.fn(),
}));

const buscar = buscarMeta as jest.Mock;
const editar = editarMeta as jest.Mock;

const meta = {
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento' as const,
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: null,
  valor_acumulado_atualizado_em: null,
  sync_status: 'pendente' as const,
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
};

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar alterações'));

describe('Editar meta (UC12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'm1' });
    buscar.mockResolvedValue(meta);
  });

  it('carrega os dados e salva alterações', async () => {
    editar.mockResolvedValue(undefined);
    await render(<EditarMeta />);
    expect(await screen.findByDisplayValue('Viagem')).toBeTruthy();
    expect(screen.getByDisplayValue('1000,00')).toBeTruthy();
    expect(screen.getByDisplayValue('31/12/2027')).toBeTruthy();

    await digitar('Objetivo', 'Viagem longa');
    await salvar();

    expect(editar).toHaveBeenCalledWith('m1', {
      objetivo: 'Viagem longa',
      tipo: 'investimento',
      valorAlvoCentavos: 100_000,
      prazo: '2027-12-31',
      categoriaId: null,
      valorAcumuladoCentavos: null,
    });
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/metas'));
    expect(consumirFeedback()).toEqual(META_SALVA);
  });

  it('meta inexistente volta para a lista', async () => {
    buscar.mockResolvedValue(null);
    await render(<EditarMeta />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/metas'));
    expect(consumirFeedback()?.texto).toBe(MSG_META.indisponivel);
  });

  it('falha de leitura oferece tentar novamente', async () => {
    buscar.mockRejectedValueOnce(new Error('db fechado')).mockResolvedValueOnce(meta);
    await render(<EditarMeta />);
    expect(await screen.findByText(MSG_META.falhaLeitura)).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(await screen.findByDisplayValue('Viagem')).toBeTruthy();
  });

  it('falha de persistência mantém os dados digitados', async () => {
    editar.mockRejectedValue(new FalhaPersistenciaMeta('db fechado'));
    await render(<EditarMeta />);
    await screen.findByDisplayValue('Viagem');
    await digitar('Objetivo', 'Viagem longa');
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_META.falhaSalvar)).toBeTruthy());
    expect(screen.getByDisplayValue('Viagem longa')).toBeTruthy();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('erro de validação do serviço é exibido sem sair da tela', async () => {
    editar.mockRejectedValue(new EntradaMetaInvalida(MSG_META.objetivoLongo));
    await render(<EditarMeta />);
    await screen.findByDisplayValue('Viagem');
    await salvar();
    await waitFor(() => expect(screen.getByText(MSG_META.objetivoLongo)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('cancelar volta', async () => {
    await render(<EditarMeta />);
    await screen.findByDisplayValue('Viagem');
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(router.back).toHaveBeenCalled();
  });
});
