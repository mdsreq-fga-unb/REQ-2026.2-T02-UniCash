import type { SQLiteDatabase } from 'expo-sqlite';
import { doc, runTransaction } from 'firebase/firestore';
import {
  PERCENTUAL_MAX_CENTESIMOS,
  PERCENTUAL_MIN_CENTESIMOS,
} from './limites';
import { db as firestore } from '@/lib/firebase';
import { gerarId } from '@/features/receitas/service';
import {
  listarPendentes,
  registrarPendente,
  removerPendente,
} from '@/db/restauracaoPendente';
import type { Categoria, LimiteTipo } from './types';
import {
  nomeCategoriaPadraoPorSlug,
  PREFIXO_DOC_PADRAO,
  slugCategoriaPadrao,
  type SlugCategoriaPadrao,
} from './padroes';
import { normalizarNome } from './validation';
import { definirEstadoCategoria } from './estado';
import { marcarCategoriaExcluidaNaTransacao } from './service';

export interface CategoriaRemota {
  padrao: boolean;
  chave: SlugCategoriaPadrao | null;
  nome: string;
  nome_normalizado: string;
  limite_tipo: LimiteTipo | null;
  limite_centavos: number | null;
  limite_percentual_centesimos: number | null;
  excluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  aliases: string[];
  /** Indica que um percentual legado foi ajustado e precisa ser reenviado. */
  percentualNormalizado?: boolean;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor : null;
}

function inteiroPositivo(valor: unknown, max: number): number | null {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0 && valor <= max
    ? valor
    : null;
}

/**
 * Normaliza um percentual legado para a faixa definitiva de 1% a 100%,
 * arredondando casas excedentes. Retorna também se houve ajuste, para que o
 * chamador marque a categoria como pendente e reenvie o documento ao Firestore.
 */
function normalizarPercentualRemoto(valor: unknown): { valor: number; ajustado: boolean } | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  const arredondado = Math.round(valor);
  const normalizado = Math.min(
    PERCENTUAL_MAX_CENTESIMOS,
    Math.max(PERCENTUAL_MIN_CENTESIMOS, arredondado),
  );
  return { valor: normalizado, ajustado: normalizado !== valor };
}

function normalizarLimite(dados: Record<string, unknown>): {
  tipo: LimiteTipo | null;
  centavos: number | null;
  percentual: number | null;
  percentualAjustado: boolean;
} | null {
  const tipo = dados.limite_tipo ?? null;
  if (tipo === null) {
    if (dados.limite_centavos != null || dados.limite_percentual_centesimos != null) return null;
    return { tipo: null, centavos: null, percentual: null, percentualAjustado: false };
  }
  if (tipo === 'valor') {
    const centavos = inteiroPositivo(dados.limite_centavos, 99_999_999_999);
    if (centavos === null || dados.limite_percentual_centesimos != null) return null;
    return { tipo, centavos, percentual: null, percentualAjustado: false };
  }
  if (tipo === 'percentual_renda') {
    const percentual = normalizarPercentualRemoto(dados.limite_percentual_centesimos);
    if (percentual === null || dados.limite_centavos != null) return null;
    return {
      tipo,
      centavos: null,
      percentual: percentual.valor,
      percentualAjustado: percentual.ajustado,
    };
  }
  return null;
}

function normalizarAliases(valor: unknown): string[] | null {
  if (valor == null) return [];
  if (!Array.isArray(valor)) return null;
  if (valor.some((a) => typeof a !== 'string' || a.length === 0 || a.length > 100)) return null;
  return [...new Set(valor)];
}

/**
 * Valida e normaliza um documento da coleção `categorias`.
 * Retorna null para documento inválido; o chamador o mantém na fila de
 * restauração/categoria pendente, nunca o converte silenciosamente em NULL.
 */
