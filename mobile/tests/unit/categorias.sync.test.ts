import {
  decidirCategoriaRemota,
  normalizarCategoriaRemota,
  payloadCategoriaRemota,
  type CategoriaRemota,
} from '@/features/categorias/sync';
import { categoriaLinha } from '../helpers/categorias';

jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));

const remotaBase = (extra: Partial<CategoriaRemota> = {}): CategoriaRemota => ({
  padrao: false,
  chave: null,
  nome: 'Mercado',
  nome_normalizado: 'mercado',
  limite_tipo: null,
  limite_centavos: null,
  limite_percentual_centesimos: null,
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-01T00:00:00Z',
  aliases: [],
  ...extra,
});

describe('payload e normalização de categoria remota', () => {
  it('padrão usa documento canônico, chave e alias do UUID local', () => {
    const local = categoriaLinha({
      id: 'uuid-casa-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'semeadura',
    });
    const payload = payloadCategoriaRemota(local);

    expect(payload).toMatchObject({
      padrao: true,
      chave: 'casa',
      nome: 'Casa',
      nome_normalizado: 'casa',
      aliases: ['uuid-casa-a'],
    });
    expect(payload).not.toHaveProperty('estado_local');
  });

  it('própria preserva UUID e não carrega chave nem aliases', () => {
    const local = categoriaLinha({
      id: 'uuid-mercado',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
      limite_tipo: 'valor',
      limite_centavos: 10_000,
    });
    expect(payloadCategoriaRemota(local)).toMatchObject({
      padrao: false,
      chave: null,
      nome: 'Mercado',
      limite_tipo: 'valor',
      limite_centavos: 10_000,
      aliases: [],
    });
  });

  it('normaliza padrão válida com aliases e limite', () => {
    const r = normalizarCategoriaRemota('padrao_casa', {
      padrao: true,
      chave: 'casa',
      nome: 'Casa',
      nome_normalizado: 'casa',
      limite_tipo: 'valor',
      limite_centavos: 5000,
      limite_percentual_centesimos: null,
      excluido_em: null,
      criado_em: '2026-01-01T00:00:00Z',
      atualizado_em: '2026-01-02T00:00:00Z',
      aliases: ['uuid-casa-a', 'uuid-casa-b'],
    });
    expect(r).toMatchObject({
      padrao: true,
      chave: 'casa',
      limite_centavos: 5000,
      aliases: ['uuid-casa-a', 'uuid-casa-b'],
    });
  });

  it('rejeita padrão sem chave, com chave desconhecida ou tombstone', () => {
    expect(normalizarCategoriaRemota('padrao_casa', { ...remotaBase(), padrao: true, chave: null })).toBeNull();
    expect(normalizarCategoriaRemota('padrao_casa', { ...remotaBase(), padrao: true, chave: 'inexistente' })).toBeNull();
    expect(
      normalizarCategoriaRemota('padrao_casa', {
        ...remotaBase(),
        padrao: true,
        chave: 'casa',
        nome: 'Lazer',
        nome_normalizado: 'lazer',
      }),
    ).toBeNull();
    expect(
      normalizarCategoriaRemota('padrao_casa', {
        ...remotaBase(),
        padrao: true,
        chave: 'casa',
        excluido_em: '2026-01-02T00:00:00Z',
      }),
    ).toBeNull();
  });

  it('rejeita limite incoerente e aliases inválidos', () => {
    expect(
      normalizarCategoriaRemota('uuid-mercado', {
        ...remotaBase(),
        limite_tipo: 'valor',
        limite_percentual_centesimos: 100,
      }),
    ).toBeNull();
    expect(
      normalizarCategoriaRemota('uuid-mercado', {
        ...remotaBase(),
        aliases: ['ok', 1],
      }),
    ).toBeNull();
  });

  it('normaliza percentual remoto abaixo de 1% para 1% e sinaliza reenvio', () => {
    const r = normalizarCategoriaRemota('uuid-mercado', {
      ...remotaBase(),
      limite_tipo: 'percentual_renda',
      limite_percentual_centesimos: 50,
    });

    expect(r).toMatchObject({
      limite_percentual_centesimos: 100,
      percentualNormalizado: true,
    });
  });

  it('normaliza percentual remoto acima de 100% para 100% e sinaliza reenvio', () => {
    const r = normalizarCategoriaRemota('uuid-mercado', {
      ...remotaBase(),
      limite_tipo: 'percentual_renda',
      limite_percentual_centesimos: 20_000,
    });

    expect(r).toMatchObject({
      limite_percentual_centesimos: 10_000,
      percentualNormalizado: true,
    });
  });

  it('arredonda percentual remoto com mais de duas casas para o centésimo mais próximo', () => {
    const r = normalizarCategoriaRemota('uuid-mercado', {
      ...remotaBase(),
      limite_tipo: 'percentual_renda',
      limite_percentual_centesimos: 1_234.5,
    });

    expect(r).toMatchObject({
      limite_percentual_centesimos: 1_235,
      percentualNormalizado: true,
    });
  });

  it('mantém percentual remoto já válido sem sinalizar reenvio', () => {
    const r = normalizarCategoriaRemota('uuid-mercado', {
      ...remotaBase(),
      limite_tipo: 'percentual_renda',
      limite_percentual_centesimos: 5_000,
    });

    expect(r).toMatchObject({ limite_percentual_centesimos: 5_000 });
    expect(r?.percentualNormalizado).toBeFalsy();
  });

  it('aceita tombstone de própria com limites nulos', () => {
    expect(
      normalizarCategoriaRemota('uuid-mercado', {
        ...remotaBase(),
        excluido_em: '2026-02-01T00:00:00Z',
      }),
    ).toMatchObject({ padrao: false, excluido_em: '2026-02-01T00:00:00Z' });
  });
});

