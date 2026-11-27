import type { Meta } from './types';
import type { MetaRemota } from './sync';

/**
 * Campos mutáveis resolvidos individualmente na RN07. `valor_acumulado`
 * representa a unidade lógica valor + data do informe; `tipo` e `criado_em`
 * são imutáveis e `excluido_em` tem precedência de exclusão.
 */
export type CampoMeta =
  | 'objetivo'
  | 'valor_alvo_centavos'
  | 'prazo'
  | 'inicio'
  | 'categoria_id'
  | 'valor_acumulado';

export const CAMPOS_META: readonly CampoMeta[] = [
  'objetivo',
  'valor_alvo_centavos',
  'prazo',
  'inicio',
  'categoria_id',
  'valor_acumulado',
] as const;

export type CamposRevisao = Partial<Record<CampoMeta, number>>;

export interface ValoresMetaMerge {
  objetivo: string;
  valor_alvo_centavos: number;
  prazo: string;
  inicio: string | null;
  categoria_id: string | null;
  valor_acumulado_centavos: number | null;
  valor_acumulado_atualizado_em: string | null;
  excluido_em: string | null;
  atualizado_em: string;
  revisao: number;
  campos_revisao: string;
}

export interface ResultadoMergeMeta {
  valores: ValoresMetaMerge;
  /** O resultado já é igual ao documento remoto; não há edição local a enviar. */
  sincronizado: boolean;
  /** Algum campo remoto foi escolhido em vez do local. */
  remotaVenceu: boolean;
  /** A linha local precisa ser atualizada com o resultado. */
  mudouLocal: boolean;
}

/** Lê o mapa de revisões; JSON inválido ou chaves desconhecidas são ignorados. */
export function parseCamposRevisao(texto: string | null): CamposRevisao {
  if (!texto) return {};
  try {
    const bruto = JSON.parse(texto) as unknown;
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
    const resultado: CamposRevisao = {};
    for (const campo of CAMPOS_META) {
      const valor = (bruto as Record<string, unknown>)[campo];
      if (Number.isSafeInteger(valor) && (valor as number) >= 0) {
        resultado[campo] = valor as number;
      }
    }
    return resultado;
  } catch {
    return {};
  }
}

/** Serializa apenas revisões positivas, em ordem canônica. */
export function serializarCamposRevisao(campos: CamposRevisao): string {
  const resultado: Record<string, number> = {};
  for (const campo of CAMPOS_META) {
    const revisao = campos[campo];
    if (Number.isSafeInteger(revisao) && (revisao as number) > 0) {
      resultado[campo] = revisao as number;
    }
  }
  return JSON.stringify(resultado);
}

function revisaoLocal(meta: Meta, campo: CampoMeta): number {
  return parseCamposRevisao(meta.campos_revisao)[campo] ?? 0;
}

function revisaoRemota(remota: MetaRemota, campo: CampoMeta): number {
  return remota.campos_revisao?.[campo] ?? 0;
}

function valorLocal(meta: Meta, campo: CampoMeta): string {
  switch (campo) {
    case 'objetivo':
      return JSON.stringify(meta.objetivo);
    case 'valor_alvo_centavos':
      return JSON.stringify(meta.valor_alvo_centavos);
    case 'prazo':
      return JSON.stringify(meta.prazo);
    case 'inicio':
      return JSON.stringify(meta.inicio);
    case 'categoria_id':
      return JSON.stringify(meta.categoria_id);
    case 'valor_acumulado':
      return JSON.stringify([
        meta.valor_acumulado_centavos,
        meta.valor_acumulado_atualizado_em,
      ]);
  }
}

function valorRemoto(remota: MetaRemota, campo: CampoMeta): string {
  switch (campo) {
    case 'objetivo':
      return JSON.stringify(remota.objetivo);
    case 'valor_alvo_centavos':
      return JSON.stringify(remota.valor_alvo_centavos);
    case 'prazo':
      return JSON.stringify(remota.prazo);
    case 'inicio':
      return JSON.stringify(remota.inicio);
    case 'categoria_id':
      return JSON.stringify(remota.categoria_id);
    case 'valor_acumulado':
      return JSON.stringify([
        remota.valor_acumulado_centavos,
        remota.valor_acumulado_atualizado_em,
      ]);
  }
}

function valorBase(base: MetaRemota, campo: CampoMeta): string {
  return valorRemoto(base, campo);
}

