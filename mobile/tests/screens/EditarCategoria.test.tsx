import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Editar from '@/app/categorias/[id]/editar';
import {
  buscarCategoria,
  editarCategoria,
  excluirCategoria,
  CategoriaIndisponivel,
  CategoriaPadraoProtegida,
  FalhaLeituraCategoria,
  FalhaPersistenciaCategoria,
  NomeDuplicado,
} from '@/features/categorias/service';
import { CATEGORIA_EXCLUIDA, CATEGORIA_SALVA, consumirFeedback } from '@/features/categorias/feedback';
import { solicitarSemeaduraAposExclusao } from '@/features/categorias/semeaduraPendente';
import { EntradaCategoriaInvalida, MSG_CAT } from '@/features/categorias/validation';
import { router, useLocalSearchParams } from '../helpers/expoRouterMock';
import { categoriaLinha } from '../helpers/categorias';

jest.mock('expo-router', () => {
  const atual = require('../helpers/expoRouterMock');
  return {
    ...atual,
    // Foco na montagem (como o helper) + registra o callback para os testes
    // simularem recuperação de foco (atualização com dados já carregados).
    useFocusEffect: (cb: () => void) => {
      const React = require('react');
      React.useEffect(() => {
        mockFoco = cb;
        cb();
      }, [cb]);
    },
  };
});

/** Último callback de foco registrado pela tela montada. */
let mockFoco: () => void = () => {};
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/categorias/service', () => ({
  ...jest.requireActual('@/features/categorias/service'),
  buscarCategoria: jest.fn(),
  editarCategoria: jest.fn(),
  excluirCategoria: jest.fn(),
}));
jest.mock('@/features/categorias/semeaduraPendente', () => ({
  solicitarSemeaduraAposExclusao: jest.fn(),
}));

const buscar = buscarCategoria as jest.Mock;
const editar = editarCategoria as jest.Mock;
const excluir = excluirCategoria as jest.Mock;
const solicitarSemeadura = solicitarSemeaduraAposExclusao as jest.Mock;

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const apertar = async (texto: string) => await fireEvent.press(screen.getByText(texto));
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar alterações'));

const propria = (extra = {}) =>
  categoriaLinha({ id: 'abc', nome: 'Mercado', nome_normalizado: 'mercado', padrao: 0, ...extra });
const padrao = (extra = {}) =>
  categoriaLinha({ id: 'abc', nome: 'Casa', nome_normalizado: 'casa', padrao: 1, ...extra });

