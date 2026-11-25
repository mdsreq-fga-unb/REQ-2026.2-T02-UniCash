import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDbDoDono } from '@/db/database';
import type { Receita } from './types';
import { resolverCategoriaRemota } from '@/features/despesas/categorias';
import {
  normalizarCategoriasRemotas,
  restaurarCategoriasDaNuvem,
  sincronizarCategoriasPendentes,
} from '@/features/categorias/sync';
import {
  nomeNormalizadoCategoriaPadraoPorSlug,
  slugCategoriaPadrao,
} from '@/features/categorias/padroes';
import {
  listarPendentes,
  registrarPendente,
  removerPendente,
} from '@/db/restauracaoPendente';
import type { Categoria } from '@/features/categorias/types';
import type { Despesa } from '@/features/despesas/types';

type RecorrenciaSync = {
  id: string;
  tipo: 'receita' | 'despesa';
  intervalo: number;
  unidade: 'dia' | 'mes' | 'ano';
  inicio: string;
  termino: string | null;
  ativa: number;
  valor_centavos: number;
  titulo: string;
  descricao: string | null;
  categoria_id: string | null;
  fixa_ou_variavel: 'fixa' | 'variavel' | null;
  essencial: 0 | 1 | null;
  sync_status: 'pendente' | 'sincronizado';
  atualizado_em: string;
  excluido_em: string | null;
};

/** Existe quando o envio automático está pausado (FA01). */
const ENVIO_PAUSADO = 'unicash:envio_automatico_pausado';

let emAndamento = false;
let acessoNegado = false;

/** Falha ao restaurar os dados da nuvem; a base local não é alterada (transação revertida). */
export class FalhaRestauracao extends Error {}

/** Falha ao ler o catálogo local durante a sincronização; não deve virar catálogo vazio. */
export class FalhaLeituraCatalogoSincronizacao extends Error {}

function negadoPelaNuvem(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'permission-denied';
}

/**
 * Informa (uma única vez) se a nuvem negou acesso na última sincronização/restauração (UC01 EX07 / UC02 EX06).
 * Os dados locais não são afetados: continuam pendentes e salvos no aparelho.
 */
export function consumirAcessoNegado(): boolean {
  const v = acessoNegado;
  acessoNegado = false;
  return v;
}

/**
 * FA01: pausa (ligado = false) ou libera (ligado = true) o envio automático. Com o envio pausado,
 * os registros continuam pendentes no aparelho e só sobem quando a pessoa pedir (envio manual).
 * O estado fica no aparelho, então vale também depois de reiniciar o app.
 */
export async function definirEnvioAutomatico(ligado: boolean): Promise<void> {
  if (ligado) await AsyncStorage.removeItem(ENVIO_PAUSADO);
  else await AsyncStorage.setItem(ENVIO_PAUSADO, '1');
}

async function envioPausado(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENVIO_PAUSADO)) === '1';
}

export interface OpcoesSincronizacao {
  /** true quando a pessoa pediu o envio. Libera o envio automático se estava pausado (FA01). */
  manual?: boolean;
}

/**
 * Sincroniza receitas, despesas e recorrências pendentes com o Firestore.
 * Sem conta ou conexão, mantém os registros pendentes para nova tentativa.
 * Retorna true quando algum registro local é atualizado pela nuvem.
 */