function aplicarRemota(valores: ValoresMetaMerge, remota: MetaRemota, campo: CampoMeta): void {
  switch (campo) {
    case 'objetivo':
      valores.objetivo = remota.objetivo;
      break;
    case 'valor_alvo_centavos':
      valores.valor_alvo_centavos = remota.valor_alvo_centavos;
      break;
    case 'prazo':
      valores.prazo = remota.prazo;
      break;
    case 'inicio':
      valores.inicio = remota.inicio;
      break;
    case 'categoria_id':
      valores.categoria_id = remota.categoria_id;
      break;
    case 'valor_acumulado':
      valores.valor_acumulado_centavos = remota.valor_acumulado_centavos;
      valores.valor_acumulado_atualizado_em = remota.valor_acumulado_atualizado_em;
      break;
  }
}

function aplicarLocal(valores: ValoresMetaMerge, local: Meta, campo: CampoMeta): void {
  switch (campo) {
    case 'objetivo':
      valores.objetivo = local.objetivo;
      break;
    case 'valor_alvo_centavos':
      valores.valor_alvo_centavos = local.valor_alvo_centavos;
      break;
    case 'prazo':
      valores.prazo = local.prazo;
      break;
    case 'inicio':
      valores.inicio = local.inicio;
      break;
    case 'categoria_id':
      valores.categoria_id = local.categoria_id;
      break;
    case 'valor_acumulado':
      valores.valor_acumulado_centavos = local.valor_acumulado_centavos;
      valores.valor_acumulado_atualizado_em = local.valor_acumulado_atualizado_em;
      break;
  }
}

/**
 * Escolhe o vencedor de um campo. A base compartilhada distingue alteração
 * efetiva de valor herdado. No mesmo campo, a revisão lógica vence; empate usa
 * `atualizado_em` apenas como fallback legado e, por fim, uma comparação
 * canônica determinística do valor.
 */
function escolherCampo(
  local: Meta,
  remota: MetaRemota,
  base: MetaRemota,
  campo: CampoMeta,
): 'local' | 'remota' {
  const localValor = valorLocal(local, campo);
  const remotoValor = valorRemoto(remota, campo);
  const baseValor = valorBase(base, campo);
  const localMudou = localValor !== baseValor;
  const remotaMudou = remotoValor !== baseValor;

  if (localMudou && !remotaMudou) return 'local';
  if (!localMudou && remotaMudou) return 'remota';
  if (!localMudou && !remotaMudou) return 'local';

  const localRev = revisaoLocal(local, campo);
  const remotaRev = revisaoRemota(remota, campo);
  if (localRev !== remotaRev) return localRev > remotaRev ? 'local' : 'remota';

  // Documentos legados sem metadados usam o timestamp global como fallback.
  if (localRev === 0 && remotaRev === 0) {
    const comparacao = local.atualizado_em.localeCompare(remota.atualizado_em);
    if (comparacao !== 0) return comparacao > 0 ? 'local' : 'remota';
  }

  // Empate real (mesmo timestamp/revisão): os dois lados convergem para o
  // mesmo valor canônico, sem depender da ordem de sincronização.
  return localValor >= remotoValor ? 'local' : 'remota';
}

function valoresIniciais(local: Meta, remota: MetaRemota): ValoresMetaMerge {
  const campos = parseCamposRevisao(local.campos_revisao);
  return {
    objetivo: local.objetivo,
    valor_alvo_centavos: local.valor_alvo_centavos,
    prazo: local.prazo,
    inicio: local.inicio,
    categoria_id: local.categoria_id,
    valor_acumulado_centavos: local.valor_acumulado_centavos,
    valor_acumulado_atualizado_em: local.valor_acumulado_atualizado_em,
    excluido_em: local.excluido_em,
    atualizado_em: maiorTimestamp(local.atualizado_em, remota.atualizado_em),
    revisao: Math.max(local.revisao ?? 0, remota.revisao ?? 0),
    campos_revisao: serializarCamposRevisao(campos),
  };
}

function maiorTimestamp(a: string, b: string): string {
  return a.localeCompare(b) >= 0 ? a : b;
}

function iguaisAoRemoto(valores: ValoresMetaMerge, remota: MetaRemota): boolean {
  if (valores.excluido_em !== remota.excluido_em) return false;
  return CAMPOS_META.every((campo) => {
    switch (campo) {
      case 'objetivo':
        return valores.objetivo === remota.objetivo;
      case 'valor_alvo_centavos':
        return valores.valor_alvo_centavos === remota.valor_alvo_centavos;
      case 'prazo':
        return valores.prazo === remota.prazo;
      case 'inicio':
        return valores.inicio === remota.inicio;
      case 'categoria_id':
        return valores.categoria_id === remota.categoria_id;
      case 'valor_acumulado':
        return (
          valores.valor_acumulado_centavos === remota.valor_acumulado_centavos
          && valores.valor_acumulado_atualizado_em
            === remota.valor_acumulado_atualizado_em
        );
    }
  });
}

