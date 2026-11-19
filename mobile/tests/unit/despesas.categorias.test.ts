import {
  CATEGORIAS_PADRAO_DESPESA,
  categoriaConhecida,
  rotuloCategoria,
  ROTULO_SEM_CATEGORIA,
} from '@/features/despesas/categorias';

describe('categorias padrão de despesa (RN13)', () => {
  it('são as sete categorias do caso de uso, na ordem', () => {
    expect(CATEGORIAS_PADRAO_DESPESA.map((c) => c.nome)).toEqual([
      'Casa',
      'Alimentação',
      'Mobilidade',
      'Estudos',
      'Saúde',
      'Lazer',
      'Reserva financeira',
    ]);
  });

  it('têm ids únicos', () => {
    const ids = CATEGORIAS_PADRAO_DESPESA.map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CATEGORIAS_PADRAO_DESPESA.map((c) => [c.id, c.nome]))(
    'o id %s tem o rótulo %s',
    (id, nome) => {
      expect(categoriaConhecida(id)).toBe(true);
      expect(rotuloCategoria(id)).toBe(nome);
    },
  );

  it.each([null, undefined, '', 'Moradia', 'categoria-removida'])(
    'id %p aparece como "Sem categoria"',
    (id) => {
      expect(categoriaConhecida(id)).toBe(false);
      expect(rotuloCategoria(id)).toBe(ROTULO_SEM_CATEGORIA);
    },
  );
});
