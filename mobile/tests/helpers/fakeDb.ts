import Database from 'better-sqlite3';
import { getDb } from '@/db/database';
import { ESQUEMA_SQL } from '@/db/schema';

export interface BancoFalso {
  sqlite: Database.Database;
  /** Quantidade de gravações (runAsync) executadas. */
  chamadas: number;
  /** Faz a k-ésima gravação a partir de agora lançar erro (1 = a próxima). Usado para simular falha em cada etapa. */
  falharNaOperacao(k: number): void;
  /** Cópia do conteúdo das duas tabelas, para comparar antes/depois. */
  instantaneo(): { receitas: unknown[]; recorrencias: unknown[] };
  receitas(): any[];
  recorrencias(): any[];
}

/** Instala um SQLite em memória no lugar de getDb(), com a mesma semântica de transação do expo-sqlite. */
export function instalarBanco(): BancoFalso {
  const sqlite = new Database(':memory:');
  sqlite.exec(ESQUEMA_SQL);
  let falharEm: number | null = null;

  const banco: BancoFalso = {
    sqlite,
    chamadas: 0,
    falharNaOperacao(k) {
      falharEm = k;
    },
    instantaneo() {
      return {
        receitas: sqlite.prepare('SELECT * FROM receitas ORDER BY id').all(),
        recorrencias: sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all(),
      };
    },
    receitas: () => sqlite.prepare('SELECT * FROM receitas ORDER BY data, id').all() as any[],
    recorrencias: () => sqlite.prepare('SELECT * FROM recorrencias ORDER BY id').all() as any[],
  };

  const api: any = {
    async execAsync(sql: string) {
      sqlite.exec(sql);
    },
    async runAsync(sql: string, params: unknown[] = []) {
      banco.chamadas++;
      if (falharEm !== null) {
        falharEm--;
        if (falharEm === 0) {
          falharEm = null;
          throw new Error('Falha simulada na gravação');
        }
      }
      const r = sqlite.prepare(sql).run(...(params as any[]));
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getAllAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).all(...(params as any[]));
    },
    async getFirstAsync(sql: string, params: unknown[] = []) {
      return sqlite.prepare(sql).get(...(params as any[])) ?? null;
    },
    async withExclusiveTransactionAsync(fn: (tx: unknown) => Promise<void>) {
      sqlite.exec('BEGIN');
      try {
        await fn(api);
        sqlite.exec('COMMIT');
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };

  (getDb as jest.Mock).mockReset();
  (getDb as jest.Mock).mockResolvedValue(api);
  return banco;
}
