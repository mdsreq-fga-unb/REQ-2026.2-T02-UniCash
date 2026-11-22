import {
  CATEGORIAS_PADRAO_REMOTAS,
  docIdCategoriaRemota,
  nomeCategoriaPadraoPorSlug,
  slugCategoriaPadrao,
} from '@/features/categorias/padroes';
import { categoriaLinha } from '../helpers/categorias';

describe('identidade remota das categorias', () => {
  it('define sete slugs estáveis, independentes do UUID local', () => {
    expect(CATEGORIAS_PADRAO_REMOTAS.map((c) => c.slug)).toEqual([
      'casa',
      'alimentacao',
      'mobilidade',
      'estudos',
      'saude',
      'lazer',
      'reserva_financeira',
    ]);
    expect(new Set(CATEGORIAS_PADRAO_REMOTAS.map((c) => c.slug)).size).toBe(7);
  });

  it('associa a padrão local ao slug, sem depender do UUID', () => {
    const casa = categoriaLinha({
      id: 'uuid-casa-aparelho-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
    });
    expect(slugCategoriaPadrao(casa)).toBe('casa');
    expect(docIdCategoriaRemota(casa)).toBe('padrao_casa');
    expect(nomeCategoriaPadraoPorSlug('casa')).toBe('Casa');
  });

  it('mantém o UUID local para categoria própria', () => {
    const propria = categoriaLinha({
      id: 'uuid-mercado',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
    });
    expect(slugCategoriaPadrao(propria)).toBeNull();
    expect(docIdCategoriaRemota(propria)).toBe('uuid-mercado');
  });

  it('normaliza acentos e não confunde categoria própria homônima', () => {
    const alimentacao = categoriaLinha({
      id: 'uuid-alimentacao-b',
      nome: 'Alimentação',
      nome_normalizado: 'alimentação',
      padrao: 1,
    });
    const propria = categoriaLinha({
      id: 'uuid-casa-propria',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 0,
    });
    expect(slugCategoriaPadrao(alimentacao)).toBe('alimentacao');
    expect(slugCategoriaPadrao(propria)).toBeNull();
  });

  it('retorna null para slug desconhecido', () => {
    expect(nomeCategoriaPadraoPorSlug('inexistente')).toBeNull();
  });
});
