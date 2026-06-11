CREATE TABLE notification_preferences (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    likes            BOOLEAN NOT NULL DEFAULT true,
    comments         BOOLEAN NOT NULL DEFAULT true,
    follows          BOOLEAN NOT NULL DEFAULT true,
    follow_requests  BOOLEAN NOT NULL DEFAULT true,
    messages         BOOLEAN NOT NULL DEFAULT true,
    activities       BOOLEAN NOT NULL DEFAULT true,
    marketplace      BOOLEAN NOT NULL DEFAULT false,
    safety_alerts    BOOLEAN NOT NULL DEFAULT true,
    communities      BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