export function normalizarCategoriaRemota(
  docId: string,
  dados: unknown,
): CategoriaRemota | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const padrao = d.padrao === true;
  if (d.padrao !== true && d.padrao !== false) return null;

  const nome = texto(d.nome);
  if (!nome || Array.from(nome).length > 30) return null;
  const nomeNormalizado =
    texto(d.nome_normalizado) ?? normalizarNome(nome);
  if (Array.from(nomeNormalizado).length > 30) return null;

  const limite = normalizarLimite(d);
  if (!limite) return null;

  const criadoEm = texto(d.criado_em);
  const atualizadoEm = texto(d.atualizado_em);
  if (!criadoEm || !atualizadoEm) return null;

  const excluidoEm = d.excluido_em == null ? null : texto(d.excluido_em);
  if (d.excluido_em != null && !excluidoEm) return null;

  const aliases = normalizarAliases(d.aliases);
  if (!aliases) return null;

  if (padrao) {
    if (excluidoEm) return null; // padrão não pode ser excluída
    const chave = d.chave;
    if (typeof chave !== 'string') return null;
    if (docId !== `${PREFIXO_DOC_PADRAO}${chave}`) return null;
    if (
      slugCategoriaPadrao({
        padrao: 1,
        nome_normalizado: nomeNormalizado,
      }) !== chave
    ) {
      return null;
    }
    return {
      padrao: true,
      chave: chave as SlugCategoriaPadrao,
      nome,
      nome_normalizado: nomeNormalizado,
      limite_tipo: limite.tipo,
      limite_centavos: limite.centavos,
      limite_percentual_centesimos: limite.percentual,
      excluido_em: null,
      criado_em: criadoEm,
      atualizado_em: atualizadoEm,
      aliases,
      ...(limite.percentualAjustado ? { percentualNormalizado: true } : {}),
    };
  }

  if (d.chave != null) return null;
  if (docId.startsWith(PREFIXO_DOC_PADRAO)) return null;
  if (aliases.length > 0) return null;

  return {
    padrao: false,
    chave: null,
    nome,
    nome_normalizado: nomeNormalizado,
    limite_tipo: limite.tipo,
    limite_centavos: limite.centavos,
    limite_percentual_centesimos: limite.percentual,
    excluido_em: excluidoEm,
    criado_em: criadoEm,
    atualizado_em: atualizadoEm,
    aliases: [],
    ...(limite.percentualAjustado ? { percentualNormalizado: true } : {}),
  };
}

/** Payload remoto de uma categoria local. Nunca inclui estado local nem sync_status. */
export function payloadCategoriaRemota(categoria: Categoria): CategoriaRemota {
  const chave = slugCategoriaPadrao(categoria);
  return {
    padrao: categoria.padrao === 1,
    chave,
    nome: categoria.nome,
    nome_normalizado: categoria.nome_normalizado,
    limite_tipo: categoria.limite_tipo ?? null,
    limite_centavos: categoria.limite_centavos ?? null,
    limite_percentual_centesimos: categoria.limite_percentual_centesimos ?? null,
    excluido_em: categoria.excluido_em ?? null,
    criado_em: categoria.criado_em,
    atualizado_em: categoria.atualizado_em,
    aliases: chave ? [categoria.id] : [],
  };
}

function assinaturaCategoria(
  categoria: Pick<
    Categoria,
    | 'nome'
    | 'nome_normalizado'
    | 'limite_tipo'
    | 'limite_centavos'
    | 'limite_percentual_centesimos'
    | 'excluido_em'
    | 'criado_em'
  >,
): string {
  return JSON.stringify([
    categoria.nome,
    categoria.nome_normalizado,
    categoria.limite_tipo ?? '',
    categoria.limite_centavos ?? '',
    categoria.limite_percentual_centesimos ?? '',
    categoria.excluido_em ?? '',
    categoria.criado_em,
  ]);
}

/**
 * Impressão digital da versão local para controle otimista.
 * Inclui conteúdo, estado e timestamps: uma edição no mesmo milissegundo
 * continua detectável, e `sync_status`/`estado_local` não são mascarados.
 * Os mesmos campos existem no snapshot de `sincronizarCategoriasPendentes`
 * (`c.*` + `estado_local`) e na releitura de `lerCategoriaPorId`.
 */
