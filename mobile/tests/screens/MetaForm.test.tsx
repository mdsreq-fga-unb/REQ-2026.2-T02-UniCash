import { fireEvent, render, screen } from '@testing-library/react-native';
import { MetaForm } from '@/components/metas/MetaForm';
import type { MetaInput } from '@/features/metas/types';
import { MSG_META } from '@/features/metas/validation';

async function montar(props: Partial<React.ComponentProps<typeof MetaForm>> = {}) {
  const onSalvar = jest.fn();
  const onCancelar = jest.fn();
  const base = {
    titulo: 'Nova meta',
    textoSalvar: 'Salvar meta',
    salvando: false,
    onSalvar,
    onCancelar,
  };
  await render(<MetaForm {...base} {...props} />);
  return { onSalvar, onCancelar };
}

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const apertar = async (texto: string) => await fireEvent.press(screen.getByText(texto));
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar meta'));

describe('Formulário de meta (UC12)', () => {
  it('mostra campos, tipos e ações', async () => {
    await montar();
    expect(screen.getByLabelText('Objetivo')).toBeTruthy();
    expect(screen.getByText('Gasto')).toBeTruthy();
    expect(screen.getByText('Investimento')).toBeTruthy();
    expect(screen.getByLabelText('Valor alvo')).toBeTruthy();
    expect(screen.getByLabelText('Prazo')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Salvo primeiro no dispositivo: funciona sem internet.')).toBeTruthy();
  });

  it('bloqueia envio vazio com as mensagens da UC12', async () => {
    const { onSalvar } = await montar();
    await salvar();
    expect(screen.getByText(MSG_META.objetivoVazio)).toBeTruthy();
    expect(screen.getByText(MSG_META.valorVazio)).toBeTruthy();
    expect(screen.getByText(MSG_META.prazoVazio)).toBeTruthy();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('salva dados válidos convertendo centavos e prazo', async () => {
    const { onSalvar } = await montar();
    await digitar('Objetivo', '  Viagem  ');
    await digitar('Valor alvo', '1.234,56');
    await digitar('Prazo', '31/12/2027');
    await salvar();

    expect(onSalvar).toHaveBeenCalledWith({
      objetivo: 'Viagem',
      tipo: 'gasto',
      valorAlvoCentavos: 123_456,
      prazo: '2027-12-31',
    });
  });

  it('permite escolher investimento', async () => {
    const { onSalvar } = await montar();
    await digitar('Objetivo', 'Reserva');
    await apertar('Investimento');
    await digitar('Valor alvo', '500,00');
    await digitar('Prazo', '01/06/2028');
    await salvar();

    expect(onSalvar).toHaveBeenCalledWith({
      objetivo: 'Reserva',
      tipo: 'investimento',
      valorAlvoCentavos: 50_000,
      prazo: '2028-06-01',
    });
  });

  it('rejeita objetivo acima de 80 caracteres', async () => {
    const { onSalvar } = await montar();
    await digitar('Objetivo', 'a'.repeat(81));
    await digitar('Valor alvo', '100,00');
    await digitar('Prazo', '31/12/2027');
    await salvar();
    expect(screen.getByText(MSG_META.objetivoLongo)).toBeTruthy();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it.each([
    ['0', MSG_META.valorInvalido],
    ['1,234', MSG_META.valorInvalido],
    ['1.000.000.000,00', MSG_META.valorLimite],
  ])('rejeita valor %s', async (valor, mensagem) => {
    const { onSalvar } = await montar();
    await digitar('Objetivo', 'Viagem');
    await digitar('Valor alvo', valor);
    await digitar('Prazo', '31/12/2027');
    await salvar();
    expect(screen.getByText(mensagem)).toBeTruthy();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('rejeita prazo inexistente e preserva o texto digitado', async () => {
    const { onSalvar } = await montar();
    await digitar('Objetivo', 'Viagem');
    await digitar('Valor alvo', '100,00');
    await digitar('Prazo', '31/02/2027');
    await salvar();
    expect(screen.getByText(MSG_META.prazoInvalido)).toBeTruthy();
    expect(screen.getByLabelText('Prazo').props.value).toBe('31/02/2027');
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('carrega dados iniciais para edição', async () => {
    const inicial: MetaInput = {
      objetivo: 'Reserva',
      tipo: 'investimento',
      valorAlvoCentavos: 150_000,
      prazo: '2028-01-31',
    };
    const { onSalvar } = await montar({ inicial, titulo: 'Editar meta' });
    expect(screen.getByLabelText('Objetivo').props.value).toBe('Reserva');
    expect(screen.getByLabelText('Valor alvo').props.value).toBe('1500,00');
    expect(screen.getByLabelText('Prazo').props.value).toBe('31/01/2028');
    await salvar();
    expect(onSalvar).toHaveBeenCalledWith(inicial);
  });

  it('exibe erro geral e permite cancelar', async () => {
    const { onCancelar } = await montar({ erroGeral: MSG_META.falhaSalvar });
    expect(screen.getByText(MSG_META.falhaSalvar)).toBeTruthy();
    await apertar('Cancelar');
    expect(onCancelar).toHaveBeenCalled();
  });
});
