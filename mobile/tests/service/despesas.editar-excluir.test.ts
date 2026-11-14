
import {
  registrarDespesa,
  editarDespesa,
  excluirDespesa,
  DespesaIndisponivel,
} from '@/features/despesas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import type { DespesaInput } from '@/features/despesas/types';

function inputDespesa(extra: Partial<DespesaInput> = {}): DespesaInput {
  return {
    data: '2026-10-16',
    titulo: 'Aluguel',
    valorCentavos: 150000,
    descricao: 'Aluguel do apartamento',
    categoriaId: null,
    fixaOuVariavel: 'fixa',
    essencial: 1,
    recorrencia: null,
    ...extra,
  };
}

describe('Editar e excluir despesas', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });

  afterEach(restaurarTempo);

  it('edita os campos de uma despesa única', async () => {
    await registrarDespesa(inputDespesa());

    const id = banco.despesas()[0].id;

    await editarDespesa(
      id,
      inputDespesa({
        titulo: 'Aluguel atualizado',
        valorCentavos: 180000,
        categoriaId: 'casa',
        fixaOuVariavel: 'variavel',
        essencial: 0,
      }),
    );

    expect(banco.despesas()).toHaveLength(1);
    expect(banco.despesas()[0]).toMatchObject({
      id,
      titulo: 'Aluguel atualizado',
      valor_centavos: 180000,
      categoria_id: 'casa',
      fixa_ou_variavel: 'variavel',
      essencial: 0,
      sync_status: 'pendente',
    });
  });

  it('não altera outras despesas ao editar uma despesa', async () => {
    await registrarDespesa(inputDespesa());
    await registrarDespesa(
      inputDespesa({ titulo: 'Mercado', valorCentavos: 30000 }),
    );

    const aluguel = banco.despesas().find((d) => d.titulo === 'Aluguel');

    await editarDespesa(
      aluguel.id,
      inputDespesa({ titulo: 'Aluguel atualizado' }),
    );

    expect(banco.despesas()).toHaveLength(2);
    expect(banco.despesas().find((d) => d.titulo === 'Mercado')).toBeTruthy();
    expect(banco.despesas().find((d) => d.titulo === 'Aluguel atualizado')).toBeTruthy();
  });

  it('lança DespesaIndisponivel ao editar uma despesa inexistente', async () => {
    await expect(
      editarDespesa('id-inexistente', inputDespesa()),
    ).rejects.toBeInstanceOf(DespesaIndisponivel);
  });

  it('exclui logicamente uma despesa única', async () => {
    await registrarDespesa(inputDespesa());

    const id = banco.despesas()[0].id;

    await excluirDespesa(id);

    expect(banco.despesas()).toHaveLength(1);
    expect(banco.despesas()[0].excluido_em).toBeTruthy();
    expect(banco.despesas()[0].sync_status).toBe('pendente');
  });

  it('lança DespesaIndisponivel ao excluir uma despesa inexistente', async () => {
    await expect(
      excluirDespesa('id-inexistente'),
    ).rejects.toBeInstanceOf(DespesaIndisponivel);
  });

  it('reverte a edição quando ocorre falha na gravação', async () => {
    await registrarDespesa(inputDespesa());

    const antes = { ...banco.despesas()[0] };

    banco.falharNaOperacao(1);

    await expect(
      editarDespesa(
        antes.id,
        inputDespesa({ titulo: 'Não deve ser salvo' }),
      ),
    ).rejects.toBeTruthy();

    expect(banco.despesas()[0]).toMatchObject({
      titulo: antes.titulo,
      valor_centavos: antes.valor_centavos,
    });
  });
});