function assinaturaVersaoLocal(categoria: Categoria): string {
  return JSON.stringify([
    categoria.id,
    categoria.nome,
    categoria.nome_normalizado,
    categoria.padrao,
    categoria.limite_tipo ?? null,
    categoria.limite_centavos ?? null,
    categoria.limite_percentual_centesimos ?? null,
    categoria.sync_status,
    categoria.excluido_em ?? null,
    categoria.criado_em,
    categoria.atualizado_em,
    categoria.estado_local ?? 'editado',
  ]);
}

function mesmaVersaoLocal(atual: Categoria | null, esperada: Categoria): boolean {
  return atual !== null && assinaturaVersaoLocal(atual) === assinaturaVersaoLocal(esperada);
}

/**
 * Decide deterministicamente entre a versão local e a remota da MESMA categoria.
 * - exclusão prevalece sobre edição;
 * - padrão não pode ser excluída;
 * - padrão em `semeadura` aceita a nuvem, mesmo com timestamp local maior;
 * - empate de timestamp usa a assinatura canônica maior, simétrica nos dois
 *   dispositivos (não depende de quem é "local").
 */
export function decidirCategoriaRemota(
  local: Categoria,
  remota: CategoriaRemota,
): 'local' | 'remota' {
  if (local.padrao === 1) {
    if (remota.padrao !== true) return 'local';
    if (remota.excluido_em) return 'local';
    if (remota.chave && slugCategoriaPadrao(local) !== remota.chave) return 'local';
    if ((local.estado_local ?? 'editado') === 'semeadura') return 'remota';
  }

  const localExcluida = local.excluido_em != null;
  const remotaExcluida = remota.excluido_em != null;
  if (localExcluida && !remotaExcluida) return 'local';
  if (!localExcluida && remotaExcluida) return 'remota';

  const comparacao = local.atualizado_em.localeCompare(remota.atualizado_em);
  if (comparacao !== 0) return comparacao > 0 ? 'local' : 'remota';

  return assinaturaCategoria(local) >= assinaturaCategoria(remota) ? 'local' : 'remota';
}

export type MotivoPendenciaCategoria =
  | 'categoria_invalida'
  | 'categoria_desconhecida'
  | 'conflito_nome'
  | 'padrao_ambigua'
  | 'alteracao_local_concorrente';

export interface ResultadoAplicacaoCategoria {
  status: 'aplicada' | 'pendente';
  mapa?: string | null;
  chaves?: string[];
  remotaVenceu?: boolean;
  precisaReenviar?: boolean;
  motivo?: MotivoPendenciaCategoria;
}

const agora = () => new Date().toISOString();

async function lerCategoriaPorId(
  tx: SQLiteDatabase,
  id: string,
): Promise<Categoria | null> {
  return tx.getFirstAsync<Categoria>(
    `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local
       FROM categorias c
       LEFT JOIN categorias_estado e ON e.categoria_id = c.id
      WHERE c.id = ?`,
    [id],
  );
}

async function lerCategoriaAtivaPorNome(
  tx: SQLiteDatabase,
  nomeNormalizado: string,
): Promise<Categoria | null> {
  return tx.getFirstAsync<Categoria>(
    `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local
       FROM categorias c
       LEFT JOIN categorias_estado e ON e.categoria_id = c.id
      WHERE c.nome_normalizado = ? AND c.excluido_em IS NULL
      LIMIT 1`,
    [nomeNormalizado],
  );
}

async function lerPadraoAtivaPorNome(
  tx: SQLiteDatabase,
  nomeNormalizado: string,
): Promise<Categoria | null> {
  return tx.getFirstAsync<Categoria>(
    `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local
       FROM categorias c
       LEFT JOIN categorias_estado e ON e.categoria_id = c.id
      WHERE c.nome_normalizado = ? AND c.padrao = 1 AND c.excluido_em IS NULL
      LIMIT 1`,
    [nomeNormalizado],
  );
}

