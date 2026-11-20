
import {
  FalhaLeitura,
  excluirDespesa,
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

  describe('filtro por categoria (B, FA04)', () => {
    beforeEach(async () => {
      await registrarDespesa(
        inputDespesa({ titulo: 'Aluguel', categoriaId: 'casa', valorCentavos: 100000 }),
      );
      await registrarDespesa(
        inputDespesa({ titulo: 'Condomínio', categoriaId: 'casa', valorCentavos: 30000 }),
      );
      await registrarDespesa(
        inputDespesa({ titulo: 'Consulta', categoriaId: 'saude', valorCentavos: 20000 }),
      );
      await registrarDespesa(
        inputDespesa({ titulo: 'Avulsa', categoriaId: null, valorCentavos: 5000 }),
      );
    });

    it('sem categoria informada lista tudo', async () => {
      const r = await listarDespesas('2026-10-01', '2026-11-01');

      expect(r.itens).toHaveLength(4);
      expect(r.total).toBe(155000);
    });

    it('lista e soma só a categoria escolhida', async () => {
      const r = await listarDespesas('2026-10-01', '2026-11-01', 'casa');

      expect(r.itens.map((d) => d.titulo).sort()).toEqual(['Aluguel', 'Condomínio']);
      expect(r.total).toBe(130000);
    });

    it('FA04: categoria sem despesas no período devolve lista vazia e total zero', async () => {
      const r = await listarDespesas('2026-10-01', '2026-11-01', 'lazer');

      expect(r.itens).toEqual([]);
      expect(r.total).toBe(0);
    });

    it('combina categoria e período', async () => {
      const r = await listarDespesas('2026-11-01', '2026-12-01', 'casa');

      expect(r.itens).toEqual([]);
      expect(r.total).toBe(0);
    });

    it('não inclui despesas excluídas da categoria', async () => {
      const aluguel = banco.despesas().find((d) => d.titulo === 'Aluguel');
      await excluirDespesa(aluguel.id);

      const r = await listarDespesas('2026-10-01', '2026-11-01', 'casa');

      expect(r.itens.map((d) => d.titulo)).toEqual(['Condomínio']);
      expect(r.total).toBe(30000);
    });
  });

  it('FA03/RN12: despesa com data futura é contabilizada no mês da própria data', async () => {
    // "hoje" é 16/10/2026; esta despesa é de dezembro.
    await registrarDespesa(
      inputDespesa({ data: '2026-12-20', titulo: 'Seguro', valorCentavos: 45000 }),
    );

    const outubro = await listarDespesas('2026-10-01', '2026-11-01');
    const dezembro = await listarDespesas('2026-12-01', '2027-01-01');

    expect(outubro.itens).toHaveLength(0);
    expect(outubro.total).toBe(0);
    expect(dezembro.itens.map((d) => d.titulo)).toEqual(['Seguro']);
    expect(dezembro.total).toBe(45000);
  });

  it('RN09/precisão: soma em centavos inteiros (0,10 + 0,20 = 0,30 exato e 10,99 preservado)', async () => {
    await registrarDespesa(inputDespesa({ titulo: 'A', valorCentavos: 10 }));
    await registrarDespesa(inputDespesa({ titulo: 'B', valorCentavos: 20 }));

    const soma = await listarDespesas('2026-10-01', '2026-11-01');

    expect(soma.total).toBe(30);
    expect(Number.isInteger(soma.total)).toBe(true);

    await registrarDespesa(
      inputDespesa({ titulo: 'C', data: '2026-11-02', valorCentavos: 1099 }),
    );

    const novembro = await listarDespesas('2026-11-01', '2026-12-01');

    expect(novembro.total).toBe(1099);
    expect(novembro.itens[0].valor_centavos).toBe(1099);
  });

  it('RN12: lista da mais recente para a mais antiga, incluindo datas futuras', async () => {
    await registrarDespesa(inputDespesa({ data: '2026-10-10', titulo: 'Passada' }));
    await registrarDespesa(inputDespesa({ data: '2026-10-30', titulo: 'Futura' }));
    await registrarDespesa(inputDespesa({ data: '2026-10-16', titulo: 'Hoje' }));

    const { itens } = await listarDespesas('2026-10-01', '2026-11-01');

    expect(itens.map((d) => d.titulo)).toEqual(['Futura', 'Hoje', 'Passada']);
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

  it('busca uma despesa recorrente e sua série', async () => {
    await registrarDespesa(
      inputDespesa({
        recorrencia: {
          intervalo: 1,
          unidade: 'mes',
          termino: '2027-01-16',
        },
      }),
    );

    const despesa = banco.despesas()[0];
    const resultado = await buscarDespesa(despesa.id);

    expect(resultado).not.toBeNull();
    expect(resultado?.despesa.id).toBe(despesa.id);
    expect(resultado?.recorrencia).toMatchObject({
      id: despesa.recorrencia_id,
      intervalo: 1,
      unidade: 'mes',
      termino: '2027-01-16',
    });
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

  it('lança FalhaLeitura quando ocorre erro ao consultar despesas', async () => {
    banco.sqlite.exec('DROP TABLE despesas');

    await expect(
      listarDespesas('2026-10-01', '2026-11-01'),
    ).rejects.toBeInstanceOf(FalhaLeitura);
  });
});
