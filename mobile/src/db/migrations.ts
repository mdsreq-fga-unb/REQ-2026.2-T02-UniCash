/**
 * Migrações versionadas da base local (PRAGMA user_version).
 *
 * REGRA DE EQUIPE: `PRAGMA user_version` é global ao banco. Toda mudança de
 * esquema de QUALQUER issue deve entrar aqui, como migração numerada apendada
 * ao registro MIGRACOES. Nunca ler nem gravar user_version fora deste arquivo.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { PERCENTUAL_MAX_CENTESIMOS } from '@/features/categorias/limites';
import {
  DDL_ESQUEMA,
  DDL_TABELA_CATEGORIAS,
  DDL_TRIGGER_PERCENTUAL,
  LIMITE_PERCENTUAL_MAX,
  TRIGGERS_PERCENTUAL,
} from './schema';

/** Versão atual do esquema local. Incrementar a cada nova migração. */
export const VERSAO_ESQUEMA = 3;

export interface RegistroInvalido {
  id: string;
  nome: string;
  motivo: string;
}

/** Banco em versão futura/desconhecida (app antigo abrindo banco novo ou dado corrompido). */
export class VersaoBancoDesconhecida extends Error {
  constructor(readonly versao: number) {
    super(
      `Base local em versão desconhecida (${versao}); este aplicativo suporta até a versão ${VERSAO_ESQUEMA}.`,
    );
    this.name = 'VersaoBancoDesconhecida';
  }
}

/**
 * Registros legados incompatíveis com as novas constraints. A migração aborta
 * SEM apagar nem corrigir dados; o usuário pode corrigir/excluir as categorias
 * indicadas pelo app e tentar de novo. A migração 002 não corrige esses dados
 * automaticamente.
 */
export class DadosLegadosInvalidos extends Error {
  constructor(readonly registros: RegistroInvalido[]) {
    super(
      `Migração abortada: ${registros.length} categoria(s) inválida(s). ` +
        'Nada foi alterado. Corrija ou exclua essas categorias antes de atualizar:\n' +
        registros.map((r) => `- id=${r.id}, nome="${r.nome}": ${r.motivo}`).join('\n'),
    );
    this.name = 'DadosLegadosInvalidos';
  }
}

/**
 * Dependência inesperada na tabela categorias (trigger/view criada por outro
 * integrante, ou outra tabela referenciando categorias). A migração aborta.
 */
export class DependenciaInesperada extends Error {
  constructor(detalhe: string) {
    super(`Migração abortada: dependência inesperada na tabela categorias (${detalhe}). Nada foi alterado.`);
    this.name = 'DependenciaInesperada';
  }
}

/** Estrutura legada divergente do esperado (colunas extras ou ausentes). A migração aborta. */
export class EstruturaLegadaInesperada extends Error {
  constructor(detalhe: string) {
    super(`Migração abortada: estrutura inesperada da tabela categorias (${detalhe}). Nada foi alterado.`);
    this.name = 'EstruturaLegadaInesperada';
  }
}

/**
 * Resíduo de migração anterior (ex.: categorias_nova_001 já existente). O objeto
 * não é reutilizado, excluído nem sobrescrito — a migração aborta e preserva tudo.
 */
export class ResiduoDeMigracao extends Error {
  constructor(nome: string) {
    super(
      `Migração abortada: objeto temporário "${nome}" já existe (resíduo de migração anterior). ` +
        'Nada foi reutilizado, excluído ou sobrescrito. Remova-o manualmente ou contate a equipe.',
    );
    this.name = 'ResiduoDeMigracao';
  }
}

/** Falha interna da migração detectada na pós-verificação — rollback total. */
export class FalhaMigracao extends Error {
  constructor(detalhe: string) {
    super(`Migração abortada com rollback completo: ${detalhe}.`);
    this.name = 'FalhaMigracao';
  }
}

interface Migracao {
  versao: number;
  executar: (db: SQLiteDatabase, versaoDestino: number) => Promise<void>;
}

/**
 * Registro centralizado de migrações. A 001 reconstrói `categorias` com as
 * constraints da E2.1 (issue #43 / UC06), preservando registros e tombstones.
 * A 002 adiciona o limite técnico de Number.MAX_SAFE_INTEGER ao percentual,
 * sem impor máximo de negócio.
 * A 003 aplica, por triggers aditivos, a faixa percentual provisória de
 * 0,01% a 100% (1 a 10.000 centésimos), sem reconstruir a tabela nem alterar
 * dados legados. A futura integração da UC02 fica reservada para a 004.
 */