async function atualizarCategoriaLocal(
  tx: SQLiteDatabase,
  local: Categoria,
  remota: CategoriaRemota,
): Promise<{ conflitoNome: boolean }> {
  if (local.padrao === 1) {
    await tx.runAsync(
      `UPDATE categorias SET
         limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
         sync_status = 'sincronizado', atualizado_em = ?
       WHERE id = ?`,
      [
        remota.limite_tipo,
        remota.limite_centavos,
        remota.limite_percentual_centesimos,
        remota.atualizado_em,
        local.id,
      ],
    );
    await definirEstadoCategoria(tx, local.id, 'sincronizado');
    return { conflitoNome: false };
  }

  const conflito = await tx.getFirstAsync<{ id: string }>(
    `SELECT id FROM categorias
      WHERE nome_normalizado = ? AND excluido_em IS NULL AND id <> ?
      LIMIT 1`,
    [remota.nome_normalizado, local.id],
  );

  if (conflito) {
    // O nome remoto colidiria com outra categoria ativa. Mantemos o nome local,
    // aplicamos os limites e deixamos a categoria pendente para o próximo envio
    // local prevalecer, sem fundir categorias diferentes.
    await tx.runAsync(
      `UPDATE categorias SET
         limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
         sync_status = 'pendente', atualizado_em = ?
       WHERE id = ?`,
      [
        remota.limite_tipo,
        remota.limite_centavos,
        remota.limite_percentual_centesimos,
        agora(),
        local.id,
      ],
    );
    await definirEstadoCategoria(tx, local.id, 'editado');
    return { conflitoNome: true };
  }

  await tx.runAsync(
    `UPDATE categorias SET
       nome = ?, nome_normalizado = ?,
       limite_tipo = ?, limite_centavos = ?, limite_percentual_centesimos = ?,
       sync_status = 'sincronizado', atualizado_em = ?
     WHERE id = ?`,
    [
      remota.nome,
      remota.nome_normalizado,
      remota.limite_tipo,
      remota.limite_centavos,
      remota.limite_percentual_centesimos,
      remota.atualizado_em,
      local.id,
    ],
  );
  await definirEstadoCategoria(tx, local.id, 'sincronizado');
  return { conflitoNome: false };
}

