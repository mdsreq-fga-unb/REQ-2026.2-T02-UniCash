import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db as firestore } from '@/lib/firebase';
import { getDb } from '@/db/database';
import type { Receita } from './types';
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

let emAndamento = false;
let acessoNegado = false;

/** Falha ao restaurar os dados da nuvem; a base local não é alterada (transação revertida). */
export class FalhaRestauracao extends Error {}

function negadoPelaNuvem(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === 'permission-denied';
}

/**
 * Informa (uma única vez) se a nuvem negou acesso na última sincronização/restauração (EX07).
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
        if (negadoPelaNuvem(e)) acessoNegado = true;
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
        if (negadoPelaNuvem(e)) acessoNegado = true;
      }
    }

    // Sincroniza despesas.
    const despesas = await sqlite.getAllAsync<Despesa>(
      "SELECT * FROM despesas WHERE sync_status = 'pendente'",
    );

    for (const d of despesas) {
      try {
        const ref = doc(firestore, 'usuarios', uid, 'despesas', d.id);

        if (d.excluido_em) {
          await deleteDoc(ref);

          if (d.recorrencia_id) {
            await sqlite.runAsync(
              "UPDATE despesas SET sync_status = 'sincronizado' WHERE id = ?",
              [d.id],
            );
          } else {
            await sqlite.runAsync(
              'DELETE FROM despesas WHERE id = ? AND excluido_em IS NOT NULL',
              [d.id],
            );
          }

          continue;
        }

        const remoto = await getDoc(ref);

        if (remoto.exists()) {
          const dados = remoto.data();

          if (
            typeof dados.atualizado_em === 'string' &&
            dados.atualizado_em > d.atualizado_em
          ) {
            await sqlite.runAsync(
              `UPDATE despesas
               SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
                   categoria_id = ?, fixa_ou_variavel = ?, essencial = ?,
                   recorrencia_id = ?, sync_status = 'sincronizado',
                   atualizado_em = ?
               WHERE id = ?`,
              [
                dados.valor_centavos,
                dados.data,
                dados.titulo,
                dados.descricao ?? null,
                dados.categoria_id ?? null,
                dados.fixa_ou_variavel ?? null,
                dados.essencial ?? null,
                dados.recorrencia_id ?? null,
                dados.atualizado_em,
                d.id,
              ],
            );

            mudouLocal = true;
            continue;
          }
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
           WHERE id = ? AND atualizado_em = ?`,
          [d.id, d.atualizado_em],
        );
      } catch (e) {
        if (negadoPelaNuvem(e)) acessoNegado = true;
      }
    }
  } catch (e) {
    // Permanece pendente e é reenviado depois (EX04). Acesso negado (EX07) é sinalizado para a tela.
    if (negadoPelaNuvem(e)) acessoNegado = true;
  } finally {
    emAndamento = false;
  }

  return mudouLocal;
}


export function sincronizarEmSegundoPlano() {
  void sincronizarPendentes();
}

/**
 * Ponto de integração com o UC06 (categorias): enquanto não existir o cadastro de categorias,
 * qualquer id é aceito. Quando o UC06 existir, trocar por consulta à base local de categorias
 * para gravar categoria_id = NULL quando a categoria foi excluída (EX08).
 */
function categoriaConhecida(_id: string): boolean {
  return true;
}

export interface ResultadoRestauracao {
  receitas: number;
  despesas: number;
  recorrencias: number;
}

/**
 * Restaura da nuvem (usuarios/{uid}/...) para a base local, ao entrar numa conta.
 * Aditiva e idempotente: nunca sobrescreve linhas locais (inclusive lápides e edições pendentes),
 * então uma receita excluída não reaparece e as ocorrências de séries (ID derivado da série + data)
 * não são duplicadas. Tudo numa única transação (tudo ou nada).
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
            classificacao && typeof x.categoria_id === 'string' ? x.categoria_id : null,
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
      // Categoria desconhecida → NULL (EX08); validar contra o UC06 quando existir.
      for (const d of snapDespesas.docs) {
        const x = d.data();
        if (typeof x.valor_centavos !== 'number' || x.valor_centavos <= 0) continue;
        if (typeof x.data !== 'string' || typeof x.titulo !== 'string') continue;
        const ts = typeof x.atualizado_em === 'string' ? x.atualizado_em : new Date().toISOString();
        const serie = typeof x.recorrencia_id === 'string' && conhecidas.has(x.recorrencia_id) ? x.recorrencia_id : null;
        const categoria = typeof x.categoria_id === 'string' && categoriaConhecida(x.categoria_id) ? x.categoria_id : null;
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