const MIGRACOES: Migracao[] = [
  { versao: 1, executar: migrar001 },
  { versao: 2, executar: migrar002 },
  { versao: 3, executar: migrar003 },
];

const COLUNAS_CATEGORIAS = [
  'id',
  'nome',
  'nome_normalizado',
  'padrao',
  'limite_tipo',
  'limite_centavos',
  'limite_percentual_centesimos',
  'sync_status',
  'excluido_em',
  'criado_em',
  'atualizado_em',
] as const;

const INDICES_CATEGORIAS = [
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_unico ON categorias(nome_normalizado) WHERE excluido_em IS NULL',
  'CREATE INDEX IF NOT EXISTS idx_categorias_sync ON categorias(sync_status)',
] as const;

/** Únicos índices de usuário que a tabela categorias pode ter. Outros = mudança de colega. */
const INDICES_ESPERADOS: string[] = ['idx_categorias_nome_unico', 'idx_categorias_sync'];

/** Índices de usuário esperados nas tabelas de outras funcionalidades (vazio para recorrencias). */
const INDICES_ESPERADOS_OUTRAS: Record<string, string[]> = {
  recorrencias: [],
  receitas: ['idx_receitas_data', 'idx_receitas_recorrencia', 'idx_receitas_sync'],
};

/**
 * Assinatura canônica (nome, tipo, notnull, pk — nesta ordem) das tabelas de
 * outras funcionalidades. Deve refletir DDL_ESQUEMA; teste de regressão
 * compara com um banco recém-criado para detectar desvios.
 */
export interface ColunaEsperada {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

export const ESTRUTURAS_ESPERADAS: Record<string, ColunaEsperada[]> = {
  recorrencias: [
    { name: 'id', type: 'TEXT', notnull: 1, pk: 1 },
    { name: 'intervalo', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'unidade', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'inicio', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'termino', type: 'TEXT', notnull: 0, pk: 0 },
    { name: 'ativa', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'valor_centavos', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'titulo', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'descricao', type: 'TEXT', notnull: 0, pk: 0 },
    { name: 'sync_status', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'atualizado_em', type: 'TEXT', notnull: 1, pk: 0 },
  ],
  receitas: [
    { name: 'id', type: 'TEXT', notnull: 1, pk: 1 },
    { name: 'valor_centavos', type: 'INTEGER', notnull: 1, pk: 0 },
    { name: 'data', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'titulo', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'descricao', type: 'TEXT', notnull: 0, pk: 0 },
    { name: 'recorrencia_id', type: 'TEXT', notnull: 0, pk: 0 },
    { name: 'sync_status', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'excluido_em', type: 'TEXT', notnull: 0, pk: 0 },
    { name: 'criado_em', type: 'TEXT', notnull: 1, pk: 0 },
    { name: 'atualizado_em', type: 'TEXT', notnull: 1, pk: 0 },
  ],
};

/** Constraints nomeadas que o DDL da forma nova deve conter. */
const CONSTRAINTS_ESPERADAS: string[] = [
  'nome_valido',
  'padrao_valido',
  'limite_tipo_valido',
  'limite_centavos_valido',
  'limite_percentual_valido',
  'sync_status_valido',
  'limite_coerente',
];

async function lerVersao(db: SQLiteDatabase): Promise<number> {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return r?.user_version ?? 0;
}

async function existeTabela(db: SQLiteDatabase, nome: string): Promise<boolean> {
  const r = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?",
    [nome],
  );
  return (r?.n ?? 0) > 0;
}

/** Índices de usuário da tabela (sqlite_master), excluindo sqlite_autoindex_* (índices internos). */
async function indicesDeUsuario(tx: SQLiteDatabase, tabela: string): Promise<string[]> {
  const linhas = await tx.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = ?",
    [tabela],
  );
  return linhas.map((l) => l.name).filter((n) => !n.startsWith('sqlite_autoindex_'));
}

/**
 * Tabelas de usuário com FK real apontando para a tabela informada, via
 * PRAGMA foreign_key_list — mais confiável que busca textual em sqlite_master,
 * que não reconhece referências com aspas nem variações de formato SQL.
 */
