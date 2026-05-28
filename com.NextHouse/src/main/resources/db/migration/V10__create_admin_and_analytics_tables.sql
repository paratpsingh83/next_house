-- ══════════════════════════════════════════════════════════════════════════════
-- V10__create_admin_and_analytics_tables.sql
-- reports, moderation_queue, recommendation_scores, search_history
-- ══════════════════════════════════════════════════════════════════════════════

-- ── reports ───────────────────────────────────────────────────────────────────
CREATE TABLE reports (
    id              BIGSERIAL   PRIMARY KEY,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,

    entity_type     VARCHAR(50) NOT NULL
                        CONSTRAINT chk_report_entity_type
                        CHECK (entity_type IN (
                            'POST','COMMENT','USER','ACTIVITY',
                            'MARKETPLACE','COMMUNITY','SAFETY_ALERT'
                        )),
    entity_id       BIGINT      NOT NULL,
    reason          VARCHAR(50) NOT NULL
                        CONSTRAINT chk_report_reason
                        CHECK (reason IN (
                            'SPAM','HARASSMENT','INAPPROPRIATE',
                            'MISINFORMATION','SAFETY_RISK','OTHER'
                        )),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CONSTRAINT chk_report_status
                        CHECK (status IN ('PENDING','REVIEWED','DISMISSED','ACTION_TAKEN')),
    resolved_note   TEXT,
    reviewed_at     TIMESTAMP,

    reported_by     BIGINT  NOT NULL
                        CONSTRAINT fk_report_reporter
                        REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_by     BIGINT
                        CONSTRAINT fk_report_reviewer
                        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_report_entity       ON reports (entity_type, entity_id);
CREATE INDEX idx_report_reported_by  ON reports (reported_by);
CREATE INDEX idx_report_status       ON reports (status);
-- Prevent a user from reporting the same entity twice
CREATE UNIQUE INDEX uq_report_per_user
    ON reports (entity_type, entity_id, reported_by)
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── moderation_queue ──────────────────────────────────────────────────────────
CREATE TABLE moderation_queue (
    id                BIGSERIAL   PRIMARY KEY,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    active            BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,

    content_type      VARCHAR(50) NOT NULL
                          CONSTRAINT chk_mod_content_type
                          CHECK (content_type IN (
                              'POST','COMMENT','MARKETPLACE','ACTIVITY',
                              'SAFETY_ALERT','USER','CHAT'
                          )),
    content_id        BIGINT      NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                          CONSTRAINT chk_mod_status
                          CHECK (status IN (
                              'PENDING','AUTO_APPROVED','AUTO_BLOCKED',
                              'MANUALLY_APPROVED','MANUALLY_BLOCKED','ESCALATED'
                          )),
    reason            VARCHAR(200),
    confidence_score  DOUBLE PRECISION
                          CONSTRAINT chk_confidence_score
                          CHECK (confidence_score IS NULL OR
                                 (confidence_score >= 0 AND confidence_score <= 1)),
    ai_response       TEXT,
    auto_blocked      BOOLEAN     NOT NULL DEFAULT FALSE,
    reviewed_at       TIMESTAMP,

    reviewed_by   BIGINT
                      CONSTRAINT fk_mod_reviewed_by
                      REFERENCES users(id) ON DELETE SET NULL,
    reported_by   BIGINT
                      CONSTRAINT fk_mod_reported_by
                      REFERENCES users(id) ON DELETE SET NULL,

    -- One queue entry per content item (upserted on multiple reports)
    CONSTRAINT uq_mod_queue_content UNIQUE (content_type, content_id)
);

CREATE INDEX idx_mod_status      ON moderation_queue (status);
CREATE INDEX idx_mod_entity      ON moderation_queue (content_type, content_id);
CREATE INDEX idx_mod_reviewed_by ON moderation_queue (reviewed_by);
CREATE INDEX idx_mod_pending     ON moderation_queue (created_at)
    WHERE status = 'PENDING';

CREATE TRIGGER trg_moderation_queue_updated_at
    BEFORE UPDATE ON moderation_queue
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── recommendation_scores ─────────────────────────────────────────────────────
CREATE TABLE recommendation_scores (
    id              BIGSERIAL   PRIMARY KEY,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id         BIGINT      NOT NULL
                        CONSTRAINT fk_rec_score_user
                        REFERENCES users(id) ON DELETE CASCADE,
    entity_type     VARCHAR(30) NOT NULL
                        CONSTRAINT chk_rec_entity_type
                        CHECK (entity_type IN ('POST','ACTIVITY','COMMUNITY','USER')),
    entity_id       BIGINT      NOT NULL,
    score           DOUBLE PRECISION    NOT NULL
                        CONSTRAINT chk_score CHECK (score >= 0),
    computed_at     TIMESTAMP,
    score_version   VARCHAR(20),

    CONSTRAINT uq_rec_score UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_rec_score_user        ON recommendation_scores (user_id);
CREATE INDEX idx_rec_score_user_type   ON recommendation_scores (user_id, entity_type);
-- ORDER BY score DESC — primary query pattern for top-N recommendations
CREATE INDEX idx_rec_score_user_score  ON recommendation_scores (user_id, score DESC);

CREATE TRIGGER trg_recommendation_scores_updated_at
    BEFORE UPDATE ON recommendation_scores
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── search_history ────────────────────────────────────────────────────────────
CREATE TABLE search_history (
    id           BIGSERIAL   PRIMARY KEY,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id      BIGINT      NOT NULL
                     CONSTRAINT fk_search_history_user
                     REFERENCES users(id) ON DELETE CASCADE,
    keyword      VARCHAR(200)    NOT NULL,
    search_type  VARCHAR(30)     NOT NULL DEFAULT 'ALL'
                     CONSTRAINT chk_search_type
                     CHECK (search_type IN (
                         'ALL','POST','USER','ACTIVITY','COMMUNITY','MARKETPLACE'
                     )),
    result_count INTEGER
);

-- Composite: user + recent searches
CREATE INDEX idx_search_user_time ON search_history (user_id, created_at DESC)
    WHERE is_deleted = FALSE;
-- Trending keywords query
CREATE INDEX idx_search_keyword_time ON search_history (keyword, created_at DESC);
-- Trigram for autocomplete prefix matching
CREATE INDEX idx_search_keyword_trgm ON search_history USING GIN (keyword gin_trgm_ops);

CREATE TRIGGER trg_search_history_updated_at
    BEFORE UPDATE ON search_history
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
