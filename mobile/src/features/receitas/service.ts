import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import { adicionarDias, adicionarIntervalo, adicionarMeses, hojeISO } from './dates';
import type { EscopoSerie, Receita, ReceitaInput, Recorrencia } from './types';

const MAX_OCORRENCIAS = 3700;
const HORIZONTE_MESES = 12;

/** Falha ao gravar/recalcular (EX03): nada foi alterado, pois a transação foi revertida. */
export class FalhaPersistencia extends Error {}
/** Receita inexistente ou já excluída (EX06). */
export class ReceitaIndisponivel extends Error {}
/** Falha ao ler da base local (EX08). */
export class FalhaLeitura extends Error {}

const agora = () => new Date().toISOString();

export function gerarId(): string {
  // UUID v4 gerado no cliente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Operação composta numa única transação; só resolve após o commit (RN11, RNF05, RNF35). */
async function transacao<T>(fn: (tx: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await getDb();
    let resultado!: T;
    await db.withExclusiveTransactionAsync(async (tx) => {
      resultado = await fn(tx as unknown as SQLiteDatabase);
    });
    return resultado;
  } catch (e) {
    if (e instanceof ReceitaIndisponivel) throw e;
    throw new FalhaPersistencia(String(e));
  }
}

async function leitura<T>(fn: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaLeitura(String(e));
  }
}

// ---------------------------------------------------------------- consultas

