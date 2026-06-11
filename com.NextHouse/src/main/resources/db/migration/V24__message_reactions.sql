CREATE TABLE message_reactions (
    id         BIGSERIAL PRIMARY KEY,
    message_id BIGINT      NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    emoji      VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_message_reaction_user UNIQUE (message_id, user_id)
);

CREATE INDEX idx_message_reactions_message ON message_reactions (message_id);