export async function sincronizarPendentes(opcoes: OpcoesSincronizacao = {}): Promise<boolean> {
  const user = auth.currentUser;

  if (!user || !user.emailVerified || emAndamento) return false;

  emAndamento = true;
  let mudouLocal = false;

  try {
    // FA01: com o envio automático pausado, só segue se a pessoa pediu a sincronização.
    if (await envioPausado()) {
      if (!opcoes.manual) return false;
      await definirEnvioAutomatico(true); // a pessoa pediu: daqui em diante os registros sincronizam
    }

    const uid = user.uid;
    const sqlite = await getDbDoDono(uid);

    if (auth.currentUser?.uid !== uid || !auth.currentUser?.emailVerified) return false;

    // Categorias primeiro: séries/despesas dependem do catálogo reconciliado.
    const categoriasSync = await sincronizarCategoriasPendentes(sqlite, uid);
    if (categoriasSync.mudouLocal) mudouLocal = true;

    // Catálogo carregado no máximo uma vez por sincronização e compartilhado
    // entre uploads e conflitos. Falha de leitura não vira catálogo vazio.
    let categoriasLocais: Categoria[] | null = null;
    const obterCategoriasLocais = async (): Promise<Categoria[]> => {
      if (categoriasLocais === null) {
        try {
          categoriasLocais = await sqlite.getAllAsync<Categoria>(
            'SELECT * FROM categorias',
          );
        } catch (e) {
          throw new FalhaLeituraCatalogoSincronizacao(String(e));
        }
      }
      return categoriasLocais;
    };

    const resolverCategoriaUpload = async (
      categoriaId: string,
    ): Promise<{ valida: boolean; id: string | null }> => {
      const catalogo = await obterCategoriasLocais();
      const resolvida = resolverCategoriaRemota(categoriaId, catalogo);

      if (resolvida.tipo === 'valida') {
        const local = catalogo.find((c) => c.id === resolvida.id)!;
        // Padrão viaja com slug estável; própria preserva o UUID.
        return { valida: true, id: slugCategoriaPadrao(local) ?? local.id };
      }
      return { valida: false, id: null };
    };

    const seriesNaoConfirmadas = new Set<string>();

    const marcarOcorrenciasDaSerieExcluida = async (
      serie: RecorrenciaSync,
      ts: string,
    ) => {
      const tabela = serie.tipo === 'receita' ? 'receitas' : 'despesas';
      await sqlite.runAsync(
        `UPDATE ${tabela}
            SET excluido_em = ?, atualizado_em = ?, sync_status = 'pendente'
          WHERE recorrencia_id = ? AND excluido_em IS NULL`,
        [ts, ts, serie.id],
      );
    };

    // Sincroniza as recorrências, identificando seu tipo.
    const series = await sqlite.getAllAsync<RecorrenciaSync>(
      "SELECT * FROM recorrencias WHERE sync_status = 'pendente'",
    );

    for (const s of series) {
      if (auth.currentUser?.uid !== uid || !auth.currentUser?.emailVerified) throw new Error('conta alterada durante a sincronização');
      try {
        let categoriaSerie: string | null = null;

        if (s.tipo === 'despesa' && s.categoria_id != null) {
          const categoriaUpload = await resolverCategoriaUpload(
            s.categoria_id,
          );
          if (s.excluido_em == null && !categoriaUpload.valida) {
            // Categoria inválida: não executa setDoc nem marca como sincronizada.
            seriesNaoConfirmadas.add(s.id);
            continue;
          }
          if (categoriaUpload.valida) categoriaSerie = categoriaUpload.id;
        }

        const payload: Record<string, unknown> = {
          tipo: s.tipo,
          intervalo: s.intervalo,
          unidade: s.unidade,
          inicio: s.inicio,
          ativa: s.ativa === 1,
          valor_centavos: s.valor_centavos,
          titulo: s.titulo,
          atualizado_em: s.atualizado_em,
        };

        if (s.termino) payload.termino = s.termino;
        if (s.descricao) payload.descricao = s.descricao;

        // Campos opcionais nulos são omitidos (as Security Rules validam tipo quando presentes).
        if (s.tipo === 'despesa') {
          if (categoriaSerie != null) payload.categoria_id = categoriaSerie;
          if (s.fixa_ou_variavel != null) payload.fixa_ou_variavel = s.fixa_ou_variavel;
          if (s.essencial != null) payload.essencial = s.essencial;
        }

        const payloadTombstone: Record<string, unknown> = {
          tipo: s.tipo,
          intervalo: s.intervalo,
          unidade: s.unidade,
          inicio: s.inicio,
          ativa: false,
          valor_centavos: s.valor_centavos,
          titulo: s.titulo,
          atualizado_em: s.atualizado_em,
          excluido_em: s.excluido_em,
        };

        if (s.termino) payloadTombstone.termino = s.termino;
        if (s.descricao) payloadTombstone.descricao = s.descricao;
        if (s.tipo === 'despesa') {
          if (categoriaSerie != null) {
            payloadTombstone.categoria_id = categoriaSerie;
          }
          if (s.fixa_ou_variavel != null) {
            payloadTombstone.fixa_ou_variavel = s.fixa_ou_variavel;
          }
          if (s.essencial != null) payloadTombstone.essencial = s.essencial;
        }

        const ref = doc(firestore, 'usuarios', uid, 'recorrencias', s.id);

        const resultado = await runTransaction(firestore, async (tx) => {
          const remoto = await tx.get(ref);

          if (!remoto.exists()) {
            tx.set(
              ref,
              s.excluido_em != null ? payloadTombstone : payload,
            );
            return { tipo: 'enviado' as const };
          }

          const dados = remoto.data() as Record<string, any>;

          // Tombstone remoto é terminal: não pode ser sobrescrito por série ativa.
          if (typeof dados.excluido_em === 'string') {
            return { tipo: 'remoto_tombstone' as const, dados };
          }

          if (s.excluido_em != null) {
            tx.set(ref, payloadTombstone);
            return { tipo: 'enviado' as const };
          }

          tx.set(ref, payload);
          return { tipo: 'enviado' as const };
        });

        if (resultado.tipo === 'remoto_tombstone') {
          const ts =
            resultado.dados.atualizado_em ?? resultado.dados.excluido_em;
          await sqlite.runAsync(
            `UPDATE recorrencias
                SET excluido_em = ?, ativa = 0,
                    sync_status = 'sincronizado', atualizado_em = ?
              WHERE id = ?`,
            [resultado.dados.excluido_em, ts, s.id],
          );
          seriesNaoConfirmadas.add(s.id);
          await marcarOcorrenciasDaSerieExcluida(s, ts);
          continue;
        }

        if (s.excluido_em != null) {
          seriesNaoConfirmadas.add(s.id);
          await marcarOcorrenciasDaSerieExcluida(s, s.excluido_em);
        }

        await sqlite.runAsync(
          `UPDATE recorrencias
           SET sync_status = 'sincronizado'
           WHERE id = ? AND atualizado_em = ?`,
          [s.id, s.atualizado_em],
        );
      } catch (e) {
        // Um registro rejeitado não bloqueia os demais; ele segue pendente.
        if (!negadoPelaNuvem(e)) throw e;
        seriesNaoConfirmadas.add(s.id);
        acessoNegado = true;
      }
    }

    const seriesExcluidas = new Set(
      (
        await sqlite.getAllAsync<{ id: string }>(
          'SELECT id FROM recorrencias WHERE excluido_em IS NOT NULL',
        )
      ).map((s) => s.id),
    );

    // Sincroniza receitas.
    const receitas = await sqlite.getAllAsync<Receita>(
      "SELECT * FROM receitas WHERE sync_status = 'pendente'",
    );

    for (const r of receitas) {
      if (auth.currentUser?.uid !== uid || !auth.currentUser?.emailVerified) throw new Error('conta alterada durante a sincronização');
      try {
        const ref = doc(firestore, 'usuarios', uid, 'receitas', r.id);

        if (
          !r.excluido_em &&
          r.recorrencia_id &&
          seriesExcluidas.has(r.recorrencia_id)
        ) {
          continue;
        }

        if (r.excluido_em) {
          await deleteDoc(ref);

          if (r.recorrencia_id) {
            await sqlite.runAsync(
              "UPDATE receitas SET sync_status = 'sincronizado' WHERE id = ?",
              [r.id],
            );
          } else {
            await sqlite.runAsync(
              'DELETE FROM receitas WHERE id = ? AND excluido_em IS NOT NULL',
              [r.id],
            );
          }

          continue;
        }

        const remoto = await getDoc(ref);

        if (remoto.exists()) {
          const d = remoto.data();

          if (
            typeof d.atualizado_em === 'string' &&
            d.atualizado_em > r.atualizado_em
          ) {
            await sqlite.runAsync(
              `UPDATE receitas
               SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
                   sync_status = 'sincronizado', atualizado_em = ?
               WHERE id = ?`,
              [
                d.valor_centavos,
                d.data,
                d.titulo,
                d.descricao ?? null,
                d.atualizado_em,
                r.id,
              ],
            );

            mudouLocal = true;
            continue;
          }
        }

        const payload: Record<string, unknown> = {
          valor_centavos: r.valor_centavos,
          data: r.data,
          titulo: r.titulo,
          criado_em: r.criado_em,
          atualizado_em: r.atualizado_em,
        };

        if (r.descricao) payload.descricao = r.descricao;
        if (r.recorrencia_id) payload.recorrencia_id = r.recorrencia_id;

        await setDoc(ref, payload);

        await sqlite.runAsync(
          `UPDATE receitas
           SET sync_status = 'sincronizado'
           WHERE id = ? AND atualizado_em = ?`,
          [r.id, r.atualizado_em],
        );
      } catch (e) {
        if (!negadoPelaNuvem(e)) throw e;
        acessoNegado = true;
      }
    }

    // Sincroniza despesas.
    const despesas = await sqlite.getAllAsync<Despesa>(
      "SELECT * FROM despesas WHERE sync_status = 'pendente'",
    );

    const catalogo = despesas.length > 0
      ? await obterCategoriasLocais()
      : [];
    const categoriasExcluidas = new Set(
      catalogo
        .filter((c) => c.excluido_em !== null)
        .map((c) => c.id),
    );

    const categoriaDoConflito = (
      valorRemoto: unknown,
      categoriaLocal: string | null,
    ): string | null => {
      const resolvida = resolverCategoriaRemota(
        valorRemoto,
        catalogo,
      );

      if (resolvida.tipo === 'valida') return resolvida.id;
      if (resolvida.tipo === 'sem_categoria') return null;

      // Referência remota inválida: preserva a categoria local.
      return categoriaLocal;
    };

    const aplicarConflitoRemoto = async (
      d: Despesa,
      dados: Record<string, any>,
      categoriaConflito: string | null,
    ) => {
      await sqlite.runAsync(
        `UPDATE despesas
         SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
             categoria_id = ?, fixa_ou_variavel = ?, essencial = ?,
             recorrencia_id = ?, sync_status = 'sincronizado',
             atualizado_em = ?
         WHERE id = ? AND atualizado_em = ? AND excluido_em IS NULL`,
        [
          dados.valor_centavos,
          dados.data,
          dados.titulo,
          dados.descricao ?? null,
          categoriaConflito,
          dados.fixa_ou_variavel ?? null,
          dados.essencial ?? null,
          dados.recorrencia_id ?? null,
          dados.atualizado_em,
          d.id,
          d.atualizado_em,
        ],
      );

      mudouLocal = true;
    };

    const aplicarLapideRemota = async (
      d: Despesa,
      dados: Record<string, any>,
    ) => {
      const resultado = await sqlite.runAsync(
        `UPDATE despesas
         SET excluido_em = ?, atualizado_em = ?,
             sync_status = 'sincronizado'
         WHERE id = ?`,
        [
          dados.excluido_em,
          dados.atualizado_em ?? dados.excluido_em,
          d.id,
        ],
      );

      mudouLocal ||= resultado.changes > 0;
    };

    for (const d of despesas) {
      if (auth.currentUser?.uid !== uid || !auth.currentUser?.emailVerified) throw new Error('conta alterada durante a sincronização');
      try {
        const ref = doc(firestore, 'usuarios', uid, 'despesas', d.id);

        // A série pode já existir remotamente mesmo sem upload confirmado nesta
        // execução. O bloqueio é conservador para não criar ocorrência órfã.
        // Lápides não dependem da série e seguem o fluxo próprio.
        if (
          !d.excluido_em &&
          d.recorrencia_id &&
          (seriesNaoConfirmadas.has(d.recorrencia_id) ||
            seriesExcluidas.has(d.recorrencia_id))
        ) {
          continue;
        }

        let categoriaUpload: string | null = null;

        if (!d.excluido_em && d.categoria_id != null) {
          const categoriaResolvida = await resolverCategoriaUpload(
            d.categoria_id,
          );
          if (!categoriaResolvida.valida) continue;
          categoriaUpload = categoriaResolvida.id;
        }

        const payload: Record<string, unknown> = {
          valor_centavos: d.valor_centavos,
          data: d.data,
          titulo: d.titulo,
          criado_em: d.criado_em,
          atualizado_em: d.atualizado_em,
        };

        // Campos opcionais nulos são omitidos (FA01: despesa sem categoria).
        if (categoriaUpload != null) payload.categoria_id = categoriaUpload;
        if (d.fixa_ou_variavel != null) payload.fixa_ou_variavel = d.fixa_ou_variavel;
        if (d.essencial != null) payload.essencial = d.essencial;
        if (d.descricao) payload.descricao = d.descricao;
        if (d.recorrencia_id) payload.recorrencia_id = d.recorrencia_id;

        const payloadTombstone = {
          excluido_em: d.excluido_em,
          atualizado_em: d.atualizado_em,
        };

        const resultado = await runTransaction(firestore, async (tx) => {
          const remoto = await tx.get(ref);

          if (!remoto.exists()) {
            tx.set(ref, d.excluido_em ? payloadTombstone : payload);
            return { tipo: 'enviado' as const };
          }

          const dados = remoto.data() as Record<string, any>;

          // Tombstone remoto é terminal: nunca pode ser sobrescrito.
          if (typeof dados.excluido_em === 'string') {
            return { tipo: 'remoto_tombstone' as const, dados };
          }

          if (d.excluido_em) {
            tx.set(ref, payloadTombstone);
            return { tipo: 'enviado' as const };
          }

          if (
            typeof dados.atualizado_em === 'string' &&
            dados.atualizado_em > d.atualizado_em
          ) {
            // Desvinculação de categoria excluída localmente, somente na cópia remota.
            if (
              d.categoria_id == null &&
              typeof dados.categoria_id === 'string' &&
              categoriasExcluidas.has(dados.categoria_id)
            ) {
              tx.update(ref, { categoria_id: deleteField() });
              const semCategoria = { ...dados };
              delete semCategoria.categoria_id;
              return {
                tipo: 'remoto_ativo' as const,
                dados: semCategoria,
                categoria: null,
              };
            }

            return {
              tipo: 'remoto_ativo' as const,
              dados,
              categoria: categoriaDoConflito(
                dados.categoria_id,
                d.categoria_id,
              ),
            };
          }

          tx.set(ref, payload);
          return { tipo: 'enviado' as const };
        });

        if (resultado.tipo === 'remoto_tombstone') {
          await aplicarLapideRemota(d, resultado.dados);
          continue;
        }

        if (resultado.tipo === 'remoto_ativo') {
          await aplicarConflitoRemoto(
            d,
            resultado.dados,
            resultado.categoria,
          );
          continue;
        }

        await sqlite.runAsync(
          `UPDATE despesas
           SET sync_status = 'sincronizado'
           WHERE id = ? AND atualizado_em = ? AND excluido_em IS ?`,
          [d.id, d.atualizado_em, d.excluido_em],
        );
      } catch (e) {
        if (!negadoPelaNuvem(e)) throw e;
        acessoNegado = true;
      }
    }
  } catch (e) {
    // Falha de catálogo é explícita; os demais erros mantêm o comportamento atual.
    if (e instanceof FalhaLeituraCatalogoSincronizacao) throw e;
    // UC01 EX04 / UC02 EX03: falhas de rede interrompem a fila e mantêm as pendências.
    if (negadoPelaNuvem(e)) acessoNegado = true;
  } finally {
    emAndamento = false;
  }

  return mudouLocal;
}