/** Intervalo [inicio, fim) por data, mais recente primeiro (RN12). Ignora excluídas. */
export function listarReceitas(inicio: string, fim: string) {
  return leitura(async (db) => {
    const itens = await db.getAllAsync<Receita>(
      `SELECT * FROM receitas
       WHERE excluido_em IS NULL AND data >= ? AND data < ?
       ORDER BY data DESC, criado_em DESC`,
      [inicio, fim],
    );
    const t = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor_centavos) AS total FROM receitas
       WHERE excluido_em IS NULL AND data >= ? AND data < ?`,
      [inicio, fim],
    );
    return { itens, total: t?.total ?? 0 };
  });
}

export function buscarReceita(id: string) {
  return leitura(async (db) => {
    const r = await db.getFirstAsync<Receita>(
      'SELECT * FROM receitas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!r) return null;
    const rec = r.recorrencia_id
      ? await db.getFirstAsync<Recorrencia>('SELECT * FROM recorrencias WHERE id = ?', [r.recorrencia_id])
      : null;
    return { receita: r, recorrencia: rec ?? null };
  });
}

// ---------------------------------------------------------------- recorrência

/** Gera ocorrências até `limite` com INSERT OR IGNORE pelo ID derivado (sem duplicar, RNF26). */
async function gerarOcorrencias(tx: SQLiteDatabase, rec: Recorrencia, limite: string) {
  const ts = agora();
  for (let k = 0; k < MAX_OCORRENCIAS; k++) {
    const data = adicionarIntervalo(rec.inicio, k * rec.intervalo, rec.unidade);
    if (data > limite) break;
    await tx.runAsync(
      `INSERT OR IGNORE INTO receitas
        (id, valor_centavos, data, titulo, descricao, recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, 'pendente', NULL, ?, ?)`,
      [`${rec.id}_${data}`, rec.valor_centavos, data, rec.titulo, rec.descricao, rec.id, ts, ts],
    );
  }
}

/** Ao abrir o app: completa a geração das séries sem término até 12 meses à frente. */
export function completarRecorrencias() {
  return transacao(async (tx) => {
    const series = await tx.getAllAsync<Recorrencia>(
      'SELECT * FROM recorrencias WHERE ativa = 1 AND termino IS NULL',
    );
    const limite = adicionarMeses(hojeISO(), HORIZONTE_MESES);
    for (const s of series) await gerarOcorrencias(tx, s, limite);
  });
}

// ---------------------------------------------------------------- registrar (A)

export function registrarReceita(input: ReceitaInput) {
  return transacao(async (tx) => {
    const ts = agora();
    if (!input.recorrencia) {
      await tx.runAsync(
        `INSERT INTO receitas
          (id, valor_centavos, data, titulo, descricao, recorrencia_id, sync_status, excluido_em, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, NULL, 'pendente', NULL, ?, ?)`,
        [gerarId(), input.valorCentavos, input.data, input.titulo, input.descricao, ts, ts],
      );
      return;
    }
    const rec: Recorrencia = {
      id: gerarId(),
      intervalo: input.recorrencia.intervalo,
      unidade: input.recorrencia.unidade,
      inicio: input.data,
      termino: input.recorrencia.termino,
      ativa: 1,
      valor_centavos: input.valorCentavos,
      titulo: input.titulo,
      descricao: input.descricao,
      sync_status: 'pendente',
      atualizado_em: ts,
    };
    await tx.runAsync(
      `INSERT INTO recorrencias
        (id, intervalo, unidade, inicio, termino, ativa, valor_centavos, titulo, descricao, sync_status, atualizado_em)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 'pendente', ?)`,
      [rec.id, rec.intervalo, rec.unidade, rec.inicio, rec.termino, rec.valor_centavos, rec.titulo, rec.descricao, ts],
    );
    // Sem término: 12 meses à frente; a primeira ocorrência sempre é gerada.
    const horizonte = rec.termino ?? adicionarMeses(hojeISO(), HORIZONTE_MESES);
    await gerarOcorrencias(tx, rec, horizonte < rec.inicio ? rec.inicio : horizonte);
  });
}

// ---------------------------------------------------------------- editar (C)

export function editarReceita(id: string, input: ReceitaInput, escopo: EscopoSerie = 'esta') {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Receita>(
      'SELECT * FROM receitas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new ReceitaIndisponivel();
    const ts = agora();

    // A ocorrência selecionada recebe todos os campos (incluindo a data).
    await tx.runAsync(
      `UPDATE receitas SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
         sync_status = 'pendente', atualizado_em = ? WHERE id = ?`,
      [input.valorCentavos, input.data, input.titulo, input.descricao, ts, id],
    );

    if (atual.recorrencia_id && escopo !== 'esta') {
      // Demais ocorrências: valor, título e descrição (a data de cada uma é preservada).
      const filtroData = escopo === 'proximas' ? 'AND data >= ?' : '';
      const params: (string | number | null)[] = [
        input.valorCentavos, input.titulo, input.descricao, ts, atual.recorrencia_id, id,
      ];
      if (escopo === 'proximas') params.push(atual.data);
      await tx.runAsync(
        `UPDATE receitas SET valor_centavos = ?, titulo = ?, descricao = ?,
           sync_status = 'pendente', atualizado_em = ?
         WHERE recorrencia_id = ? AND id <> ? AND excluido_em IS NULL ${filtroData}`,
        params,
      );
      // Modelo da série: ocorrências geradas depois seguem os novos dados.
      await tx.runAsync(
        `UPDATE recorrencias SET valor_centavos = ?, titulo = ?, descricao = ?,
           sync_status = 'pendente', atualizado_em = ? WHERE id = ?`,
        [input.valorCentavos, input.titulo, input.descricao, ts, atual.recorrencia_id],
      );
    }
  });
}

// ---------------------------------------------------------------- excluir (D)

export function excluirReceita(id: string, escopo: EscopoSerie = 'esta') {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Receita>(
      'SELECT * FROM receitas WHERE id = ? AND excluido_em IS NULL',
      [id],
    );
    if (!atual) throw new ReceitaIndisponivel();
    const ts = agora();
    // Tombstone: a exclusão precisa chegar à nuvem (RN07).
    const lapide = `UPDATE receitas SET excluido_em = ?, sync_status = 'pendente', atualizado_em = ?`;

    if (!atual.recorrencia_id || escopo === 'esta') {
      await tx.runAsync(`${lapide} WHERE id = ?`, [ts, ts, id]);
      return;
    }

    const rec = await tx.getFirstAsync<Recorrencia>('SELECT * FROM recorrencias WHERE id = ?', [
      atual.recorrencia_id,
    ]);
    if (escopo === 'todas') {
      await tx.runAsync(`${lapide} WHERE recorrencia_id = ? AND excluido_em IS NULL`, [ts, ts, atual.recorrencia_id]);
      await tx.runAsync(
        `UPDATE recorrencias SET ativa = 0, sync_status = 'pendente', atualizado_em = ? WHERE id = ?`,
        [ts, atual.recorrencia_id],
      );
      return;
    }

    // 'proximas': da data selecionada em diante; a série deixa de gerar novas ocorrências.
    await tx.runAsync(`${lapide} WHERE recorrencia_id = ? AND data >= ? AND excluido_em IS NULL`, [
      ts, ts, atual.recorrencia_id, atual.data,
    ]);
    const anterior = adicionarDias(atual.data, -1);
    if (rec && anterior < rec.inicio) {
      await tx.runAsync(
        `UPDATE recorrencias SET ativa = 0, sync_status = 'pendente', atualizado_em = ? WHERE id = ?`,
        [ts, rec.id],
      );
    } else {
      await tx.runAsync(
        `UPDATE recorrencias SET termino = ?, sync_status = 'pendente', atualizado_em = ? WHERE id = ?`,
        [anterior, ts, atual.recorrencia_id],
      );
    }
  });
}
