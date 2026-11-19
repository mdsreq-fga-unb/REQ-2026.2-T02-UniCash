import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDb } from '@/db/database';
import type { Receita } from './types';
import { categoriaConhecida } from '@/features/despesas/categorias';
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
};

// Mantém a chave da ocorrência para bloquear sua regeneração. As colunas
// obrigatórias do SQLite recebem valores neutros após confirmar a exclusão.
const LIMPAR_DESPESA_EXCLUIDA = `
  valor_centavos = 1, data = '', titulo = '', descricao = NULL,
  categoria_id = NULL, fixa_ou_variavel = NULL, essencial = NULL,
  recorrencia_id = NULL, criado_em = '', sync_status = 'sincronizado'
`;

let emAndamento = false;
let acessoNegado = false;

/** Falha ao restaurar os dados da nuvem; a base local não é alterada (transação revertida). */
export class FalhaRestauracao extends Error {}

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

    // Sincroniza as recorrências, identificando seu tipo.
    const series = await sqlite.getAllAsync<RecorrenciaSync>(
      "SELECT * FROM recorrencias WHERE sync_status = 'pendente'",
    );

    for (const s of series) {
      try {
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
          if (s.categoria_id != null) payload.categoria_id = s.categoria_id;
          if (s.fixa_ou_variavel != null) payload.fixa_ou_variavel = s.fixa_ou_variavel;
          if (s.essencial != null) payload.essencial = s.essencial;
        }

        await setDoc(
          doc(firestore, 'usuarios', uid, 'recorrencias', s.id),
          payload,
        );

        await sqlite.runAsync(
          `UPDATE recorrencias
           SET sync_status = 'sincronizado'
           WHERE id = ? AND atualizado_em = ?`,
          [s.id, s.atualizado_em],
        );
      } catch (e) {
        // Um registro rejeitado não bloqueia os demais; ele segue pendente.
        if (!negadoPelaNuvem(e)) throw e;
        acessoNegado = true;
      }
    }

    // Sincroniza receitas.
    const receitas = await sqlite.getAllAsync<Receita>(
      "SELECT * FROM receitas WHERE sync_status = 'pendente'",
    );

    for (const r of receitas) {
      try {
        const ref = doc(firestore, 'usuarios', uid, 'receitas', r.id);

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

    for (const d of despesas) {
      try {
        const ref = doc(firestore, 'usuarios', uid, 'despesas', d.id);

        const remoto = await getDoc(ref);
        const exclusaoRemota = remoto.data()?.excluido_em;

        // UC02 EX04: a exclusão prevalece mesmo quando a edição local é mais recente.
        if (typeof exclusaoRemota === 'string') {
          const resultado = await sqlite.runAsync(
            `UPDATE despesas
             SET excluido_em = ?, atualizado_em = ?, ${LIMPAR_DESPESA_EXCLUIDA}
             WHERE id = ?`,
            [exclusaoRemota, remoto.data()?.atualizado_em ?? exclusaoRemota, d.id],
          );
          mudouLocal ||= resultado.changes > 0;
          continue;
        }

        if (remoto.exists()) {
          const dados = remoto.data();

          if (
            !d.excluido_em &&
            typeof dados.atualizado_em === 'string' &&
            dados.atualizado_em > d.atualizado_em
          ) {
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
                categoriaRemota(dados.categoria_id),
                dados.fixa_ou_variavel ?? null,
                dados.essencial ?? null,
                dados.recorrencia_id ?? null,
                dados.atualizado_em,
                d.id,
                d.atualizado_em,
              ],
            );

            mudouLocal = true;
            continue;
          }
        }

        if (d.excluido_em) {
          await setDoc(ref, { excluido_em: d.excluido_em, atualizado_em: d.atualizado_em });
          await sqlite.runAsync(
            `UPDATE despesas SET ${LIMPAR_DESPESA_EXCLUIDA}
             WHERE id = ? AND atualizado_em = ? AND excluido_em = ?`,
            [d.id, d.atualizado_em, d.excluido_em],
          );
          continue;
        }

        const payload: Record<string, unknown> = {
          valor_centavos: d.valor_centavos,
          data: d.data,
          titulo: d.titulo,
          criado_em: d.criado_em,
          atualizado_em: d.atualizado_em,
        };

        // Campos opcionais nulos são omitidos (FA01: despesa sem categoria).
        if (d.categoria_id != null) payload.categoria_id = d.categoria_id;
        if (d.fixa_ou_variavel != null) payload.fixa_ou_variavel = d.fixa_ou_variavel;
        if (d.essencial != null) payload.essencial = d.essencial;
        if (d.descricao) payload.descricao = d.descricao;
        if (d.recorrencia_id) payload.recorrencia_id = d.recorrencia_id;

        await setDoc(ref, payload);

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
    // UC01 EX04 / UC02 EX03: falhas de rede interrompem a fila e mantêm as pendências.
    if (negadoPelaNuvem(e)) acessoNegado = true;
  } finally {
    emAndamento = false;
  }

  return mudouLocal;
}


export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes();
}

function categoriaRemota(id: unknown): string | null {
  return typeof id === 'string' && categoriaConhecida(id) ? id : null;
}

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

      for (const d of snapSeries.docs) {
        const x = d.data();
        if (conhecidas.has(d.id)) continue;
        if (typeof x.intervalo !== 'number' || typeof x.unidade !== 'string' || typeof x.inicio !== 'string') continue;
        if (typeof x.valor_centavos !== 'number' || typeof x.titulo !== 'string') continue;
        // Preserva o tipo: sem ele, uma série de despesa viraria série de receita (DEFAULT 'receita').
        const tipo = x.tipo === 'despesa' ? 'despesa' : 'receita';
        const classificacao = tipo === 'despesa';
        await tx.runAsync(
          `INSERT OR IGNORE INTO recorrencias
            (id, tipo, intervalo, unidade, inicio, termino, ativa, valor_centavos, titulo, descricao,
             categoria_id, fixa_ou_variavel, essencial, sync_status, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sincronizado', ?)`,
          [
            d.id, tipo, x.intervalo, x.unidade, x.inicio, x.termino ?? null, x.ativa === false ? 0 : 1,
            x.valor_centavos, x.titulo, x.descricao ?? null,
            classificacao ? categoriaRemota(x.categoria_id) : null,
            classificacao && (x.fixa_ou_variavel === 'fixa' || x.fixa_ou_variavel === 'variavel') ? x.fixa_ou_variavel : null,
            classificacao && typeof x.essencial === 'number' && (x.essencial === 0 || x.essencial === 1) ? x.essencial
              : classificacao && typeof x.essencial === 'boolean' ? (x.essencial ? 1 : 0) : null,
            x.atualizado_em ?? new Date().toISOString(),
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
               excluido_em = excluded.excluido_em, atualizado_em = excluded.atualizado_em,
               ${LIMPAR_DESPESA_EXCLUIDA}`,
            [d.id, x.excluido_em, ts],
          );
          continue;
        }

        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : new Date().toISOString();
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const categoria = categoriaRemota(x.categoria_id);
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
