/** Esquema da base local (RN06). Compartilhado pelo app e pelos testes. */

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
 * Não é um limite de negócio: a faixa percentual máxima continua pendente de
 * validação da cliente.
 */
export const LIMITE_PERCENTUAL_MAX = 9007199254740991;

/**
 * DDL da tabela de categorias, parametrizado para reuso na migração 001
 * (reconstrução segura de bancos legados — ver migrations.ts).
 * A faixa máxima de percentual (0,01% a 100%) NÃO é fixada aqui: pendente de
 * validação da cliente. Exige-se apenas valor inteiro, positivo e seguro para
 * o JavaScript (até Number.MAX_SAFE_INTEGER).
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

/** DDL completo do esquema (somente definições; os PRAGMAs ficam em PRAGMAS_SQL). */
export const DDL_ESQUEMA = `
    CREATE TABLE IF NOT EXISTS recorrencias (
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
    );

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

    CREATE INDEX IF NOT EXISTS idx_receitas_data ON receitas(data);
    CREATE INDEX IF NOT EXISTS idx_receitas_recorrencia ON receitas(recorrencia_id);
    CREATE INDEX IF NOT EXISTS idx_receitas_sync ON receitas(sync_status);

    ${DDL_TABELA_CATEGORIAS('categorias')}

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_unico
      ON categorias(nome_normalizado) WHERE excluido_em IS NULL;
    CREATE INDEX IF NOT EXISTS idx_categorias_sync ON categorias(sync_status);
  `;

/** Esquema completo (PRAGMAs + DDL), mantido para compatibilidade com os testes existentes. */
export const ESQUEMA_SQL = `
    ${PRAGMAS_SQL}

    ${DDL_ESQUEMA}
  `;
