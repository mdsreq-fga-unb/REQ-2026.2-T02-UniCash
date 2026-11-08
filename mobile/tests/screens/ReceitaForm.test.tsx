import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';
import { formatarBR, hojeISO } from '@/features/receitas/dates';
import { MSG } from '@/features/receitas/validation';

function montar(props: Partial<React.ComponentProps<typeof ReceitaForm>> = {}) {
  const onSalvar = jest.fn();
  const onCancelar = jest.fn();
  render(
    <ReceitaForm
      titulo="Nova receita"
      textoSalvar="Salvar receita"
      salvando={false}
      onSalvar={onSalvar}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onSalvar, onCancelar };
}

const digitar = (rotulo: string, texto: string) => fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const salvar = () => fireEvent.press(screen.getByText('Salvar receita'));

function preencherValido() {
  digitar('Título', 'Freela de design');
  digitar('Valor', '150,00');
  digitar('Data', '16102026');
}

describe('Formulário de receita (registrar e editar)', () => {
  it('mostra os campos do protótipo F4', () => {
    montar();
    expect(screen.getByText('Nova receita')).toBeTruthy();
    for (const r of ['Título', 'Valor', 'Data', 'Descrição (opcional)']) expect(screen.getByLabelText(r)).toBeTruthy();
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Repetição (opcional)')).toBeTruthy();
    expect(screen.getByText('Não se repete')).toBeTruthy();
    expect(screen.getByText('Salvo primeiro no dispositivo: funciona sem internet.')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
  });

  describe('EX01: dados inválidos', () => {
    it('mostra o motivo ao lado de cada campo obrigatório vazio e não salva', () => {
      const { onSalvar } = montar();
      salvar();
      expect(screen.getByText('Informe a data da receita.')).toBeTruthy();
      expect(screen.getByText('Informe o título da receita.')).toBeTruthy();
      expect(screen.getByText('Informe o valor da receita.')).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
    });

    it('valor inválido: mostra a mensagem literal', () => {
      montar();
      preencherValido();
      digitar('Valor', '0');
      salvar();
      expect(screen.getByText('O valor deve ser maior que zero, com no máximo duas casas decimais.')).toBeTruthy();
    });

    it('valor acima do limite', () => {
      montar();
      preencherValido();
      digitar('Valor', '1.000.000.000,00');
      salvar();
      expect(screen.getByText('O valor máximo permitido é R$ 999.999.999,99.')).toBeTruthy();
    });

    it('título longo e descrição longa', () => {
      montar();
      preencherValido();
      digitar('Título', 'a'.repeat(81));
      digitar('Descrição (opcional)', 'd'.repeat(256));
      salvar();
      expect(screen.getByText('O título deve ter até 80 caracteres.')).toBeTruthy();
      expect(screen.getByText('A descrição deve ter até 255 caracteres.')).toBeTruthy();
    });

    it('preserva os dados digitados após o erro', () => {
      montar();
      digitar('Título', 'Freela');
      digitar('Descrição (opcional)', 'Minha descrição');
      digitar('Valor', '0');
      salvar();
      expect(screen.getByLabelText('Título').props.value).toBe('Freela');
      expect(screen.getByLabelText('Descrição (opcional)').props.value).toBe('Minha descrição');
      expect(screen.getByLabelText('Valor').props.value).toBe('0');
    });

    it('a mensagem some quando o campo é corrigido e salvo', () => {
      const { onSalvar } = montar();
      salvar();
      expect(screen.getByText('Informe o título da receita.')).toBeTruthy();
      preencherValido();
      salvar();
      expect(screen.queryByText('Informe o título da receita.')).toBeNull();
      expect(onSalvar).toHaveBeenCalledTimes(1);
    });
  });

  it('salva com campos válidos entregando dados normalizados', () => {
    const { onSalvar } = montar();
    preencherValido();
    salvar();
    expect(onSalvar).toHaveBeenCalledWith({
      data: '2026-10-16',
      titulo: 'Freela de design',
      valorCentavos: 15000,
      descricao: null,
      recorrencia: null,
    });
  });

  it('aplica a máscara na data', () => {
    montar();
    digitar('Data', '16102026');
    expect(screen.getByLabelText('Data').props.value).toBe('16/10/2026');
  });

  it('"Hoje" preenche a data atual', () => {
    montar();
    fireEvent.press(screen.getByText('Hoje'));
    expect(screen.getByLabelText('Data').props.value).toBe(formatarBR(hojeISO()));
  });

  it('exibe a falha de gravação (EX03) mantendo o formulário preenchido', () => {
    montar({ erroGeral: MSG.falhaSalvar, inicial: undefined });
    digitar('Título', 'Freela');
    expect(screen.getByText('Não foi possível salvar. Nenhuma alteração foi feita. Tente novamente.')).toBeTruthy();
    expect(screen.getByLabelText('Título').props.value).toBe('Freela');
  });

  it('cancelar não salva', () => {
    const { onSalvar, onCancelar } = montar();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onCancelar).toHaveBeenCalled();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  describe('recorrência (RN19)', () => {
    const abrirRepeticao = () => fireEvent.press(screen.getByLabelText('Repetição'));

    it('abre o formulário de repetição com intervalo, unidade e término opcional', () => {
      montar();
      abrirRepeticao();
      fireEvent.press(screen.getByText('Repete'));
      expect(screen.getByLabelText('Repetir a cada')).toBeTruthy();
      expect(screen.getByText('Dias')).toBeTruthy();
      expect(screen.getByText('Meses')).toBeTruthy();
      expect(screen.getByText('Anos')).toBeTruthy();
      expect(screen.getByLabelText('Data de término (opcional)')).toBeTruthy();
    });

    it('resume a repetição escolhida no campo', () => {
      montar();
      abrirRepeticao();
      fireEvent.press(screen.getByText('Repete'));
      digitar('Repetir a cada', '2');
      fireEvent.press(screen.getByText('Meses'));
      digitar('Data de término (opcional)', '16102027');
      fireEvent.press(screen.getByText('Concluir'));
      expect(screen.getByText('A cada 2 meses · até 16/10/2027')).toBeTruthy();
    });

    it('intervalo zero é rejeitado', () => {
      const { onSalvar } = montar();
      preencherValido();
      abrirRepeticao();
      fireEvent.press(screen.getByText('Repete'));
      digitar('Repetir a cada', '0');
      fireEvent.press(screen.getByText('Concluir'));
      salvar();
      expect(screen.getByText('O intervalo da recorrência deve ser maior que zero.')).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
    });

    it('término anterior ao início é rejeitado', () => {
      const { onSalvar } = montar();
      preencherValido();
      abrirRepeticao();
      fireEvent.press(screen.getByText('Repete'));
      digitar('Data de término (opcional)', '15102026');
      fireEvent.press(screen.getByText('Concluir'));
      salvar();
      expect(screen.getByText('A data de término deve ser igual ou posterior à data de início.')).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
    });

    it('salva a recorrência válida', () => {
      const { onSalvar } = montar();
      preencherValido();
      abrirRepeticao();
      fireEvent.press(screen.getByText('Repete'));
      fireEvent.press(screen.getByText('Concluir'));
      salvar();
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ recorrencia: { intervalo: 1, unidade: 'mes', termino: null } }),
      );
    });
  });

  describe('modo edição (protótipo F5)', () => {
    it('mostra "Excluir lançamento" no lugar de "Cancelar"', () => {
      const onExcluir = jest.fn();
      montar({ titulo: 'Editar lançamento', textoSalvar: 'Salvar alterações', onExcluir });
      expect(screen.queryByText('Cancelar')).toBeNull();
      fireEvent.press(screen.getByText(/Excluir lançamento/));
      expect(onExcluir).toHaveBeenCalled();
    });

    it('avisa que a repetição de uma série vale só em "esta e as próximas" ou "todas"', () => {
      montar({ emSerie: true });
      expect(screen.getByText(/Receita de uma série/)).toBeTruthy();
    });
  });
});
