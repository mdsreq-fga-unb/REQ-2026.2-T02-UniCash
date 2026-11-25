import { fireEvent, render, screen } from '@testing-library/react-native';
import ListaMetas from '@/app/metas/index';
import * as hookModulo from '@/features/metas/useMetas';
import type { useMetas } from '@/features/metas/useMetas';
import { META_CRIADA, setFeedback } from '@/features/metas/feedback';
import { MSG_META } from '@/features/metas/validation';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/metas/useMetas');

const usarMetas = jest.spyOn(hookModulo, 'useMetas');

const meta = (extra: Record<string, unknown> = {}) => ({
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  ...extra,
});

const retorno = (extra: Partial<ReturnType<typeof useMetas>> = {}): ReturnType<typeof useMetas> => ({
  itens: [],
  carregando: false,
  erroLeitura: false,
  recarregar: jest.fn().mockResolvedValue(undefined),
  ...extra,
});

describe('Lista de metas (UC12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usarMetas.mockReturnValue(retorno());
  });

  it('mostra estado vazio com ação de criar', async () => {
    await render(<ListaMetas />);
    expect(await screen.findByText('Nenhuma meta')).toBeTruthy();
    expect(screen.getByText(/Toque em \+ para criar/)).toBeTruthy();
    expect(screen.getByLabelText('Nova meta')).toBeTruthy();
  });

  it('lista objetivo, tipo, alvo, prazo e estado de sincronização', async () => {
    usarMetas.mockReturnValue(
      retorno({
        itens: [
          meta(),
          meta({
            id: 'm2',
            objetivo: 'Reserva',
            tipo: 'gasto',
            valor_alvo_centavos: 50_000,
            prazo: '2028-06-30',
            sync_status: 'sincronizado',
          }),
        ] as never,
      }),
    );
    await render(<ListaMetas />);

    expect(await screen.findByText('Viagem')).toBeTruthy();
    expect(screen.getByText('Investimento')).toBeTruthy();
    expect(screen.getByText('R$ 1.000,00')).toBeTruthy();
    expect(screen.getByText(/31\/12\/2027/)).toBeTruthy();
    expect(screen.getByText('Pendente de sincronização')).toBeTruthy();

    expect(screen.getByText('Reserva')).toBeTruthy();
    expect(screen.getByText('Gasto')).toBeTruthy();
    expect(screen.getByText('R$ 500,00')).toBeTruthy();
    expect(screen.getByText(/30\/06\/2028/)).toBeTruthy();
    expect(screen.getByText('Sincronizado')).toBeTruthy();
  });

  it('navega para detalhe e para o cadastro', async () => {
    usarMetas.mockReturnValue(retorno({ itens: [meta()] as never }));
    await render(<ListaMetas />);

    await fireEvent.press(await screen.findByLabelText('Meta Viagem'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/metas/[id]', params: { id: 'm1' } });

    await fireEvent.press(screen.getByLabelText('Nova meta'));
    expect(router.push).toHaveBeenCalledWith('/metas/nova');
  });

  it('exibe falha de leitura com tentar novamente', async () => {
    const recarregar = jest.fn().mockResolvedValue(undefined);
    usarMetas.mockReturnValue(retorno({ erroLeitura: true, recarregar }));
    await render(<ListaMetas />);

    expect(await screen.findByText(MSG_META.falhaLeitura)).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();
  });

  it('consome o feedback ao voltar de outra tela', async () => {
    setFeedback(META_CRIADA);
    await render(<ListaMetas />);
    expect(await screen.findByText('✓  Meta criada no dispositivo.')).toBeTruthy();
  });

  it('não mostra o vazio durante o carregamento', async () => {
    usarMetas.mockReturnValue(retorno({ carregando: true }));
    await render(<ListaMetas />);
    expect(screen.queryByText('Nenhuma meta')).toBeNull();
  });
});