function valoresMudaram(local: Meta, valores: ValoresMetaMerge): boolean {
  return (
    valores.objetivo !== local.objetivo
    || valores.valor_alvo_centavos !== local.valor_alvo_centavos
    || valores.prazo !== local.prazo
    || valores.inicio !== local.inicio
    || valores.categoria_id !== local.categoria_id
    || valores.valor_acumulado_centavos !== local.valor_acumulado_centavos
    || valores.valor_acumulado_atualizado_em !== local.valor_acumulado_atualizado_em
    || valores.excluido_em !== local.excluido_em
    || valores.revisao !== local.revisao
    || valores.campos_revisao !== local.campos_revisao
    || valores.atualizado_em !== local.atualizado_em
  );
}

function resultadoTombstone(
  local: Meta,
  remota: MetaRemota,
): ResultadoMergeMeta {
  const remotaTombstone = remota.excluido_em != null;
  const localTombstone = local.excluido_em != null;
  const usarRemota = remotaTombstone
    && (!localTombstone || (remota.excluido_em ?? '') >= (local.excluido_em ?? ''));

  const valores = valoresIniciais(local, remota);
  if (usarRemota) {
    aplicarRemota(valores, remota, 'objetivo');
    aplicarRemota(valores, remota, 'valor_alvo_centavos');
    aplicarRemota(valores, remota, 'prazo');
    aplicarRemota(valores, remota, 'inicio');
    aplicarRemota(valores, remota, 'categoria_id');
    aplicarRemota(valores, remota, 'valor_acumulado');
    valores.excluido_em = remota.excluido_em;
  } else {
    valores.excluido_em = local.excluido_em;
  }
  valores.revisao = Math.max(local.revisao ?? 0, remota.revisao ?? 0);
  const sincronizado =
    usarRemota
    && local.criado_em === remota.criado_em
    && iguaisAoRemoto(valores, remota);
  return {
    valores,
    sincronizado,
    remotaVenceu: usarRemota,
    mudouLocal: valoresMudaram(local, valores),
  };
}

/**
 * Merge de três vias para uma meta local e um documento remoto com a mesma
 * base sincronizada. A exclusão é tratada antes de qualquer combinação.
 */
export function mergeMetaRemota(
  local: Meta,
  remota: MetaRemota,
  base: MetaRemota,
): ResultadoMergeMeta {
  if (local.excluido_em != null || remota.excluido_em != null) {
    return resultadoTombstone(local, remota);
  }

  const valores = valoresIniciais(local, remota);

  // Tipo é imutável. Uma divergência remota não pode trocar o tipo local nem
  // combinar categoria/acumulado de tipos diferentes.
  if (local.tipo !== remota.tipo) {
    return {
      valores,
      sincronizado: false,
      remotaVenceu: false,
      mudouLocal: valoresMudaram(local, valores),
    };
  }

  const camposRevisao = parseCamposRevisao(local.campos_revisao);
  for (const campo of CAMPOS_META) {
    const vencedor = escolherCampo(local, remota, base, campo);
    if (vencedor === 'remota') aplicarRemota(valores, remota, campo);
    else aplicarLocal(valores, local, campo);

    const revisao = Math.max(
      revisaoLocal(local, campo),
      revisaoRemota(remota, campo),
    );
    if (revisao > 0) camposRevisao[campo] = revisao;
  }

  // `inicio` não é editável na interface, mas precisa permanecer coerente com
  // um prazo remoto escolhido independentemente.
  if (valores.inicio != null && valores.inicio > valores.prazo) {
    if (local.inicio == null || local.inicio <= valores.prazo) {
      valores.inicio = local.inicio;
    } else if (remota.inicio == null || remota.inicio <= valores.prazo) {
      valores.inicio = remota.inicio;
    } else {
      valores.inicio = null;
    }
  }

  // Coerência por tipo após a combinação.
  if (local.tipo === 'investimento') {
    valores.categoria_id = null;
    if (valores.valor_acumulado_centavos == null) {
      valores.valor_acumulado_atualizado_em = null;
    } else if (valores.valor_acumulado_atualizado_em == null) {
      valores.valor_acumulado_centavos = null;
    }
  } else {
    valores.valor_acumulado_centavos = null;
    valores.valor_acumulado_atualizado_em = null;
  }

  valores.revisao = Math.max(local.revisao ?? 0, remota.revisao ?? 0);
  valores.campos_revisao = serializarCamposRevisao(camposRevisao);

  const sincronizado =
    local.criado_em === remota.criado_em && iguaisAoRemoto(valores, remota);
  const remotaVenceu = CAMPOS_META.some((campo) => {
    const escolhido = escolherCampo(local, remota, base, campo);
    return escolhido === 'remota' && valorLocal(local, campo) !== valorRemoto(remota, campo);
  });

  return {
    valores,
    sincronizado,
    remotaVenceu,
    mudouLocal: valoresMudaram(local, valores),
  };
}
