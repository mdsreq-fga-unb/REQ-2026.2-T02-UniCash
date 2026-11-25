
/** Esquema da base local (RN06). Compartilhado pelo app e pelos testes. */
import { PERCENTUAL_MAX_CENTESIMOS, PERCENTUAL_MIN_CENTESIMOS } from '@/features/categorias/limites';

/**
 * PRAGMAs de conexão/banco. Executar FORA de transação: journal_mode não pode
 * ser alterado dentro dela e foreign_keys não é herdado pela conexão separada
 * usada por withExclusiveTransactionAsync (ver migrations.ts).
 */
export const PRAGMAS_SQL = `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `;

/**
 * Limite técnico seguro para percentuais em centésimos (Number.MAX_SAFE_INTEGER).
 * Não é um limite de negócio: a faixa definitiva de 1% a 100% é aplicada
 * separadamente por triggers aditivos (DDL_TRIGGER_PERCENTUAL).
 */
export const LIMITE_PERCENTUAL_MAX = 9007199254740991;

/**
 * DDL da tabela de categorias, parametrizado para reuso na migração 001
 * (reconstrução segura de bancos legados — ver migrations.ts).
 * A faixa de negócio (1% a 100%) NÃO é fixada por CHECK nesta tabela: os
 * triggers de DDL_TRIGGER_PERCENTUAL a aplicam sem bloquear a abertura de
 * bancos legados que ainda tenham percentuais fora da faixa. Aqui exige-se
 * apenas valor inteiro, positivo e seguro para o JavaScript (até
 * Number.MAX_SAFE_INTEGER).
 */
export const DDL_TABELA_CATEGORIAS = (tabela: string) => `
    CREATE TABLE IF NOT EXISTS ${tabela} (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL CONSTRAINT nome_valido CHECK (length(nome) BETWEEN 1 AND 30),
      nome_normalizado TEXT NOT NULL,
      padrao INTEGER NOT NULL DEFAULT 0 CONSTRAINT padrao_valido CHECK (padrao IN (0, 1)),
      limite_tipo TEXT CONSTRAINT limite_tipo_valido
        CHECK (limite_tipo IS NULL OR limite_tipo IN ('valor', 'percentual_renda')),
      limite_centavos INTEGER CONSTRAINT limite_centavos_valido
        CHECK (
          limite_centavos IS NULL
          OR (typeof(limite_centavos) = 'integer' AND limite_centavos > 0 AND limite_centavos <= 99999999999)
        ),
      limite_percentual_centesimos INTEGER CONSTRAINT limite_percentual_valido
        CHECK (
          limite_percentual_centesimos IS NULL
          OR (
            typeof(limite_percentual_centesimos) = 'integer'
            AND limite_percentual_centesimos > 0
            AND limite_percentual_centesimos <= ${LIMITE_PERCENTUAL_MAX}
          )
        ),
      sync_status TEXT NOT NULL DEFAULT 'pendente'
        CONSTRAINT sync_status_valido CHECK (sync_status IN ('pendente', 'sincronizado')),
      excluido_em TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      -- Coerência entre tipo e coluna de limite. O CASE avalia explicitamente todas as
      -- combinações e termina em ELSE 0: cada ramo usa IS NULL/IS NOT NULL (resultado
      -- sempre 0 ou 1, nunca NULL), então combinação inválida não escapa do CHECK.
      -- Constraint de TABELA: precisa vir depois de todas as definições de colunas.
      CONSTRAINT limite_coerente CHECK (
        CASE
          WHEN limite_tipo IS NULL
            THEN (limite_centavos IS NULL AND limite_percentual_centesimos IS NULL)
          WHEN limite_tipo = 'valor'
            THEN (limite_centavos IS NOT NULL AND limite_percentual_centesimos IS NULL)
          WHEN limite_tipo = 'percentual_renda'
            THEN (limite_centavos IS NULL AND limite_percentual_centesimos IS NOT NULL)
          ELSE 0
        END
      )
    );
  `;