export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes().catch((erro) => {
    if (erro instanceof FalhaLeituraCatalogoSincronizacao) {
      // Mantém as pendências para a próxima tentativa; não altera dados locais.
      console.warn(
        'Sincronização em segundo plano: falha ao ler o catálogo local. As pendências foram preservadas para a próxima tentativa.',
        erro,
      );
      return;
    }

    // Erro inesperado: registra com o objeto original para preservar o stack.
    console.error(
      'Sincronização em segundo plano: falha inesperada. As pendências foram preservadas para a próxima tentativa.',
      erro,
    );
  });
}

/** Falha identificável quando a restauração encontraria referências sem catálogo. */
export const MENSAGEM_RESTAURACAO_SEM_CATALOGO =
  'RESTAURACAO_SEM_CATALOGO: existem despesas ou recorrências com categoria e não há categorias ativas no catálogo local.';

export interface ResultadoRestauracao {
  receitas: number;
  despesas: number;
  recorrencias: number;
}

/**
 * Restaura da nuvem (usuarios/{uid}/...) para a base local, ao entrar numa conta.
 * Idempotente e transacional. Preserva linhas locais, salvo quando um marcador remoto
 * registra a exclusão da despesa (RN07).
 */
async function aguardarAuthResolvida(): Promise<void> {
  const autenticacao = auth as unknown as { authStateReady?: () => Promise<void> };
  if (typeof autenticacao.authStateReady === 'function') {
    try {
      await autenticacao.authStateReady();
    } catch {
      // Sem sessão restaurável: currentUser decide o fluxo.
    }
  }
}

