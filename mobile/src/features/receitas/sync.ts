import type { SQLiteBindParams } from 'expo-sqlite';
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
import { getDb } from '@/db/database';
import { registrarTransicoes, type AlertaSaldo } from '@/features/saldo/alertas';
import type { Receita } from './types';
import { resolverCategoriaRemota } from '@/features/despesas/categorias';
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
 * Sincroniza receitas, despesas e recorrências pendentes com o Firestore.
 * Sem conta ou conexão, mantém os registros pendentes para nova tentativa.
 * Retorna true quando algum registro local é atualizado pela nuvem.
 */
export async function sincronizarPendentes(): Promise<boolean> {
  const user = auth.currentUser;

  if (!user || emAndamento) return false;

  emAndamento = true;
  let mudouLocal = false;

  try {
    const sqlite = await getDb();
    const uid = user.uid;

    async function aplicarLancamentoRemoto(sql: string, valores: SQLiteBindParams) {
      await sqlite.withExclusiveTransactionAsync(async (tx) => {
        const resultado = await registrarTransicoes(tx, () => tx.runAsync(sql, valores));
        mudouLocal ||= resultado.changes > 0;
      });
    }

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
      categoriaId: string | null,
    ): Promise<{ valida: boolean; id: string | null }> => {
      if (categoriaId == null) return { valida: true, id: null };

      const resolvida = resolverCategoriaRemota(
        categoriaId,
        await obterCategoriasLocais(),
      );

      if (resolvida.tipo === 'valida') {
        return { valida: true, id: resolvida.id };
      }
      if (resolvida.tipo === 'sem_categoria') {
        return { valida: true, id: null };
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
      try {
        let categoriaSerie: string | null = null;

        if (
          s.excluido_em == null &&
          s.tipo === 'despesa' &&
          s.categoria_id != null
        ) {
          const categoriaUpload = await resolverCategoriaUpload(
            s.categoria_id,
          );
          if (!categoriaUpload.valida) {
            // Categoria inválida: não executa setDoc nem marca como sincronizada.
            seriesNaoConfirmadas.add(s.id);
            continue;
          }
          categoriaSerie = categoriaUpload.id;
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
          if (s.categoria_id != null) {
            payloadTombstone.categoria_id = s.categoria_id;
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
            await aplicarLancamentoRemoto(
              `UPDATE receitas
               SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
                   sync_status = 'sincronizado', atualizado_em = ?
               WHERE id = ? AND atualizado_em = ? AND excluido_em IS NULL`,
              [
                d.valor_centavos,
                d.data,
                d.titulo,
                d.descricao ?? null,
                d.atualizado_em,
                r.id,
                r.atualizado_em,
              ],
            );

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
      await aplicarLancamentoRemoto(
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

    };

    const aplicarLapideRemota = async (
      d: Despesa,
      dados: Record<string, any>,
    ) => {
      await aplicarLancamentoRemoto(
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

    };

    for (const d of despesas) {
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

    const alertas = await sqlite.getAllAsync<AlertaSaldo>(
      "SELECT * FROM alertas_emitidos WHERE sync_status = 'pendente'",
    );
    for (const { id, mes, anterior_centavos, saldo_centavos, criado_em } of alertas) {
      await setDoc(doc(firestore, 'usuarios', uid, 'alertas_emitidos', id), {
        mes, anterior_centavos, saldo_centavos, criado_em,
      });
      await sqlite.runAsync("UPDATE alertas_emitidos SET sync_status = 'sincronizado' WHERE id = ?", [id]);
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
export async function restaurarDaNuvem(): Promise<ResultadoRestauracao> {
  const user = auth.currentUser;
  if (!user) throw new FalhaRestauracao('sem conta');
  try {
    const [snapSeries, snapReceitas, snapDespesas] = await Promise.all([
      getDocs(collection(firestore, 'usuarios', user.uid, 'recorrencias')),
      getDocs(collection(firestore, 'usuarios', user.uid, 'receitas')),
      getDocs(collection(firestore, 'usuarios', user.uid, 'despesas')),
    ]);
    const sqlite = await getDb();
    const resultado: ResultadoRestauracao = { receitas: 0, despesas: 0, recorrencias: 0 };

    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      const conhecidas = new Set(
        (await tx.getAllAsync<{ id: string }>('SELECT id FROM recorrencias')).map((r) => r.id),
      );

      // Catálogo local lido uma única vez por restauração. Inclui tombstones;
      // o resolvedor os trata como referência inválida.
      const categoriasLocais = await tx.getAllAsync<Categoria>(
        'SELECT * FROM categorias',
      );

      // Proteção apenas contra ausência de categorias ativas. IDs de outros
      // dispositivos que não existam localmente continuam virando NULL: a
      // sincronização de categorias cross-device ainda não existe.
      const temCategoriaAtiva = categoriasLocais.some(
        (c) => c.excluido_em === null,
      );

      if (!temCategoriaAtiva) {
        // Espelha exatamente as condições de elegibilidade dos laços abaixo:
        // - séries já conhecidas ou com campos inválidos são ignoradas;
        // - séries só contam quando o tipo é 'despesa', inclusive inativas;
        // - lápides de despesas usam o caminho especial e não consomem categoria;
        // - despesas com valor <= 0, data/título inválidos são ignoradas.
        const serieComCategoria = snapSeries.docs.some((d) => {
          if (conhecidas.has(d.id)) return false;
          const x = d.data();
          if (typeof x.excluido_em === 'string') return false;
          if (
            typeof x.intervalo !== 'number' ||
            typeof x.unidade !== 'string' ||
            typeof x.inicio !== 'string'
          ) {
            return false;
          }
          if (
            typeof x.valor_centavos !== 'number' ||
            typeof x.titulo !== 'string'
          ) {
            return false;
          }
          return x.tipo === 'despesa' && x.categoria_id != null;
        });

        const despesaComCategoria = snapDespesas.docs.some((d) => {
          const x = d.data();
          if (typeof x.excluido_em === 'string') return false;
          if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) {
            return false;
          }
          if (typeof x.data !== 'string' || typeof x.titulo !== 'string') {
            return false;
          }
          return x.categoria_id != null;
        });

        if (serieComCategoria || despesaComCategoria) {
          throw new FalhaRestauracao(MENSAGEM_RESTAURACAO_SEM_CATALOGO);
        }
      }

      const idCategoriaRemota = (valor: unknown): string | null => {
        const resultado = resolverCategoriaRemota(valor, categoriasLocais);
        return resultado.tipo === 'valida' ? resultado.id : null;
      };

      // Exclusão remota da série também exclui logicamente as ocorrências locais:
      // preserva valores/histórico e deixa as lápides pendentes para o próximo envio.
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

      for (const d of snapSeries.docs) {
        const x = d.data();
        const tombstones = typeof x.excluido_em === 'string';

        if (conhecidas.has(d.id)) {
          if (tombstones) {
            const ts =
              typeof x.atualizado_em === 'string'
                ? x.atualizado_em
                : x.excluido_em;
            await tx.runAsync(
              `UPDATE recorrencias
                  SET excluido_em = ?, ativa = 0,
                      sync_status = 'sincronizado', atualizado_em = ?
                WHERE id = ?`,
              [x.excluido_em, ts, d.id],
            );
            await marcarOcorrenciasLocaisDaSerie(
              x.tipo === 'despesa' ? 'despesa' : 'receita',
              d.id,
              x.excluido_em,
              ts,
            );
          }
          continue;
        }

        if (typeof x.intervalo !== 'number' || typeof x.unidade !== 'string' || typeof x.inicio !== 'string') continue;
        if (typeof x.valor_centavos !== 'number' || typeof x.titulo !== 'string') continue;
        // Preserva o tipo: sem ele, uma série de despesa viraria série de receita (DEFAULT 'receita').
        const tipo = x.tipo === 'despesa' ? 'despesa' : 'receita';
        const classificacao = tipo === 'despesa';
        await tx.runAsync(
          `INSERT OR IGNORE INTO recorrencias
            (id, tipo, intervalo, unidade, inicio, termino, ativa, valor_centavos, titulo, descricao,
             categoria_id, fixa_ou_variavel, essencial, sync_status, atualizado_em, excluido_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?, ?)`,
          [
            d.id, tipo, x.intervalo, x.unidade, x.inicio, x.termino ?? null,
            tombstones ? 0 : x.ativa === false ? 0 : 1,
            x.valor_centavos, x.titulo, x.descricao ?? null,
            classificacao ? idCategoriaRemota(x.categoria_id) : null,
            classificacao && (x.fixa_ou_variavel === 'fixa' || x.fixa_ou_variavel === 'variavel') ? x.fixa_ou_variavel : null,
            classificacao && typeof x.essencial === 'number' && (x.essencial === 0 || x.essencial === 1) ? x.essencial
              : classificacao && typeof x.essencial === 'boolean' ? (x.essencial ? 1 : 0) : null,
            x.atualizado_em ?? new Date().toISOString(),
            tombstones ? x.excluido_em : null,
          ],
        );
        conhecidas.add(d.id);
        resultado.recorrencias++;
      }

      for (const d of snapReceitas.docs) {
        const x = d.data();
        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : new Date().toISOString();
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const r = await tx.runAsync(
          `INSERT OR IGNORE INTO receitas
            (id, valor_centavos, data, titulo, descricao, recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
          [d.id, x.valor_centavos, x.data, x.titulo, x.descricao ?? null, serie, x.criado_em ?? ts, ts],
        );
        if (r.changes > 0) resultado.receitas++;
      }

      // Despesas: INSERT OR IGNORE preserva lápides e edições locais (despesa excluída não reaparece).
      // Categoria indisponível no catálogo local → NULL (EX08).
      for (const d of snapDespesas.docs) {
        const x = d.data();
        if (typeof x.excluido_em === 'string') {
          const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : x.excluido_em;
          await tx.runAsync(
            `INSERT INTO despesas
              (id, valor_centavos, data, titulo, sync_status, excluido_em, criado_em, atualizado_em)
             VALUES (?, 1, '', '', 'sincronizado', ?, '', ?)
             ON CONFLICT(id) DO UPDATE SET
               excluido_em = excluded.excluido_em,
               atualizado_em = excluded.atualizado_em,
               sync_status = 'sincronizado'`,
            [d.id, x.excluido_em, ts],
          );
          continue;
        }

        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : new Date().toISOString();
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const categoria = idCategoriaRemota(x.categoria_id);
        const fixa = x.fixa_ou_variavel === 'fixa' || x.fixa_ou_variavel === 'variavel' ? x.fixa_ou_variavel : null;
        const essencial = typeof x.essencial === 'boolean' ? (x.essencial ? 1 : 0) : x.essencial === 0 || x.essencial === 1 ? x.essencial : null;
        const r = await tx.runAsync(
          `INSERT OR IGNORE INTO despesas
            (id, valor_centavos, data, titulo, descricao, categoria_id, fixa_ou_variavel, essencial,
             recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', NULL, ?, ?)`,
          [d.id, x.valor_centavos, x.data, x.titulo, x.descricao ?? null, categoria, fixa, essencial, serie, x.criado_em ?? ts, ts],
        );
        if (r.changes > 0) resultado.despesas++;
      }
    });
    return resultado;
  } catch (e) {
    if (negadoPelaNuvem(e)) acessoNegado = true;
    throw new FalhaRestauracao(String(e));
  }
}
