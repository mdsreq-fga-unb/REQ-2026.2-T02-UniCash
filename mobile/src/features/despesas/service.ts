import type { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '@/db/database';
import {
  adicionarDias,
  adicionarIntervalo,
  adicionarMeses,
  hojeISO,
} from '../receitas/dates';
import type {
  Despesa,
  DespesaInput,
  EscopoSerie,
} from './types';

const MAX_OCORRENCIAS = 3700;
const HORIZONTE_MESES = 12;

/** Falha ao gravar ou recalcular: a transação é revertida. */
export class FalhaPersistencia extends Error {}

/** Despesa inexistente ou já excluída. */
export class DespesaIndisponivel extends Error {}

/** Falha ao ler a base local. */
export class FalhaLeitura extends Error {}

const agora = () => new Date().toISOString();

/** Gera um UUID v4 no próprio dispositivo. */
export function gerarId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Executa operações compostas em uma única transação. */
async function transacao<T>(
  fn: (tx: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  try {
    const db = await getDb();
    let resultado!: T;

    await db.withExclusiveTransactionAsync(async (tx) => {
      resultado = await fn(tx as unknown as SQLiteDatabase);
    });

    return resultado;
  } catch (e) {
    if (e instanceof DespesaIndisponivel) throw e;
    throw new FalhaPersistencia(String(e));
  }
}

/** Centraliza o tratamento de falhas de leitura. */
async function leitura<T>(
  fn: (db: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  try {
    return await fn(await getDb());
  } catch (e) {
    throw new FalhaLeitura(String(e));
  }
}
// ---------------------------------------------------------------- consultas

/** Lista despesas de um intervalo [inicio, fim), mais recentes primeiro. */
export function listarDespesas(inicio: string, fim: string) {
  return leitura(async (db) => {
    const itens = await db.getAllAsync<Despesa>(
      `SELECT * FROM despesas
       WHERE excluido_em IS NULL AND data >= ? AND data < ?
       ORDER BY data DESC, criado_em DESC`,
      [inicio, fim],
    );

    const total = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor_centavos) AS total FROM despesas
       WHERE excluido_em IS NULL AND data >= ? AND data < ?`,
      [inicio, fim],
    );

    return {
      itens,
      total: total?.total ?? 0,
    };
  });
}

/** Busca uma despesa e sua recorrência, se houver. */
export function buscarDespesa(id: string) {
  return leitura(async (db) => {
    const despesa = await db.getFirstAsync<Despesa>(
      `SELECT * FROM despesas
       WHERE id = ? AND excluido_em IS NULL`,
      [id],
    );

    if (!despesa) return null;

    const recorrencia = despesa.recorrencia_id
      ? await db.getFirstAsync<RecorrenciaDespesa>(
          `SELECT * FROM recorrencias
           WHERE id = ? AND tipo = 'despesa'`,
          [despesa.recorrencia_id],
        )
      : null;

    return {
      despesa,
      recorrencia: recorrencia ?? null,
    };
  });
}
/** Completa as despesas recorrentes até 12 meses à frente. */
export function completarRecorrenciasDespesas() {
  return transacao(async (tx) => {
    const series = await tx.getAllAsync<{
      id: string;
      intervalo: number;
      unidade: 'dia' | 'mes' | 'ano';
      inicio: string;
      termino: string | null;
      valor_centavos: number;
      titulo: string;
      descricao: string | null;
      categoria_id: string | null;
      fixa_ou_variavel: 'fixa' | 'variavel' | null;
      essencial: 0 | 1 | null;
    }>(
      `SELECT * FROM recorrencias
       WHERE ativa = 1
         AND termino IS NULL
         AND tipo = 'despesa'`,
    );

    const limite = adicionarMeses(hojeISO(), HORIZONTE_MESES);

    for (const serie of series) {
      await gerarOcorrencias(tx, serie, limite);
    }
  });
}
// ---------------------------------------------------------------- recorrência

/** Cria as ocorrências de uma série de despesas. */
async function gerarOcorrencias(
  tx: SQLiteDatabase,
  rec: {
    id: string;
    intervalo: number;
    unidade: 'dia' | 'mes' | 'ano';
    inicio: string;
    termino: string | null;
    valor_centavos: number;
    titulo: string;
    descricao: string | null;
    categoria_id: string | null;
    fixa_ou_variavel: 'fixa' | 'variavel' | null;
    essencial: 0 | 1 | null;
  },
  limite: string,
) {
  const ts = agora();

  for (let k = 0; k < MAX_OCORRENCIAS; k++) {
    const data = adicionarIntervalo(
      rec.inicio,
      k * rec.intervalo,
      rec.unidade,
    );

    if (data > limite) break;

    await tx.runAsync(
      `INSERT OR IGNORE INTO despesas
        (id, valor_centavos, data, titulo, descricao, categoria_id,
         fixa_ou_variavel, essencial, recorrencia_id, sync_status,
         excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NULL, ?, ?)`,
      [
        `${rec.id}_${data}`,
        rec.valor_centavos,
        data,
        rec.titulo,
        rec.descricao,
        rec.categoria_id,
        rec.fixa_ou_variavel,
        rec.essencial,
        rec.id,
        ts,
        ts,
      ],
    );
  }
}
// ---------------------------------------------------------------- séries

type DadosSerie = Omit<DespesaInput, 'recorrencia'> & {
  recorrencia: NonNullable<DespesaInput['recorrencia']>;
};

/** Cria a série e gera suas ocorrências. */
async function criarSerie(
  tx: SQLiteDatabase,
  d: DadosSerie,
  ts: string,
) {
  const rec = {
    id: gerarId(),
    intervalo: d.recorrencia.intervalo,
    unidade: d.recorrencia.unidade,
    inicio: d.data,
    termino: d.recorrencia.termino,
    ativa: 1,
    valor_centavos: d.valorCentavos,
    titulo: d.titulo,
    descricao: d.descricao,
    categoria_id: d.categoriaId,
    fixa_ou_variavel: d.fixaOuVariavel,
    essencial: d.essencial,
    sync_status: 'pendente',
    atualizado_em: ts,
  };

    await tx.runAsync(
    `INSERT INTO recorrencias
      (id, tipo, intervalo, unidade, inicio, termino, ativa,
       valor_centavos, titulo, descricao, categoria_id,
       fixa_ou_variavel, essencial, sync_status, atualizado_em)
     VALUES (?, 'despesa', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
    [
      rec.id,
      rec.intervalo,
      rec.unidade,
      rec.inicio,
      rec.termino,
      rec.valor_centavos,
      rec.titulo,
      rec.descricao,
      rec.categoria_id,
      rec.fixa_ou_variavel,
      rec.essencial,
      ts,
    ],
  );

  const horizonte =
    rec.termino ?? adicionarMeses(hojeISO(), HORIZONTE_MESES);

  await gerarOcorrencias(
    tx,
    rec,
    horizonte < rec.inicio ? rec.inicio : horizonte,
  );
}
// ---------------------------------------------------------------- cadastro

/** Registra uma despesa única ou uma série recorrente. */
export function registrarDespesa(d: DespesaInput) {
  return transacao(async (tx) => {
    const ts = agora();

    if (d.recorrencia) {
      await criarSerie(tx, d as DadosSerie, ts);
      return;
    }

    await tx.runAsync(
      `INSERT INTO despesas
        (id, valor_centavos, data, titulo, descricao, categoria_id,
         fixa_ou_variavel, essencial, recorrencia_id, sync_status,
         excluido_em, criado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pendente', NULL, ?, ?)`,
      [
        gerarId(),
        d.valorCentavos,
        d.data,
        d.titulo,
        d.descricao,
        d.categoriaId,
        d.fixaOuVariavel,
        d.essencial,
        ts,
        ts,
      ],
    );
  });
}

// ---------------------------------------------------------------- edição e exclusão

const LAPIDE = `UPDATE despesas
  SET excluido_em = ?, sync_status = 'pendente', atualizado_em = ?`;

type RecorrenciaDespesa = {
  id: string;
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
};

async function encerrarSerieAntes(
  tx: SQLiteDatabase,
  rec: RecorrenciaDespesa,
  dataCorte: string,
  ts: string,
) {
  const anterior = adicionarDias(dataCorte, -1);

  if (anterior < rec.inicio) {
    await tx.runAsync(
      `UPDATE recorrencias
       SET ativa = 0, sync_status = 'pendente', atualizado_em = ?
       WHERE id = ?`,
      [ts, rec.id],
    );
  } else {
    await tx.runAsync(
      `UPDATE recorrencias
       SET termino = ?, sync_status = 'pendente', atualizado_em = ?
       WHERE id = ?`,
      [anterior, ts, rec.id],
    );
  }
}

async function desativarSerie(
  tx: SQLiteDatabase,
  recId: string,
  ts: string,
) {
  await tx.runAsync(
    `UPDATE recorrencias
     SET ativa = 0, sync_status = 'pendente', atualizado_em = ?
     WHERE id = ?`,
    [ts, recId],
  );
}

/** Edita uma despesa única ou uma ocorrência de série. */
export function editarDespesa(
  id: string,
  input: DespesaInput,
  escopo: EscopoSerie = 'esta',
) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Despesa>(
      `SELECT * FROM despesas
       WHERE id = ? AND excluido_em IS NULL`,
      [id],
    );

    if (!atual) throw new DespesaIndisponivel();

    const ts = agora();

    const rec = atual.recorrencia_id
      ? await tx.getFirstAsync<RecorrenciaDespesa>(
          `SELECT * FROM recorrencias WHERE id = ?`,
          [atual.recorrencia_id],
        )
      : null;

    const atualizarSelecionada = (desvincular = false) =>
      tx.runAsync(
        `UPDATE despesas
         SET valor_centavos = ?, data = ?, titulo = ?, descricao = ?,
             categoria_id = ?, fixa_ou_variavel = ?, essencial = ?
             ${desvincular ? ', recorrencia_id = NULL' : ''},
             sync_status = 'pendente', atualizado_em = ?
         WHERE id = ?`,
        [
          input.valorCentavos,
          input.data,
          input.titulo,
          input.descricao,
          input.categoriaId,
          input.fixaOuVariavel,
          input.essencial,
          ts,
          id,
        ],
      );

    // Despesa que não pertence a uma série.
    if (!rec) {
      if (input.recorrencia) {
        await tx.runAsync(`${LAPIDE} WHERE id = ?`, [ts, ts, id]);
        await criarSerie(tx, { ...input, recorrencia: input.recorrencia }, ts);
      } else {
        await atualizarSelecionada();
      }
      return;
    }

    const r = input.recorrencia;

    const mudouRecorrencia =
      !r ||
      r.intervalo !== rec.intervalo ||
      r.unidade !== rec.unidade ||
      (r.termino ?? null) !== (rec.termino ?? null);

    // Edita somente esta ocorrência ou mantém a repetição atual.
    if (escopo === 'esta' || !mudouRecorrencia) {
      await atualizarSelecionada();

      if (escopo === 'esta') return;

      const filtroData = escopo === 'proximas' ? 'AND data >= ?' : '';

      const parametros: (string | number | null)[] = [
        input.valorCentavos,
        input.titulo,
        input.descricao,
        input.categoriaId,
        input.fixaOuVariavel,
        input.essencial,
        ts,
        rec.id,
        id,
      ];

      if (escopo === 'proximas') parametros.push(atual.data);

      await tx.runAsync(
        `UPDATE despesas
         SET valor_centavos = ?, titulo = ?, descricao = ?,
             categoria_id = ?, fixa_ou_variavel = ?, essencial = ?,
             sync_status = 'pendente', atualizado_em = ?
         WHERE recorrencia_id = ? AND id <> ?
           AND excluido_em IS NULL ${filtroData}`,
        parametros,
      );

      await tx.runAsync(
        `UPDATE recorrencias
         SET valor_centavos = ?, titulo = ?, descricao = ?,
             categoria_id = ?, fixa_ou_variavel = ?, essencial = ?,
             sync_status = 'pendente', atualizado_em = ?
         WHERE id = ?`,
        [
          input.valorCentavos,
          input.titulo,
          input.descricao,
          input.categoriaId,
          input.fixaOuVariavel,
          input.essencial,
          ts,
          rec.id,
        ],
      );

      return;
    }

    // A repetição foi removida.
    if (!r) {
      if (escopo === 'proximas') {
        await atualizarSelecionada();

        await tx.runAsync(
          `${LAPIDE}
           WHERE recorrencia_id = ? AND data > ?
             AND excluido_em IS NULL`,
          [ts, ts, rec.id, atual.data],
        );

        const fim =
          input.data > atual.data ? input.data : atual.data;

        await tx.runAsync(
          `UPDATE recorrencias
           SET termino = ?, sync_status = 'pendente', atualizado_em = ?
           WHERE id = ?`,
          [fim, ts, rec.id],
        );
      } else {
        await atualizarSelecionada(true);

        await tx.runAsync(
          `${LAPIDE}
           WHERE recorrencia_id = ? AND id <> ?
             AND excluido_em IS NULL`,
          [ts, ts, rec.id, id],
        );

        await desativarSerie(tx, rec.id, ts);
      }

      return;
    }

    // A repetição mudou: encerra a série antiga e cria outra.
    if (escopo === 'proximas') {
      await tx.runAsync(
        `${LAPIDE}
         WHERE recorrencia_id = ? AND data >= ?
           AND excluido_em IS NULL`,
        [ts, ts, rec.id, atual.data],
      );

      await encerrarSerieAntes(tx, rec, atual.data, ts);

      await criarSerie(tx, { ...input, recorrencia: r }, ts);
    } else {
      await tx.runAsync(
        `${LAPIDE}
         WHERE recorrencia_id = ? AND excluido_em IS NULL`,
        [ts, ts, rec.id],
      );

      await desativarSerie(tx, rec.id, ts);

      await criarSerie(
        tx,
        { ...input, data: rec.inicio, recorrencia: r },
        ts,
      );
    }
  });
}

/** Exclui uma despesa ou as ocorrências selecionadas de uma série. */
export function excluirDespesa(
  id: string,
  escopo: EscopoSerie = 'esta',
) {
  return transacao(async (tx) => {
    const atual = await tx.getFirstAsync<Despesa>(
      `SELECT * FROM despesas
       WHERE id = ? AND excluido_em IS NULL`,
      [id],
    );

    if (!atual) throw new DespesaIndisponivel();

    const ts = agora();

    // Despesa única ou exclusão de apenas uma ocorrência.
    if (!atual.recorrencia_id || escopo === 'esta') {
      await tx.runAsync(`${LAPIDE} WHERE id = ?`, [ts, ts, id]);
      return;
    }

    const rec = await tx.getFirstAsync<RecorrenciaDespesa>(
      `SELECT * FROM recorrencias WHERE id = ?`,
      [atual.recorrencia_id],
    );

    if (escopo === 'todas') {
      await tx.runAsync(
        `${LAPIDE}
         WHERE recorrencia_id = ? AND excluido_em IS NULL`,
        [ts, ts, atual.recorrencia_id],
      );

      await desativarSerie(tx, atual.recorrencia_id, ts);
      return;
    }

    // Exclui esta ocorrência e todas as seguintes.
    await tx.runAsync(
      `${LAPIDE}
       WHERE recorrencia_id = ? AND data >= ?
         AND excluido_em IS NULL`,
      [ts, ts, atual.recorrencia_id, atual.data],
    );

    if (rec) {
      await encerrarSerieAntes(tx, rec, atual.data, ts);
    }
  });
}