async function inserirCategoriaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: CategoriaRemota,
): Promise<string> {
  if (remota.padrao) {
    const nome = nomeCategoriaPadraoPorSlug(remota.chave!);
    if (!nome) throw new Error('categoria padrão sem nome canônico');
    const id = gerarId();
    await tx.runAsync(
      `INSERT INTO categorias
         (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
          limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, 1, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
      [
        id,
        nome,
        normalizarNome(nome),
        remota.limite_tipo,
        remota.limite_centavos,
        remota.limite_percentual_centesimos,
        remota.criado_em,
        remota.atualizado_em,
      ],
    );
    await definirEstadoCategoria(tx, id, 'sincronizado');
    return id;
  }

  await tx.runAsync(
    `INSERT INTO categorias
       (id, nome, nome_normalizado, padrao, limite_tipo, limite_centavos,
        limite_percentual_centesimos, sync_status, excluido_em, criado_em, atualizado_em)
     VALUES (?, ?, ?, 0, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
    [
      docId,
      remota.nome,
      remota.nome_normalizado,
      remota.limite_tipo,
      remota.limite_centavos,
      remota.limite_percentual_centesimos,
      remota.criado_em,
      remota.atualizado_em,
    ],
  );
  await definirEstadoCategoria(tx, docId, 'sincronizado');
  return docId;
}

function chavesDaCategoria(docId: string, remota: CategoriaRemota): string[] {
  if (!remota.padrao) return [docId];
  return [...new Set([docId, remota.chave!, ...remota.aliases])];
}

/** Payload remoto sem metadados internos (ex.: `percentualNormalizado`). */
function payloadDaRemota(remota: CategoriaRemota, aliases: string[]): CategoriaRemota {
  return {
    padrao: remota.padrao,
    chave: remota.chave,
    nome: remota.nome,
    nome_normalizado: remota.nome_normalizado,
    limite_tipo: remota.limite_tipo,
    limite_centavos: remota.limite_centavos,
    limite_percentual_centesimos: remota.limite_percentual_centesimos,
    excluido_em: remota.excluido_em,
    criado_em: remota.criado_em,
    atualizado_em: remota.atualizado_em,
    aliases,
  };
}

/**
 * Aplica um documento remoto de categoria na base local, sem rede.
 * Conflitos de nome entre categorias próprias diferentes NÃO são fundidos:
 * o documento fica pendente para resolução posterior.
 */
export async function aplicarCategoriaRemota(
  tx: SQLiteDatabase,
  docId: string,
  remota: CategoriaRemota,
  opcoes: { forcarRemota?: boolean } = {},
): Promise<ResultadoAplicacaoCategoria> {
  if (remota.padrao) {
    if (!remota.chave) {
      return { status: 'pendente', motivo: 'categoria_invalida' };
    }
    const nome = nomeCategoriaPadraoPorSlug(remota.chave);
    if (!nome) return { status: 'pendente', motivo: 'categoria_invalida' };
    const nomeNormalizado = normalizarNome(nome);
    const local = await lerPadraoAtivaPorNome(tx, nomeNormalizado);

    if (!local) {
      const ativa = await lerCategoriaAtivaPorNome(tx, nomeNormalizado);
      if (ativa) return { status: 'pendente', motivo: 'conflito_nome' };
      const localId = await inserirCategoriaRemota(tx, docId, remota);
      return {
        status: 'aplicada',
        mapa: localId,
        chaves: chavesDaCategoria(docId, remota),
        remotaVenceu: true,
      };
    }

    const venceu =
      opcoes.forcarRemota === true || decidirCategoriaRemota(local, remota) === 'remota';
    if (venceu) {
      await atualizarCategoriaLocal(tx, local, remota);
    }
    return {
      status: 'aplicada',
      mapa: local.id,
      chaves: chavesDaCategoria(docId, remota),
      remotaVenceu: venceu,
    };
  }

  const local = await lerCategoriaPorId(tx, docId);

  if (local) {
    if (remota.excluido_em) {
      const excluidoEm = local.excluido_em
        ? remota.excluido_em >= local.excluido_em
          ? remota.excluido_em
          : local.excluido_em
        : remota.excluido_em;
      const atualizadoEm = local.excluido_em
        ? remota.atualizado_em >= local.atualizado_em
          ? remota.atualizado_em
          : local.atualizado_em
        : remota.atualizado_em;
      await marcarCategoriaExcluidaNaTransacao(
        tx,
        local.id,
        excluidoEm,
        atualizadoEm,
        'sincronizado',
      );
      return {
        status: 'aplicada',
        mapa: null,
        chaves: [docId],
        remotaVenceu: true,
      };
    }

    if (local.excluido_em) {
      // Exclusão local prevalece; o tombstone será reenviado.
      return {
        status: 'aplicada',
        mapa: null,
        chaves: [docId],
        remotaVenceu: false,
      };
    }

    const venceu =
      opcoes.forcarRemota === true || decidirCategoriaRemota(local, remota) === 'remota';
    let conflitoNome = false;
    if (venceu) {
      ({ conflitoNome } = await atualizarCategoriaLocal(tx, local, remota));
    }
    return {
      status: 'aplicada',
      mapa: local.id,
      chaves: [docId],
      remotaVenceu: venceu && !conflitoNome,
      precisaReenviar: conflitoNome,
    };
  }

  if (remota.excluido_em) {
    return { status: 'aplicada', mapa: null, chaves: [docId], remotaVenceu: true };
  }

  const ativa = await lerCategoriaAtivaPorNome(tx, remota.nome_normalizado);
  if (ativa) {
    // Categorias próprias diferentes com o mesmo nome não são fundidas.
    return { status: 'pendente', motivo: 'conflito_nome' };
  }

  const localId = await inserirCategoriaRemota(tx, docId, remota);
  return {
    status: 'aplicada',
    mapa: localId,
    chaves: [docId],
    remotaVenceu: true,
  };
}

export interface DocumentoCategoriaRemota {
  id: string;
  data: () => unknown;
}

export interface ResultadoNormalizacaoRemota {
  normalizadas: number;
  ignoradas: number;
  falhas: number;
  acessoNegado: boolean;
}

/**
 * Campos que precisam ser corrigidos em um documento remoto para a faixa
 * percentual definitiva. Retorna null quando não há correção segura possível.
 * - Tombstone de própria: remove qualquer limite residual.
 * - Categoria ativa: corrige somente o percentual ajustado.
 */
function camposNormalizacaoRemota(
  docId: string,
  dados: unknown,
): Record<string, unknown> | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const tombstone = typeof d.excluido_em === 'string' && d.excluido_em.length > 0;

  if (tombstone) {
    // Padrão nunca pode ser tombstone; não há correção segura de identidade.
    if (d.padrao === true) return null;
    const temLimite =
      d.limite_tipo != null ||
      d.limite_centavos != null ||
      d.limite_percentual_centesimos != null;
    return temLimite
      ? { limite_tipo: null, limite_centavos: null, limite_percentual_centesimos: null }
      : null;
  }

  const remota = normalizarCategoriaRemota(docId, dados);
  if (!remota || !remota.percentualNormalizado) return null;
  return { limite_percentual_centesimos: remota.limite_percentual_centesimos };
}

/**
 * Varre TODOS os documentos de categorias do usuário e normaliza os percentuais
 * legados, inclusive categorias que não estão em uso, conflitos de nome e
 * tombstones. É idempotente e usa uma transação por documento, relendo antes de
 * escrever para não sobrescrever alterações concorrentes. Atualiza apenas campos
 * de limite; nome, identidade, aliases, timestamps e referências financeiras não
 * são alterados. Documentos inválidos em outros campos são ignorados para não
 * aplicar correções inseguras.
 */
export async function normalizarCategoriasRemotas(
  uid: string,
  docs: readonly DocumentoCategoriaRemota[],
): Promise<ResultadoNormalizacaoRemota> {
  let normalizadas = 0;
  let ignoradas = 0;
  let falhas = 0;
  let acessoNegado = false;

  for (const documento of docs) {
    const campos = camposNormalizacaoRemota(documento.id, documento.data());
    if (!campos) {
      ignoradas++;
      continue;
    }

    const ref = doc(firestore, 'usuarios', uid, 'categorias', documento.id);
    try {
      const aplicou = await runTransaction(firestore, async (tx) => {
        const atual = await tx.get(ref);
        if (!atual.exists()) return false;
        const camposAtuais = camposNormalizacaoRemota(documento.id, atual.data());
        if (!camposAtuais) return false;
        tx.update(ref, camposAtuais);
        return true;
      });
      if (aplicou) normalizadas++;
      else ignoradas++;
    } catch (erro) {
      if ((erro as { code?: string } | null)?.code === 'permission-denied') {
        acessoNegado = true;
      }
      falhas++;
    }
  }

  return { normalizadas, ignoradas, falhas, acessoNegado };
}

function timestampDoDocumento(dados: unknown): string {
  if (!dados || typeof dados !== 'object') return '';
  const ts = (dados as Record<string, unknown>).atualizado_em;
  return typeof ts === 'string' ? ts : '';
}

function categoriaIdDoDocumento(dados: unknown, docId: string): string {
  if (!dados || typeof dados !== 'object') return docId;
  const d = dados as Record<string, unknown>;
  if (typeof d.chave === 'string' && d.chave.length > 0) return d.chave;
  return docId;
}

async function marcarCategoriaPendenteLocal(
  tx: SQLiteDatabase,
  id: string,
): Promise<void> {
  await tx.runAsync("UPDATE categorias SET sync_status = 'pendente' WHERE id = ?", [id]);
  await definirEstadoCategoria(tx, id, 'editado');
}

/**
 * Restaura categorias antes de séries/despesas. Categorias com conflito de nome
 * ou documento inválido ficam na fila `restauracao_pendente`; nada é convertido
 * em NULL nem mesclado por nome. Percentuais legados normalizados são marcados
 * como pendentes para que a correção seja enviada ao Firestore.
 */
export async function restaurarCategoriasDaNuvem(
  tx: SQLiteDatabase,
  docs: DocumentoCategoriaRemota[],
): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  const idsNoSnapshot = new Set(docs.map((d) => d.id));

  const ordenados = [...docs].sort((a, b) => {
    const da = a.data() as Record<string, unknown> | null;
    const db = b.data() as Record<string, unknown> | null;
    const pa = da?.padrao === true ? 0 : 1;
    const pb = db?.padrao === true ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return timestampDoDocumento(da).localeCompare(timestampDoDocumento(db));
  });

  for (const documento of ordenados) {
    const dados = documento.data();
    const remota = normalizarCategoriaRemota(documento.id, dados);

    if (!remota) {
      await registrarPendente(tx, {
        tipo: 'categoria',
        id: documento.id,
        categoriaId: categoriaIdDoDocumento(dados, documento.id),
        motivo: 'categoria_invalida',
        payload: dados,
        atualizadoEm: timestampDoDocumento(dados),
      });
      continue;
    }

    const resultado = await aplicarCategoriaRemota(tx, documento.id, remota);
    if (resultado.status === 'aplicada') {
      if (remota.percentualNormalizado && resultado.mapa) {
        await marcarCategoriaPendenteLocal(tx, resultado.mapa);
      }
      await removerPendente(tx, 'categoria', documento.id);
      for (const chave of resultado.chaves ?? []) {
        mapa.set(chave, resultado.mapa ?? null);
      }
    } else {
      await registrarPendente(tx, {
        tipo: 'categoria',
        id: documento.id,
        categoriaId: remota.chave ?? documento.id,
        motivo: resultado.motivo ?? 'conflito_nome',
        payload: dados,
        atualizadoEm: remota.atualizado_em,
      });
    }
  }

  // Uma categoria que estava pendente e não veio no snapshot pode ter sido
  // resolvida localmente (renomeação/exclusão da conflitante). Tenta novamente.
  const pendentes = await listarPendentes(tx, ['categoria']);
  for (const pendente of pendentes) {
    if (idsNoSnapshot.has(pendente.id)) continue;
    let dados: unknown;
    try {
      dados = JSON.parse(pendente.payload);
    } catch {
      continue;
    }
    const remota = normalizarCategoriaRemota(pendente.id, dados);
    if (!remota) continue;
    const resultado = await aplicarCategoriaRemota(tx, pendente.id, remota);
    if (resultado.status === 'aplicada') {
      if (remota.percentualNormalizado && resultado.mapa) {
        await marcarCategoriaPendenteLocal(tx, resultado.mapa);
      }
      await removerPendente(tx, 'categoria', pendente.id);
      for (const chave of resultado.chaves ?? []) {
        mapa.set(chave, resultado.mapa ?? null);
      }
    }
  }

  return mapa;
}

