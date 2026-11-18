import { render, screen } from '@testing-library/react-native';
import Detalhe from '@/app/receitas/[id]/index';
import Editar from '@/app/receitas/[id]/editar';
import { buscarReceita } from '@/features/receitas/service';
import { receitaLinha, serieLinha } from '../helpers/dados';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/receitas/service', () => ({
  ...jest.requireActual('@/features/receitas/service'),
  buscarReceita: jest.fn(),
}));
jest.mock('@/features/receitas/sync', () => ({
  sincronizarPendentes: jest.fn().mockResolvedValue(false),
  sincronizarEmSegundoPlano: jest.fn(),
}));

const buscar = buscarReceita as jest.Mock;
const serie = (extra = {}) => ({
  receita: receitaLinha({ recorrencia_id: 'serie1' }),
  recorrencia: serieLinha(extra),
});

describe('Detalhe: descrição e repetição', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sem descrição mostra traço; com descrição mostra o texto', async () => {
    buscar.mockResolvedValue({ receita: receitaLinha({ descricao: null }), recorrencia: null });
    await render(<Detalhe />);
    expect((await screen.findAllByText('—')).length).toBeGreaterThan(0);
    expect(screen.getByText('Não se repete')).toBeTruthy();
  });

  it('mostra a descrição quando existe', async () => {
    buscar.mockResolvedValue({ receita: receitaLinha({ descricao: 'Projeto de logo' }), recorrencia: null });
    await render(<Detalhe />);
    expect(await screen.findByText('Projeto de logo')).toBeTruthy();
  });

  it('série a cada 1 período, sem término', async () => {
    buscar.mockResolvedValue(serie({ intervalo: 1, termino: null }));
    await render(<Detalhe />);
    expect(await screen.findByText('A cada 1 mês · sem término')).toBeTruthy();
  });

  it('série a cada 2 períodos, com término', async () => {
    buscar.mockResolvedValue(serie({ intervalo: 2, termino: '2026-12-16' }));
    await render(<Detalhe />);
    expect(await screen.findByText('A cada 2 meses · até 16/12/2026')).toBeTruthy();
  });
});

describe('Edição: resumo da repetição ao carregar a série', () => {
  beforeEach(() => jest.clearAllMocks());

  it('com término', async () => {
    buscar.mockResolvedValue(serie({ intervalo: 2, termino: '2026-12-16' }));
    await render(<Editar />);
    await screen.findByText('Editar lançamento');
    expect(screen.getByText('A cada 2 meses · até 16/12/2026')).toBeTruthy();
  });

  it('sem término', async () => {
    buscar.mockResolvedValue(serie({ intervalo: 1, termino: null }));
    await render(<Editar />);
    await screen.findByText('Editar lançamento');
    expect(screen.getByText('A cada 1 mês')).toBeTruthy();
  });
});
