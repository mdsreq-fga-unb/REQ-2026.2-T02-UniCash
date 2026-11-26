import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import DetalheMeta from '@/app/metas/[id]/index';
import { excluirMeta } from '@/features/metas/service';
import * as hookModulo from '@/features/metas/useMetas';
import type { useMeta } from '@/features/metas/useMetas';
import { META_EXCLUIDA, consumirFeedback } from '@/features/metas/feedback';
import { MSG_META } from '@/features/metas/validation';
import { router, useLocalSearchParams } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/metas/useMetas');
jest.mock('@/features/metas/service', () => ({
  ...jest.requireActual('@/features/metas/service'),
  excluirMeta: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({ sincronizarEmSegundoPlano: jest.fn() }));

const usarMeta = jest.spyOn(hookModulo, 'useMeta');
const excluir = excluirMeta as jest.Mock;

const meta = {
  id: 'm1',
  objetivo: 'Viagem',
  tipo: 'investimento' as const,
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: 79_900,
  valor_acumulado_atualizado_em: '2026-11-20T10:00:00.000Z',
  sync_status: 'pendente' as const,
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
};

const progresso = (extra: Record<string, unknown> = {}) => ({
  metaId: 'm1',
  tipo: 'investimento' as const,
  valorAlvoCentavos: 100_000,
  valorRealizadoCentavos: 79_900,
  valorRestanteCentavos: 20_100,
  percentual: 79.9,
  prazo: '2027-12-31',
  situacaoProgresso: 'em_andamento' as const,
  situacaoPrazo: 'em_vigor' as const,
  progressoIndisponivel: false,
  periodo: null,
  ...extra,
});

const retorno = (extra: Partial<ReturnType<typeof useMeta>> = {}): ReturnType<typeof useMeta> => ({
  meta,
  progresso: progresso(),
  carregando: false,
  erroLeitura: false,
  recarregar: jest.fn().mockResolvedValue(undefined),
  ...extra,
});

describe('Detalhe da meta (UC12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consumirFeedback();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'm1' });
    usarMeta.mockReturnValue(retorno());
  });

  it('mostra objetivo, tipo, alvo, prazo e progresso', async () => {
    await render(<DetalheMeta />);
    expect(await screen.findByText('Viagem')).toBeTruthy();
    expect(screen.getByText('Investimento')).toBeTruthy();
    expect(screen.getByText('R$ 1.000,00')).toBeTruthy();
    expect(screen.getAllByText(/31\/12\/2027/).length).toBeGreaterThan(0);
    expect(screen.getByText('79,9%')).toBeTruthy();
    expect(screen.getByText(/R\$ 799,00/)).toBeTruthy();
    expect(screen.getByText(/R\$ 201,00/)).toBeTruthy();
    expect(screen.getByText('Em andamento')).toBeTruthy();
    expect(screen.getByText('Pendente de sincronização')).toBeTruthy();
    expect(screen.getByText('Valor informado pelo usuário.')).toBeTruthy();
    expect(screen.getByText(/Prazo em vigor/)).toBeTruthy();
  });

  it('sem valor acumulado, não mostra número inventado', async () => {
    usarMeta.mockReturnValue(
      retorno({
        progresso: progresso({
          valorRealizadoCentavos: null,
          valorRestanteCentavos: null,
          percentual: null,
          situacaoProgresso: 'indisponivel',
          situacaoPrazo: 'em_vigor',
          progressoIndisponivel: true,
        }),
      }),
    );
    await render(<DetalheMeta />);
    expect(await screen.findByText(MSG_META.valorNaoInformado)).toBeTruthy();
    expect(screen.getByText(/Valor realizado: indisponível/)).toBeTruthy();
    expect(screen.getByText(/Situação do progresso: Indisponível/)).toBeTruthy();
    expect(screen.queryByText(/79,9%/)).toBeNull();
  });

  it('meta de gasto sem categoria oferece correção', async () => {
    usarMeta.mockReturnValue(
      retorno({
        meta: {
          ...meta,
          tipo: 'gasto',
          categoria_id: null,
          categoria_nome: null,
        },
        progresso: progresso({
          tipo: 'gasto',
          valorRealizadoCentavos: null,
          valorRestanteCentavos: null,
          percentual: null,
          situacaoProgresso: 'indisponivel',
          progressoIndisponivel: true,
        }),
      }),
    );
    await render(<DetalheMeta />);
    expect((await screen.findAllByText(MSG_META.categoriaRemovida)).length).toBeGreaterThan(0);
    expect(screen.getByText('Corrigir categoria')).toBeTruthy();
  });

  it('navega para edição', async () => {
    await render(<DetalheMeta />);
    await fireEvent.press(screen.getByText('Editar meta'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/metas/[id]/editar', params: { id: 'm1' } });
  });

  it('confirma a exclusão e informa que os lançamentos são mantidos', async () => {
    excluir.mockResolvedValue(undefined);
    await render(<DetalheMeta />);
    await fireEvent.press(await screen.findByText('Excluir meta'));
    expect(screen.getByText(/Os lançamentos associados serão mantidos/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Excluir'));
    await waitFor(() => expect(excluir).toHaveBeenCalledWith('m1'));
    expect(consumirFeedback()).toEqual(META_EXCLUIDA);
    expect(router.dismissTo).toHaveBeenCalledWith('/metas');
  });

  it('meta inexistente volta para a lista com aviso', async () => {
    usarMeta.mockReturnValue(retorno({ meta: null, progresso: null }));
    await render(<DetalheMeta />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/metas'));
    expect(consumirFeedback()?.texto).toBe(MSG_META.indisponivel);
  });

  it('falha de leitura oferece tentar novamente', async () => {
    const recarregar = jest.fn().mockResolvedValue(undefined);
    usarMeta.mockReturnValue(retorno({ meta: null, progresso: null, erroLeitura: true, recarregar }));
    await render(<DetalheMeta />);
    expect(await screen.findByText(MSG_META.falhaLeitura)).toBeTruthy();
    await fireEvent.press(screen.getByText('Tentar novamente'));
    expect(recarregar).toHaveBeenCalled();
  });
});