/**
 * Confirma o envio somente se a linha local ainda for a versão que originou o
 * payload. A releitura e o UPDATE ficam na mesma transação SQLite exclusiva.
 */
async function marcarCategoriaSincronizada(
  db: SQLiteDatabase,
  esperada: Categoria,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const atual = await lerCategoriaPorId(tx, esperada.id);
    if (!mesmaVersaoLocal(atual, esperada)) return;

    const resultado = await tx.runAsync(
      `UPDATE categorias
          SET sync_status = 'sincronizado'
        WHERE id = ? AND sync_status = 'pendente'`,
      [esperada.id],
    );
    if (resultado.changes !== 1) return;

    await definirEstadoCategoria(tx, esperada.id, 'sincronizado');
  });
}

async function aplicarRemotaNaTransacao(
  db: SQLiteDatabase,
  docId: string,
  remota: CategoriaRemota,
  esperada: Categoria,
): Promise<ResultadoAplicacaoCategoria> {
  let resultado: ResultadoAplicacaoCategoria = {
    status: 'pendente',
    motivo: 'alteracao_local_concorrente',
  };

  await db.withExclusiveTransactionAsync(async (tx) => {
    const atual = await lerCategoriaPorId(tx, esperada.id);
    const versaoMudou = !mesmaVersaoLocal(atual, esperada);

    // Uma aplicação remota ativa decidida sobre uma versão antiga não pode
    // sobrescrever uma edição ou exclusão local feita durante a rede.
    if (versaoMudou && !remota.excluido_em) return;

    resultado = await aplicarCategoriaRemota(tx, docId, remota, { forcarRemota: true });
    if (resultado.status !== 'aplicada' || !resultado.mapa || resultado.precisaReenviar) {
      return;
    }

    await tx.runAsync(
      "UPDATE categorias SET sync_status = 'sincronizado' WHERE id = ?",
      [resultado.mapa],
    );
    await definirEstadoCategoria(tx, resultado.mapa, 'sincronizado');
  });

  return resultado;
}

