-- ══════════════════════════════════════════════════════════════════════════════
-- V9__create_content_tables.sql
-- notifications, media_files, marketplace_items, borrow_requests, safety_alerts
-- ══════════════════════════════════════════════════════════════════════════════

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id                BIGSERIAL   PRIMARY KEY,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    active            BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,

    title             VARCHAR(200)    NOT NULL,
    message           TEXT,
    notification_type VARCHAR(50)     NOT NULL
                          CONSTRAINT chk_notification_type
                          CHECK (notification_type IN (
                              'LIKE','COMMENT','FOLLOW','ACTIVITY_JOIN_REQUEST',
                              'ACTIVITY_APPROVED','ACTIVITY_REJECTED',
                              'COMMUNITY_JOIN_REQUEST','COMMUNITY_APPROVED',
                              'SAFETY_ALERT','SYSTEM','MESSAGE'
                          )),
    reference_type    VARCHAR(50)
                          CONSTRAINT chk_notification_ref_type
                          CHECK (reference_type IN (
                              'POST','ACTIVITY','COMMENT','USER','COMMUNITY','SAFETY_ALERT', NULL
                          )),
    reference_id      BIGINT,
    is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
    push_sent         BOOLEAN     NOT NULL DEFAULT FALSE,
    websocket_sent    BOOLEAN     NOT NULL DEFAULT FALSE,
    redirect_url      VARCHAR(500),

    receiver_id   BIGINT  NOT NULL
                      CONSTRAINT fk_notification_receiver
                      REFERENCES users(id) ON DELETE CASCADE,
    sender_id     BIGINT
                      CONSTRAINT fk_notification_sender
                      REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_receiver       ON notifications (receiver_id);
CREATE INDEX idx_notification_receiver_read  ON notifications (receiver_id, is_read)
    WHERE is_deleted = FALSE;
CREATE INDEX idx_notification_created        ON notifications (created_at DESC);

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── media_files ───────────────────────────────────────────────────────────────
CREATE TABLE media_files (
    id                BIGSERIAL    PRIMARY KEY,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,

    url               VARCHAR(1000)   NOT NULL,
    type              VARCHAR(20)     NOT NULL
                          CONSTRAINT chk_media_type
                          CHECK (type IN ('IMAGE','VIDEO','AUDIO','DOCUMENT')),
    storage_provider  VARCHAR(30)
                          CONSTRAINT chk_storage_provider
                          CHECK (storage_provider IN ('S3','GCS','CLOUDINARY','LOCAL', NULL)),
    storage_key       VARCHAR(500),
    size              BIGINT          CONSTRAINT chk_file_size CHECK (size > 0),
    mime_type         VARCHAR(100),
    original_filename VARCHAR(255),
    thumbnail_url     VARCHAR(1000),
    width             INTEGER         CONSTRAINT chk_width  CHECK (width  > 0),
    height            INTEGER         CONSTRAINT chk_height CHECK (height > 0),
    entity_type       VARCHAR(50)     NOT NULL
                          CONSTRAINT chk_media_entity_type
                          CHECK (entity_type IN (
                              'POST','CHAT','ACTIVITY','MARKETPLACE',
                              'COMMUNITY','USER','BORROW_REQUEST'
                          )),
    entity_id         BIGINT          NOT NULL,
    uploaded_by       BIGINT          NOT NULL
                          CONSTRAINT fk_media_file_uploader
                          REFERENCES users(id) ON DELETE RESTRICT
);