async function tabelasQueReferenciam(tx: SQLiteDatabase, tabela: string): Promise<string[]> {
  const outras = (
    await tx.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
  )
    .map((t) => t.name)
    .filter((n) => n.toLowerCase() !== tabela.toLowerCase());

  const referenciam: string[] = [];
  for (const nome of outras) {
    const fks = await tx.getAllAsync<{ table: string }>(
      `PRAGMA foreign_key_list("${nome.replace(/"/g, '""')}")`,
    );
    if (fks.some((fk) => (fk.table ?? '').toLowerCase() === tabela.toLowerCase())) {
      referenciam.push(nome);
    }
  }
  return referenciam;
}

/**
 * Valida a estrutura "nova" (ex.: crash entre DDL e gravação da versão): a
 * presença do texto 'limite_coerente' não é prova suficiente — exigir colunas
 * exatas, constraints nomeadas e índices esperados antes de avançar a versão.
 */
/**
 * Instalação nova só é segura em banco realmente vazio, ou quando os únicos
 * objetos preexistentes são recorrencias/receitas com estrutura idêntica à
 * canônica (banco parcial de versão anterior sem categorias). Qualquer outro
 * objeto ou estrutura divergente aborta, preservando tudo — a versão não é
 * marcada e o banco permanece como está.
 */
async function prepararInstalacaoNova(tx: SQLiteDatabase): Promise<void> {
  const objetos = (
    await tx.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type IN ('table', 'view', 'trigger') AND name NOT LIKE 'sqlite_%'",
    )
  ).map((o) => o.name);

  if (objetos.length === 0) return; // banco realmente vazio

  const inesperados = objetos.filter((n) => n !== 'recorrencias' && n !== 'receitas');
  if (inesperados.length > 0) {
    throw new EstruturaLegadaInesperada(
      `instalação parcial com objetos não esperados: [${inesperados.join(', ')}]`,
    );
  }

  for (const nome of ['recorrencias', 'receitas'] as const) {
    if (!objetos.includes(nome)) continue;

    const atual = await tx.getAllAsync<ColunaEsperada>(`PRAGMA table_info("${nome}")`);
    const esperada = ESTRUTURAS_ESPERADAS[nome];
    if (atual.length !== esperada.length) {
      throw new EstruturaLegadaInesperada(
        `"${nome}" tem ${atual.length} colunas; o esquema canônico tem ${esperada.length}`,
      );
    }
    for (let i = 0; i < esperada.length; i++) {
      const a = atual[i];
      const e = esperada[i];
      if (
        a.name !== e.name ||
        a.type.toUpperCase() !== e.type.toUpperCase() ||
        a.notnull !== e.notnull ||
        a.pk !== e.pk
      ) {
        throw new EstruturaLegadaInesperada(
          `estrutura de "${nome}" diverge do esquema canônico na coluna ${i + 1} (${a.name} ≠ ${e.name})`,
        );
      }
    }

    const indices = await indicesDeUsuario(tx, nome);
    const indicesInesperados = indices.filter((i) => !INDICES_ESPERADOS_OUTRAS[nome].includes(i));
    if (indicesInesperados.length > 0) {
      throw new EstruturaLegadaInesperada(
        `índice(s) inesperado(s) em "${nome}": [${indicesInesperados.join(', ')}]`,
      );
    }
  }
}

/**
 * Valida a estrutura "nova" (ex.: crash entre DDL e gravação da versão): a
 * presença do texto 'limite_coerente' não é prova suficiente — exigir colunas
 * exatas, constraints nomeadas e índices esperados antes de avançar a versão.
 */
async function validarFormaNova(tx: SQLiteDatabase, sqlCategorias: string): Promise<void> {
  const colunas = (await tx.getAllAsync<{ name: string }>('PRAGMA table_info(categorias)'))
    .map((c) => c.name)
    .sort();
  const esperadas: string[] = [...COLUNAS_CATEGORIAS].sort();
  const extras = colunas.filter((c) => !esperadas.includes(c));
  const ausentes = esperadas.filter((c) => !colunas.includes(c));
  if (extras.length > 0 || ausentes.length > 0) {
    throw new EstruturaLegadaInesperada(
      `colunas extras: [${extras.join(', ')}]; ausentes: [${ausentes.join(', ')}]`,
    );
  }

  const constraintsFaltantes = CONSTRAINTS_ESPERADAS.filter((c) => !sqlCategorias.includes(c));
  if (constraintsFaltantes.length > 0) {
    throw new EstruturaLegadaInesperada(`constraints ausentes: [${constraintsFaltantes.join(', ')}]`);
  }

  const indices = await indicesDeUsuario(tx, 'categorias');
  const indicesInesperados = indices.filter((i) => !INDICES_ESPERADOS.includes(i));
  const indicesAusentes = INDICES_ESPERADOS.filter((i) => !indices.includes(i));
  if (indicesInesperados.length > 0 || indicesAusentes.length > 0) {
    throw new EstruturaLegadaInesperada(
      `índices inesperados: [${indicesInesperados.join(', ')}]; ausentes: [${indicesAusentes.join(', ')}]`,
    );
  }
}