/**
 * Envia categorias pendentes antes de séries/despesas. O status local só vira
 * `sincronizado` depois que a transação remota confirma; aliases de padrões são
 * mesclados dentro da transação, sem perder aliases concorrentes.
 */
export async function sincronizarCategoriasPendentes(
  db: SQLiteDatabase,
  uid: string,
): Promise<{ mudouLocal: boolean }> {
  const pendentes = await db.getAllAsync<Categoria>(
    `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local
       FROM categorias c
       LEFT JOIN categorias_estado e ON e.categoria_id = c.id
      WHERE c.sync_status = 'pendente'
      ORDER BY c.padrao DESC, c.id`,
  );

  let mudouLocal = false;

  for (const categoria of pendentes) {
    const chave = slugCategoriaPadrao(categoria);
    if (categoria.padrao === 1 && !chave) continue; // padrão inconsistente: não envia

    const docId = chave ? `${PREFIXO_DOC_PADRAO}${chave}` : categoria.id;
    const payload = payloadCategoriaRemota(categoria);
    const nomesConflitantes = new Set(
      (
        await db.getAllAsync<{ nome_normalizado: string }>(
          `SELECT nome_normalizado FROM categorias
            WHERE excluido_em IS NULL AND id <> ?`,
          [categoria.id],
        )
      ).map((l) => l.nome_normalizado),
    );

    const decisao = await runTransaction(firestore, async (tx) => {
      const ref = doc(firestore, 'usuarios', uid, 'categorias', docId);
      const snap = await tx.get(ref);

      if (!snap.exists()) {
        tx.set(ref, payload);
        return { acao: 'local' as const };
      }

      const remota = normalizarCategoriaRemota(docId, snap.data());
      if (!remota) return { acao: 'ignorada' as const };

      if (remota.padrao) {
        const aliases = [...new Set([...remota.aliases, categoria.id])];
        const vencedor = decidirCategoriaRemota(categoria, remota);
        if (vencedor === 'local') {
          tx.set(ref, { ...payload, aliases });
          return { acao: 'local' as const };
        }
        tx.set(ref, payloadDaRemota(remota, aliases));
        return { acao: 'remota' as const, remota };
      }

      if (remota.excluido_em) {
        return { acao: 'remota' as const, remota };
      }

      if (categoria.excluido_em) {
        tx.set(ref, payload);
        return { acao: 'local' as const };
      }

      if (nomesConflitantes.has(remota.nome_normalizado)) {
        tx.set(ref, payload);
        return { acao: 'local' as const };
      }

      const vencedor = decidirCategoriaRemota(categoria, remota);
      if (vencedor === 'local') {
        tx.set(ref, payload);
        return { acao: 'local' as const };
      }
      return { acao: 'remota' as const, remota };
    });

    if (decisao.acao === 'ignorada') continue;

    if (decisao.acao === 'local') {
      try {
        await marcarCategoriaSincronizada(db, categoria);
      } catch {
        // A nuvem confirmou, mas o SQLite não. A categoria continua pendente
        // para a próxima tentativa; não bloqueia despesas/séries.
      }
      continue;
    }

    let aplicada: ResultadoAplicacaoCategoria | null = null;
    try {
      aplicada = await aplicarRemotaNaTransacao(db, docId, decisao.remota, categoria);
    } catch {
      // Mantém a categoria pendente e segue para os demais registros.
    }
    if (aplicada?.status === 'aplicada' && aplicada.remotaVenceu) {
      mudouLocal = true;
    }
  }

  return { mudouLocal };
}
