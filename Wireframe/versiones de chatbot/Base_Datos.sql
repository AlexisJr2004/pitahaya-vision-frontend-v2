-- =============================================================
-- PITAHAYA VISION — Script de creación de base de datos
-- =============================================================
-- Orden de creación respetando dependencias de FK


-- =============================================================
-- MÓDULO: AUTH
-- =============================================================

CREATE TABLE auth_permission (
    id_permission   SERIAL          PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    codename        VARCHAR(255)    NOT NULL,
    content_type    INT             NOT NULL
);

-- -------------------------------------------------------------

CREATE TABLE auth_group (
    id_group    SERIAL          PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL
);

-- -------------------------------------------------------------
-- Tabla puente: grupo ↔ permiso  (relación "posee / se otorga a")
-- -------------------------------------------------------------

CREATE TABLE auth_group_permissions (
    id_group_permissions    SERIAL  PRIMARY KEY,
    id_group                INT     NOT NULL,
    id_permission           INT     NOT NULL,

    CONSTRAINT fk_agp_group
        FOREIGN KEY (id_group)
        REFERENCES auth_group (id_group)
        ON DELETE CASCADE,

    CONSTRAINT fk_agp_permission
        FOREIGN KEY (id_permission)
        REFERENCES auth_permission (id_permission)
        ON DELETE CASCADE,

    CONSTRAINT uq_agp_group_permission
        UNIQUE (id_group, id_permission)
);

-- -------------------------------------------------------------

CREATE TABLE auth_user (
    id_user         SERIAL          PRIMARY KEY,
    username        VARCHAR(150)    NOT NULL UNIQUE,
    email           VARCHAR(254)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(150),
    last_name       VARCHAR(150),
    dni             VARCHAR(20)             UNIQUE,
    phone           VARCHAR(20)             UNIQUE,
    profile_photo   VARCHAR(500),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_superuser    BOOLEAN         NOT NULL DEFAULT FALSE
);

-- -------------------------------------------------------------
-- Tabla puente: usuario ↔ grupo  (relación "contiene / pertenece")
-- -------------------------------------------------------------

CREATE TABLE auth_user_groups (
    id_user_groups  SERIAL  PRIMARY KEY,
    id_user         INT     NOT NULL,
    id_group        INT     NOT NULL,

    CONSTRAINT fk_aug_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE,

    CONSTRAINT fk_aug_group
        FOREIGN KEY (id_group)
        REFERENCES auth_group (id_group)
        ON DELETE CASCADE,

    CONSTRAINT uq_aug_user_group
        UNIQUE (id_user, id_group)
);

-- -------------------------------------------------------------
-- Tabla puente: usuario ↔ permiso directo
-- (relación "tiene de forma directa / se asigna a")
-- -------------------------------------------------------------

CREATE TABLE auth_user_permission (
    id_user_permission  SERIAL  PRIMARY KEY,
    id_user             INT     NOT NULL,
    id_permission       INT     NOT NULL,

    CONSTRAINT fk_aup_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE,

    CONSTRAINT fk_aup_permission
        FOREIGN KEY (id_permission)
        REFERENCES auth_permission (id_permission)
        ON DELETE CASCADE,

    CONSTRAINT uq_aup_user_permission
        UNIQUE (id_user, id_permission)
);


-- =============================================================
-- MÓDULO: AGRO
-- =============================================================

