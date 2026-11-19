
import {
  FalhaPersistencia,
  registrarDespesa,
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

describe('Registrar despesa', () => {
  let banco: BancoFalso;

  beforeEach(() => {
    banco = instalarBanco();
    fixarHoje('2026-10-16');
  });

  afterEach(restaurarTempo);

  it('registra uma despesa única com os campos válidos', async () => {
    await registrarDespesa(inputDespesa());

    const linhas = banco.despesas();

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      valor_centavos: 150000,
      data: '2026-10-16',
      titulo: 'Aluguel',
      descricao: 'Aluguel do apartamento',
      categoria_id: null,
      fixa_ou_variavel: 'fixa',
      essencial: 1,
      recorrencia_id: null,
      sync_status: 'pendente',
      excluido_em: null,
    });

    expect(linhas[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(linhas[0].criado_em).toBeTruthy();
    expect(linhas[0].atualizado_em).toBeTruthy();
  });

  it('guarda o valor como inteiro em centavos', async () => {
    await registrarDespesa(inputDespesa({ valorCentavos: 123456 }));

    const resultado = banco.sqlite
      .prepare('SELECT valor_centavos, typeof(valor_centavos) AS tipo FROM despesas')
      .get() as any;

    expect(resultado).toEqual({
      valor_centavos: 123456,
      tipo: 'integer',
    });
  });

  it('permite descrição vazia, gravada como nula', async () => {
    await registrarDespesa(inputDespesa({ descricao: null }));

    expect(banco.despesas()[0].descricao).toBeNull();
  });

  it('persiste categoria e classificações da despesa', async () => {
    await registrarDespesa(
      inputDespesa({
        categoriaId: 'alimentacao',
        fixaOuVariavel: 'variavel',
        essencial: 0,
      }),
    );

    expect(banco.despesas()[0]).toMatchObject({
      categoria_id: 'alimentacao',
      fixa_ou_variavel: 'variavel',
      essencial: 0,
    });
  });

  it('falha na gravação sem deixar despesa registrada', async () => {
    banco.falharNaOperacao(1);

    await expect(
      registrarDespesa(inputDespesa()),
    ).rejects.toBeInstanceOf(FalhaPersistencia);

    expect(banco.despesas()).toHaveLength(0);
  });
});
