-- ══════════════════════════════════════════════════════════════════════════════
-- V7__create_activities.sql
-- Activities + activity members.
-- Activities extend CommunityScopedEntity (geo + community + neighborhood FKs).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── activities ────────────────────────────────────────────────────────────────
CREATE TABLE activities (
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
                         CONSTRAINT fk_activity_community
                         REFERENCES communities(id) ON DELETE SET NULL,
    neighborhood_id  BIGINT
                         CONSTRAINT fk_activity_neighborhood
                         REFERENCES neighborhoods(id) ON DELETE SET NULL,

    -- Activity fields
    title               VARCHAR(200)    NOT NULL,
    description         TEXT,
    activity_type       VARCHAR(30)     NOT NULL
                            CONSTRAINT chk_activity_type
                            CHECK (activity_type IN (
                                'SOCIAL','SPORTS','LEARNING','VOLUNTEERING',
                                'FOOD','ARTS','OUTDOOR','NEIGHBORHOOD_WATCH','OTHER'
                            )),
    activity_time       TIMESTAMP       NOT NULL,
    end_time            TIMESTAMP,
    max_members         INTEGER         CONSTRAINT chk_max_members CHECK (max_members > 0),
    cover_image         VARCHAR(500),
    private_activity    BOOLEAN         NOT NULL DEFAULT FALSE,
    approval_required   BOOLEAN         NOT NULL DEFAULT FALSE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'PUBLISHED'
                            CONSTRAINT chk_activity_status
                            CHECK (status IN (
                                'DRAFT','PUBLISHED','FULL','CANCELLED','COMPLETED','EXPIRED'
                            )),

    -- Optimistic locking
    version         BIGINT  NOT NULL DEFAULT 0,

    -- Host
    host_user_id    BIGINT  NOT NULL
                        CONSTRAINT fk_activity_host_user
                        REFERENCES users(id) ON DELETE RESTRICT,

    -- End time must be after start time
    CONSTRAINT chk_activity_times CHECK (end_time IS NULL OR end_time > activity_time)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_activity_host            ON activities (host_user_id);
CREATE INDEX idx_activity_community       ON activities (community_id);
CREATE INDEX idx_activity_neighborhood    ON activities (neighborhood_id);
CREATE INDEX idx_activity_status          ON activities (status);
CREATE INDEX idx_activity_time            ON activities (activity_time);
CREATE INDEX idx_activity_deleted         ON activities (is_deleted) WHERE is_deleted = FALSE;

-- Composite: neighbourhood + time — used by community activities feed
CREATE INDEX idx_activity_nbh_time        ON activities (neighborhood_id, activity_time ASC)
    WHERE is_deleted = FALSE AND status IN ('PUBLISHED','FULL');

-- PostGIS: nearby activities query
CREATE INDEX idx_activity_location        ON activities USING GIST (location);

CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_activities_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON activities
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();

-- ── activity_members ──────────────────────────────────────────────────────────
CREATE TABLE activity_members (
    id              BIGSERIAL   PRIMARY KEY,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,

    activity_id     BIGINT      NOT NULL
                        CONSTRAINT fk_activity_member_activity
                        REFERENCES activities(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL
                        CONSTRAINT fk_activity_member_user
                        REFERENCES users(id) ON DELETE CASCADE,
    join_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CONSTRAINT chk_join_status
                        CHECK (join_status IN (
                            'PENDING','APPROVED','REJECTED','CANCELLED','WAITLISTED'
                        )),
    role            VARCHAR(20) NOT NULL DEFAULT 'MEMBER'
                        CONSTRAINT chk_activity_member_role
                        CHECK (role IN ('HOST','CO_HOST','MEMBER')),
    joined_at       TIMESTAMP,
    invited_by_user_id BIGINT
                        CONSTRAINT fk_activity_member_invited_by
                        REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT uq_activity_member UNIQUE (activity_id, user_id)
);

CREATE INDEX idx_activity_member_activity ON activity_members (activity_id);
CREATE INDEX idx_activity_member_user     ON activity_members (user_id);
CREATE INDEX idx_activity_member_status   ON activity_members (activity_id, join_status);

CREATE TRIGGER trg_activity_members_updated_at
    BEFORE UPDATE ON activity_members
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
