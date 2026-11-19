
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import DetalheDespesa from '@/app/despesas/[id]';
import { buscarDespesa } from '@/features/despesas/service';
import { MSG_DESPESA } from '@/features/despesas/validation';
import { despesaLinha } from '../helpers/dados';
import { router } from '../helpers/expoRouterMock';

const mockIniciarExclusao = jest.fn();

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@/components/despesas/useExclusaoDespesas', () => ({
  useExclusaoDespesas: () => ({
    iniciar: mockIniciarExclusao,
    dialogos: null,
  }),
}));

jest.mock('@/features/despesas/service', () => ({
  ...jest.requireActual('@/features/despesas/service'),
  buscarDespesa: jest.fn(),
}));

const buscar = buscarDespesa as jest.Mock;

function unica() {
  return {
    despesa: despesaLinha({
      id: 'abc',
      titulo: 'Aluguel',
      valor_centavos: 150000,
      data: '2026-10-16',
      descricao: 'Aluguel do apartamento',
      categoria_id: 'Moradia',
      fixa_ou_variavel: 'fixa',
      essencial: 1,
      recorrencia_id: null,
      sync_status: 'pendente',
    }),
    recorrencia: null,
  };
}

function emSerie(termino: string | null = null) {
  return {
    despesa: despesaLinha({
      id: 'abc',
      titulo: 'Aluguel',
      valor_centavos: 150000,
      data: '2026-10-16',
      recorrencia_id: 'serie-1',
      sync_status: 'pendente',
    }),
    recorrencia: {
      intervalo: 1,
      unidade: 'mes',
      termino,
    },
  };
}

describe('DetalheDespesa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buscar.mockResolvedValue(unica());
  });

  it('mostra os detalhes da despesa', async () => {
    await render(<DetalheDespesa />);

    expect(await screen.findByText('Aluguel')).toBeTruthy();
    expect(screen.getByText('Detalhe da despesa')).toBeTruthy();
    expect(screen.getByText('Aluguel do apartamento')).toBeTruthy();
    expect(screen.getByText('Moradia')).toBeTruthy();
    expect(screen.getByText('Fixa')).toBeTruthy();
    expect(screen.getByText('Essencial')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });

  it('mostra quando a despesa não tem recorrência', async () => {
    await render(<DetalheDespesa />);

    expect(await screen.findByText('Não se repete')).toBeTruthy();
  });

  it('mostra a recorrência sem data de término', async () => {
    buscar.mockResolvedValue(emSerie());

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(/A cada 1 mês/),
    ).toBeTruthy();

    expect(screen.getByText(/sem término/)).toBeTruthy();
  });

  it('mostra a recorrência com data de término', async () => {
    buscar.mockResolvedValue(emSerie('2027-01-16'));

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(/A cada 1 mês/),
    ).toBeTruthy();

    expect(screen.getByText(/16\/01\/2027/)).toBeTruthy();
  });

  it('navega para a edição da despesa', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    fireEvent.press(screen.getByText(/Editar despesa/));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/despesas/[id]/editar',
      params: { id: 'abc' },
    });
  });

  it('volta para a tela anterior', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    fireEvent.press(screen.getByLabelText('Voltar'));

    expect(router.back).toHaveBeenCalled();
  });

  it('mostra mensagem quando a despesa não está disponível', async () => {
    buscar.mockResolvedValue(null);

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(MSG_DESPESA.indisponivel),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Voltar para despesas'));

    expect(router.replace).toHaveBeenCalledWith('/despesas');
  });

  it('mostra erro de leitura e permite tentar novamente', async () => {
    buscar
      .mockRejectedValueOnce(new Error('Falha'))
      .mockResolvedValueOnce(unica());

    await render(<DetalheDespesa />);

    expect(
      await screen.findByText(MSG_DESPESA.falhaLeitura),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Tentar novamente'));

    expect(await screen.findByText('Aluguel')).toBeTruthy();

    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('aciona o início da exclusão pelo botão', async () => {
    await render(<DetalheDespesa />);

    await screen.findByText('Aluguel');

    fireEvent.press(
      screen.getByRole('button', { name: 'Excluir despesa' }),
    );

    expect(mockIniciarExclusao).toHaveBeenCalledTimes(1);
  });
});
