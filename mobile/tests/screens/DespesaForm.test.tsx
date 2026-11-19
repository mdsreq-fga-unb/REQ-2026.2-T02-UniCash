
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DespesaForm } from '@/components/despesas/DespesaForm';
import { formatarBR, hojeISO } from '@/features/receitas/dates';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import type { FormValoresDespesa } from '@/features/despesas/types';

async function montar(
  props: Partial<React.ComponentProps<typeof DespesaForm>> = {},
) {
  const onSalvar = jest.fn();
  const onCancelar = jest.fn();
  const onExcluir = jest.fn();

  await render(
    <DespesaForm
      titulo="Nova despesa"
      textoSalvar="Salvar despesa"
      salvando={false}
      onSalvar={onSalvar}
      onCancelar={onCancelar}
      onExcluir={undefined}
      {...props}
    />,
  );

  return { onSalvar, onCancelar, onExcluir };
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

  describe('categoria (RN13)', () => {
    it('mostra "Sem categoria" e as sete categorias padrão', async () => {
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
      ]) {
        expect(screen.getByText(nome)).toBeTruthy();
      }
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
      ['Casa', 'casa'],
      ['Alimentação', 'alimentacao'],
      ['Mobilidade', 'mobilidade'],
      ['Estudos', 'estudos'],
      ['Saúde', 'saude'],
      ['Lazer', 'lazer'],
      ['Reserva financeira', 'reserva_financeira'],
    ])('escolher %s salva a categoria %s', async (nome, id) => {
      const { onSalvar } = await montar();

      await preencherValido();
      await fireEvent.press(screen.getByText(nome));
      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: id }),
      );
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

    it('na edição, abre com a categoria atual selecionada', async () => {
      const { onSalvar } = await montar({
        inicial: { ...FORM_BASE, categoriaId: 'estudos' },
      });

      await salvar();

      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'estudos' }),
      );
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
    expect(screen.getByLabelText('Valor').props.value).toBe('0');
    expect(onSalvar).not.toHaveBeenCalled();
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
  fixarHoje('2027-01-01');
  try {
    await montar();

    expect(screen.getByLabelText('Data').props.value).toBe('01/01/2027');
  } finally {
    restaurarTempo();
  }
});
