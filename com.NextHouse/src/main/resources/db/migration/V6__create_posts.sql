-- ══════════════════════════════════════════════════════════════════════════════
-- V6__create_posts.sql
-- Posts + comments + likes + saved posts.
-- CommunityScopedEntity: inherits GeoBaseEntity + community_id + neighborhood_id FKs.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── posts ─────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
    -- BaseEntity
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,
    address          VARCHAR(500),
    city             VARCHAR(100),
    state            VARCHAR(100),
    country          VARCHAR(100),
    zip_code         VARCHAR(20),
    location         geography(Point, 4326),

    -- CommunityScopedEntity FKs
    community_id     BIGINT
                         CONSTRAINT fk_post_community
                         REFERENCES communities(id) ON DELETE SET NULL,
    neighborhood_id  BIGINT
                         CONSTRAINT fk_post_neighborhood
                         REFERENCES neighborhoods(id) ON DELETE SET NULL,

    -- Post fields
    post_type           VARCHAR(50)     NOT NULL
                            CONSTRAINT chk_post_type
                            CHECK (post_type IN (
                                'NEWS','HELP','MARKETPLACE','SAFETY',
                                'EVENT','RECOMMENDATION','GENERAL'
                            )),
    content             TEXT,
    visibility_radius   INTEGER         CONSTRAINT chk_visibility_radius CHECK (visibility_radius > 0),
    status              VARCHAR(20)     NOT NULL DEFAULT 'PUBLISHED'
                            CONSTRAINT chk_post_status
                            CHECK (status IN ('DRAFT','PUBLISHED','UNDER_REVIEW','REMOVED','ARCHIVED')),
    like_count          INTEGER         NOT NULL DEFAULT 0 CONSTRAINT chk_post_likes     CHECK (like_count    >= 0),
    comment_count       INTEGER         NOT NULL DEFAULT 0 CONSTRAINT chk_post_comments  CHECK (comment_count >= 0),
    share_count         INTEGER         NOT NULL DEFAULT 0 CONSTRAINT chk_post_shares    CHECK (share_count   >= 0),
    anonymous           BOOLEAN         NOT NULL DEFAULT FALSE,
    edited              BOOLEAN         NOT NULL DEFAULT FALSE,
    thumbnail_url       VARCHAR(500),
    hashtag_string      VARCHAR(500),

    -- Optimistic locking version
    version             BIGINT          NOT NULL DEFAULT 0,

    -- Author
    created_by  BIGINT  NOT NULL
                    CONSTRAINT fk_post_creator
                    REFERENCES users(id) ON DELETE RESTRICT
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_post_created_by      ON posts (created_by);
CREATE INDEX idx_post_community       ON posts (community_id);
CREATE INDEX idx_post_neighborhood    ON posts (neighborhood_id);
CREATE INDEX idx_post_status          ON posts (status);
CREATE INDEX idx_post_created_at      ON posts (created_at DESC);
CREATE INDEX idx_post_deleted         ON posts (is_deleted) WHERE is_deleted = FALSE;

-- Composite: neighbourhood + created_at — used by nearby feed query
CREATE INDEX idx_post_nbh_time        ON posts (neighborhood_id, created_at DESC)
    WHERE is_deleted = FALSE AND status = 'PUBLISHED';

-- Trending feed: neighbourhood + engagement score (like + comment*2) + time window
CREATE INDEX idx_post_trending        ON posts (neighborhood_id, created_at DESC, like_count DESC, comment_count DESC)
    WHERE is_deleted = FALSE AND status = 'PUBLISHED';

-- Hashtag search
CREATE INDEX idx_post_hashtag_trgm    ON posts USING GIN (hashtag_string gin_trgm_ops);

-- PostGIS spatial index
CREATE INDEX idx_post_location        ON posts USING GIST (location);

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_posts_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();

-- ── post_comments ─────────────────────────────────────────────────────────────
CREATE TABLE post_comments (
    id                BIGSERIAL   PRIMARY KEY,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    active            BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,

    comment           TEXT        NOT NULL,
    like_count        INTEGER     NOT NULL DEFAULT 0 CONSTRAINT chk_comment_likes CHECK (like_count >= 0),
    edited            BOOLEAN     NOT NULL DEFAULT FALSE,
    version           BIGINT      NOT NULL DEFAULT 0,

    -- Threading: self-referential FK (max depth enforced in service layer)
    parent_comment_id BIGINT
                          CONSTRAINT fk_comment_parent
                          REFERENCES post_comments(id) ON DELETE CASCADE,
    post_id           BIGINT      NOT NULL
                          CONSTRAINT fk_comment_post
                          REFERENCES posts(id) ON DELETE CASCADE,
    commented_by      BIGINT      NOT NULL
                          CONSTRAINT fk_comment_author
                          REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_post_comment_post     ON post_comments (post_id)   WHERE is_deleted = FALSE;
CREATE INDEX idx_post_comment_author   ON post_comments (commented_by);
CREATE INDEX idx_post_comment_parent   ON post_comments (parent_comment_id);
CREATE INDEX idx_post_comment_time     ON post_comments (post_id, created_at DESC) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── post_likes ────────────────────────────────────────────────────────────────
CREATE TABLE post_likes (
    id            BIGSERIAL   PRIMARY KEY,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted    BOOLEAN     NOT NULL DEFAULT FALSE,

    post_id       BIGINT      NOT NULL
                      CONSTRAINT fk_post_like_post
                      REFERENCES posts(id) ON DELETE CASCADE,
    liked_by      BIGINT      NOT NULL
                      CONSTRAINT fk_post_like_user
                      REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'LIKE'
                      CONSTRAINT chk_reaction_type
                      CHECK (reaction_type IN ('LIKE','HEART','HELPFUL','CELEBRATE','CURIOUS')),

    CONSTRAINT uq_post_like UNIQUE (post_id, liked_by)
);

CREATE INDEX idx_post_like_post     ON post_likes (post_id);
CREATE INDEX idx_post_like_liked_by ON post_likes (liked_by);

CREATE TRIGGER trg_post_likes_updated_at
    BEFORE UPDATE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── saved_posts ───────────────────────────────────────────────────────────────
CREATE TABLE saved_posts (
    id               BIGSERIAL    PRIMARY KEY,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,

    user_id          BIGINT       NOT NULL
                         CONSTRAINT fk_saved_post_user
                         REFERENCES users(id) ON DELETE CASCADE,
    post_id          BIGINT       NOT NULL
                         CONSTRAINT fk_saved_post_post
                         REFERENCES posts(id) ON DELETE CASCADE,
    collection_name  VARCHAR(100),

    CONSTRAINT uq_saved_post UNIQUE (user_id, post_id)
);

CREATE INDEX idx_saved_post_user ON saved_posts (user_id);
CREATE INDEX idx_saved_post_post ON saved_posts (post_id);

CREATE TRIGGER trg_saved_posts_updated_at
    BEFORE UPDATE ON saved_posts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
