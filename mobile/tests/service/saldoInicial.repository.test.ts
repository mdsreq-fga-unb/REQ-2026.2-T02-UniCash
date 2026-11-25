
import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DDL_TABELA_SALDO_INICIAL } from '../../src/db/schema';

import {
  consultarSaldoInicial,
  salvarSaldoInicial,
} from '../../src/features/saldoInicial/repository';

describe('UC08 — persistência do saldo inicial', () => {
  let sqlite: Database.Database;
  let db: SQLiteDatabase;
  let falharGravacao: boolean;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(DDL_TABELA_SALDO_INICIAL);
    falharGravacao = false;

    const api = {
      async getFirstAsync(
        sql: string,
        params: unknown[] = [],
      ) {
        return sqlite.prepare(sql).get(...params) ?? null;
      },

      async runAsync(
        sql: string,
        params: unknown[] = [],
      ) {
        sqlite.prepare(sql).run(...params);

        if (falharGravacao) {
          throw new Error('Falha simulada na gravação');
        }
      },

      async withExclusiveTransactionAsync(
        callback: (tx: unknown) => Promise<void>,
      ) {
        sqlite.exec('BEGIN IMMEDIATE');

        try {
          await callback(api);
          sqlite.exec('COMMIT');
        } catch (erro) {
          sqlite.exec('ROLLBACK');
          throw erro;
        }
      },
    };

    db = api as unknown as SQLiteDatabase;
  });

  afterEach(() => {
    sqlite.close();
  });

  it('retorna null quando não existe saldo inicial', async () => {
    const saldo = await consultarSaldoInicial(
      db,
      'usuario-1',
    );

    expect(saldo).toBeNull();
  });

  it.each([150000, 0, -50000])(
    'salva e consulta saldo de %i centavos',
    async (valorCentavos) => {
      await salvarSaldoInicial(db, 'usuario-1', {
        valorCentavos,
        mesReferencia: '2026-11',
      });

      const saldo = await consultarSaldoInicial(
        db,
        'usuario-1',
      );

      expect(saldo).toMatchObject({
        uid: 'usuario-1',
        valor_centavos: valorCentavos,
        mes_referencia: '2026-11',
        sync_status: 'pendente',
      });
    },
  );

  it('atualiza o saldo sem duplicar registros', async () => {
    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: 1000,
      mesReferencia: '2026-10',
    });

    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: -2000,
      mesReferencia: '2026-11',
    });

    const registros = sqlite.prepare(
      'SELECT * FROM saldo_inicial',
    ).all();

    expect(registros).toHaveLength(1);

    expect(registros[0]).toMatchObject({
      valor_centavos: -2000,
      mes_referencia: '2026-11',
      sync_status: 'pendente',
    });
  });

  it('mantém os saldos de usuários separados', async () => {
    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: 1000,
      mesReferencia: '2026-11',
    });

    await salvarSaldoInicial(db, 'usuario-2', {
      valorCentavos: 2000,
      mesReferencia: '2026-11',
    });

    expect(
      await consultarSaldoInicial(db, 'usuario-1'),
    ).toMatchObject({
      valor_centavos: 1000,
    });

    expect(
      await consultarSaldoInicial(db, 'usuario-2'),
    ).toMatchObject({
      valor_centavos: 2000,
    });
  });

  it('rejeita usuário não identificado', async () => {
    await expect(
      salvarSaldoInicial(db, '', {
        valorCentavos: 1000,
        mesReferencia: '2026-11',
      }),
    ).rejects.toThrow('Usuário não identificado.');

    expect(
      sqlite.prepare('SELECT * FROM saldo_inicial').all(),
    ).toHaveLength(0);
  });

  it('não grava dados inválidos', async () => {
    await expect(
      salvarSaldoInicial(db, 'usuario-1', {
        valorCentavos: 1000,
        mesReferencia: '2026-13',
      }),
    ).rejects.toThrow('Informe um mês e ano válidos.');

    expect(
      await consultarSaldoInicial(db, 'usuario-1'),
    ).toBeNull();
  });

  it('marca novamente como pendente após alteração', async () => {
    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: 1000,
      mesReferencia: '2026-11',
    });

    sqlite.exec(`
      UPDATE saldo_inicial
      SET sync_status = 'sincronizado'
      WHERE uid = 'usuario-1'
    `);

    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: 2000,
      mesReferencia: '2026-11',
    });

    expect(
      await consultarSaldoInicial(db, 'usuario-1'),
    ).toMatchObject({
      valor_centavos: 2000,
      sync_status: 'pendente',
    });
  });

  it('preserva o saldo anterior quando a gravação falha', async () => {
    await salvarSaldoInicial(db, 'usuario-1', {
      valorCentavos: 1000,
      mesReferencia: '2026-10',
    });

    const antes = await consultarSaldoInicial(
      db,
      'usuario-1',
    );

    falharGravacao = true;

    await expect(
      salvarSaldoInicial(db, 'usuario-1', {
        valorCentavos: -5000,
        mesReferencia: '2026-11',
      }),
    ).rejects.toThrow('Falha simulada na gravação');

    expect(
      await consultarSaldoInicial(db, 'usuario-1'),
    ).toEqual(antes);
  });

  it('não deixa registro parcial quando o cadastro falha', async () => {
    falharGravacao = true;

    await expect(
      salvarSaldoInicial(db, 'usuario-1', {
        valorCentavos: 1000,
        mesReferencia: '2026-11',
      }),
    ).rejects.toThrow('Falha simulada na gravação');

    expect(
      await consultarSaldoInicial(db, 'usuario-1'),
    ).toBeNull();
  });
});