/**
 * Marcas mínimas que comprovam que um trigger existente de mesmo nome aplica a
 * faixa provisória. `CREATE TRIGGER IF NOT EXISTS` não falha se o nome já existir,
 * então a definição precisa ser conferida antes de reutilizá-la.
 */
const MARCAS_TRIGGER_PERCENTUAL = [
  'limite_percentual_faixa',
  `> ${PERCENTUAL_MAX_CENTESIMOS}`,
];

async function verificarConflitoTriggersPercentual(tx: SQLiteDatabase): Promise<void> {
  const linhas = await tx.getAllAsync<{ name: string; sql: string | null }>(
    "SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
    [...TRIGGERS_PERCENTUAL],
  );
  const divergentes = linhas.filter(
    (l) => !MARCAS_TRIGGER_PERCENTUAL.every((m) => (l.sql ?? '').includes(m)),
  );
  if (divergentes.length > 0) {
    throw new DependenciaInesperada(
      `trigger(s) com definição divergente: [${divergentes.map((d) => d.name).join(', ')}]`,
    );
  }
}

async function validarTriggersPercentual(tx: SQLiteDatabase): Promise<void> {
  const linhas = await tx.getAllAsync<{ name: string; sql: string | null }>(
    "SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
    [...TRIGGERS_PERCENTUAL],
  );
  const presentes = new Map(linhas.map((l) => [l.name, l.sql ?? '']));
  const ausentes = TRIGGERS_PERCENTUAL.filter((n) => !presentes.has(n));
  const divergentes = TRIGGERS_PERCENTUAL.filter((n) => {
    const sql = presentes.get(n);
    return sql !== undefined && !MARCAS_TRIGGER_PERCENTUAL.every((m) => sql.includes(m));
  });
  if (divergentes.length > 0) {
    throw new DependenciaInesperada(
      `trigger(s) com definição divergente: [${divergentes.join(', ')}]`,
    );
  }
  if (ausentes.length > 0) {
    throw new FalhaMigracao(`trigger(s) ausente(s) após a migração: [${ausentes.join(', ')}]`);
  }
}

/**
 * Cria os triggers da faixa percentual e confirma a definição resultante.
 * A execução é idempotente; um trigger preexistente divergente aborta antes de
 * qualquer DDL — a transação reverte e a versão não avança.
 */
async function aplicarTriggersPercentual(tx: SQLiteDatabase): Promise<void> {
  await verificarConflitoTriggersPercentual(tx);
  await tx.execAsync(DDL_TRIGGER_PERCENTUAL);
  await validarTriggersPercentual(tx);
}

/**
 * Leva a base à VERSAO_ESQUEMA. Instalação nova e banco legado terminam
 * consistentes na mesma versão; qualquer falha reverte por completo —
 * inclusive a versão gravada, pois PRAGMA user_version participa da transação.
 */
export async function migrarSeNecessario(db: SQLiteDatabase): Promise<void> {
  const versao = await lerVersao(db);

  if (versao > VERSAO_ESQUEMA) throw new VersaoBancoDesconhecida(versao);
  if (versao === VERSAO_ESQUEMA) return;

  // Instalação nova (sem tabela de categorias): diferenciar banco vazio de banco
  // parcial. Instalação parcial segura só avança se os objetos preexistentes
  // forem exatamente recorrencias/receitas canônicas; caso contrário, aborta
  // preservando tudo — a versão não é marcada.
  if (versao === 0 && !(await existeTabela(db, 'categorias'))) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await prepararInstalacaoNova(tx);
      await tx.execAsync(DDL_ESQUEMA);
      await aplicarTriggersPercentual(tx);
      await tx.execAsync(`PRAGMA user_version = ${VERSAO_ESQUEMA}`);
    });
    return;
  }

  // Instalação legada (ou parcial): migrações pendentes, em ordem.
  for (const m of MIGRACOES) {
    if (m.versao > versao) await m.executar(db, m.versao);
  }
}

