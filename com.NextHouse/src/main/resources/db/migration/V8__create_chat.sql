-- ══════════════════════════════════════════════════════════════════════════════
-- V8__create_chat.sql
-- Chat rooms + members + messages.
-- chat_messages has a self-referential FK (reply_to_message_id) for threading.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── chat_rooms ────────────────────────────────────────────────────────────────
CREATE TABLE chat_rooms (
    id                   BIGSERIAL    PRIMARY KEY,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    active               BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted           BOOLEAN      NOT NULL DEFAULT FALSE,

    room_type            VARCHAR(20)  NOT NULL
                             CONSTRAINT chk_room_type
                             CHECK (room_type IN ('DIRECT','GROUP','ACTIVITY','COMMUNITY')),
    title                VARCHAR(200),
    avatar_url           VARCHAR(500),
    last_message_at      TIMESTAMP,
    last_message_preview VARCHAR(150),

    activity_id   BIGINT
                      CONSTRAINT fk_chat_room_activity
                      REFERENCES activities(id) ON DELETE SET NULL,
    community_id  BIGINT
                      CONSTRAINT fk_chat_room_community
                      REFERENCES communities(id) ON DELETE SET NULL,
    created_by    BIGINT  NOT NULL
                      CONSTRAINT fk_chat_room_creator
                      REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_chat_room_activity    ON chat_rooms (activity_id);
CREATE INDEX idx_chat_room_community   ON chat_rooms (community_id);
CREATE INDEX idx_chat_room_created_by  ON chat_rooms (created_by);
CREATE INDEX idx_chat_room_last_msg    ON chat_rooms (last_message_at DESC NULLS LAST);
CREATE INDEX idx_chat_room_deleted     ON chat_rooms (is_deleted) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── chat_room_members ─────────────────────────────────────────────────────────
CREATE TABLE chat_room_members (
    id           BIGSERIAL   PRIMARY KEY,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN     NOT NULL DEFAULT FALSE,

    room_id      BIGINT      NOT NULL
                     CONSTRAINT fk_chat_room_member_room
                     REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id      BIGINT      NOT NULL
                     CONSTRAINT fk_chat_room_member_user
                     REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'MEMBER'
                     CONSTRAINT chk_chat_room_role
                     CHECK (role IN ('ADMIN','MEMBER')),
    muted        BOOLEAN     NOT NULL DEFAULT FALSE,
    last_read_at TIMESTAMP,
    joined_at    TIMESTAMP,

    CONSTRAINT uq_chat_room_member UNIQUE (room_id, user_id)
);

CREATE INDEX idx_chat_room_member_room ON chat_room_members (room_id);
CREATE INDEX idx_chat_room_member_user ON chat_room_members (user_id);
-- For inbox query: find all rooms for a user quickly
CREATE INDEX idx_chat_room_member_user_room ON chat_room_members (user_id, room_id)
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_chat_room_members_updated_at
    BEFORE UPDATE ON chat_room_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── chat_messages ─────────────────────────────────────────────────────────────
CREATE TABLE chat_messages (
    id                  BIGSERIAL   PRIMARY KEY,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    active              BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,

    message_type        VARCHAR(20) NOT NULL DEFAULT 'TEXT'
                            CONSTRAINT chk_message_type
                            CHECK (message_type IN ('TEXT','IMAGE','VIDEO','AUDIO','FILE','SYSTEM')),
    message             TEXT,
    media_url           VARCHAR(500),
    edited_at           TIMESTAMP,

    -- Threading: self-referential FK
    reply_to_message_id BIGINT
                            CONSTRAINT fk_chat_msg_reply_to
                            REFERENCES chat_messages(id) ON DELETE SET NULL,
    room_id             BIGINT  NOT NULL
                            CONSTRAINT fk_chat_msg_room
                            REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id           BIGINT  NOT NULL
                            CONSTRAINT fk_chat_msg_sender
                            REFERENCES users(id) ON DELETE RESTRICT,

    -- Either message text or media_url must be present
    CONSTRAINT chk_message_content
        CHECK (message IS NOT NULL OR media_url IS NOT NULL OR message_type = 'SYSTEM')
);

-- Composite: room + created_at DESC — primary query pattern for chat history
CREATE INDEX idx_chat_msg_room_created  ON chat_messages (room_id, created_at DESC)
    WHERE is_deleted = FALSE;
CREATE INDEX idx_chat_msg_sender        ON chat_messages (sender_id);
CREATE INDEX idx_chat_msg_reply_to      ON chat_messages (reply_to_message_id);

-- Partial index: unread count query — messages after lastReadAt
CREATE INDEX idx_chat_msg_room_time     ON chat_messages (room_id, created_at)
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
