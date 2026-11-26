
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DespesaForm } from '@/components/despesas/DespesaForm';
import { useCategoriasAtivas } from '@/features/categorias/useCategoriasAtivas';
import type { Categoria } from '@/features/categorias/types';
import { formatarBR, hojeISO } from '@/features/receitas/dates';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import type { FormValoresDespesa } from '@/features/despesas/types';
import { MSG_DESPESA } from '@/features/despesas/validation';

jest.mock('@/features/categorias/useCategoriasAtivas', () => ({
  useCategoriasAtivas: jest.fn(),
}));

const mockCategorias = useCategoriasAtivas as jest.Mock;

function categoria(id: string, nome: string, padrao: 0 | 1 = 1): Categoria {
  return {
    id,
    nome,
    nome_normalizado: nome.toLocaleLowerCase('pt-BR'),
    padrao,
    limite_tipo: null,
    limite_centavos: null,
    limite_percentual_centesimos: null,
    sync_status: 'sincronizado',
    excluido_em: null,
    criado_em: '2026-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
  };
}

const CATEGORIAS_REAIS = [
  categoria('uuid-casa', 'Casa'),
  categoria('uuid-alimentacao', 'Alimentação'),
  categoria('uuid-mobilidade', 'Mobilidade'),
  categoria('uuid-estudos', 'Estudos'),
  categoria('uuid-saude', 'Saúde'),
  categoria('uuid-lazer', 'Lazer'),
  categoria('uuid-reserva', 'Reserva financeira'),
  categoria('uuid-mercado', 'Mercado', 0),
];

function retornoCategorias(
  overrides: Partial<{
    itens: Categoria[];
    carregando: boolean;
    erro: boolean;
    recarregar: () => void;
  }> = {},
) {
  return {
    itens: CATEGORIAS_REAIS,
    carregando: false,
    erro: false,
    recarregar: jest.fn(),
    ...overrides,
  };
}

async function montar(
  props: Partial<React.ComponentProps<typeof DespesaForm>> = {},
) {
  const onSalvar = jest.fn();
  const onCancelar = jest.fn();
  const onExcluir = jest.fn();

  const criarElemento = () => (
    <DespesaForm
      titulo="Nova despesa"
      textoSalvar="Salvar despesa"
      salvando={false}
      onSalvar={onSalvar}
      onCancelar={onCancelar}
      onExcluir={undefined}
      {...props}
    />
  );

  const { rerender } = await render(criarElemento());

  return {
    onSalvar,
    onCancelar,
    onExcluir,
    rerender: () => rerender(criarElemento()),
  };
}

const FORM_BASE: FormValoresDespesa = {
  valor: '250,00',
  data: '16/10/2026',
  titulo: 'Aluguel',
  descricao: '',
  categoriaId: '',
  fixaOuVariavel: '',
  essencial: '',
  recorrente: false,
  intervalo: '1',
  unidade: 'mes',
  termino: '',
};

const digitar = (rotulo: string, texto: string) =>
  fireEvent.changeText(screen.getByLabelText(rotulo), texto);

const salvar = () => fireEvent.press(screen.getByText('Salvar despesa'));

async function preencherValido() {
  await digitar('Título', 'Conta de energia');
  await digitar('Valor', '150,00');
  await digitar('Data', '16102026');
  await fireEvent.press(screen.getByText('Fixa'));
  await fireEvent.press(screen.getByText('Essencial'));
}

