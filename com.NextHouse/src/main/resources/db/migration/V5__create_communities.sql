-- ══════════════════════════════════════════════════════════════════════════════
-- V5__create_communities.sql
-- Communities table. Depends on users + neighborhoods.
-- Self-referential FK for parent_community_id (sub-communities).
-- Inherits GeoBaseEntity geo columns.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE communities (
    -- BaseEntity
    id          BIGSERIAL    PRIMARY KEY,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100),
    zip_code    VARCHAR(20),
    location    geography(Point, 4326),

    -- Community fields
    name                VARCHAR(150)    NOT NULL,
    description         TEXT,
    community_type      VARCHAR(50),
    cover_image         VARCHAR(500),
    icon_image          VARCHAR(500),
    private_community   BOOLEAN         NOT NULL DEFAULT FALSE,
    verified            BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Relationships
    parent_community_id BIGINT
                            CONSTRAINT fk_community_parent
                            REFERENCES communities(id) ON DELETE SET NULL,
    neighborhood_id     BIGINT
                            CONSTRAINT fk_community_neighborhood
                            REFERENCES neighborhoods(id) ON DELETE SET NULL,
    created_by          BIGINT          NOT NULL
                            CONSTRAINT fk_community_creator
                            REFERENCES users(id) ON DELETE RESTRICT
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_community_created_by     ON communities (created_by);
CREATE INDEX idx_community_neighborhood   ON communities (neighborhood_id);
CREATE INDEX idx_community_type           ON communities (community_type);
CREATE INDEX idx_community_verified       ON communities (verified);
CREATE INDEX idx_community_parent         ON communities (parent_community_id);
CREATE INDEX idx_community_is_deleted     ON communities (is_deleted) WHERE is_deleted = FALSE;

-- PostGIS spatial index
CREATE INDEX idx_community_location ON communities USING GIST (location);

-- Full-text search
CREATE INDEX idx_community_name_trgm ON communities USING GIN (name gin_trgm_ops);
CREATE INDEX idx_community_desc_trgm ON communities USING GIN (description gin_trgm_ops);

CREATE TRIGGER trg_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_communities_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON communities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();

-- ── community_members ─────────────────────────────────────────────────────────
CREATE TABLE community_members (
    id                     BIGSERIAL   PRIMARY KEY,
    created_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
    active                 BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted             BOOLEAN     NOT NULL DEFAULT FALSE,

    community_id           BIGINT      NOT NULL
                               CONSTRAINT fk_community_member_community
                               REFERENCES communities(id) ON DELETE CASCADE,
    user_id                BIGINT      NOT NULL
                               CONSTRAINT fk_community_member_user
                               REFERENCES users(id) ON DELETE CASCADE,
    role                   VARCHAR(20) NOT NULL DEFAULT 'MEMBER'
                               CONSTRAINT chk_community_role
                               CHECK (role IN ('OWNER','ADMIN','MODERATOR','MEMBER')),
    approved               BOOLEAN     NOT NULL DEFAULT TRUE,
    muted                  BOOLEAN     NOT NULL DEFAULT FALSE,
    notifications_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

CREATE INDEX idx_community_member_community ON community_members (community_id);
CREATE INDEX idx_community_member_user      ON community_members (user_id);
CREATE INDEX idx_community_member_role      ON community_members (role);
CREATE INDEX idx_community_member_approved  ON community_members (community_id, approved);

CREATE TRIGGER trg_community_members_updated_at
    BEFORE UPDATE ON community_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