-- Composite: polymorphic lookup — entity_type + entity_id
CREATE INDEX idx_media_entity   ON media_files (entity_type, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_media_uploader ON media_files (uploaded_by);

CREATE TRIGGER trg_media_files_updated_at
    BEFORE UPDATE ON media_files
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── marketplace_items ─────────────────────────────────────────────────────────
CREATE TABLE marketplace_items (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100),
    zip_code    VARCHAR(20),
    location    geography(Point, 4326),

    -- CommunityScopedEntity FKs
    community_id     BIGINT  CONSTRAINT fk_market_item_community    REFERENCES communities(id)  ON DELETE SET NULL,
    neighborhood_id  BIGINT  CONSTRAINT fk_market_item_neighborhood REFERENCES neighborhoods(id) ON DELETE SET NULL,

    title           VARCHAR(200)        NOT NULL,
    description     TEXT,
    category        VARCHAR(80),
    price           NUMERIC(12,2)       CONSTRAINT chk_price CHECK (price >= 0),
    condition_type  VARCHAR(20)
                        CONSTRAINT chk_condition
                        CHECK (condition_type IN ('NEW','LIKE_NEW','GOOD','FAIR','POOR','FREE', NULL)),
    negotiable      BOOLEAN     NOT NULL DEFAULT FALSE,
    available       BOOLEAN     NOT NULL DEFAULT TRUE,
    featured        BOOLEAN     NOT NULL DEFAULT FALSE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CONSTRAINT chk_market_status
                        CHECK (status IN ('ACTIVE','SOLD','REMOVED','EXPIRED')),
    thumbnail_url   VARCHAR(500),
    seller_id       BIGINT      NOT NULL
                        CONSTRAINT fk_market_item_seller
                        REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_market_seller       ON marketplace_items (seller_id);
CREATE INDEX idx_market_neighborhood ON marketplace_items (neighborhood_id);
CREATE INDEX idx_market_status       ON marketplace_items (status);
CREATE INDEX idx_market_category     ON marketplace_items (category);
CREATE INDEX idx_market_available    ON marketplace_items (available) WHERE available = TRUE;
CREATE INDEX idx_market_featured     ON marketplace_items (featured DESC, created_at DESC);
CREATE INDEX idx_market_location     ON marketplace_items USING GIST (location);
CREATE INDEX idx_market_title_trgm   ON marketplace_items USING GIN (title gin_trgm_ops);

CREATE TRIGGER trg_marketplace_items_updated_at
    BEFORE UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_marketplace_items_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();

-- ── borrow_requests ───────────────────────────────────────────────────────────
CREATE TABLE borrow_requests (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100),
    zip_code    VARCHAR(20),
    location    geography(Point, 4326),

    -- CommunityScopedEntity FKs
    community_id     BIGINT  CONSTRAINT fk_borrow_community    REFERENCES communities(id)  ON DELETE SET NULL,
    neighborhood_id  BIGINT  CONSTRAINT fk_borrow_neighborhood REFERENCES neighborhoods(id) ON DELETE SET NULL,

    title              VARCHAR(200) NOT NULL,
    description        TEXT,
    required_duration  VARCHAR(100),
    status             VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                           CONSTRAINT chk_borrow_status
                           CHECK (status IN ('OPEN','IN_PROGRESS','FULFILLED','CLOSED','CANCELLED')),

    requester_id          BIGINT  NOT NULL
                              CONSTRAINT fk_borrow_requester
                              REFERENCES users(id) ON DELETE RESTRICT,
    responded_by_user_id  BIGINT
                              CONSTRAINT fk_borrow_responder
                              REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_borrow_requester    ON borrow_requests (requester_id);
CREATE INDEX idx_borrow_neighborhood ON borrow_requests (neighborhood_id);
CREATE INDEX idx_borrow_status       ON borrow_requests (status);
CREATE INDEX idx_borrow_location     ON borrow_requests USING GIST (location);

CREATE TRIGGER trg_borrow_requests_updated_at
    BEFORE UPDATE ON borrow_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── safety_alerts ─────────────────────────────────────────────────────────────
CREATE TABLE safety_alerts (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100),
    zip_code    VARCHAR(20),
    location    geography(Point, 4326),

    -- CommunityScopedEntity FKs
    community_id     BIGINT  CONSTRAINT fk_safety_community    REFERENCES communities(id)  ON DELETE SET NULL,
    neighborhood_id  BIGINT  CONSTRAINT fk_safety_neighborhood REFERENCES neighborhoods(id) ON DELETE SET NULL,

    title       VARCHAR(200)    NOT NULL,
    description TEXT,
    alert_type  VARCHAR(50)
                    CONSTRAINT chk_alert_type
                    CHECK (alert_type IN (
                        'CRIME','FIRE','FLOOD','ANIMAL',
                        'LOST_PERSON','ACCIDENT','OTHER', NULL
                    )),
    severity    VARCHAR(20)     NOT NULL
                    CONSTRAINT chk_severity
                    CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    emergency   BOOLEAN         NOT NULL DEFAULT FALSE,
    verified    BOOLEAN         NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP,

    reported_by BIGINT  NOT NULL
                    CONSTRAINT fk_safety_alert_reporter
                    REFERENCES users(id) ON DELETE RESTRICT,
    resolved_by BIGINT
                    CONSTRAINT fk_safety_alert_resolver
                    REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_safety_neighborhood ON safety_alerts (neighborhood_id);
CREATE INDEX idx_safety_severity     ON safety_alerts (severity);
CREATE INDEX idx_safety_emergency    ON safety_alerts (emergency) WHERE emergency = TRUE;
CREATE INDEX idx_safety_reporter     ON safety_alerts (reported_by);
CREATE INDEX idx_safety_resolved     ON safety_alerts (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_safety_location     ON safety_alerts USING GIST (location);

CREATE TRIGGER trg_safety_alerts_updated_at
    BEFORE UPDATE ON safety_alerts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_safety_alerts_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON safety_alerts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();