/**
 * 001 — reconstrói `categorias` com as constraints da E2.1.
 * Procedimento seguro da documentação oficial do SQLite: verificação prévia
 * (dependências, colunas, dados legados), criação da tabela nova, cópia com
 * lista explícita de colunas, exclusão da antiga, renomeação, índices recriados
 * e pós-verificação — tudo em uma única transação exclusiva.
 */
async function migrar001(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const forma = await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'categorias'",
    );

    // Crash entre DDL e gravação da versão: a presença do texto 'limite_coerente'
    // não é prova de estrutura atualizada — validar colunas, constraints e
    // índices esperados antes de avançar a versão; inconsistência aborta.
    // Este caminho é read-only + versão: NÃO executa DDL que pudesse mascarar
    // a inconsistência (ex.: recriar índice ausente via IF NOT EXISTS).
    if (forma?.sql?.includes('limite_coerente')) {
      await validarFormaNova(tx, forma.sql);
      await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
      return;
    }

    // Cria apenas o que falta em outras tabelas (IF NOT EXISTS); nunca altera existentes.
    await tx.execAsync(DDL_ESQUEMA);

    await reconstruirCategorias(tx, versaoDestino);
  });
}

/**
 * 002 — adiciona o limite técnico de Number.MAX_SAFE_INTEGER ao percentual.
 * Não altera a faixa de negócio: a 003 aplica a faixa provisória por triggers.
 * Bancos já no DDL novo apenas avançam a versão; bancos v1 são reconstruídos
 * com validação prévia. Dados fora do limite técnico abortam sem alteração.
 */
async function migrar002(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const forma = await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'categorias'",
    );

    if (forma?.sql?.includes(String(LIMITE_PERCENTUAL_MAX))) {
      await validarFormaNova(tx, forma.sql);
      await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
      return;
    }

    // Cria apenas o que falta em outras tabelas; a tabela categorias antiga é
    // reconstruída por reconstruirCategorias com o DDL novo.
    await tx.execAsync(DDL_ESQUEMA);
    await reconstruirCategorias(tx, versaoDestino);
  });
}

/**
 * 003 — faixa percentual provisória de 0,01% a 100% (1 a 10.000 centésimos).
 * Aditiva: cria apenas triggers de INSERT/UPDATE. Nenhuma tabela é reconstruída
 * e nenhum dado legado é apagado, reduzido ou convertido — percentuais acima de
 * 100% continuam armazenados e visíveis; novas escritas/edições de limite fora
 * da faixa passam a ser rejeitadas. A versão 3 é gravada na mesma transação.
 */
