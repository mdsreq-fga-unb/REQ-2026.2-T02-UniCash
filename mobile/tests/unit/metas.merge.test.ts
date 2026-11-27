import {
  mergeMetaRemota,
  parseCamposRevisao,
  serializarCamposRevisao,
} from '@/features/metas/merge';
import type { Meta } from '@/features/metas/types';
import type { MetaRemota } from '@/features/metas/sync';

const baseRemota = (extra: Partial<MetaRemota> = {}): MetaRemota => ({
  objetivo: 'Objetivo base',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: 10_000,
  valor_acumulado_atualizado_em: '2026-01-02T00:00:00Z',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-02T00:00:00Z',
  revisao: 1,
  campos_revisao: {},
  ...extra,
});

const local = (extra: Partial<Meta> = {}): Meta => ({
  id: 'm1',
  objetivo: 'Objetivo base',
  tipo: 'investimento',
  valor_alvo_centavos: 100_000,
  prazo: '2027-12-31',
  inicio: '2026-01-01',
  categoria_id: null,
  valor_acumulado_centavos: 10_000,
  valor_acumulado_atualizado_em: '2026-01-02T00:00:00Z',
  sync_status: 'pendente',
  excluido_em: null,
  criado_em: '2026-01-01T00:00:00Z',
  atualizado_em: '2026-01-02T00:00:00Z',
  revisao: 1,
  campos_revisao: '{}',
  base_sincronizacao: JSON.stringify(baseRemota()),
  ...extra,
});

describe('merge por campo de metas (RN07)', () => {
  it('combina objetivo local e acumulado remoto quando ambos mudaram', () => {
    const b = baseRemota();
    const l = local({
      objetivo: 'Objetivo A',
      revisao: 2,
      campos_revisao: serializarCamposRevisao({ objetivo: 2 }),
      atualizado_em: '2026-02-01T00:00:00Z',
    });
    const r = baseRemota({
      valor_acumulado_centavos: 25_000,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
      revisao: 2,
      campos_revisao: { valor_acumulado: 2 },
      atualizado_em: '2026-02-01T00:00:00Z',
    });

    const resultado = mergeMetaRemota(l, r, b);
    expect(resultado.valores).toMatchObject({
      objetivo: 'Objetivo A',
      valor_acumulado_centavos: 25_000,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
    });
    expect(resultado.sincronizado).toBe(false);
    expect(resultado.remotaVenceu).toBe(true);
  });

  it('no mesmo campo, revisão lógica maior vence', () => {
    const b = baseRemota();
    const l = local({
      objetivo: 'Local',
      revisao: 2,
      campos_revisao: serializarCamposRevisao({ objetivo: 2 }),
    });
    const r = baseRemota({
      objetivo: 'Remota',
      revisao: 3,
      campos_revisao: { objetivo: 3 },
      atualizado_em: '2026-03-01T00:00:00Z',
    });

    expect(mergeMetaRemota(l, r, b).valores.objetivo).toBe('Remota');
  });

  it('empate de revisão converge para o mesmo valor nas duas ordens', () => {
    const b = baseRemota();
    const alfa = local({
      objetivo: 'Alfa',
      revisao: 2,
      campos_revisao: serializarCamposRevisao({ objetivo: 2 }),
    });
    const zebraRemota = baseRemota({
      objetivo: 'Zebra',
      revisao: 2,
      campos_revisao: { objetivo: 2 },
      atualizado_em: '2026-02-01T00:00:00Z',
    });

    const primeira = mergeMetaRemota(alfa, zebraRemota, b).valores.objetivo;
    const segunda = mergeMetaRemota(
      local({
        objetivo: 'Zebra',
        revisao: 2,
        campos_revisao: serializarCamposRevisao({ objetivo: 2 }),
        atualizado_em: '2026-02-01T00:00:00Z',
      }),
      baseRemota({
        objetivo: 'Alfa',
        revisao: 2,
        campos_revisao: { objetivo: 2 },
      }),
      b,
    ).valores.objetivo;

    expect(primeira).toBe(segunda);
  });

  it('trata valor e data do acumulado como uma única unidade', () => {
    const b = baseRemota();
    const l = local({
      valor_acumulado_centavos: 20_000,
      valor_acumulado_atualizado_em: '2026-02-01T00:00:00Z',
      revisao: 2,
      campos_revisao: serializarCamposRevisao({ valor_acumulado: 2 }),
    });
    const r = baseRemota({
      valor_acumulado_centavos: 30_000,
      valor_acumulado_atualizado_em: '2026-03-01T00:00:00Z',
      revisao: 3,
      campos_revisao: { valor_acumulado: 3 },
      atualizado_em: '2026-03-01T00:00:00Z',
    });

    expect(mergeMetaRemota(l, r, b).valores).toMatchObject({
      valor_acumulado_centavos: 30_000,
      valor_acumulado_atualizado_em: '2026-03-01T00:00:00Z',
    });
  });

  it('tombstone tem precedência e não ressuscita registro', () => {
    const b = baseRemota();
    const localTomb = local({ excluido_em: '2026-02-01T00:00:00Z' });
    const remotaAtiva = baseRemota({ atualizado_em: '2099-01-01T00:00:00Z' });
    expect(mergeMetaRemota(localTomb, remotaAtiva, b).valores.excluido_em).toBe(
      '2026-02-01T00:00:00Z',
    );
    expect(mergeMetaRemota(local({}), baseRemota({ excluido_em: '2026-02-01T00:00:00Z' }), b)).toMatchObject({
      valores: { excluido_em: '2026-02-01T00:00:00Z' },
      sincronizado: true,
    });
  });

  it('não combina início posterior ao prazo', () => {
    const b = baseRemota();
    const l = local({ inicio: '2027-06-01' });
    const r = baseRemota({
      prazo: '2027-01-01',
      revisao: 2,
      campos_revisao: { prazo: 2 },
    });

    const valores = mergeMetaRemota(l, r, b).valores;
    expect(valores.inicio).toBe('2026-01-01');
    expect(valores.prazo).toBe('2027-01-01');
  });

  it('preserva o tipo local quando o remoto tenta trocá-lo', () => {
    const b = baseRemota();
    const l = local({ tipo: 'investimento' });
    const r = baseRemota({ tipo: 'gasto', categoria_id: 'c1', valor_acumulado_centavos: null, valor_acumulado_atualizado_em: null });

    const resultado = mergeMetaRemota(l, r, b);
    expect(resultado.valores.categoria_id).toBeNull();
    expect(resultado.valores.valor_acumulado_centavos).toBe(10_000);
  });

  it('mantém compatibilidade com mapas de revisão legados', () => {
    expect(parseCamposRevisao('{}')).toEqual({});
    expect(parseCamposRevisao('inválido')).toEqual({});
    expect(parseCamposRevisao(JSON.stringify({ objetivo: 2, extra: 1 }))).toEqual({
      objetivo: 2,
    });
  });
});
