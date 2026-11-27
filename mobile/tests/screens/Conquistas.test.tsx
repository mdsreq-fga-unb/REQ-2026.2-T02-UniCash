import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Conquistas from '@/app/conquistas/index';
import DetalheSelo from '@/app/conquistas/[chave]';
import { avaliar } from '@/features/conquistas/avaliacao';
import { consultarConquistas, consultarSelo, FalhaLeituraConquistas } from '@/features/conquistas/consulta';
import { METAS_EXEMPLO } from '@/features/conquistas/metas';
import { definirSessao } from '@/features/conta/sessao';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/conquistas/consulta', () => ({
  ...jest.requireActual('@/features/conquistas/consulta'),
  consultarConquistas: jest.fn(),
  consultarSelo: jest.fn(),
}));
jest.mock('@/features/conquistas/emissao', () => ({ avaliarEEmitir: jest.fn(async () => {}) }));

const cheio = avaliar({
  meses: [
    { mes: '2026-09', receitasCentavos: 2000, despesasCentavos: 1000 },
    { mes: '2026-10', receitasCentavos: 320000, despesasCentavos: 278000 },
  ],
  metas: METAS_EXEMPLO,
});
const vazio = avaliar({ meses: [], metas: [] });

const consultar = consultarConquistas as jest.Mock;
const selo = consultarSelo as jest.Mock;
const params = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  params.mockReturnValue({});
  definirSessao({ status: 'sem-sessao' });
});

describe('UC13 - área Conquistas', () => {
  describe('US1 - consultar [CQ1, CQ3]', () => {
    it('mostra total, selos e pontos por meta', async () => {
      consultar.mockResolvedValue(cheio);
      await render(<Conquistas />);

      expect(await screen.findByText('300')).toBeTruthy();
      expect(screen.getByText('3 metas concluídas · 100 pontos cada')).toBeTruthy();
      expect(screen.getByText('Selos conquistados (3)')).toBeTruthy();
      expect(screen.getByText('No verde em outubro')).toBeTruthy();
      expect(screen.getByText('31/10')).toBeTruthy();
      expect(screen.getByText('Primeira meta concluída')).toBeTruthy();
      expect(screen.getByText('Pontos por meta concluída')).toBeTruthy();
      expect(screen.getByText('Reserva de emergência · +100')).toBeTruthy();
      expect(screen.getByText('15/10/2026')).toBeTruthy();
    });

    it('estado vazio (FA01)', async () => {
      consultar.mockResolvedValue(vazio);
      await render(<Conquistas />);

      expect(await screen.findByText('0')).toBeTruthy();
      expect(screen.getByText('Nenhuma meta concluída')).toBeTruthy();
      expect(screen.getByText('Nenhuma conquista ainda.')).toBeTruthy();
      expect(screen.getByText('Mantenha as contas no verde e conclua suas metas para ganhar selos e pontos.')).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: 'Ver metas' }));
      expect(router.push).toHaveBeenCalledWith('/metas');
    });

    it('tocar no selo abre o detalhe', async () => {
      consultar.mockResolvedValue(cheio);
      await render(<Conquistas />);
      fireEvent.press(await screen.findByLabelText('No verde em outubro, 31/10'));
      expect(router.push).toHaveBeenCalledWith({ pathname: '/conquistas/[chave]', params: { chave: 'no-verde:2026-10' } });
    });
  });

  describe('US3 - detalhe do selo [CQ2]', () => {
    it('selo "No verde" mostra os dados do mês e leva ao resumo', async () => {
      params.mockReturnValue({ chave: 'no-verde:2026-10' });
      selo.mockResolvedValue(cheio.selos[0]);
      await render(<DetalheSelo />);

      expect(await screen.findByText('Conquistado em 31/10/2026')).toBeTruthy();
      expect(screen.getByText('Saldo positivo no mês')).toBeTruthy();
      expect(screen.getByText('Outubro/2026')).toBeTruthy();
      expect(screen.getByText('R$ 3.200,00')).toBeTruthy();
      expect(screen.getByText('R$ 2.780,00')).toBeTruthy();
      expect(screen.getByText('R$ 420,00')).toBeTruthy();

      fireEvent.press(screen.getByText('Ver resumo do mês'));
      expect(router.push).toHaveBeenCalledWith({ pathname: '/', params: { ano: '2026', mes: '10' } });
    });

    it('selo de primeira meta mostra a meta e a data', async () => {
      params.mockReturnValue({ chave: 'primeira-meta' });
      selo.mockResolvedValue(cheio.selos.find((s) => s.chave === 'primeira-meta'));
      await render(<DetalheSelo />);

      expect(await screen.findByText('Viagem de julho')).toBeTruthy();
      expect(screen.getByText('Conquistado em 12/09/2026')).toBeTruthy();
    });

    it('mostra o selo e a meta quando a data da conquista é indeterminável', async () => {
      const r = avaliar({
        meses: [],
        metas: [{ id: 'reserva', titulo: 'Reserva', concluidaEm: null }],
      });
      params.mockReturnValue({ chave: 'primeira-meta' });
      selo.mockResolvedValue(r.selos[0]);
      await render(<DetalheSelo />);

      expect(await screen.findByText('Reserva')).toBeTruthy();
      expect(screen.queryByText(/Conquistado em/)).toBeNull();
    });

    it('selo que não vale mais (FA08) avisa e volta à lista', async () => {
      params.mockReturnValue({ chave: 'no-verde:2026-08' });
      selo.mockResolvedValue(null);
      await render(<DetalheSelo />);

      expect(await screen.findByText(/não está mais disponível/)).toBeTruthy();
      fireEvent.press(screen.getByText('Voltar para Conquistas'));
      expect(router.back).toHaveBeenCalled();
    });
  });

  describe('US5 - falhas e acesso negado [CQ4, CQ6]', () => {
    it('falha de leitura mostra EX03 e "Tentar novamente" recarrega', async () => {
      consultar.mockRejectedValueOnce(new FalhaLeituraConquistas('disco')).mockResolvedValueOnce(cheio);
      await render(<Conquistas />);

      expect(await screen.findByText('Não foi possível carregar as conquistas.')).toBeTruthy();
      expect(screen.getByText('Tente novamente.')).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByText('Tentar novamente'));
      });
      expect(await screen.findByText('300')).toBeTruthy();
    });

    it('conquistas de outro usuário são negadas (EX04)', async () => {
      definirSessao({ status: 'ativa', uid: 'eu', email: 'eu@x.com' });
      params.mockReturnValue({ uid: 'outra-pessoa' });
      consultar.mockResolvedValue(cheio);
      await render(<Conquistas />);

      expect(await screen.findByText('Você não tem acesso a estas conquistas.')).toBeTruthy();
      expect(screen.getByText('As conquistas são visíveis apenas para o próprio usuário.')).toBeTruthy();
      expect(screen.queryByText('300')).toBeNull();
      fireEvent.press(screen.getByText('Ir para minhas conquistas'));
      expect(router.replace).toHaveBeenCalledWith('/conquistas');
    });
  });
});