/**
 * DDL da tabela despesas (UC02), reutilizável na migração 004.
 * Mantém as mesmas colunas, constraints e FK do DDL_ESQUEMA.
 */
export const DDL_TABELA_DESPESAS = `CREATE TABLE IF NOT EXISTS despesas (
      id TEXT PRIMARY KEY NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data TEXT NOT NULL,
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
      recorrencia_id TEXT REFERENCES recorrencias(id),
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      excluido_em TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );`;

/**
 * Índices da tabela despesas (UC02), reutilizáveis na migração 004.
 * Cada item é uma instrução completa.
 */
export const DDL_INDICES_DESPESAS = [
  'CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data);',
  `CREATE INDEX IF NOT EXISTS idx_despesas_categoria_data
      ON despesas(categoria_id, data);`,
  `CREATE INDEX IF NOT EXISTS idx_despesas_recorrencia
      ON despesas(recorrencia_id);`,
  `CREATE INDEX IF NOT EXISTS idx_despesas_sync
      ON despesas(sync_status);`,
] as const;

const RECORRENCIAS_V4 = `CREATE TABLE IF NOT EXISTS recorrencias (
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
    );`;

/** Forma v5: a coluna de tombstone é acrescentada ao final, como no ALTER TABLE. */
export const DDL_RECORRENCIAS_V5 = `CREATE TABLE IF NOT EXISTS recorrencias (
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
      atualizado_em TEXT NOT NULL,
      excluido_em TEXT
    );`;

const DDL_ESQUEMA_BASE = (recorrencias: string) => `
    ${recorrencias}

    CREATE TABLE IF NOT EXISTS receitas (
      id TEXT PRIMARY KEY NOT NULL,
      valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
      data TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      recorrencia_id TEXT REFERENCES recorrencias(id),
      sync_status TEXT NOT NULL DEFAULT 'pendente',
      excluido_em TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );

    ${DDL_TABELA_DESPESAS}

    CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
    CREATE INDEX IF NOT EXISTS idx_receitas_recorrencia ON receitas(recorrencia_id);
    CREATE INDEX IF NOT EXISTS idx_receitas_sync ON receitas(sync_status);

    ${DDL_TABELA_CATEGORIAS('categorias')}

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_unico
      ON categorias(nome_normalizado) WHERE excluido_em IS NULL;
    CREATE INDEX IF NOT EXISTS idx_categorias_sync ON categorias(sync_status);

    ${DDL_INDICES_DESPESAS.join('\n    ')}
  `;

/** Forma histórica v4, preservada para as migrations 001–004. */
export const DDL_ESQUEMA = DDL_ESQUEMA_BASE(RECORRENCIAS_V4);

/** Forma v5, preservada para migrations e testes históricos. */
export const DDL_ESQUEMA_V5 = DDL_ESQUEMA_BASE(DDL_RECORRENCIAS_V5);

/**
 * Estado local explícito da categoria (v6).
 * - `semeadura`: padrão recém-criada, nunca editada nem reconciliada com a nuvem.
 * - `editado`: alteração local ainda não confirmada pela nuvem.
 * - `sincronizado`: o conteúdo local corresponde ao último estado remoto confirmado.
 *
 * Fica em tabela própria para não alterar a tabela `categorias` já existente e
 * para permitir migração aditiva, sem reconstrução nem perda de referências.
 */
export const DDL_TABELA_CATEGORIA_ESTADO = `
    CREATE TABLE IF NOT EXISTS categorias_estado (
      categoria_id TEXT PRIMARY KEY NOT NULL,
      estado_local TEXT NOT NULL DEFAULT 'editado'
        CONSTRAINT estado_local_valido
        CHECK (estado_local IN ('semeadura', 'editado', 'sincronizado'))
    );
  `;

/**
 * Fila durável de restauração adiada. Registros remotos cuja categoria ainda
 * não pôde ser resolvida ficam aqui, com o payload original, até que o vínculo
 * seja resolvido. Nunca são gravados como "Sem categoria" por falta de vínculo.
 */
