-- V15: Stories feature — 24-hour ephemeral user stories (Instagram/WhatsApp style)

CREATE TABLE stories (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT        NOT NULL,
    media_url        VARCHAR(2048),
    media_type       VARCHAR(10)   NOT NULL CHECK (media_type IN ('IMAGE','VIDEO','TEXT')),
    text_content     VARCHAR(500),
    background_color VARCHAR(20),
    expires_at       TIMESTAMP     NOT NULL,
    view_count       INTEGER       NOT NULL DEFAULT 0,
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP     NOT NULL DEFAULT now(),

    CONSTRAINT fk_story_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_story_user       ON stories (user_id);
CREATE INDEX idx_story_expires_at ON stories (expires_at);

-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE story_views (
    id         BIGSERIAL PRIMARY KEY,
    story_id   BIGINT    NOT NULL,
    viewer_id  BIGINT    NOT NULL,
    active     BOOLEAN   NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT uq_story_view        UNIQUE (story_id, viewer_id),
    CONSTRAINT fk_story_view_story  FOREIGN KEY (story_id)  REFERENCES stories(id),
    CONSTRAINT fk_story_view_viewer FOREIGN KEY (viewer_id) REFERENCES users(id)
);

CREATE INDEX idx_story_view_story  ON story_views (story_id);
CREATE INDEX idx_story_view_viewer ON story_views (viewer_id);