describe('Formulário de despesa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCategorias.mockReturnValue(retornoCategorias());
  });

  it('mascara o valor como moeda ao digitar um zero à direita', async () => {
    await montar();

    await digitar('Valor', '100,00');
    expect(screen.getByLabelText('Valor').props.value).toBe('100,00');

    await digitar('Valor', '100,000');
    expect(screen.getByLabelText('Valor').props.value).toBe('1.000,00');
  });

  it('mostra os campos principais do formulário', async () => {
    await montar();

    expect(screen.getByText('Nova despesa')).toBeTruthy();
    for (const rotulo of [
      'Título',
      'Valor',
      'Data',
      'Descrição (opcional)',
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeTruthy();
    }

    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Tipo de despesa')).toBeTruthy();
    expect(screen.getByText('Importância')).toBeTruthy();
    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Sem categoria')).toBeTruthy();
    expect(screen.getByText('Repetição (opcional)')).toBeTruthy();
    expect(screen.getByText('Salvo primeiro no dispositivo: funciona sem internet.')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('mostra erros ao tentar salvar o formulário vazio', async () => {
    const { onSalvar } = await montar();

    await salvar();

    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  describe('categoria (RN13, UC06)', () => {
    it('mostra Sem categoria, padrão e própria, sem duplicatas', async () => {
      await montar();

      for (const nome of [
        'Sem categoria',
        'Casa',
        'Alimentação',
        'Mobilidade',
        'Estudos',
        'Saúde',
        'Lazer',
        'Reserva financeira',
        'Mercado',
      ]) {
        expect(screen.getByText(nome)).toBeTruthy();
      }

      expect(screen.getAllByText('Casa')).toHaveLength(1);
      expect(screen.getAllByRole('radio')).toHaveLength(
        CATEGORIAS_REAIS.length + 1,
      );
    });

    it('por padrão salva sem categoria (FA01)', async () => {
      const { onSalvar } = await montar();

      await preencherValido();
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: null }),
      );
    });

    it.each([
      ['Casa', 'uuid-casa'],
      ['Alimentação', 'uuid-alimentacao'],
      ['Mobilidade', 'uuid-mobilidade'],
      ['Estudos', 'uuid-estudos'],
      ['Saúde', 'uuid-saude'],
      ['Lazer', 'uuid-lazer'],
      ['Reserva financeira', 'uuid-reserva'],
      ['Mercado', 'uuid-mercado'],
    ])('escolher %s salva o ID real %s', async (nome, id) => {
      const { onSalvar } = await montar();

      await preencherValido();
      await fireEvent.press(screen.getByText(nome));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: id }),
      );
    });

    it('não envia slugs históricos ao escolher uma categoria', async () => {
      const { onSalvar } = await montar();

      await preencherValido();
      await fireEvent.press(screen.getByText('Casa'));
      await salvar();

      const dados = onSalvar.mock.calls[0][0];
      expect(dados.categoriaId).toBe('uuid-casa');
      expect(dados.categoriaId).not.toBe('casa');
    });

    it('voltar para "Sem categoria" remove a categoria escolhida', async () => {
      const { onSalvar } = await montar();

      await preencherValido();
      await fireEvent.press(screen.getByText('Lazer'));
      await fireEvent.press(screen.getByText('Sem categoria'));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: null }),
      );
    });

    it('na edição, abre com o ID real selecionado e o preserva', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'uuid-estudos' },
      });

      expect(
        screen.getByRole('radio', { name: 'Estudos', selected: true }),
      ).toBeTruthy();

      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'uuid-estudos' }),
      );
    });

    it('preserva slug em quarentena ao salvar sem alterar a categoria', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'estudos' },
      });

      expect(
        screen.getByRole('radio', {
          name: 'Categoria atual (indisponível)',
          selected: true,
        }),
      ).toBeTruthy();

      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'estudos' }),
      );
    });

    it('preserva ID desconhecido ao salvar sem alterar a categoria', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'id-desconhecido' },
      });

      expect(
        screen.getByRole('radio', {
          name: 'Categoria atual (indisponível)',
          selected: true,
        }),
      ).toBeTruthy();

      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'id-desconhecido' }),
      );
    });

    it('substitui o vínculo anterior ao escolher uma categoria real', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'estudos' },
      });

      await fireEvent.press(screen.getByText('Mercado'));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'uuid-mercado' }),
      );
      expect(
        screen.queryByText('Categoria atual (indisponível)'),
      ).toBeNull();
    });

    it('remove explicitamente o vínculo ao escolher "Sem categoria"', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'estudos' },
      });

      await fireEvent.press(screen.getByText('Sem categoria'));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: null }),
      );
    });

    it('falha ao carregar preserva o ID, exibe erro e permite retry', async () => {
      const recarregar = jest.fn();
      mockCategorias.mockReturnValue(
        retornoCategorias({ itens: [], erro: true, recarregar }),
      );

      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'uuid-casa' },
      });

      expect(
        screen.getByText('Não foi possível carregar as categorias.'),
      ).toBeTruthy();
      expect(
        screen.getByRole('radio', {
          name: 'Categoria atual (indisponível)',
          selected: true,
        }),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(recarregar).toHaveBeenCalledTimes(1);

      await salvar();
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'uuid-casa' }),
      );
    });

    it('após retry bem-sucedido, exibe o nome real da categoria', async () => {
      const recarregar = jest.fn();
      mockCategorias.mockReturnValue(
        retornoCategorias({ itens: [], erro: true, recarregar }),
      );

      const { rerender } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'uuid-casa' },
      });

      expect(
        screen.getByText('Categoria atual (indisponível)'),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Tentar novamente'));
      expect(recarregar).toHaveBeenCalledTimes(1);

      mockCategorias.mockReturnValue(retornoCategorias());
      await rerender();

      expect(
        screen.getByRole('radio', { name: 'Casa', selected: true }),
      ).toBeTruthy();
      expect(
        screen.queryByText('Categoria atual (indisponível)'),
      ).toBeNull();
    });

    it('mostra o indicador durante a carga e não duplica opções após recarregar', async () => {
      mockCategorias.mockReturnValue(
        retornoCategorias({ itens: [], carregando: true }),
      );

      const { rerender } = await montar();

      expect(
        screen.root?.queryAll((i) => i.type === 'ActivityIndicator').length,
      ).toBeGreaterThan(0);

      mockCategorias.mockReturnValue(retornoCategorias());
      await rerender();

      expect(screen.getAllByRole('radio')).toHaveLength(
        CATEGORIAS_REAIS.length + 1,
      );
      expect(screen.getAllByText('Casa')).toHaveLength(1);
    });
  });

  it('salva os dados válidos', async () => {
    const { onSalvar } = await montar();

    await preencherValido();
    await salvar();

    expect(onSalvar).toHaveBeenCalledTimes(1);
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Conta de energia',
        valorCentavos: 15000,
        data: '2026-10-16',
        fixaOuVariavel: 'fixa',
        essencial: 1,
        recorrencia: null,
      }),
    );
  });

  it('aplica a máscara na data digitada', async () => {
    await montar();

    await digitar('Data', '16102026');

    expect(screen.getByLabelText('Data').props.value).toBe('16/10/2026');
  });

  it('"Hoje" preenche a data atual', async () => {
    await montar();

    await fireEvent.press(screen.getByText('Hoje'));

    expect(screen.getByLabelText('Data').props.value).toBe(
      formatarBR(hojeISO()),
    );
  });

  it('preserva os dados digitados após uma validação inválida', async () => {
    const { onSalvar } = await montar();

    await digitar('Título', 'Aluguel');
    await digitar('Valor', '0');
    await salvar();

    expect(screen.getByLabelText('Título').props.value).toBe('Aluguel');
    expect(screen.getByLabelText('Valor').props.value).toBe('0,00');
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('preserva o sinal na digitação progressiva e não salva', async () => {
    const { onSalvar } = await montar();

    await preencherValido();

    await digitar('Valor', '-');
    expect(screen.getByLabelText('Valor').props.value).toBe('-');

    await digitar('Valor', '-1');
    expect(screen.getByLabelText('Valor').props.value).toBe('-0,01');

    await digitar('Valor', '-1,00');
    expect(screen.getByLabelText('Valor').props.value).toBe('-1,00');

    await salvar();

    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByText(MSG_DESPESA.valorInvalido)).toBeTruthy();
  });

  it('rejeita valor negativo digitado e não salva', async () => {
    const { onSalvar } = await montar();

    await preencherValido();
    await digitar('Valor', '-150,00');

    expect(screen.getByLabelText('Valor').props.value).toBe('-150,00');

    await salvar();

    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByText(MSG_DESPESA.valorInvalido)).toBeTruthy();
  });

  it('rejeita valor negativo colado com símbolo de moeda', async () => {
    const { onSalvar } = await montar();

    await preencherValido();
    await digitar('Valor', 'R$ -150,00');

    expect(screen.getByLabelText('Valor').props.value).toBe('-150,00');

    await salvar();

    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByText(MSG_DESPESA.valorInvalido)).toBeTruthy();
  });

  it('rejeita valor negativo ao editar uma despesa', async () => {
    const { onSalvar } = await montar({
      inicial: FORM_BASE,
      titulo: 'Editar despesa',
    });

    await digitar('Valor', '-150,00');

    expect(screen.getByLabelText('Valor').props.value).toBe('-150,00');

    await salvar();

    expect(onSalvar).not.toHaveBeenCalled();
    expect(screen.getByText(MSG_DESPESA.valorInvalido)).toBeTruthy();
    expect(screen.getByText('Editar despesa')).toBeTruthy();
  });

  it('exibe erro geral de gravação', async () => {
    await montar({ erroGeral: 'Falha ao salvar a despesa.' });

    expect(screen.getByText('Falha ao salvar a despesa.')).toBeTruthy();
  });

  it('chama cancelar pelo botão do rodapé', async () => {
    const { onCancelar, onSalvar } = await montar();

    await fireEvent.press(screen.getByText('Cancelar'));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('chama cancelar pelo botão voltar', async () => {
    const { onCancelar } = await montar();

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('desabilita salvar enquanto está salvando', async () => {
    await montar({ salvando: true });

    expect(screen.queryByText('Salvar despesa')).toBeNull();
    expect(screen.getByLabelText('Voltar')).toBeTruthy();
  });

  describe('recorrência', () => {
    const abrirRepeticao = () =>
      fireEvent.press(screen.getByLabelText('Repetição'));

    it('abre as opções de recorrência', async () => {
      await montar();

      await abrirRepeticao();
      await fireEvent.press(screen.getByText('Repete'));

      expect(screen.getByLabelText('Repetir a cada')).toBeTruthy();
      expect(screen.getByText('Dias')).toBeTruthy();
      expect(screen.getByText('Meses')).toBeTruthy();
      expect(screen.getByText('Anos')).toBeTruthy();
      expect(screen.getByLabelText('Data de término (opcional)')).toBeTruthy();
    });

    it('resume a recorrência escolhida', async () => {
      await montar();

      await abrirRepeticao();
      await fireEvent.press(screen.getByText('Repete'));
      await digitar('Repetir a cada', '2');
      await fireEvent.press(screen.getByText('Meses'));
      await digitar('Data de término (opcional)', '16102027');
      await fireEvent.press(screen.getByText('Concluir'));

      expect(
         screen.getByText('A cada 2 meses · até 16/10/2027')
      ).toBeTruthy();
    });

    it('remove as opções de recorrência ao selecionar não se repete', async () => {
      await montar();

      await abrirRepeticao();
      await fireEvent.press(screen.getByText('Repete'));
      expect(screen.getByLabelText('Repetir a cada')).toBeTruthy();

      await fireEvent.press(screen.getByText('Não se repete'));

      expect(screen.queryByLabelText('Repetir a cada')).toBeNull();
    });

    it('salva uma despesa recorrente válida', async () => {
      const { onSalvar } = await montar();

      await preencherValido();
      await abrirRepeticao();
      await fireEvent.press(screen.getByText('Repete'));
      await fireEvent.press(screen.getByText('Concluir'));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          recorrencia: {
            intervalo: 1,
            unidade: 'mes',
            termino: null,
          },
        }),
      );
    });
  });

  it('mostra orientação quando a despesa pertence a uma série', async () => {
    await montar({ emSerie: true });

    expect(
      screen.getByText(/Despesa de uma série/),
    ).toBeTruthy();
  });

  it('mostra a ação de excluir quando recebe onExcluir', async () => {
    const onExcluir = jest.fn();

    await montar({ onExcluir });

    await fireEvent.press(screen.getByText(/Excluir despesa/));

    expect(onExcluir).toHaveBeenCalledTimes(1);
  });

  it('não mostra excluir quando não recebe onExcluir', async () => {
    await montar();

    expect(screen.queryByText(/Excluir despesa/)).toBeNull();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  it('usa os valores iniciais recebidos para edição', async () => {
    const inicial: FormValoresDespesa = {
      valor: '250,00',
      data: '16/10/2026',
      titulo: 'Aluguel',
      descricao: 'Apartamento',
      categoriaId: '',
      fixaOuVariavel: 'fixa',
      essencial: 'essencial',
      recorrente: false,
      intervalo: '1',
      unidade: 'mes',
      termino: '',
    };

    await montar({ inicial, titulo: 'Editar despesa' });

    expect(screen.getByText('Editar despesa')).toBeTruthy();
    expect(screen.getByLabelText('Título').props.value).toBe('Aluguel');
    expect(screen.getByLabelText('Valor').props.value).toBe('250,00');
    expect(screen.getByLabelText('Descrição (opcional)').props.value).toBe('Apartamento');
  });
});

it('preenche a data do dia em que o formulário é aberto', async () => {
  mockCategorias.mockReturnValue(retornoCategorias());
  fixarHoje('2027-01-01');
  try {
    await montar();

    expect(screen.getByLabelText('Data').props.value).toBe('01/01/2027');
  } finally {
    restaurarTempo();
  }
});

describe('Seletor Despesa/Receita', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCategorias.mockReturnValue(retornoCategorias());
  });

  it('no cadastro novo, tocar em "Receita" chama a troca de tipo', async () => {
    const onTrocarTipo = jest.fn();
    await montar({ onTrocarTipo });
    await fireEvent.press(screen.getByRole('button', { name: 'Receita' }));
    expect(onTrocarTipo).toHaveBeenCalledTimes(1);
  });

  it('na edição (sem troca de tipo), "Receita" fica desabilitado', async () => {
    await montar();
    expect(screen.getByRole('button', { name: 'Receita' })).toBeDisabled();
  });
});