export const DDL_TABELA_RESTAURACAO_PENDENTE = `
    CREATE TABLE IF NOT EXISTS restauracao_pendente (
      tipo TEXT NOT NULL
        CONSTRAINT tipo_pendente_valido
        CHECK (tipo IN ('categoria', 'despesa', 'recorrencia')),
      id TEXT NOT NULL,
      categoria_id TEXT,
      motivo TEXT NOT NULL,
      payload TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      registrado_em TEXT NOT NULL,
      PRIMARY KEY (tipo, id)
    );
  `;

export const DDL_INDICES_V6 = [
  `CREATE INDEX IF NOT EXISTS idx_restauracao_pendente_categoria
     ON restauracao_pendente(categoria_id);`,
  `CREATE INDEX IF NOT EXISTS idx_restauracao_pendente_tipo
     ON restauracao_pendente(tipo);`,
] as const;

/** Forma atual v6: acrescenta estado local e fila de restauração adiada. */
export const DDL_ESQUEMA_V6 = `
    ${DDL_ESQUEMA_V5}

    ${DDL_TABELA_CATEGORIA_ESTADO}

    ${DDL_TABELA_RESTAURACAO_PENDENTE}

    ${DDL_INDICES_V6.join('\n    ')}
  `;

/** Triggers de faixa percentual (definitiva 1%–100%). */
export const TRIGGERS_PERCENTUAL = [
  'trg_categorias_percentual_insert',
  'trg_categorias_percentual_update',
] as const;

export const DDL_TRIGGER_PERCENTUAL = `
    CREATE TRIGGER IF NOT EXISTS trg_categorias_percentual_insert
    BEFORE INSERT ON categorias
    WHEN NEW.limite_tipo = 'percentual_renda'
      AND typeof(NEW.limite_percentual_centesimos) = 'integer'
      AND (
        NEW.limite_percentual_centesimos < ${PERCENTUAL_MIN_CENTESIMOS}
        OR NEW.limite_percentual_centesimos > ${PERCENTUAL_MAX_CENTESIMOS}
      )
    BEGIN
      SELECT RAISE(ABORT, 'limite_percentual_faixa');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_categorias_percentual_update
    BEFORE UPDATE OF limite_tipo, limite_percentual_centesimos ON categorias
    WHEN NEW.limite_tipo = 'percentual_renda'
      AND typeof(NEW.limite_percentual_centesimos) = 'integer'
      AND (
        NEW.limite_percentual_centesimos < ${PERCENTUAL_MIN_CENTESIMOS}
        OR NEW.limite_percentual_centesimos > ${PERCENTUAL_MAX_CENTESIMOS}
      )
    BEGIN
      SELECT RAISE(ABORT, 'limite_percentual_faixa');
    END;
  `;


/** Tabela de saldo inicial (UC08 — RN16). */
export const DDL_TABELA_SALDO_INICIAL = `
  CREATE TABLE IF NOT EXISTS saldo_inicial (
    uid TEXT PRIMARY KEY NOT NULL,
    valor_centavos INTEGER NOT NULL
      CHECK (
        typeof(valor_centavos) = 'integer'
        AND valor_centavos BETWEEN -9007199254740991
        AND 9007199254740991
      ),
    mes_referencia TEXT NOT NULL
      CHECK (
        length(mes_referencia) = 7
        AND mes_referencia GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
        AND substr(mes_referencia, 1, 4) <> '0000'
        AND substr(mes_referencia, 6, 2) BETWEEN '01' AND '12'
      ),
    sync_status TEXT NOT NULL DEFAULT 'pendente'
      CHECK (sync_status IN ('pendente', 'sincronizado')),
    atualizado_em TEXT NOT NULL
  );
`;

/** Esquema completo (PRAGMAs + DDL), mantido para compatibilidade com os testes existentes. */
export const ESQUEMA_SQL = `
    ${PRAGMAS_SQL}

    ${DDL_ESQUEMA_V6}

    ${DDL_TRIGGER_PERCENTUAL}

    ${DDL_TABELA_SALDO_INICIAL}
  `;

