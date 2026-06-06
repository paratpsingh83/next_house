-- ══════════════════════════════════════════════════════════════════════════════
-- V13__chat_unsend_and_per_user_delete.sql
-- Adds unsend support and per-user message deletion to the chat system.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add is_unsent column to chat_messages ──────────────────────────────────
ALTER TABLE chat_messages
    ADD COLUMN is_unsent BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Per-user message deletion table ───────────────────────────────────────
-- Records that a specific user hid a message from their own chat history.
-- Unlike is_deleted (global), this only affects the requesting user's view.
CREATE TABLE chat_message_deletions (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    message_id  BIGINT      NOT NULL
                    CONSTRAINT fk_cmd_message
                    REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id     BIGINT      NOT NULL
                    CONSTRAINT fk_cmd_user
                    REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT uc_cmd_user_message UNIQUE (message_id, user_id)
);

CREATE INDEX idx_cmd_user_msg ON chat_message_deletions (user_id, message_id);

CREATE TRIGGER trg_chat_message_deletions_updated_at
    BEFORE UPDATE ON chat_message_deletions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();