async function migrar003(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await aplicarTriggersPercentual(tx);
    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

async function reconstruirCategorias(tx: SQLiteDatabase, versaoDestino: number): Promise<void> {
  // 0. Resíduo de migração anterior: o objeto temporário não é reutilizado,
  //    excluído nem sobrescrito — aborta com erro descritivo.
  const residuos = await tx.getAllAsync<{ type: string; name: string }>(
    "SELECT type, name FROM sqlite_master WHERE name = 'categorias_nova_001'",
  );
  if (residuos.length > 0) {
    throw new ResiduoDeMigracao('categorias_nova_001');
  }

  // 1. Dependências inesperadas: triggers/views que tocam categorias.
  const dependencias = await tx.getAllAsync<{ type: string; name: string }>(
    "SELECT type, name FROM sqlite_master WHERE type IN ('trigger', 'view') AND sql LIKE '%categorias%'",
  );
  if (dependencias.length > 0) {
    throw new DependenciaInesperada(dependencias.map((d) => `${d.type} "${d.name}"`).join(', '));
  }

  // 2. FKs reais de outras tabelas (PRAGMA foreign_key_list, robusto a aspas e formatos).
  const referenciam = await tabelasQueReferenciam(tx, 'categorias');
  if (referenciam.length > 0) {
    throw new DependenciaInesperada(`tabela(s) com FK para categorias: [${referenciam.join(', ')}]`);
  }

  // 3. Índices inesperados em categorias: NÃO eliminamos o que não conhecemos — aborta.
  const indicesLegados = await indicesDeUsuario(tx, 'categorias');
  const indicesInesperados = indicesLegados.filter((i) => !INDICES_ESPERADOS.includes(i));
  if (indicesInesperados.length > 0) {
    throw new DependenciaInesperada(`índice(s) inesperado(s) em categorias: [${indicesInesperados.join(', ')}]`);
  }

  // 4. Colunas legadas devem ser exatamente as esperadas (extras indicam mudança de colega).
  const colunas = (await tx.getAllAsync<{ name: string }>('PRAGMA table_info(categorias)'))
    .map((c) => c.name)
    .sort();
  const esperadas: string[] = [...COLUNAS_CATEGORIAS].sort();
  const extras = colunas.filter((c) => !esperadas.includes(c));
  const ausentes = esperadas.filter((c) => !colunas.includes(c));
  if (extras.length > 0 || ausentes.length > 0) {
    throw new EstruturaLegadaInesperada(
      `colunas extras: [${extras.join(', ')}]; ausentes: [${ausentes.join(', ')}]`,
    );
  }

  // 5. Validação dos registros legados: qualquer linha inválida aborta, sem corrigir nada.
  const invalidas = await tx.getAllAsync<RegistroInvalido>(
    `SELECT id, nome, motivo FROM (
       SELECT id, nome,
         CASE
           WHEN nome IS NULL OR length(nome) < 1 OR length(nome) > 30
             THEN 'nome fora da faixa de 1 a 30 caracteres'
           WHEN padrao IS NULL OR padrao NOT IN (0, 1)
             THEN 'padrao fora de (0, 1)'
           WHEN sync_status IS NULL OR sync_status NOT IN ('pendente', 'sincronizado')
             THEN 'sync_status inválido'
           WHEN limite_tipo IS NOT NULL AND limite_tipo NOT IN ('valor', 'percentual_renda')
             THEN 'limite_tipo desconhecido'
           WHEN limite_tipo IS NULL AND (limite_centavos IS NOT NULL OR limite_percentual_centesimos IS NOT NULL)
             THEN 'limite preenchido sem limite_tipo'
           WHEN limite_tipo = 'valor' AND (
                  limite_centavos IS NULL OR limite_percentual_centesimos IS NOT NULL
                  OR typeof(limite_centavos) <> 'integer' OR limite_centavos <= 0 OR limite_centavos > 99999999999)
             THEN 'limite de valor incoerente'
           WHEN limite_tipo = 'percentual_renda' AND (
                  limite_centavos IS NOT NULL OR limite_percentual_centesimos IS NULL
                  OR typeof(limite_percentual_centesimos) <> 'integer' OR limite_percentual_centesimos <= 0)
             THEN 'limite percentual incoerente'
           WHEN limite_tipo = 'percentual_renda'
                AND typeof(limite_percentual_centesimos) = 'integer'
                AND limite_percentual_centesimos > ${LIMITE_PERCENTUAL_MAX}
             THEN 'limite percentual acima do máximo técnico seguro'
           ELSE NULL
         END AS motivo
       FROM categorias
     )
     WHERE motivo IS NOT NULL`,
  );
  if (invalidas.length > 0) throw new DadosLegadosInvalidos(invalidas);

  const totalAntes =
    (await tx.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categorias'))?.n ?? 0;

  // 6. Reconstrução: tabela nova → cópia explícita → excluir antiga → renomear → índices.
  await tx.runAsync('DROP INDEX IF EXISTS idx_categorias_nome_unico');
  await tx.runAsync('DROP INDEX IF EXISTS idx_categorias_sync');
  await tx.runAsync(DDL_TABELA_CATEGORIAS('categorias_nova_001'));
  await tx.runAsync(
    `INSERT INTO categorias_nova_001 (${COLUNAS_CATEGORIAS.join(', ')})
     SELECT ${COLUNAS_CATEGORIAS.join(', ')} FROM categorias`,
  );
  await tx.runAsync('DROP TABLE categorias');
  await tx.runAsync('ALTER TABLE categorias_nova_001 RENAME TO categorias');
  for (const ddl of INDICES_CATEGORIAS) await tx.runAsync(ddl);

  // 7. Pós-verificação: qualquer divergência reverte a transação inteira.
  const totalDepois =
    (await tx.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM categorias'))?.n ?? 0;
  if (totalDepois !== totalAntes) {
    throw new FalhaMigracao(`contagem de linhas divergiu (${totalAntes} → ${totalDepois})`);
  }

  const violacoesFk = await tx.getAllAsync<unknown>('PRAGMA foreign_key_check');
  if (violacoesFk.length > 0) {
    throw new FalhaMigracao('integridade referencial violada após a reconstrução');
  }

  const indices = await indicesDeUsuario(tx, 'categorias');
  for (const esperado of INDICES_ESPERADOS) {
    if (!indices.includes(esperado)) {
      throw new FalhaMigracao(`índice "${esperado}" ausente após a reconstrução`);
    }
  }

  // 8. Versão gravada na MESMA transação: commit e migração são atômicos.
  await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
}