/**
 * Restaura da nuvem (usuarios/{uid}/...) para a base local, ao entrar numa conta.
 *
 * Ordem: categorias -> séries -> receitas -> despesas. Documentos cuja categoria
 * ainda não pôde ser resolvida vão para `restauracao_pendente` com o payload
 * original; nunca são gravados como "Sem categoria" por falta de vínculo.
 * Categorias próprias diferentes com o mesmo nome não são fundidas.
 */
export async function restaurarDaNuvem(): Promise<ResultadoRestauracao> {
  await aguardarAuthResolvida();
  const user = auth.currentUser;
  if (!user?.emailVerified) throw new FalhaRestauracao('sem conta confirmada');
  const uid = user.uid;

  try {
    const [snapSeries, snapReceitas, snapDespesas, snapCategorias] = await Promise.all([
      getDocs(collection(firestore, 'usuarios', uid, 'recorrencias')),
      getDocs(collection(firestore, 'usuarios', uid, 'receitas')),
      getDocs(collection(firestore, 'usuarios', uid, 'despesas')),
      getDocs(collection(firestore, 'usuarios', uid, 'categorias')),
    ]);
    const sqlite = await getDbDoDono(uid);
    const resultado: ResultadoRestauracao = { receitas: 0, despesas: 0, recorrencias: 0 };

    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      if (auth.currentUser?.uid !== uid || !auth.currentUser?.emailVerified) {
        throw new FalhaRestauracao('conta alterada durante a restauração');
      }

      const mapaCategorias = await restaurarCategoriasDaNuvem(tx, snapCategorias.docs);
      const categoriasLocais = await tx.getAllAsync<Categoria>(
        `SELECT c.*, COALESCE(e.estado_local, 'editado') AS estado_local
           FROM categorias c
           LEFT JOIN categorias_estado e ON e.categoria_id = c.id`,
      );
      const conhecidas = new Set(
        (await tx.getAllAsync<{ id: string }>('SELECT id FROM recorrencias')).map((r) => r.id),
      );

      type CategoriaResolvida =
        | { status: 'ok'; id: string | null }
        | { status: 'pendente' };

      const resolverCategoria = (valor: unknown): CategoriaResolvida => {
        if (valor == null) return { status: 'ok', id: null };
        if (typeof valor !== 'string') return { status: 'pendente' };
        if (mapaCategorias.has(valor)) {
          return { status: 'ok', id: mapaCategorias.get(valor) ?? null };
        }
        const local = categoriasLocais.find((c) => c.id === valor);
        if (local) return { status: 'ok', id: local.excluido_em ? null : local.id };
        const nomePadrao = nomeNormalizadoCategoriaPadraoPorSlug(valor);
        if (nomePadrao) {
          const localPadrao = categoriasLocais.find(
            (c) => c.padrao === 1 && c.nome_normalizado === nomePadrao,
          );
          if (localPadrao) {
            return { status: 'ok', id: localPadrao.excluido_em ? null : localPadrao.id };
          }
        }
        const resolvida = resolverCategoriaRemota(valor, categoriasLocais);
        if (resolvida.tipo === 'valida') return { status: 'ok', id: resolvida.id };
        return { status: 'pendente' };
      };

      const categoriaIdTexto = (valor: unknown): string | null =>
        typeof valor === 'string' ? valor : null;

      const timestampRemoto = (x: any, fallback = new Date().toISOString()) =>
        typeof x.atualizado_em === 'string' ? x.atualizado_em : fallback;

      const registrarDespesaPendente = async (
        id: string,
        x: any,
      ) => {
        await registrarPendente(tx, {
          tipo: 'despesa',
          id,
          categoriaId: categoriaIdTexto(x.categoria_id),
          motivo: 'categoria_nao_resolvida',
          payload: x,
          atualizadoEm: timestampRemoto(x),
        });
      };

      const registrarSeriePendente = async (
        id: string,
        x: any,
      ) => {
        await registrarPendente(tx, {
          tipo: 'recorrencia',
          id,
          categoriaId: categoriaIdTexto(x.categoria_id),
          motivo: 'categoria_nao_resolvida',
          payload: x,
          atualizadoEm: timestampRemoto(x),
        });
      };

      const marcarOcorrenciasLocaisDaSerie = async (
        tipo: 'receita' | 'despesa',
        serieId: string,
        excluidoEm: string,
        ts: string,
      ) => {
        const tabela = tipo === 'despesa' ? 'despesas' : 'receitas';
        await tx.runAsync(
          `UPDATE ${tabela}
              SET excluido_em = ?, atualizado_em = ?, sync_status = 'pendente'
            WHERE recorrencia_id = ? AND excluido_em IS NULL`,
          [excluidoEm, ts, serieId],
        );
      };

      const aplicarSerie = async (
        id: string,
        x: any,
        categoria: string | null,
      ): Promise<void> => {
        const tombstones = typeof x.excluido_em === 'string';

        if (conhecidas.has(id)) {
          if (tombstones) {
            const ts = timestampRemoto(x, x.excluido_em as string);
            await tx.runAsync(
              `UPDATE recorrencias
                  SET excluido_em = ?, ativa = 0,
                      sync_status = 'sincronizado', atualizado_em = ?
                WHERE id = ?`,
              [x.excluido_em, ts, id],
            );
            await marcarOcorrenciasLocaisDaSerie(
              x.tipo === 'despesa' ? 'despesa' : 'receita',
              id,
              x.excluido_em as string,
              ts,
            );
          }
          return;
        }

        if (typeof x.intervalo !== 'number' || typeof x.unidade !== 'string' || typeof x.inicio !== 'string') return;
        if (typeof x.valor_centavos !== 'number' || typeof x.titulo !== 'string') return;

        const tipo = x.tipo === 'despesa' ? 'despesa' : 'receita';
        const classificacao = tipo === 'despesa';
        await tx.runAsync(
          `INSERT OR IGNORE INTO recorrencias
            (id, tipo, intervalo, unidade, inicio, termino, ativa, valor_centavos, titulo, descricao,
             categoria_id, fixa_ou_variavel, essencial, sync_status, atualizado_em, excluido_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?, ?)`,
          [
            id, tipo, x.intervalo, x.unidade, x.inicio, x.termino ?? null,
            tombstones ? 0 : x.ativa === false ? 0 : 1,
            x.valor_centavos, x.titulo, x.descricao ?? null,
            tombstones || !classificacao ? null : categoria,
            classificacao && (x.fixa_ou_variavel === 'fixa' || x.fixa_ou_variavel === 'variavel') ? x.fixa_ou_variavel : null,
            classificacao && typeof x.essencial === 'number' && (x.essencial === 0 || x.essencial === 1) ? x.essencial
              : classificacao && typeof x.essencial === 'boolean' ? (x.essencial ? 1 : 0) : null,
            timestampRemoto(x),
            tombstones ? x.excluido_em : null,
          ],
        );
        conhecidas.add(id);
        resultado.recorrencias++;
      };

      const aplicarDespesa = async (
        id: string,
        x: any,
        categoria: string | null,
      ): Promise<void> => {
        if (typeof x.excluido_em === 'string') {
          const ts = timestampRemoto(x, x.excluido_em);
          await tx.runAsync(
            `INSERT INTO despesas
              (id, valor_centavos, data, titulo, sync_status, excluido_em, criado_em, atualizado_em)
             VALUES (?, 1, '', '', 'sincronizado', ?, '', ?)
             ON CONFLICT(id) DO UPDATE SET
               excluido_em = excluded.excluido_em,
               atualizado_em = excluded.atualizado_em,
               sync_status = 'sincronizado'`,
            [id, x.excluido_em, ts],
          );
          await removerPendente(tx, 'despesa', id);
          return;
        }

        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) return;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') return;
        const ts = timestampRemoto(x);
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id)
          ? x.recorrencia_id
          : null;
        const fixa = x.fixa_ou_variavel === 'fixa' || x.fixa_ou_variavel === 'variavel' ? x.fixa_ou_variavel : null;
        const essencial = typeof x.essencial === 'boolean' ? (x.essencial ? 1 : 0) : x.essencial === 0 || x.essencial === 1 ? x.essencial : null;
        const r = await tx.runAsync(
          `INSERT OR IGNORE INTO despesas
            (id, valor_centavos, data, titulo, descricao, categoria_id, fixa_ou_variavel, essencial,
             recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
          [id, x.valor_centavos, x.data, x.titulo, x.descricao ?? null, categoria, fixa, essencial, serie, x.criado_em ?? ts, ts],
        );
        if (r.changes > 0) resultado.despesas++;
        await removerPendente(tx, 'despesa', id);
      };

      const idsNoSnapshot = new Set([
        ...snapSeries.docs.map((d) => `recorrencia:${d.id}`),
        ...snapDespesas.docs.map((d) => `despesa:${d.id}`),
      ]);

      // Retoma registros que ficaram aguardando categoria, quando o vínculo já
      // existe. Registros presentes no snapshot são tratados pelo fluxo normal.
      const pendentes = await listarPendentes(tx, ['recorrencia', 'despesa']);
      for (const pendente of pendentes) {
        if (idsNoSnapshot.has(`${pendente.tipo}:${pendente.id}`)) continue;
        let dados: any;
        try {
          dados = JSON.parse(pendente.payload) as any;
        } catch {
          continue;
        }

        if (pendente.tipo === 'recorrencia') {
          const cat = resolverCategoria(dados.categoria_id);
          if (cat.status === 'pendente') continue;
          await aplicarSerie(pendente.id, dados, cat.id);
          if (conhecidas.has(pendente.id)) {
            await removerPendente(tx, 'recorrencia', pendente.id);
          }
        } else {
          const cat = resolverCategoria(dados.categoria_id);
          if (cat.status === 'pendente') continue;
          await aplicarDespesa(pendente.id, dados, cat.id);
        }
      }

      for (const d of snapSeries.docs) {
        const x = d.data() as any;
        const tombstones = typeof x.excluido_em === 'string';

        if (conhecidas.has(d.id)) {
          if (tombstones) await aplicarSerie(d.id, x, null);
          continue;
        }

        if (typeof x.intervalo !== 'number' || typeof x.unidade !== 'string' || typeof x.inicio !== 'string') continue;
        if (typeof x.valor_centavos !== 'number' || typeof x.titulo !== 'string') continue;

        const classificacao = x.tipo === 'despesa';
        if (!tombstones && classificacao && x.categoria_id != null) {
          const cat = resolverCategoria(x.categoria_id);
          if (cat.status === 'pendente') {
            await registrarSeriePendente(d.id, x);
            continue;
          }
          await aplicarSerie(d.id, x, cat.id);
        } else {
          await aplicarSerie(d.id, x, null);
        }
      }

      for (const d of snapReceitas.docs) {
        const x = d.data() as any;
        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = timestampRemoto(x);
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const r = await tx.runAsync(
          `INSERT OR IGNORE INTO receitas
            (id, valor_centavos, data, titulo, descricao, recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
          [d.id, x.valor_centavos, x.data, x.titulo, x.descricao ?? null, serie, x.criado_em ?? ts, ts],
        );
        if (r.changes > 0) resultado.receitas++;
      }

      for (const d of snapDespesas.docs) {
        const x = d.data() as any;

        if (typeof x.excluido_em === 'string') {
          await aplicarDespesa(d.id, x, null);
          continue;
        }

        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;

        const cat = resolverCategoria(x.categoria_id);
        if (cat.status === 'pendente') {
          await registrarDespesaPendente(d.id, x);
          continue;
        }
        await aplicarDespesa(d.id, x, cat.id);
      }
    });

    // A restauração local pode ter deixado documentos remotos fora do fluxo
    // (conflito de nome, tombstone ou categoria sem uso). A varredura seguinte
    // alcança toda a coleção e é idempotente; não altera dados financeiros.
    const normalizacao = await normalizarCategoriasRemotas(uid, snapCategorias.docs);
    if (normalizacao.acessoNegado) acessoNegado = true;

    return resultado;
  } catch (e) {
    if (e instanceof FalhaRestauracao) throw e;
    if (negadoPelaNuvem(e)) acessoNegado = true;
    throw new FalhaRestauracao(String(e));
  }
}
