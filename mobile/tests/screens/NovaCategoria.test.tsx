import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NovaCategoria from '@/app/categorias/nova';
import { criarCategoria, FalhaPersistenciaCategoria, NomeDuplicado } from '@/features/categorias/service';
import { EntradaCategoriaInvalida, MSG_CAT } from '@/features/categorias/validation';
import { CATEGORIA_CRIADA, consumirFeedback } from '@/features/categorias/feedback';
import { router } from '../helpers/expoRouterMock';

jest.mock('expo-router', () => require('../helpers/expoRouterMock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/categorias/service', () => ({
  ...jest.requireActual('@/features/categorias/service'),
  criarCategoria: jest.fn(),
}));

const criar = criarCategoria as jest.Mock;

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const apertar = async (texto: string) => await fireEvent.press(screen.getByText(texto));
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar categoria'));

async function preencher(nome = 'Mercado', limite?: { rotulo: string; texto: string }) {
  await digitar('Nome', nome);
  if (limite) {
    await apertar(limite.rotulo === 'Percentual da renda' ? '% da renda' : 'Valor fixo');
    await digitar(limite.rotulo, limite.texto);
  }
}

describe('Nova categoria (fluxo B do UC06)', () => {
  beforeEach(() => {
    // resetAllMocks (e não clearAllMocks) para não vazar implementações mockXxxOnce entre testes.
    jest.resetAllMocks();
    consumirFeedback();
  });

  describe('cadastro com os três estados de limite', () => {
    it('sem limite', async () => {
      criar.mockResolvedValue('id-1');
      await render(<NovaCategoria />);
      await preencher('Mercado');
      await salvar();

      expect(criar).toHaveBeenCalledWith({ nome: 'Mercado', limite: null });
    });

    it('com limite monetário em centavos', async () => {
      criar.mockResolvedValue('id-1');
      await render(<NovaCategoria />);
      await preencher('Mercado', { rotulo: 'Valor', texto: '1.234,56' });
      await salvar();

      expect(criar).toHaveBeenCalledWith({ nome: 'Mercado', limite: { tipo: 'valor', valor: 123_456 } });
    });

    it('com percentual da renda em centésimos', async () => {
      criar.mockResolvedValue('id-1');
      await render(<NovaCategoria />);
      await preencher('Mercado', { rotulo: 'Percentual da renda', texto: '12,5' });
      await salvar();

      expect(criar).toHaveBeenCalledWith({ nome: 'Mercado', limite: { tipo: 'percentual_renda', valor: 1250 } });
    });
  });

  it('sucesso: feedback registrado e retorno à listagem', async () => {
    criar.mockResolvedValue('id-1');
    await render(<NovaCategoria />);
    await preencher('Mercado');
    await salvar();

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    expect(consumirFeedback()).toEqual(CATEGORIA_CRIADA);
    expect(consumirFeedback()).toBeNull(); // consumido uma única vez
  });

  it('nome duplicado: erro inline no campo e limpeza ao editar o nome', async () => {
    criar.mockRejectedValueOnce(new NomeDuplicado()).mockResolvedValueOnce('id-2');
    await render(<NovaCategoria />);
    await preencher('Casa');
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_CAT.nomeDuplicado)).toBeTruthy());
    expect(router.dismissTo).not.toHaveBeenCalled();

    // Editar o nome limpa o erro; nova tentativa com sucesso sai da tela.
    await digitar('Nome', 'Casa Nova');
    expect(screen.queryByText(MSG_CAT.nomeDuplicado)).toBeNull();
    await salvar();
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(2));
    expect(router.dismissTo).toHaveBeenCalledWith('/categorias');
  });

  it('falha de persistência: mensagem geral e dados preservados', async () => {
    criar.mockRejectedValue(new FalhaPersistenciaCategoria('db fechado'));
    await render(<NovaCategoria />);
    await preencher('Mercado', { rotulo: 'Valor', texto: '100,00' });
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());
    expect(screen.getByLabelText('Nome').props.value).toBe('Mercado'); // dados preservados
    expect(screen.getByLabelText('Valor').props.value).toBe('100,00');
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('erro de validação do serviço: mensagem sem sair da tela', async () => {
    criar.mockRejectedValue(new EntradaCategoriaInvalida(MSG_CAT.nomeLongo));
    await render(<NovaCategoria />);
    await preencher('a'.repeat(31));
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_CAT.nomeLongo)).toBeTruthy());
    expect(screen.getByLabelText('Nome').props.value).toBe('a'.repeat(31));
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('dois envios rápidos criam uma categoria só; nova tentativa após falha', async () => {
    // Falha fica pendente durante os toques rápidos e só chega depois (como uma operação lenta).
    let rejeitar!: (erro: unknown) => void;
    criar
      .mockImplementationOnce(() => new Promise<never>((_, rej) => (rejeitar = rej)))
      .mockResolvedValueOnce('id-3');
    await render(<NovaCategoria />);
    await preencher('Mercado');
    const botao = screen.getByLabelText('Salvar categoria');

    await fireEvent.press(botao);
    await fireEvent.press(botao); // segundo toque antes da tela liberar
    await salvar();
    expect(criar).toHaveBeenCalledTimes(1); // concorrência bloqueada

    // A operação falha: mensagem aparece e a trava é liberada.
    rejeitar(new FalhaPersistenciaCategoria('x'));
    await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());
    expect(criar).toHaveBeenCalledTimes(1);

    // Nova tentativa é permitida e desta vez funciona.
    await salvar();
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(2));
    expect(router.dismissTo).toHaveBeenCalledWith('/categorias');
  });

  it('estado de carregamento: spinner no botão e envios bloqueados', async () => {
    let resolver!: (v: string) => void;
    criar.mockImplementation(() => new Promise<string>((res) => (resolver = res)));
    await render(<NovaCategoria />);
    await preencher('Mercado');
    const botao = screen.getByLabelText('Salvar categoria');

    await fireEvent.press(botao);
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Salvar categoria')).toBeNull(); // texto virou spinner
    await fireEvent.press(botao);
    expect(criar).toHaveBeenCalledTimes(1);

    // Sucesso: feedback + navegação (a tela não reseta salvando, como em receitas/nova).
    resolver('id-4');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
  });

  it('erro inesperado: mensagem adequada sem travar ou fechar a tela', async () => {
    criar.mockRejectedValue(new Error('fora do previsto'));
    await render(<NovaCategoria />);
    await preencher('Mercado');
    await salvar();

    await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());
    expect(screen.getByLabelText('Nome').props.value).toBe('Mercado');
    expect(router.dismissTo).not.toHaveBeenCalled();

    // A tela continua operável: nova tentativa com sucesso sai normalmente.
    criar.mockResolvedValueOnce('id-5');
    await salvar();
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
  });

  it('cancelar volta à tela anterior', async () => {
    await render(<NovaCategoria />);
    await apertar('Cancelar');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