describe('desempate determinístico de categorias', () => {
  const local = (extra = {}) =>
    categoriaLinha({
      id: 'uuid-mercado',
      nome: 'Mercado',
      nome_normalizado: 'mercado',
      padrao: 0,
      estado_local: 'editado',
      atualizado_em: '2026-01-02T00:00:00Z',
      ...extra,
    });

  it('padrão recém-semeada aceita o limite remoto mesmo com timestamp local maior', () => {
    const p = categoriaLinha({
      id: 'uuid-casa-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'semeadura',
      atualizado_em: '2026-02-01T00:00:00Z',
    });
    expect(
      decidirCategoriaRemota(
        p,
        remotaBase({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          limite_tipo: 'valor',
          limite_centavos: 5000,
          atualizado_em: '2026-01-01T00:00:00Z',
        }),
      ),
    ).toBe('remota');
  });

  it('edição remota mais recente vence a edição local', () => {
    const p = categoriaLinha({
      id: 'uuid-casa-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'editado',
      limite_tipo: 'valor',
      limite_centavos: 9000,
      atualizado_em: '2026-01-01T00:00:00Z',
    });
    expect(
      decidirCategoriaRemota(
        p,
        remotaBase({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          limite_tipo: 'valor',
          limite_centavos: 5000,
          atualizado_em: '2026-02-01T00:00:00Z',
        }),
      ),
    ).toBe('remota');
  });

  it('padrão já editada usa o timestamp', () => {
    const p = categoriaLinha({
      id: 'uuid-casa-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'editado',
      limite_tipo: 'valor',
      limite_centavos: 9000,
      atualizado_em: '2026-02-01T00:00:00Z',
    });
    expect(
      decidirCategoriaRemota(
        p,
        remotaBase({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          limite_tipo: 'valor',
          limite_centavos: 5000,
          atualizado_em: '2026-01-01T00:00:00Z',
        }),
      ),
    ).toBe('local');
  });

  it('exclusão prevalece sobre edição nos dois sentidos', () => {
    const ativa = local();
    const excluida = local({ excluido_em: '2026-01-01T00:00:00Z' });
    expect(decidirCategoriaRemota(ativa, { ...remotaBase(), excluido_em: '2026-01-01T00:00:00Z' })).toBe('remota');
    expect(decidirCategoriaRemota(excluida, remotaBase())).toBe('local');
  });

  it('tombstone de padrão é inválido e não apaga a padrão local', () => {
    const p = categoriaLinha({
      id: 'uuid-casa-a',
      nome: 'Casa',
      nome_normalizado: 'casa',
      padrao: 1,
      estado_local: 'sincronizado',
    });
    expect(
      decidirCategoriaRemota(
        p,
        remotaBase({
          padrao: true,
          chave: 'casa',
          nome: 'Casa',
          nome_normalizado: 'casa',
          excluido_em: '2026-02-01T00:00:00Z',
        }),
      ),
    ).toBe('local');
  });

  it('empate de timestamp escolhe o mesmo conteúdo vencedor nos dois sentidos', () => {
    const a = local({ limite_tipo: 'valor', limite_centavos: 5000 });
    const b = local({ limite_tipo: 'valor', limite_centavos: 7000 });

    const ab = decidirCategoriaRemota(
      a,
      remotaBase({
        limite_tipo: 'valor',
        limite_centavos: 7000,
        criado_em: 't',
        atualizado_em: '2026-01-02T00:00:00Z',
      }),
    );
    const ba = decidirCategoriaRemota(
      b,
      remotaBase({
        limite_tipo: 'valor',
        limite_centavos: 5000,
        criado_em: 't',
        atualizado_em: '2026-01-02T00:00:00Z',
      }),
    );

    expect(ab).toBe('remota');
    expect(ba).toBe('local');
  });
});