describe('Editar categoria (fluxos C e D do UC06)', () => {
  beforeEach(() => {
    // resetAllMocks (e não clearAllMocks) para não vazar implementações mockXxxOnce
    // entre testes; o helper de rota precisa da implementação re-semeada.
    jest.resetAllMocks();
    useLocalSearchParams.mockReturnValue({ id: 'abc' });
    consumirFeedback();
  });

  describe('carregamento (fluxo A)', () => {
    it('própria com limite em valor vem preenchida, com opção de excluir', async () => {
      buscar.mockResolvedValue(propria({ limite_tipo: 'valor', limite_centavos: 150_000 }));
      await render(<Editar />);

      expect(await screen.findByText('Editar categoria')).toBeTruthy();
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado');
      expect(screen.getByLabelText('Valor').props.value).toBe('1500,00');
      expect(screen.getByLabelText('Excluir categoria')).toBeTruthy();
    });

    it('própria com limite percentual vem preenchida em centésimos', async () => {
      buscar.mockResolvedValue(propria({ limite_tipo: 'percentual_renda', limite_percentual_centesimos: 1250 }));
      await render(<Editar />);

      expect(await screen.findByText('Editar categoria')).toBeTruthy();
      expect(screen.getByLabelText('Percentual da renda').props.value).toBe('12,5');
    });

    it('estado de carregamento não renderiza o formulário', async () => {
      let resolver!: (v: ReturnType<typeof propria>) => void;
      buscar.mockImplementation(() => new Promise((res) => (resolver = res)));
      await render(<Editar />);

      expect(screen.queryByLabelText('Nome')).toBeNull();
      resolver(propria());
      expect(await screen.findByLabelText('Nome')).toBeTruthy();
    });

    it('categoria inexistente: informa e volta à listagem (EX06)', async () => {
      buscar.mockResolvedValue(null);
      await render(<Editar />);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG_CAT.indisponivel });
    });

    it('erro de leitura: mensagem, tentar novamente e recuperação (EX08)', async () => {
      buscar.mockRejectedValueOnce(new FalhaLeituraCategoria('disco')).mockResolvedValueOnce(propria());
      await render(<Editar />);

      expect(await screen.findByText(MSG_CAT.falhaLeitura)).toBeTruthy();
      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(await screen.findByText('Editar categoria')).toBeTruthy();
    });

    it('falha de atualização com dados carregados: mantém o formulário, avisa e recupera', async () => {
      buscar
        .mockResolvedValueOnce(propria())
        .mockRejectedValueOnce(new FalhaLeituraCategoria('disco'))
        .mockResolvedValueOnce(propria());
      await render(<Editar />);
      expect(await screen.findByText('Editar categoria')).toBeTruthy();
      await digitar('Nome', 'Mercado Livre'); // edição em andamento

      // Recupera o foco e a atualização falha: nada é perdido, o aviso aparece.
      await act(async () => {
        mockFoco();
      });
      expect(await screen.findByText(/Não foi possível atualizar a categoria/)).toBeTruthy();
      expect(screen.getByText('Editar categoria')).toBeTruthy(); // formulário mantido
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado Livre'); // edição preservada

      // "Tentar novamente" recarrega com sucesso: o aviso some e a edição segue.
      await fireEvent.press(screen.getByLabelText('Tentar novamente'));
      await waitFor(() => expect(screen.queryByText(/Não foi possível atualizar a categoria/)).toBeNull());
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado Livre');
      expect(buscar).toHaveBeenCalledTimes(3);
    });
  });

  describe('edição de categoria própria (fluxo C)', () => {
    it('salva nome e limite alterados, registra feedback e volta', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockResolvedValue(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await digitar('Nome', 'Mercado Livre');
      await apertar('Valor fixo');
      await digitar('Valor', '200,00');
      await salvar();

      await waitFor(() =>
        expect(editar).toHaveBeenCalledWith('abc', { nome: 'Mercado Livre', limite: { tipo: 'valor', valor: 20_000 } }),
      );
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual(CATEGORIA_SALVA);
    });

    it('nome duplicado: erro inline, limpeza ao editar e nova tentativa (EX07)', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValueOnce(new NomeDuplicado()).mockResolvedValueOnce(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await digitar('Nome', 'Casa');
      await salvar();
      await waitFor(() => expect(screen.getByText(MSG_CAT.nomeDuplicado)).toBeTruthy());
      expect(router.dismissTo).not.toHaveBeenCalled();

      // Editar o nome limpa o erro; nova tentativa com sucesso sai da tela.
      await digitar('Nome', 'Mercado Livre');
      expect(screen.queryByText(MSG_CAT.nomeDuplicado)).toBeNull();
      await salvar();
      await waitFor(() => expect(editar).toHaveBeenCalledTimes(2));
      expect(router.dismissTo).toHaveBeenCalledWith('/categorias');
    });

    it('erro de validação do serviço: mensagem sem sair da tela', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValue(new EntradaCategoriaInvalida(MSG_CAT.nomeLongo));
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await digitar('Nome', 'Mercado Livre'); // entrada válida: o formulário não bloqueia antes do serviço
      await salvar();

      await waitFor(() => expect(screen.getByText(MSG_CAT.nomeLongo)).toBeTruthy());
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado Livre');
      expect(router.dismissTo).not.toHaveBeenCalled();
    });

    it('falha de persistência: mensagem, dados preservados e nova tentativa (EX03)', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValueOnce(new FalhaPersistenciaCategoria('db')).mockResolvedValueOnce(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await digitar('Nome', 'Mercado Livre');
      await salvar();
      await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado Livre'); // preservado
      expect(router.dismissTo).not.toHaveBeenCalled();

      await salvar();
      await waitFor(() => expect(editar).toHaveBeenCalledTimes(2));
      expect(router.dismissTo).toHaveBeenCalledWith('/categorias');
    });

    it('erro inesperado: mensagem adequada e recuperação', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValueOnce(new Error('fora do previsto')).mockResolvedValueOnce(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await salvar();
      await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());
      expect(router.dismissTo).not.toHaveBeenCalled();

      await salvar();
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    });

    it('categoria excluída entre abrir e salvar: informa e volta (EX06)', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValueOnce(new CategoriaIndisponivel());
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await salvar();
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG_CAT.indisponivel });
    });

    it('dois toques rápidos salvam uma vez; nova tentativa após a falha', async () => {
      buscar.mockResolvedValue(propria());
      let rejeitar!: (erro: unknown) => void;
      editar
        .mockImplementationOnce(() => new Promise<never>((_, rej) => (rejeitar = rej)))
        .mockResolvedValueOnce(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await salvar();
      await salvar(); // segundo toque antes da tela liberar
      expect(editar).toHaveBeenCalledTimes(1);

      rejeitar(new FalhaPersistenciaCategoria('x'));
      await waitFor(() => expect(screen.getByText(MSG_CAT.falhaSalvar)).toBeTruthy());

      await salvar();
      await waitFor(() => expect(editar).toHaveBeenCalledTimes(2));
      expect(router.dismissTo).toHaveBeenCalledWith('/categorias');
    });
  });

  describe('categoria padrão (RN13/RN14)', () => {
    it('nome imutável, sem opção de excluir, limite editável', async () => {
      buscar.mockResolvedValue(padrao());
      editar.mockResolvedValue(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      const campoNome = screen.getByLabelText('Nome');
      expect(campoNome.props.value).toBe('Casa');
      expect(campoNome.props.editable).toBe(false);
      expect(screen.getByText('Categorias padrão não podem ser renomeadas nem excluídas.')).toBeTruthy();
      expect(screen.queryByLabelText('Excluir categoria')).toBeNull(); // sem exclusão para padrões

      await apertar('Valor fixo');
      await digitar('Valor', '800,00');
      await salvar();

      await waitFor(() =>
        expect(editar).toHaveBeenCalledWith('abc', { nome: 'Casa', limite: { tipo: 'valor', valor: 80_000 } }),
      );
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual(CATEGORIA_SALVA);
    });

    it('proteção do serviço (EX02) é exibida como erro geral', async () => {
      buscar.mockResolvedValue(propria());
      editar.mockRejectedValueOnce(new CategoriaPadraoProtegida());
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await salvar();
      await waitFor(() => expect(screen.getByText(MSG_CAT.categoriaPadrao)).toBeTruthy());
      expect(router.dismissTo).not.toHaveBeenCalled();
    });
  });

  describe('exclusão de categoria própria (fluxo D)', () => {
    it('confirmada: exclui, registra feedback e volta', async () => {
      buscar.mockResolvedValue(propria());
      excluir.mockResolvedValue(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      expect(screen.getByText('Excluir categoria?')).toBeTruthy();
      expect(screen.getByText(/A categoria “Mercado” será excluída/)).toBeTruthy();
      expect(screen.getByText(/limite de gastos associado será perdido/)).toBeTruthy();
      expect(screen.getByText(/UC02.*Sem categoria/)).toBeTruthy();
      expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeTruthy();

      await fireEvent.press(screen.getByText('Excluir')); // opção destrutiva do diálogo
      await waitFor(() => expect(excluir).toHaveBeenCalledWith('abc'));
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual(CATEGORIA_EXCLUIDA);
    });

    it('exclusão de própria com nome reservado solicita reavaliação da semeadura', async () => {
      buscar.mockResolvedValue(propria({ nome: 'Casa', nome_normalizado: 'casa' }));
      excluir.mockResolvedValue(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));

      await waitFor(() => expect(excluir).toHaveBeenCalledWith('abc'));
      expect(solicitarSemeadura).toHaveBeenCalledWith('casa');
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual(CATEGORIA_EXCLUIDA);
    });

    it('cancelada: não exclui e mantém a tela', async () => {
      buscar.mockResolvedValue(propria());
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      expect(screen.getByText('Excluir categoria?')).toBeTruthy();
      // Dois "Cancelar" existem (formulário e diálogo); o do diálogo é o último da árvore.
      await fireEvent.press(screen.getAllByText('Cancelar').at(-1)!);
      expect(excluir).not.toHaveBeenCalled();
      expect(router.dismissTo).not.toHaveBeenCalled();
      expect(screen.getByText('Editar categoria')).toBeTruthy(); // segue na edição
    });

    it('exclusão com CategoriaIndisponivel: feedback de erro e retorno à lista (EX06)', async () => {
      buscar.mockResolvedValue(propria());
      excluir.mockRejectedValueOnce(new CategoriaIndisponivel());
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));

      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual({ tipo: 'erro', texto: MSG_CAT.indisponivel });
      expect(router.dismissTo).not.toHaveBeenCalled();
    });

    it('exclusão com CategoriaPadraoProtegida: mensagem de proteção sem sair da tela (EX02)', async () => {
      buscar.mockResolvedValue(propria());
      excluir.mockRejectedValueOnce(new CategoriaPadraoProtegida());
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));

      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(MSG_CAT.categoriaPadrao)).toBeTruthy());
      expect(router.dismissTo).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado'); // dados preservados
    });

    it('falha de exclusão: mensagem, sem navegação, e nova tentativa funciona', async () => {
      buscar.mockResolvedValue(propria());
      excluir.mockRejectedValueOnce(new FalhaPersistenciaCategoria('db')).mockResolvedValueOnce(undefined);
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(MSG_CAT.falhaExcluir)).toBeTruthy());
      expect(router.dismissTo).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByLabelText('Excluir categoria')); // nova tentativa
      await fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
      expect(consumirFeedback()).toEqual(CATEGORIA_EXCLUIDA);
    });

    it('exclusão em andamento bloqueia nova exclusão até terminar', async () => {
      buscar.mockResolvedValue(propria());
      let resolver!: () => void;
      excluir.mockImplementation(() => new Promise<void>((res) => (resolver = res)));
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));

      // Botão desabilitado durante a exclusão: o diálogo não reabre.
      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      expect(screen.queryByText('Excluir categoria?')).toBeNull();
      expect(excluir).toHaveBeenCalledTimes(1);

      resolver();
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    });

    it('trava síncrona: dois toques na confirmação disparam uma exclusão só', async () => {
      buscar.mockResolvedValue(propria());
      let resolver!: () => void;
      excluir.mockImplementation(() => new Promise<void>((res) => (resolver = res)));
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      const confirmar = screen.getByText('Excluir');
      await fireEvent.press(confirmar); // primeiro toque: exclusão inicia e a trava fecha
      await fireEvent.press(confirmar); // segundo toque antes do fim: a trava síncrona bloqueia
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));
      resolver();
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    });

    it('não salva enquanto uma exclusão está em andamento', async () => {
      buscar.mockResolvedValue(propria());
      let resolverExclusao!: () => void;
      excluir.mockImplementation(() => new Promise<void>((res) => (resolverExclusao = res)));
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      await fireEvent.press(screen.getByText('Excluir'));
      await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));

      await salvar(); // salvamento durante a exclusão: bloqueado
      expect(editar).not.toHaveBeenCalled();

      resolverExclusao();
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    });

    it('não exclui enquanto um salvamento está em andamento', async () => {
      buscar.mockResolvedValue(propria());
      let resolverSalvar!: () => void;
      editar.mockImplementation(() => new Promise<void>((res) => (resolverSalvar = res)));
      await render(<Editar />);
      await screen.findByText('Editar categoria');

      await salvar(); // salvamento fica pendente
      await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));

      // Botão de exclusão desabilitado durante o salvamento: o diálogo não abre.
      await fireEvent.press(screen.getByLabelText('Excluir categoria'));
      expect(screen.queryByText('Excluir categoria?')).toBeNull();
      expect(excluir).not.toHaveBeenCalled();

      resolverSalvar();
      await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/categorias'));
    });
  });

  it('cancelar volta à tela anterior', async () => {
    buscar.mockResolvedValue(propria());
    await render(<Editar />);
    await screen.findByText('Editar categoria');

    await apertar('Cancelar');
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
