import { consultarConsumoMensal } from '@/features/consumo/consulta';
import { lerTotaisLocais } from '@/features/consumo/sqlite';
import { instalarBanco } from '../helpers/fakeDb';

it('recalcula do SQLite após alterações e exclusões, somente no mês selecionado', async () => {
  const { sqlite } = instalarBanco();
  const categoria = sqlite.prepare(`INSERT INTO categorias
    (id, nome, nome_normalizado, limite_tipo, limite_centavos, limite_percentual_centesimos, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, 't', 't')`);
  categoria.run('a', 'Alimentação', 'alimentacao', 'valor', 10000, null);
  categoria.run('b', 'Casa', 'casa', 'percentual_renda', null, 5000);
  categoria.run('c', 'Lazer', 'lazer', null, null, null);
  sqlite.exec(`INSERT INTO receitas (id, valor_centavos, data, titulo, criado_em, atualizado_em)
    VALUES ('r', 20000, '2026-11-01', 'Receita', 't', 't')`);
  const despesa = sqlite.prepare(`INSERT INTO despesas
    (id, valor_centavos, data, titulo, categoria_id, fixa_ou_variavel, essencial, criado_em, atualizado_em)
    VALUES (?, ?, ?, 'Despesa', ?, 'variavel', 0, 't', 't')`);
  despesa.run('d', 7999, '2026-11-01', 'a');
  despesa.run('fora', 10000, '2026-12-01', 'a');
  despesa.run('sem', 5000, '2026-11-30', null);

  const consultar = () => consultarConsumoMensal('2026-11', lerTotaisLocais);
  expect(await consultar()).toMatchObject([
    { categoriaId: 'a', gastoCentavos: 7999, faixa: 'amarela' },
    { categoriaId: 'b', gastoCentavos: 0, limiteEfetivoCentavos: 10000, faixa: 'verde' },
    { categoriaId: 'c', status: 'sem_limite' },
  ]);
  sqlite.exec(`UPDATE despesas SET valor_centavos = 8000 WHERE id = 'd'`);
  expect((await consultar())[0]).toMatchObject({ faixa: 'laranja' });
  sqlite.exec(`UPDATE categorias SET limite_centavos = 20000 WHERE id = 'a'`);
  expect((await consultar())[0]).toMatchObject({ faixa: 'verde' });
  sqlite.exec(`UPDATE despesas SET excluido_em = 't' WHERE id = 'd';
    UPDATE receitas SET excluido_em = 't' WHERE id = 'r';`);
  expect(await consultar()).toMatchObject([
    { gastoCentavos: 0 }, { status: 'indisponivel' }, { status: 'sem_limite' },
  ]);
  sqlite.exec(`UPDATE categorias SET excluido_em = 't' WHERE id = 'a'`);
  expect((await consultar()).map((item) => item.categoriaId)).toEqual(['b', 'c']);
  sqlite.exec(`UPDATE categorias SET excluido_em = 't'`);
  expect(await consultar()).toEqual([]);
});
