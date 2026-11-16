
import {
  registrarDespesa,
  listarDespesas,
  buscarDespesa,
} from '@/features/despesas/service';
import { fixarHoje, restaurarTempo } from '../helpers/tempo';
import { instalarBanco, type BancoFalso } from '../helpers/fakeDb';
import type { DespesaInput } from '@/features/despesas/types';

function inputDespesa(extra: Partial<DespesaInput> = {}): DespesaInput {
  return {
    data: '2026-10-16',
    titulo: 'Aluguel',
    valorCentavos: 150000,
    descricao: null,
    categoriaId: null,
    fixaOuVariavel: 'fixa',
    essencial: 1,
    recorrencia: null,
    ...extra,
  };
}

describe('Leitura de despesas', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });

  afterEach(restaurarTempo);

  it('lista despesas dentro do período e calcula o total', async () => {
    await registrarDespesa(inputDespesa());
    await registrarDespesa(
      inputDespesa({
        data: '2026-10-20',
        titulo: 'Mercado',
        valorCentavos: 30000,
      }),
    );
    await registrarDespesa(
      inputDespesa({
        data: '2026-11-05',
        titulo: 'Conta de luz',
        valorCentavos: 20000,
      }),
    );

    const resultado = await listarDespesas('2026-10-01', '2026-11-01');

    expect(resultado.itens).toHaveLength(2);
    expect(resultado.total).toBe(180000);
    expect(resultado.itens[0].titulo).toBe('Mercado');
    expect(resultado.itens[1].titulo).toBe('Aluguel');
  });

  it('não lista despesas excluídas nem inclui seus valores no total', async () => {
    await registrarDespesa(inputDespesa());
    await registrarDespesa(
      inputDespesa({
        titulo: 'Despesa excluída',
        valorCentavos: 50000,
      }),
    );

    const excluida = banco.despesas().find(
      (d) => d.titulo === 'Despesa excluída',
    );

    banco.sqlite
      .prepare('UPDATE despesas SET excluido_em = ? WHERE id = ?')
      .run('2026-10-16T15:00:00.000Z', excluida.id);

    const resultado = await listarDespesas('2026-10-01', '2026-11-01');

    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].titulo).toBe('Aluguel');
    expect(resultado.total).toBe(150000);
  });

  it('retorna zero quando não existem despesas no período', async () => {
    const resultado = await listarDespesas('2026-10-01', '2026-11-01');

    expect(resultado.itens).toEqual([]);
    expect(resultado.total).toBe(0);
  });

  it('busca uma despesa pelo ID', async () => {
    await registrarDespesa(inputDespesa());

    const id = banco.despesas()[0].id;
    const resultado = await buscarDespesa(id);

    expect(resultado).not.toBeNull();
    expect(resultado?.despesa).toMatchObject({
      id,
      titulo: 'Aluguel',
      valor_centavos: 150000,
    });
    expect(resultado?.recorrencia).toBeNull();
  });

  it('retorna null quando a despesa não existe', async () => {
    const resultado = await buscarDespesa('id-inexistente');

    expect(resultado).toBeNull();
  });

  it('não encontra uma despesa excluída', async () => {
    await registrarDespesa(inputDespesa());

    const id = banco.despesas()[0].id;

    banco.sqlite
      .prepare('UPDATE despesas SET excluido_em = ? WHERE id = ?')
      .run('2026-10-16T15:00:00.000Z', id);

    const resultado = await buscarDespesa(id);

    expect(resultado).toBeNull();
  });
});
