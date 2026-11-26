import { serializarImportacao } from './operacoes-locais';
import { getDbLocal, getDbDoDono } from '@/db/database';
import { auth } from '@/lib/firebase';

const TABELAS = ['categorias', 'categorias_estado', 'recorrencias', 'receitas', 'despesas', 'saldo_inicial', 'alertas_emitidos', 'alertas', 'preferencias_alertas_por_tipo'] as const;
type Valor = string | number | null | Uint8Array;
type Linha = Record<string, Valor>;
const META = `CREATE TABLE IF NOT EXISTS uc10_adocao (
  id INTEGER PRIMARY KEY CHECK (id = 1), uid TEXT NOT NULL
)`;

function exigirDono(uid: string) {
  if (auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) {
    throw new Error('Sessão alterada durante a adoção');
  }
}

/** E6: reserva a origem para um único UID e copia em transação exclusiva.
 * A origem é mantida como cópia de segurança; o recibo no destino impede reaplicação.
 * Uma falha permite retomar somente com o mesmo UID, nunca com outra conta.
 */
export async function adotarDadosLocais(uid: string): Promise<void> {
  return serializarImportacao(uid, () => copiarDadosLocais(uid));
}

async function copiarDadosLocais(uid: string): Promise<void> {
  exigirDono(uid);
  const origem = await getDbLocal();
  const destino = await getDbDoDono(uid);
  const dados = new Map<string, Linha[]>();
  await origem.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(META);
    const reserva = await tx.getFirstAsync<{ uid: string }>('SELECT uid FROM uc10_adocao WHERE id = 1');
    if (reserva && reserva.uid !== uid) return;
    exigirDono(uid);
    for (const tabela of TABELAS) {
      const ordem = tabela === 'alertas_emitidos' ? ' ORDER BY mes, transicao' : '';
      dados.set(tabela, await tx.getAllAsync<Linha>(`SELECT * FROM ${tabela}${ordem}`));
    }
    if (![...dados.values()].some(linhas => linhas.length)) return;
    await tx.runAsync('INSERT OR IGNORE INTO uc10_adocao (id, uid) VALUES (1, ?)', [uid]);
  });
  if (!dados.size) return;
  exigirDono(uid);
  await destino.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync(META);
    const recibo = await tx.getFirstAsync<{ uid: string }>('SELECT uid FROM uc10_adocao WHERE id = 1');
    if (recibo?.uid === uid) return;
    if (recibo) throw new Error('Recibo de adoção incompatível');
    const idsCategorias = new Map<Valor, Valor>();
    for (const tabela of TABELAS) {
      for (const original of dados.get(tabela) ?? []) {
        exigirDono(uid);
        const linha = { ...original };
        if ('sync_status' in linha) linha.sync_status = 'pendente';
        if (tabela === 'categorias_estado' && linha.estado_local !== 'semeadura') linha.estado_local = 'editado';
        if (tabela === 'categorias' && linha.padrao === 1 && linha.excluido_em === null) {
          const existente = await tx.getFirstAsync<{ id: string; estado_local: string }>(
            `SELECT c.id, e.estado_local FROM categorias c JOIN categorias_estado e ON e.categoria_id = c.id
             WHERE c.nome_normalizado = ? AND c.padrao = 1 AND c.excluido_em IS NULL`, linha.nome_normalizado,
          );
          if (existente?.estado_local === 'semeadura') {
            idsCategorias.set(linha.id, existente.id);
            await tx.runAsync('DELETE FROM categorias_estado WHERE categoria_id = ?', existente.id);
            await tx.runAsync('DELETE FROM categorias WHERE id = ?', existente.id);
            linha.id = existente.id;
          }
        }
        if ('categoria_id' in linha && idsCategorias.has(linha.categoria_id)) {
          linha.categoria_id = idsCategorias.get(linha.categoria_id)!;
        }
        if (tabela === 'alertas') {
          if (linha.proprietario_uid !== null && linha.proprietario_uid !== uid) continue;
          linha.ref_id = idsCategorias.get(linha.ref_id) ?? linha.ref_id;
          linha.proprietario_uid = uid;
        }
        if (tabela === 'alertas_emitidos') {
          const ultima = await tx.getFirstAsync<{ numero: number | null }>(
            'SELECT MAX(transicao) AS numero FROM alertas_emitidos WHERE mes = ?', [linha.mes],
          );
          linha.transicao = (ultima?.numero ?? 0) + 1;
        }
        const colunas = Object.keys(linha);
        // A referência da conta prevalece; o mesmo ID de alerta já representa o mesmo evento.
        const conflito = tabela === 'saldo_inicial' || tabela === 'alertas_emitidos'
          ? ' ON CONFLICT(id) DO NOTHING'
          : tabela === 'alertas' || tabela === 'preferencias_alertas_por_tipo'
            ? ' ON CONFLICT DO NOTHING'
            : '';
        await tx.runAsync(`INSERT INTO ${tabela} (${colunas.map(c => '"' + c.replace(/"/g, '""') + '"').join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})${conflito}`, colunas.map(c => linha[c]));
      }
    }
    exigirDono(uid);
    await tx.runAsync('INSERT INTO uc10_adocao (id, uid) VALUES (1, ?)', [uid]);
  });
}
