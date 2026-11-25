/**
 * Migrações versionadas da base local (PRAGMA user_version).
 *
 * REGRA DE EQUIPE: `PRAGMA user_version` é global ao banco. Toda mudança de
 * esquema de QUALQUER issue deve entrar aqui, como migração numerada apendada
 * ao registro MIGRACOES. Nunca ler nem gravar user_version fora deste arquivo.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  PERCENTUAL_MAX_CENTESIMOS,
  PERCENTUAL_MIN_CENTESIMOS,
} from '@/features/categorias/limites';
import {
  DDL_ESQUEMA,
  DDL_SALDO_INICIAL,
  DDL_INDICES_DESPESAS,
  DDL_INDICES_V6,
  DDL_RECORRENCIAS_V5,
  DDL_TABELA_CATEGORIA_ESTADO,
  DDL_TABELA_DESPESAS,
  DDL_TABELA_CATEGORIAS,
  DDL_TABELA_RESTAURACAO_PENDENTE,
  DDL_TRIGGER_PERCENTUAL,
  LIMITE_PERCENTUAL_MAX,
  TRIGGERS_PERCENTUAL,
} from './schema';

/** Versão atual do esquema local. Incrementar a cada nova migração. */
export const VERSAO_ESQUEMA = 8;

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
  constructor(detalhe: string, readonly tabela = 'categorias') {
    super(
      `Migração abortada: estrutura inesperada da tabela ${tabela} (${detalhe}). Nada foi alterado.`,
    );
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
 * dados legados.
 * A 004 integra as estruturas da UC02 (`recorrencias` e `despesas`).
 * A 005 adiciona o tombstone lógico de recorrências.
 * A 006 adiciona o estado local explícito das categorias e a fila de
 * restauração adiada, de forma aditiva e sem alterar dados existentes.
 * A 007 normaliza os percentuais legados para a faixa definitiva de 1% a 100%
 * e substitui os triggers da faixa provisória pelos definitivos.
 */
const MIGRACOES: Migracao[] = [
  { versao: 1, executar: migrar001 },
  { versao: 2, executar: migrar002 },
  { versao: 3, executar: migrar003 },
  { versao: 4, executar: migrar004 },
  { versao: 5, executar: migrar005 },
  { versao: 6, executar: migrar006 },
  { versao: 7, executar: migrar007 },
  { versao: 8, executar: migrar008 },
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

interface ColunaTabela {
  nome: string;
  tipo: 'TEXT' | 'INTEGER';
  notnull: 0 | 1;
  defaultValue: string | null;
  pk: 0 | 1;
}

interface ColunaRecorrencia extends ColunaTabela {
  nome: 'tipo' | 'categoria_id' | 'fixa_ou_variavel' | 'essencial';
  ddl: string;
}

interface ColunaRecorrenciaAtual {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/** Estruturas canônicas de recorrencias: base UC01/UC06 v3 e forma da UC02. */
const RECORRENCIAS_BASE_UC01 = `CREATE TABLE IF NOT EXISTS recorrencias (
      id TEXT PRIMARY KEY NOT NULL,
      intervalo INTEGER NOT NULL CHECK (intervalo > 0),
      unidade TEXT NOT NULL CHECK (unidade IN ('dia','mes','ano')),
      inicio TEXT NOT NULL,
      termino TEXT,
      ativa INTEGER NOT NULL DEFAULT 1,
      valor_centavos INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      atualizado_em TEXT NOT NULL
    )`;

const RECORRENCIAS_UC02 = `CREATE TABLE IF NOT EXISTS recorrencias (
      id TEXT PRIMARY KEY NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'receita'
        CHECK (tipo IN ('receita', 'despesa')),
      intervalo INTEGER NOT NULL CHECK (intervalo > 0),
      unidade TEXT NOT NULL CHECK (unidade IN ('dia','mes','ano')),
      inicio TEXT NOT NULL,
      termino TEXT,
      ativa INTEGER NOT NULL DEFAULT 1,
      valor_centavos INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      categoria_id TEXT,
      fixa_ou_variavel TEXT CHECK (
        fixa_ou_variavel IS NULL OR
        fixa_ou_variavel IN ('fixa', 'variavel')
      ),
      essencial INTEGER CHECK (
        essencial IS NULL OR essencial IN (0, 1)
      ),
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      atualizado_em TEXT NOT NULL
    )`;

const COLUNAS_NOVAS_RECORRENCIAS: ColunaRecorrencia[] = [
  {
    nome: 'tipo',
    ddl: `ALTER TABLE recorrencias ADD COLUMN tipo TEXT NOT NULL DEFAULT 'receita' CHECK (tipo IN ('receita', 'despesa'))`,
    tipo: 'TEXT',
    notnull: 1,
    defaultValue: "'receita'",
    pk: 0,
  },
  {
    nome: 'categoria_id',
    ddl: 'ALTER TABLE recorrencias ADD COLUMN categoria_id TEXT',
    tipo: 'TEXT',
    notnull: 0,
    defaultValue: null,
    pk: 0,
  },
  {
    nome: 'fixa_ou_variavel',
    ddl: `ALTER TABLE recorrencias ADD COLUMN fixa_ou_variavel TEXT CHECK (fixa_ou_variavel IS NULL OR fixa_ou_variavel IN ('fixa', 'variavel'))`,
    tipo: 'TEXT',
    notnull: 0,
    defaultValue: null,
    pk: 0,
  },
  {
    nome: 'essencial',
    ddl: `ALTER TABLE recorrencias ADD COLUMN essencial INTEGER CHECK (essencial IS NULL OR essencial IN (0, 1))`,
    tipo: 'INTEGER',
    notnull: 0,
    defaultValue: null,
    pk: 0,
  },
];

/** Normaliza a forma de origem para a forma armazenada por sqlite_master. */
function normalizarAssinatura(sql: string): string {
  return sql
    .replace(/^\s*CREATE (TABLE|INDEX) IF NOT EXISTS\s+/, 'CREATE $1 ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1')
    .trim()
    .replace(/;\s*$/, '');
}

const ASSINATURA_BASE_RECORRENCIAS = normalizarAssinatura(RECORRENCIAS_BASE_UC01);
const COLUNAS_ALTER_NORMALIZADAS = COLUNAS_NOVAS_RECORRENCIAS.map((coluna) =>
  normalizarAssinatura(coluna.ddl.replace(/^ALTER TABLE recorrencias ADD COLUMN /, '')),
);

function assinaturaComColunasAnexadas(quantidade: number): string {
  if (quantidade === 0) return ASSINATURA_BASE_RECORRENCIAS;
  const corpo = ASSINATURA_BASE_RECORRENCIAS.slice(0, -1);
  return `${corpo},${COLUNAS_ALTER_NORMALIZADAS.slice(0, quantidade).join(',')})`;
}

const ASSINATURAS_RECORRENCIAS: string[] = [
  assinaturaComColunasAnexadas(0),
  assinaturaComColunasAnexadas(1),
  assinaturaComColunasAnexadas(2),
  assinaturaComColunasAnexadas(3),
  assinaturaComColunasAnexadas(4),
  normalizarAssinatura(RECORRENCIAS_UC02),
];

/** Formas v5: UC02 canônica e a variante histórica com colunas anexadas. */
const ASSINATURA_RECORRENCIAS_V5 = normalizarAssinatura(DDL_RECORRENCIAS_V5);
const ASSINATURA_RECORRENCIAS_V5_ANEXADA = `${
  assinaturaComColunasAnexadas(4).slice(0, -1)
},excluido_em TEXT)`;
const ASSINATURAS_RECORRENCIAS_V5 = [
  ASSINATURA_RECORRENCIAS_V5,
  ASSINATURA_RECORRENCIAS_V5_ANEXADA,
];

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

  const inesperados = objetos.filter(
    (n) =>
      n !== 'recorrencias' &&
      n !== 'receitas' &&
      n !== 'despesas' &&
      n !== 'categorias_estado' &&
      n !== 'restauracao_pendente',
  );
  if (inesperados.length > 0) {
    throw new EstruturaLegadaInesperada(
      `instalação parcial com objetos não esperados: [${inesperados.join(', ')}]`,
    );
  }

  for (const nome of ['recorrencias', 'receitas'] as const) {
    if (!objetos.includes(nome)) continue;

    if (nome === 'recorrencias') {
      const { indice, quantidadeExistente } = await validarAssinaturaRecorrencias(
        tx,
        (detalhe) => new EstruturaLegadaInesperada(detalhe, 'recorrencias'),
      );
      if (indice !== 0 && indice !== 5) {
        throw new EstruturaLegadaInesperada(
          `"recorrencias" tem ${11 + quantidadeExistente} colunas, mas não corresponde à assinatura histórica UC01 (11) ou UC02 (15)`,
          'recorrencias',
        );
      }
    } else {
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
    }

    const indices = await indicesDeUsuario(tx, nome);
    const indicesInesperados = indices.filter((i) => !INDICES_ESPERADOS_OUTRAS[nome].includes(i));
    if (indicesInesperados.length > 0) {
      throw new EstruturaLegadaInesperada(
        `índice(s) inesperado(s) em "${nome}": [${indicesInesperados.join(', ')}]`,
      );
    }
  }

  if (objetos.includes('despesas')) {
    try {
      await validarTabelaDespesas(tx);
      await validarIndicesDespesas(tx, false);
    } catch (erro) {
      if (erro instanceof FalhaMigracao) {
        throw new EstruturaLegadaInesperada(erro.message, 'despesas');
      }
      throw erro;
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
  `< ${PERCENTUAL_MIN_CENTESIMOS}`,
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
      await garantirColunasRecorrencias(tx);
      await garantirTabelaDespesas(tx);
      await garantirColunaExcluidoEmRecorrencias(tx);
      await garantirTabelasV6(tx);
      await aplicarTriggersPercentual(tx);
      await tx.execAsync(DDL_SALDO_INICIAL);
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

/**
 * 004 — integra recorrencias e despesas da UC02 à cadeia versionada.
 * A versão só é gravada depois que os dois helpers concluem com sucesso.
 */
async function migrar004(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await garantirColunasRecorrencias(tx);
    await garantirTabelaDespesas(tx);
    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

/**
 * 005 — tombstone lógico de recorrências.
 * Aditiva e transacional: preserva os dados e só grava a versão após validar.
 */
async function migrar005(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await garantirColunaExcluidoEmRecorrencias(tx);
    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

/**
 * 006 — estado local explícito das categorias e fila de restauração adiada.
 *
 * Aditiva: cria apenas duas tabelas e seus índices. Nenhuma tabela existente é
 * reconstruída e nenhum dado financeiro é alterado. Categorias já existentes
 * recebem um estado inicial inferido de forma conservadora:
 * - padrão ativa, sem limite e com timestamps iguais = `semeadura`;
 * - qualquer outro caso = `editado`.
 * Assim, uma padrão intocada não sobrescreve limite remoto, e uma categoria
 * possivelmente editada nunca é tratada como recém-semeada.
 */
async function garantirTabelasV6(tx: SQLiteDatabase): Promise<void> {
  await tx.execAsync(DDL_TABELA_CATEGORIA_ESTADO);
  await tx.execAsync(DDL_TABELA_RESTAURACAO_PENDENTE);
  for (const ddl of DDL_INDICES_V6) await tx.execAsync(ddl);
}

async function migrar006(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await garantirTabelasV6(tx);

    await tx.runAsync(
      `INSERT INTO categorias_estado (categoria_id, estado_local)
       SELECT id,
         CASE
           WHEN padrao = 1
             AND excluido_em IS NULL
             AND limite_tipo IS NULL
             AND criado_em = atualizado_em
           THEN 'semeadura'
           ELSE 'editado'
         END
       FROM categorias
       WHERE 1
       ON CONFLICT(categoria_id) DO NOTHING`,
    );

    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

/**
 * Substitui os triggers da faixa provisória (somente máximo) pelos da faixa
 * definitiva (1% a 100%). Triggers ausentes são criados; definições
 * desconhecidas abortam sem alteração, preservando mudanças de colegas.
 */
async function substituirTriggersPercentualDefinitivos(tx: SQLiteDatabase): Promise<void> {
  const linhas = await tx.getAllAsync<{ name: string; sql: string | null }>(
    "SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
    [...TRIGGERS_PERCENTUAL],
  );

  const temMarcasDefinitivas = (sql: string) =>
    MARCAS_TRIGGER_PERCENTUAL.every((marca) => sql.includes(marca));
  const temMarcasProvisorias = (sql: string) =>
    sql.includes('limite_percentual_faixa') &&
    sql.includes(`> ${PERCENTUAL_MAX_CENTESIMOS}`) &&
    !sql.includes(`< ${PERCENTUAL_MIN_CENTESIMOS}`);

  for (const linha of linhas) {
    const sql = linha.sql ?? '';
    if (temMarcasDefinitivas(sql) || temMarcasProvisorias(sql)) continue;
    throw new DependenciaInesperada(
      `trigger "${linha.name}" com definição divergente da faixa percentual`,
    );
  }

  for (const nome of TRIGGERS_PERCENTUAL) {
    await tx.runAsync(`DROP TRIGGER IF EXISTS ${nome}`);
  }
  await tx.execAsync(DDL_TRIGGER_PERCENTUAL);
  await validarTriggersPercentual(tx);
}

/**
 * Normaliza percentuais legados para a faixa definitiva:
 * - abaixo de 1% vira 1% (100 centésimos);
 * - acima de 100% vira 100% (10.000 centésimos);
 * - casas excedentes são arredondadas para o inteiro mais próximo.
 *
 * Apenas categorias alteradas são marcadas como pendentes e recebem estado
 * local `editado`, para que a correção chegue ao Firestore. Despesas, receitas,
 * séries e referências financeiras não são tocadas. A operação é idempotente:
 * uma segunda execução não encontra mais linhas fora do padrão.
 */
async function normalizarPercentuaisLegados(tx: SQLiteDatabase): Promise<void> {
  const filtro = `
    limite_tipo = 'percentual_renda'
    AND limite_percentual_centesimos IS NOT NULL
    AND (
      limite_percentual_centesimos < ${PERCENTUAL_MIN_CENTESIMOS}
      OR limite_percentual_centesimos > ${PERCENTUAL_MAX_CENTESIMOS}
      OR CAST(ROUND(limite_percentual_centesimos) AS INTEGER) <> limite_percentual_centesimos
    )`;

  const alvos = await tx.getAllAsync<{ id: string }>(
    `SELECT id FROM categorias WHERE ${filtro} ORDER BY id`,
  );
  if (alvos.length === 0) return;

  const agoraIso = new Date().toISOString();
  await tx.runAsync(
    `UPDATE categorias
        SET limite_percentual_centesimos = CASE
              WHEN ROUND(limite_percentual_centesimos) < ${PERCENTUAL_MIN_CENTESIMOS}
                THEN ${PERCENTUAL_MIN_CENTESIMOS}
              WHEN ROUND(limite_percentual_centesimos) > ${PERCENTUAL_MAX_CENTESIMOS}
                THEN ${PERCENTUAL_MAX_CENTESIMOS}
              ELSE CAST(ROUND(limite_percentual_centesimos) AS INTEGER)
            END,
            sync_status = 'pendente',
            atualizado_em = ?
      WHERE ${filtro}`,
    [agoraIso],
  );

  for (const { id } of alvos) {
    await tx.runAsync(
      `INSERT INTO categorias_estado (categoria_id, estado_local)
       VALUES (?, 'editado')
       ON CONFLICT(categoria_id) DO UPDATE SET estado_local = excluded.estado_local`,
      [id],
    );
  }
}

/**
 * 007 — faixa percentual definitiva de 1% a 100%.
 *
 * Transacional e idempotente. Substitui os triggers provisórios, normaliza
 * dados legados e marca apenas as categorias corrigidas como pendentes. Não
 * altera despesas, receitas, recorrências nem referências financeiras.
 */
async function migrar007(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await substituirTriggersPercentualDefinitivos(tx);
    await normalizarPercentuaisLegados(tx);
    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

async function migrar008(db: SQLiteDatabase, versaoDestino: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(DDL_SALDO_INICIAL);
    await tx.execAsync(`PRAGMA user_version = ${versaoDestino}`);
  });
}

function validarColunaTabela(
  tabela: string,
  coluna: ColunaTabela,
  atual: ColunaRecorrenciaAtual,
): void {
  if (atual.type.toUpperCase() !== coluna.tipo) {
    throw new FalhaMigracao(
      `coluna "${coluna.nome}" de ${tabela}: tipo ${atual.type}, esperado ${coluna.tipo}`,
    );
  }
  if (atual.notnull !== coluna.notnull) {
    throw new FalhaMigracao(
      `coluna "${coluna.nome}" de ${tabela}: notnull ${atual.notnull}, esperado ${coluna.notnull}`,
    );
  }
  if ((atual.dflt_value ?? null) !== coluna.defaultValue) {
    throw new FalhaMigracao(
      `coluna "${coluna.nome}" de ${tabela}: default ${atual.dflt_value ?? 'NULL'}, esperado ${coluna.defaultValue ?? 'NULL'}`,
    );
  }
  if (atual.pk !== coluna.pk) {
    throw new FalhaMigracao(
      `coluna "${coluna.nome}" de ${tabela}: pk ${atual.pk}, esperado ${coluna.pk}`,
    );
  }
}

function validarColunaRecorrencia(
  coluna: ColunaRecorrencia,
  atual: ColunaRecorrenciaAtual,
): void {
  validarColunaTabela('recorrencias', coluna, atual);
}

/** Validação somente leitura das assinaturas UC01/UC02 de recorrencias. */
async function validarAssinaturaRecorrencias(
  tx: SQLiteDatabase,
  criarErro: (detalhe: string) => Error = (detalhe) => new FalhaMigracao(detalhe),
): Promise<{ indice: number; quantidadeExistente: number }> {
  const info = await tx.getAllAsync<ColunaRecorrenciaAtual>('PRAGMA table_info(recorrencias)');
  if (info.length === 0) {
    throw criarErro('tabela "recorrencias" ausente');
  }

  const sql = (
    await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'",
    )
  )?.sql ?? '';
  const assinatura = normalizarAssinatura(sql);
  const indice = ASSINATURAS_RECORRENCIAS.indexOf(assinatura);
  if (indice < 0) {
    throw criarErro('estrutura de "recorrencias" desconhecida');
  }

  const quantidadeExistente = indice === ASSINATURAS_RECORRENCIAS.length - 1 ? 4 : indice;
  const porNome = new Map(info.map((coluna) => [coluna.name, coluna]));

  for (const coluna of COLUNAS_NOVAS_RECORRENCIAS.slice(0, quantidadeExistente)) {
    const atual = porNome.get(coluna.nome);
    if (!atual) {
      throw criarErro(
        `assinatura de "recorrencias" indica a coluna "${coluna.nome}", mas ela está ausente`,
      );
    }
    try {
      validarColunaRecorrencia(coluna, atual);
    } catch (erro) {
      if (erro instanceof FalhaMigracao) {
        throw criarErro(erro.message);
      }
      throw erro;
    }
  }

  for (const coluna of COLUNAS_NOVAS_RECORRENCIAS.slice(quantidadeExistente)) {
    if (porNome.has(coluna.nome)) {
      throw criarErro(`coluna "${coluna.nome}" de recorrencias existe fora da assinatura canônica`);
    }
  }

  return { indice, quantidadeExistente };
}

/**
 * Garante as quatro colunas da UC02 em recorrencias, sem reconstruir a tabela.
 * Usa a transação recebida e não altera user_version.
 */
/** @internal Exportada para testes; não faz parte da API de produção. */
export async function garantirColunasRecorrencias(tx: SQLiteDatabase): Promise<void> {
  const { quantidadeExistente } = await validarAssinaturaRecorrencias(tx);

  for (const coluna of COLUNAS_NOVAS_RECORRENCIAS.slice(quantidadeExistente)) {
    await tx.execAsync(coluna.ddl);
  }

  const depois = await tx.getAllAsync<ColunaRecorrenciaAtual>('PRAGMA table_info(recorrencias)');
  const mapaDepois = new Map(depois.map((coluna) => [coluna.name, coluna]));
  for (const coluna of COLUNAS_NOVAS_RECORRENCIAS) {
    const atual = mapaDepois.get(coluna.nome);
    if (!atual) {
      throw new FalhaMigracao(`coluna "${coluna.nome}" ausente após ALTER TABLE`);
    }
    validarColunaRecorrencia(coluna, atual);
  }

  const sqlDepois = (
    await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'",
    )
  )?.sql ?? '';
  const indiceDepois = ASSINATURAS_RECORRENCIAS.indexOf(normalizarAssinatura(sqlDepois));
  if (indiceDepois !== 4 && indiceDepois !== ASSINATURAS_RECORRENCIAS.length - 1) {
    throw new FalhaMigracao('estrutura de "recorrencias" divergente após ALTER TABLE');
  }
}

async function validarTabelaRecorrenciasV5(tx: SQLiteDatabase): Promise<void> {
  const sql = (
    await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'",
    )
  )?.sql ?? '';

  if (!ASSINATURAS_RECORRENCIAS_V5.includes(normalizarAssinatura(sql))) {
    throw new FalhaMigracao('estrutura v5 de "recorrencias" divergente');
  }

  const colunas = await tx.getAllAsync<ColunaRecorrenciaAtual>(
    'PRAGMA table_info(recorrencias)',
  );
  const excluido = colunas[colunas.length - 1];

  if (
    colunas.length !== 16 ||
    excluido?.name !== 'excluido_em' ||
    excluido.type.toUpperCase() !== 'TEXT' ||
    excluido.notnull !== 0 ||
    excluido.pk !== 0
  ) {
    throw new FalhaMigracao('coluna "excluido_em" ausente ou inválida em "recorrencias"');
  }
}

/** Acrescenta a coluna v5 sem alterar a migration 004 nem suas assinaturas históricas. */
/** @internal Exportada para testes; não faz parte da API de produção. */
export async function garantirColunaExcluidoEmRecorrencias(
  tx: SQLiteDatabase,
): Promise<void> {
  const sql = (
    await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recorrencias'",
    )
  )?.sql ?? '';
  const assinatura = normalizarAssinatura(sql);

  if (ASSINATURAS_RECORRENCIAS_V5.includes(assinatura)) {
    await validarTabelaRecorrenciasV5(tx);
    return;
  }

  // Antes do ALTER, a tabela precisa estar em uma forma v4 conhecida.
  await validarAssinaturaRecorrencias(tx);

  await tx.execAsync('ALTER TABLE recorrencias ADD COLUMN excluido_em TEXT');
  await validarTabelaRecorrenciasV5(tx);
}

const COLUNAS_DESPESAS: ColunaTabela[] = [
  { nome: 'id', tipo: 'TEXT', notnull: 1, defaultValue: null, pk: 1 },
  { nome: 'valor_centavos', tipo: 'INTEGER', notnull: 1, defaultValue: null, pk: 0 },
  { nome: 'data', tipo: 'TEXT', notnull: 1, defaultValue: null, pk: 0 },
  { nome: 'titulo', tipo: 'TEXT', notnull: 1, defaultValue: null, pk: 0 },
  { nome: 'descricao', tipo: 'TEXT', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'categoria_id', tipo: 'TEXT', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'fixa_ou_variavel', tipo: 'TEXT', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'essencial', tipo: 'INTEGER', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'recorrencia_id', tipo: 'TEXT', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'sync_status', tipo: 'TEXT', notnull: 1, defaultValue: "'pendente'", pk: 0 },
  { nome: 'excluido_em', tipo: 'TEXT', notnull: 0, defaultValue: null, pk: 0 },
  { nome: 'criado_em', tipo: 'TEXT', notnull: 1, defaultValue: null, pk: 0 },
  { nome: 'atualizado_em', tipo: 'TEXT', notnull: 1, defaultValue: null, pk: 0 },
];

const ASSINATURA_TABELA_DESPESAS = normalizarAssinatura(DDL_TABELA_DESPESAS);

const INDICES_DESPESAS_ESPERADOS = [
  { nome: 'idx_despesas_data', colunas: ['data'], unico: false, ddl: DDL_INDICES_DESPESAS[0] },
  {
    nome: 'idx_despesas_categoria_data',
    colunas: ['categoria_id', 'data'],
    unico: false,
    ddl: DDL_INDICES_DESPESAS[1],
  },
  {
    nome: 'idx_despesas_recorrencia',
    colunas: ['recorrencia_id'],
    unico: false,
    ddl: DDL_INDICES_DESPESAS[2],
  },
  { nome: 'idx_despesas_sync', colunas: ['sync_status'], unico: false, ddl: DDL_INDICES_DESPESAS[3] },
] as const;

async function validarTabelaDespesas(tx: SQLiteDatabase): Promise<void> {
  const tabela = await tx.getFirstAsync<{ sql: string | null }>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'despesas'",
  );
  if (!tabela?.sql || normalizarAssinatura(tabela.sql) !== ASSINATURA_TABELA_DESPESAS) {
    throw new FalhaMigracao('estrutura de "despesas" desconhecida');
  }

  const info = await tx.getAllAsync<ColunaRecorrenciaAtual>('PRAGMA table_info(despesas)');
  if (info.length !== COLUNAS_DESPESAS.length) {
    throw new FalhaMigracao(
      `"despesas" tem ${info.length} colunas; esperado ${COLUNAS_DESPESAS.length}`,
    );
  }

  const porNome = new Map(info.map((coluna) => [coluna.name, coluna]));
  for (const coluna of COLUNAS_DESPESAS) {
    const atual = porNome.get(coluna.nome);
    if (!atual) {
      throw new FalhaMigracao(`coluna "${coluna.nome}" ausente em "despesas"`);
    }
    validarColunaTabela('despesas', coluna, atual);
  }

  const extras = info.filter((coluna) => !COLUNAS_DESPESAS.some((c) => c.nome === coluna.name));
  if (extras.length > 0) {
    throw new FalhaMigracao(
      `coluna(s) inesperada(s) em "despesas": [${extras.map((c) => c.name).join(', ')}]`,
    );
  }

  const fks = await tx.getAllAsync<{ table: string; from: string; to: string }>(
    'PRAGMA foreign_key_list(despesas)',
  );
  const fk = fks.find((f) => f.from === 'recorrencia_id');
  if (fks.length !== 1 || !fk || fk.table !== 'recorrencias' || fk.to !== 'id') {
    throw new FalhaMigracao('FK de despesas.recorrencia_id inválida');
  }
}

async function validarIndicesDespesas(
  tx: SQLiteDatabase,
  exigirTodos: boolean,
): Promise<string[]> {
  const nomes = await indicesDeUsuario(tx, 'despesas');
  const esperados: string[] = INDICES_DESPESAS_ESPERADOS.map((indice) => indice.nome);
  const extras = nomes.filter((nome) => !esperados.includes(nome));
  if (extras.length > 0) {
    throw new FalhaMigracao(`índice(s) inesperado(s) em "despesas": [${extras.join(', ')}]`);
  }

  const lista = await tx.getAllAsync<{
    name: string;
    unique: number;
    partial: number;
    origin: string;
  }>('PRAGMA index_list(despesas)');
  const faltantes: string[] = [];

  for (const indice of INDICES_DESPESAS_ESPERADOS) {
    const atual = lista.find((item) => item.name === indice.nome);
    if (!atual) {
      faltantes.push(indice.nome);
      continue;
    }

    if (atual.unique !== (indice.unico ? 1 : 0) || atual.partial !== 0 || atual.origin !== 'c') {
      throw new FalhaMigracao(`índice "${indice.nome}" com definição incompatível`);
    }

    const sql = await tx.getFirstAsync<{ sql: string | null }>(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = ?",
      [indice.nome],
    );
    if (!sql?.sql || normalizarAssinatura(sql.sql) !== normalizarAssinatura(indice.ddl)) {
      throw new FalhaMigracao(`DDL do índice "${indice.nome}" divergente`);
    }

    const colunas = await tx.getAllAsync<{ name: string }>(
      `PRAGMA index_info("${indice.nome}")`,
    );
    if (colunas.map((coluna) => coluna.name).join(',') !== indice.colunas.join(',')) {
      throw new FalhaMigracao(`colunas do índice "${indice.nome}" divergentes`);
    }
  }

  if (exigirTodos && faltantes.length > 0) {
    throw new FalhaMigracao(`índice(s) ausente(s) em "despesas": [${faltantes.join(', ')}]`);
  }
  return faltantes;
}

/**
 * Garante a tabela despesas e seus índices, sem reconstruir nem apagar dados.
 * Usa a transação recebida e não altera user_version.
 */
/** @internal Exportada para testes; não faz parte da API de produção. */
export async function garantirTabelaDespesas(tx: SQLiteDatabase): Promise<void> {
  if (!(await existeTabela(tx, 'despesas'))) {
    await tx.execAsync(DDL_TABELA_DESPESAS);
  }

  await validarTabelaDespesas(tx);

  const faltantes = await validarIndicesDespesas(tx, false);
  for (const nome of faltantes) {
    const indice = INDICES_DESPESAS_ESPERADOS.find((item) => item.nome === nome);
    if (!indice) throw new FalhaMigracao(`índice esperado "${nome}" não encontrado`);
    await tx.execAsync(indice.ddl);
  }

  await validarIndicesDespesas(tx, true);
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