CREATE TABLE agro_conversation (
    id_conversation SERIAL          PRIMARY KEY,
    id_user         INT             NOT NULL,
    title           VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_conv_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- (relación "contiene")
-- -------------------------------------------------------------

CREATE TABLE agro_chat_message (
    id_chat_message     SERIAL          PRIMARY KEY,
    id_conversation     INT             NOT NULL,
    role                VARCHAR(50)     NOT NULL,   -- 'user' | 'assistant' | 'system'
    content             TEXT            NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_msg_conversation
        FOREIGN KEY (id_conversation)
        REFERENCES agro_conversation (id_conversation)
        ON DELETE CASCADE
);

-- -------------------------------------------------------------

CREATE TABLE agro_analysis_result (
    id_analysis_result      SERIAL          PRIMARY KEY,
    id_user                 INT             NOT NULL,
    image                   VARCHAR(500)    NOT NULL,
    context_description     TEXT,
    status                  VARCHAR(50),
    disease_name            VARCHAR(255),
    confidence              FLOAT,
    recomendation           TEXT,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ar_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE SET NULL
);


-- =============================================================
-- MÓDULO: RAG  (Retrieval-Augmented Generation)
-- =============================================================

CREATE TABLE rag_document (
    id_document     SERIAL              PRIMARY KEY,
    title           VARCHAR(500)        NOT NULL,
    source_path     VARCHAR(1000)       NOT NULL UNIQUE,
    file_hash       VARCHAR(255),
    chunks_count    INT                 NOT NULL DEFAULT 0,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- (relación "contiene")
-- -------------------------------------------------------------

CREATE TABLE rag_chunk (
    id_chunk            SERIAL          PRIMARY KEY,
    id_document         INT             NOT NULL,
    chunk_index         INT             NOT NULL,
    text                TEXT            NOT NULL,
    page                INT,
    embedding           BYTEA,
    embedding_dim       INT,
    embedding_model     VARCHAR(255),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_chunk_document_index
        UNIQUE (id_document, chunk_index),

    CONSTRAINT fk_chunk_document
        FOREIGN KEY (id_document)
        REFERENCES rag_document (id_document)
        ON DELETE CASCADE
);


-- =============================================================
-- PITAHAYA VISION — Script completo de base de datos
-- =============================================================
-- Orden de creación respetando dependencias de FK


-- =============================================================
-- MÓDULO: AUTH
-- =============================================================

CREATE TABLE auth_permission (
    id_permission   SERIAL          PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    codename        VARCHAR(255)    NOT NULL,
    content_type    INT             NOT NULL
);

CREATE TABLE auth_group (
    id_group    SERIAL          PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL
);

CREATE TABLE auth_group_permissions (
    id_group_permissions    SERIAL  PRIMARY KEY,
    id_group                INT     NOT NULL,
    id_permission           INT     NOT NULL,

    CONSTRAINT fk_agp_group
        FOREIGN KEY (id_group)
        REFERENCES auth_group (id_group)
        ON DELETE CASCADE,

    CONSTRAINT fk_agp_permission
        FOREIGN KEY (id_permission)
        REFERENCES auth_permission (id_permission)
        ON DELETE CASCADE,

    CONSTRAINT uq_agp_group_permission
        UNIQUE (id_group, id_permission)
);

CREATE TABLE auth_user (
    id_user         SERIAL          PRIMARY KEY,
    username        VARCHAR(150)    NOT NULL UNIQUE,
    email           VARCHAR(254)    NOT NULL UNIQUE,
    password        VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(150),
    last_name       VARCHAR(150),
    dni             VARCHAR(20)     UNIQUE,
    phone           VARCHAR(20)     UNIQUE,
    profile_photo   VARCHAR(500),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_superuser    BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE TABLE auth_user_groups (
    id_user_groups  SERIAL  PRIMARY KEY,
    id_user         INT     NOT NULL,
    id_group        INT     NOT NULL,

    CONSTRAINT fk_aug_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE,

    CONSTRAINT fk_aug_group
        FOREIGN KEY (id_group)
        REFERENCES auth_group (id_group)
        ON DELETE CASCADE,

    CONSTRAINT uq_aug_user_group
        UNIQUE (id_user, id_group)
);

CREATE TABLE auth_user_permission (
    id_user_permission  SERIAL  PRIMARY KEY,
    id_user             INT     NOT NULL,
    id_permission       INT     NOT NULL,

    CONSTRAINT fk_aup_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE,

    CONSTRAINT fk_aup_permission
        FOREIGN KEY (id_permission)
        REFERENCES auth_permission (id_permission)
        ON DELETE CASCADE,

    CONSTRAINT uq_aup_user_permission
        UNIQUE (id_user, id_permission)
);


-- =============================================================
-- MÓDULO: RAG (Retrieval-Augmented Generation)
-- =============================================================

CREATE TABLE rag_document (
    id_document     SERIAL              PRIMARY KEY,
    title           VARCHAR(500)        NOT NULL,
    source_path     VARCHAR(1000)       NOT NULL UNIQUE,
    file_hash       VARCHAR(255),
    chunks_count    INT                 NOT NULL DEFAULT 0,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE TABLE rag_chunk (
    id_chunk            SERIAL          PRIMARY KEY,
    id_document         INT             NOT NULL,
    chunk_index         INT             NOT NULL,
    text                TEXT            NOT NULL,
    page                INT,
    embedding           BYTEA,
    embedding_dim       INT,
    embedding_model     VARCHAR(255),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_chunk_document_index
        UNIQUE (id_document, chunk_index),

    CONSTRAINT fk_chunk_document
        FOREIGN KEY (id_document)
        REFERENCES rag_document (id_document)
        ON DELETE CASCADE
);


-- =============================================================
-- MÓDULO: AGRO
-- =============================================================

-- FINCAS (propiedades del usuario)
CREATE TABLE agro_farm (
    id_farm         SERIAL          PRIMARY KEY,
    id_user         INT             NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    location        VARCHAR(500),
    hectares        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_farm_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE
);

-- PARCELAS (dentro de una finca)
CREATE TABLE agro_plot (
    id_plot         SERIAL          PRIMARY KEY,
    id_farm         INT             NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    hectares        DECIMAL(10,2)   NOT NULL DEFAULT 0,
    crop_variety    VARCHAR(255),
    gps_location    VARCHAR(500),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_plot_farm
        FOREIGN KEY (id_farm)
        REFERENCES agro_farm (id_farm)
        ON DELETE CASCADE
);

-- CONVERSACIONES (sesiones de chat)
CREATE TABLE agro_conversation (
    id_conversation SERIAL          PRIMARY KEY,
    id_user         INT             NOT NULL,
    title           VARCHAR(500),
    preview         VARCHAR(500),
    id_context      INT,
    pinned_at       TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_conv_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE CASCADE
);

-- MENSAJES DEL CHAT
CREATE TABLE agro_chat_message (
    id_chat_message     SERIAL          PRIMARY KEY,
    id_conversation     INT             NOT NULL,
    role                VARCHAR(50)     NOT NULL,
    content             TEXT            NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_msg_conversation
        FOREIGN KEY (id_conversation)
        REFERENCES agro_conversation (id_conversation)
        ON DELETE CASCADE
);

-- CONTEXTO DE LA CONVERSACIÓN (formulario previo al escaneo)
CREATE TABLE agro_context (
    id_context          SERIAL          PRIMARY KEY,
    id_conversation     INT             NOT NULL,
    id_plot             INT,

    -- Datos de la parcela (copiados para preservar histórico)
    datetime            TIMESTAMP,
    farm_name           VARCHAR(255),
    farm_location       VARCHAR(500),
    plot_name           VARCHAR(255),
    plot_gps            VARCHAR(500),
    plot_hectares       DECIMAL(10,2),
    crop_variety        VARCHAR(255),

    -- Estado sanitario
    plant_id            VARCHAR(255),
    main_symptom        VARCHAR(500),
    affected_part       VARCHAR(100),
    severity            VARCHAR(50),
    stage               VARCHAR(100),
    irrigation          VARCHAR(500),
    phytosanitary       VARCHAR(500),
    notes               TEXT,

    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_context_conversation
        FOREIGN KEY (id_conversation)
        REFERENCES agro_conversation (id_conversation)
        ON DELETE CASCADE,

    CONSTRAINT fk_context_plot
        FOREIGN KEY (id_plot)
        REFERENCES agro_plot (id_plot)
        ON DELETE SET NULL
);

-- FK de conversación a contexto
ALTER TABLE agro_conversation
    ADD CONSTRAINT fk_conv_context
        FOREIGN KEY (id_context)
        REFERENCES agro_context (id_context)
        ON DELETE SET NULL;

-- RESULTADOS DE ANÁLISIS (diagnóstico de imagen)
CREATE TABLE agro_analysis_result (
    id_analysis_result      SERIAL          PRIMARY KEY,
    id_user                 INT             NOT NULL,
    id_conversation         INT,
    id_plot                 INT,
    image                   VARCHAR(500)    NOT NULL,
    disease_name            VARCHAR(255),
    severity                VARCHAR(50),
    stage                   VARCHAR(100),
    affected_part           VARCHAR(100),
    probability             VARCHAR(50),
    confidence              FLOAT,
    context_description     TEXT,
    recommendations         TEXT,
    lot_id                  VARCHAR(255),
    zone                    VARCHAR(255),
    rows                    VARCHAR(255),
    plant_id                VARCHAR(255),
    location                VARCHAR(500),
    irrigation              VARCHAR(500),
    phytosanitary           VARCHAR(500),
    notes                   TEXT,
    status                  VARCHAR(50),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ar_user
        FOREIGN KEY (id_user)
        REFERENCES auth_user (id_user)
        ON DELETE SET NULL,

    CONSTRAINT fk_ar_conversation
        FOREIGN KEY (id_conversation)
        REFERENCES agro_conversation (id_conversation)
        ON DELETE SET NULL,

    CONSTRAINT fk_ar_plot
        FOREIGN KEY (id_plot)
        REFERENCES agro_plot (id_plot)
        ON DELETE SET NULL
);

-- HISTORIAL POR PLANTA (trazabilidad entre análisis)
CREATE TABLE agro_plant_history (
    id_plant_history    SERIAL          PRIMARY KEY,
    id_conversation     INT             NOT NULL,
    id_plot             INT,
    plant_key           VARCHAR(500)    NOT NULL,
    lot_id              VARCHAR(255),
    zone                VARCHAR(255),
    rows                VARCHAR(255),
    plant_id            VARCHAR(255),
    disease             VARCHAR(255),
    severity            VARCHAR(50),
    probability         VARCHAR(50),
    analysis            TEXT,
    recommendations     TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ph_conversation
        FOREIGN KEY (id_conversation)
        REFERENCES agro_conversation (id_conversation)
        ON DELETE CASCADE,

    CONSTRAINT fk_ph_plot
        FOREIGN KEY (id_plot)
        REFERENCES agro_plot (id_plot)
        ON DELETE SET NULL
);

CREATE INDEX idx_plant_history_plant_key ON agro_plant_history (plant_key);


-- =============================================================
-- ÍNDICES ADICIONALES
-- =============================================================

CREATE INDEX idx_farm_user               ON agro_farm (id_user);
CREATE INDEX idx_plot_farm               ON agro_plot (id_farm);
CREATE INDEX idx_conversation_user       ON agro_conversation (id_user);
CREATE INDEX idx_conversation_updated    ON agro_conversation (updated_at DESC);
CREATE INDEX idx_conversation_pinned     ON agro_conversation (pinned_at DESC NULLS LAST);
CREATE INDEX idx_context_conversation    ON agro_context (id_conversation);
CREATE INDEX idx_analysis_user           ON agro_analysis_result (id_user);
CREATE INDEX idx_analysis_conversation   ON agro_analysis_result (id_conversation);
CREATE INDEX idx_analysis_created        ON agro_analysis_result (created_at DESC);
CREATE INDEX idx_analysis_severity       ON agro_analysis_result (severity);


-- =============================================================
-- VISTA: Dashboard consolidado para el panel de admin
-- =============================================================

CREATE OR REPLACE VIEW vw_dashboard_analysis AS
SELECT
    ar.id_analysis_result   AS id,
    'analysis'              AS source_type,
    u.first_name || ' ' || u.last_name AS owner_name,
    ar.severity,
    ar.stage,
    ar.affected_part,
    ar.disease_name         AS disease,
    ar.probability,
    ar.context_description  AS diagnosis,
    ar.recommendations,
    ar.lot_id,
    ar.zone,
    ar.rows,
    ar.plant_id,
    ar.location,
    ar.irrigation,
    ar.phytosanitary,
    ar.notes,
    ar.image                AS image_url,
    ar.created_at
FROM agro_analysis_result ar
JOIN auth_user u ON u.id_user = ar.id_user

UNION ALL

SELECT
    ph.id_plant_history     AS id,
    'plant_history'         AS source_type,
    u.first_name || ' ' || u.last_name AS owner_name,
    ph.severity,
    NULL                    AS stage,
    NULL                    AS affected_part,
    ph.disease,
    ph.probability,
    ph.analysis             AS diagnosis,
    ph.recommendations,
    ph.lot_id,
    ph.zone,
    ph.rows,
    ph.plant_id,
    NULL                    AS location,
    NULL                    AS irrigation,
    NULL                    AS phytosanitary,
    NULL                    AS notes,
    NULL                    AS image_url,
    ph.created_at
FROM agro_plant_history ph
JOIN agro_conversation c ON c.id_conversation = ph.id_conversation
JOIN auth_user u ON u.id_user = c.id_user

ORDER BY created_at DESC;
