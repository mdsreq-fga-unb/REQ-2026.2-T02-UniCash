import { fireEvent, render, screen } from '@testing-library/react-native';
import { CategoriaForm } from '@/components/categorias/CategoriaForm';
import type { CategoriaInput } from '@/features/categorias/types';
import { MSG_CAT } from '@/features/categorias/validation';

async function montar(props: Partial<React.ComponentProps<typeof CategoriaForm>> = {}) {
  const onSalvar = jest.fn();
  const onCancelar = jest.fn();
  const base = {
    titulo: 'Nova categoria',
    textoSalvar: 'Salvar categoria',
    salvando: false,
    onSalvar,
    onCancelar,
  };
  const tela = await render(<CategoriaForm {...base} {...props} />);
  return { onSalvar, onCancelar, rerender: tela.rerender, base };
}

const digitar = async (rotulo: string, texto: string) =>
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
const apertar = async (texto: string) => await fireEvent.press(screen.getByText(texto));
const salvar = async () => await fireEvent.press(screen.getByLabelText('Salvar categoria'));

describe('Formulário de categoria (B e C do UC06)', () => {
  it('mostra nome, os três estados de limite e os botões', async () => {
    await montar();
    expect(screen.getByLabelText('Nome')).toBeTruthy();
    expect(screen.getByText('Sem limite')).toBeTruthy();
    expect(screen.getByText('Valor fixo')).toBeTruthy();
    expect(screen.getByText('% da renda')).toBeTruthy();
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Salvo primeiro no dispositivo: funciona sem internet.')).toBeTruthy();
  });

  describe('cadastro (B)', () => {
    it('salva sem limite com o nome trimado', async () => {
      const { onSalvar } = await montar();
      await digitar('Nome', '  Mercado  ');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Mercado', limite: null });
    });

    it('limite por valor fixo em centavos', async () => {
      const { onSalvar } = await montar();
      await apertar('Valor fixo');
      await digitar('Nome', 'Mercado');
      await digitar('Valor', '1.234,56');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Mercado', limite: { tipo: 'valor', valor: 123_456 } });
    });

    it('limite por percentual da renda em centésimos', async () => {
      const { onSalvar } = await montar();
      await apertar('% da renda');
      await digitar('Nome', 'Mercado');
      await digitar('Percentual da renda', '12,5');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Mercado', limite: { tipo: 'percentual_renda', valor: 1250 } });
    });

    it('não impõe máximo percentual (decisão da cliente pendente)', async () => {
      const { onSalvar } = await montar();
      await apertar('% da renda');
      await digitar('Nome', 'Mercado');
      await digitar('Percentual da renda', '101');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Mercado', limite: { tipo: 'percentual_renda', valor: 10_100 } });
    });
  });

  describe('validações (RN13/RN14, EX01)', () => {
    it('nome vazio bloqueia o salvamento', async () => {
      const { onSalvar } = await montar();
      await digitar('Nome', '   ');
      await salvar();
      expect(screen.getByText(MSG_CAT.nomeVazio)).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
    });

    it('nome acima de 30 caracteres é rejeitado', async () => {
      const { onSalvar } = await montar();
      await digitar('Nome', 'a'.repeat(31));
      await salvar();
      expect(screen.getByText(MSG_CAT.nomeLongo)).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
    });

    it('percentual inválido é rejeitado sem apagar o que foi digitado', async () => {
      const { onSalvar } = await montar();
      await apertar('% da renda');
      await digitar('Percentual da renda', '1,999');
      await salvar();
      expect(screen.getByText(MSG_CAT.limitePercentualInvalido)).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Percentual da renda').props.value).toBe('1,999'); // preservado
    });

    it('valor inválido é rejeitado sem apagar o que foi digitado', async () => {
      const { onSalvar } = await montar();
      await apertar('Valor fixo');
      await digitar('Valor', 'abc');
      await salvar();
      expect(screen.getByText(MSG_CAT.limiteValorInvalido)).toBeTruthy();
      expect(onSalvar).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Valor').props.value).toBe('abc'); // preservado
    });

    it('voltar ao estado "Sem limite" descarta o limite mesmo com texto preenchido', async () => {
      const { onSalvar } = await montar();
      await apertar('Valor fixo');
      await digitar('Valor', '100,00');
      await apertar('Sem limite');
      await digitar('Nome', 'Mercado');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Mercado', limite: null });
    });
  });

  describe('edição (C)', () => {
    it('carrega limite em reais e salva sem alterações', async () => {
      const inicial: CategoriaInput = { nome: 'Mercado', limite: { tipo: 'valor', valor: 150_000 } };
      const { onSalvar } = await montar({ inicial });
      expect(screen.getByLabelText('Nome').props.value).toBe('Mercado');
      expect(screen.getByLabelText('Valor').props.value).toBe('1500,00');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith(inicial);
    });

    it('carrega limite percentual em centésimos e salva sem alterações', async () => {
      const inicial: CategoriaInput = { nome: 'Lazer', limite: { tipo: 'percentual_renda', valor: 1250 } };
      const { onSalvar } = await montar({ inicial });
      expect(screen.getByLabelText('Percentual da renda').props.value).toBe('12,5');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith(inicial);
    });

    it('permite trocar o tipo do limite mantendo os textos digitados', async () => {
      const inicial: CategoriaInput = { nome: 'Lazer', limite: { tipo: 'valor', valor: 150_000 } };
      const { onSalvar } = await montar({ inicial });
      await apertar('% da renda');
      expect(screen.getByLabelText('Percentual da renda').props.value).toBe('');
      await digitar('Percentual da renda', '7,5');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Lazer', limite: { tipo: 'percentual_renda', valor: 750 } });
    });
  });

  describe('categoria padrão (RN13/RN14)', () => {
    it('exibe o nome sem permitir edição e explica a regra', async () => {
      const inicial: CategoriaInput = { nome: 'Casa', limite: null };
      await montar({ inicial, padrao: true });
      const campoNome = screen.getByLabelText('Nome');
      expect(campoNome.props.value).toBe('Casa');
      expect(campoNome.props.editable).toBe(false);
      expect(screen.getByText('Categorias padrão não podem ser renomeadas nem excluídas.')).toBeTruthy();
    });

    it('salva mantendo o nome, alterando apenas o limite', async () => {
      const inicial: CategoriaInput = { nome: 'Casa', limite: null };
      const { onSalvar } = await montar({ inicial, padrao: true });
      await apertar('Valor fixo');
      await digitar('Valor', '800,00');
      await salvar();
      expect(onSalvar).toHaveBeenCalledWith({ nome: 'Casa', limite: { tipo: 'valor', valor: 80_000 } });
    });
  });

  describe('erros e estados', () => {
    it('bloqueia dois toques rápidos e permite nova tentativa após falha', async () => {
      const { onSalvar, rerender, base } = await montar();
      await digitar('Nome', 'Mercado');
      const botao = screen.getByLabelText('Salvar categoria');

      // Dois toques antes da tela conseguir atualizar a prop salvando:
      await fireEvent.press(botao);
      await fireEvent.press(botao);
      expect(onSalvar).toHaveBeenCalledTimes(1);

      // A tela entra em salvamento e o toque continua bloqueado:
      await rerender(<CategoriaForm {...base} salvando />);
      await fireEvent.press(botao);
      expect(onSalvar).toHaveBeenCalledTimes(1);

      // Falha de persistência: a tela volta salvando=false e a nova tentativa é liberada.
      await rerender(<CategoriaForm {...base} salvando={false} />);
      await fireEvent.press(botao);
      expect(onSalvar).toHaveBeenCalledTimes(2);
      expect(onSalvar).toHaveBeenLastCalledWith({ nome: 'Mercado', limite: null });
    });

    it('botão Voltar fica desabilitado durante o salvamento', async () => {
      const { onCancelar } = await montar({ salvando: true });
      await fireEvent.press(screen.getByLabelText('Voltar'));
      expect(onCancelar).not.toHaveBeenCalled();
    });

    it('edição do nome avisa a tela (onNomeAlterado) para limpar erro externo antigo', async () => {
      const onNomeAlterado = jest.fn();
      const { rerender, base } = await montar({
        erroNomeExterno: MSG_CAT.nomeDuplicado,
        onNomeAlterado,
      });
      expect(screen.getByText(MSG_CAT.nomeDuplicado)).toBeTruthy();

      await digitar('Nome', 'Mercado Livre');
      expect(onNomeAlterado).toHaveBeenCalled();

      // A tela limpa o erro antigo e ele desaparece:
      await rerender(<CategoriaForm {...base} erroNomeExterno={null} onNomeAlterado={onNomeAlterado} />);
      expect(screen.queryByText(MSG_CAT.nomeDuplicado)).toBeNull();

      // Um novo erro retornado pelo serviço volta a ser exibido:
      await rerender(
        <CategoriaForm {...base} erroNomeExterno={MSG_CAT.nomeDuplicado} onNomeAlterado={onNomeAlterado} />,
      );
      expect(screen.getByText(MSG_CAT.nomeDuplicado)).toBeTruthy();
    });

    it('exibe erro externo no campo nome (ex.: NomeDuplicado tratado pela tela)', async () => {
      await montar({ erroNomeExterno: MSG_CAT.nomeDuplicado });
      expect(screen.getByText(MSG_CAT.nomeDuplicado)).toBeTruthy();
    });

    it('exibe o erro geral com papel de alerta', async () => {
      await montar({ erroGeral: MSG_CAT.falhaSalvar });
      expect(screen.getByRole('alert')).toHaveTextContent(MSG_CAT.falhaSalvar);
    });

    it('com salvando=true os botões ficam desabilitados e o envio duplicado é bloqueado', async () => {
      const { onSalvar, onCancelar } = await montar({ salvando: true });
      await digitar('Nome', 'Mercado');
      await salvar(); // via rótulo: com salvando, o texto é trocado por spinner
      await apertar('Cancelar');
      expect(onSalvar).not.toHaveBeenCalled();
      expect(onCancelar).not.toHaveBeenCalled();
    });

    it('cancelar chama onCancelar', async () => {
      const { onCancelar } = await montar();
      await apertar('Cancelar');
      expect(onCancelar).toHaveBeenCalledTimes(1);
    });
  });
});
