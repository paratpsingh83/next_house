-- ══════════════════════════════════════════════════════════════════════════════
-- V14__private_accounts_and_follow_requests.sql
-- Adds private account flag to users and follow_requests table.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Private account flag on users ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Follow requests table ──────────────────────────────────────────────────
CREATE TABLE follow_requests (
    id           BIGSERIAL   PRIMARY KEY,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE,

    requester_id BIGINT NOT NULL
        CONSTRAINT fk_follow_req_requester REFERENCES users(id) ON DELETE CASCADE,
    target_id    BIGINT NOT NULL
        CONSTRAINT fk_follow_req_target    REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT uq_follow_request_pair UNIQUE (requester_id, target_id),
    CONSTRAINT chk_follow_req_no_self CHECK (requester_id <> target_id)
);

CREATE INDEX idx_follow_req_requester ON follow_requests (requester_id);
CREATE INDEX idx_follow_req_target    ON follow_requests (target_id);

CREATE TRIGGER trg_follow_requests_updated_at
    BEFORE UPDATE ON follow_requests
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();