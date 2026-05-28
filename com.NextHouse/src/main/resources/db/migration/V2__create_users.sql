-- ═══════════════════════════════════════════════════════════════════════
-- V2__create_users.sql  ← REPLACE YOUR EXISTING V2 FILE WITH THIS ONE
--
-- FIX: Added 8 GeoBaseEntity columns to users table.
--      Required because User entity now extends GeoBaseEntity.
--      These columns are needed by:
--        UserServiceImpl.updateLocation()   → sets latitude, longitude, address, city, state, zipCode, location
--        AuthServiceImpl.register()         → sets latitude, longitude, location
--        PostServiceImpl.getNearbyFeed()    → reads u.getLatitude()
--        RecommendationServiceImpl          → reads u.getLatitude() != null
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    -- BaseEntity
    id                          BIGSERIAL    PRIMARY KEY,
    created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
    active                      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted                  BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Identity
    name                        VARCHAR(100) NOT NULL,
    username                    VARCHAR(50)  NOT NULL,
    phone_number                VARCHAR(20)  NOT NULL,
    email                       VARCHAR(150),
    password                    TEXT,
    bio                         TEXT,
    profile_image               VARCHAR(500),
    gender                      VARCHAR(20),
    dob                         DATE,

    -- RBAC & status
    role                        VARCHAR(20)  NOT NULL DEFAULT 'USER'
                                    CONSTRAINT chk_user_role CHECK (role IN ('USER','ADMIN','MODERATOR')),
    verification_status         VARCHAR(30)  NOT NULL DEFAULT 'UNVERIFIED',
    account_status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                                    CONSTRAINT chk_user_account_status
                                    CHECK (account_status IN ('ACTIVE','INACTIVE','SUSPENDED','DELETED')),

    -- Trust & flags
    trust_score                 INTEGER      NOT NULL DEFAULT 0 CONSTRAINT chk_trust CHECK (trust_score >= 0),
    address_verified            BOOLEAN      NOT NULL DEFAULT FALSE,
    identity_verified           BOOLEAN      NOT NULL DEFAULT FALSE,
    banned                      BOOLEAN      NOT NULL DEFAULT FALSE,
    two_factor_enabled          BOOLEAN      NOT NULL DEFAULT FALSE,
    last_location_updated_at    TIMESTAMP,

    -- ── GeoBaseEntity columns (FIX: added — User now extends GeoBaseEntity) ──
    latitude                    DOUBLE PRECISION,
    longitude                   DOUBLE PRECISION,
    address                     VARCHAR(500),
    city                        VARCHAR(100),
    state                       VARCHAR(100),
    country                     VARCHAR(100),
    zip_code                    VARCHAR(20),
    -- PostGIS geography point for spatial queries
    location                    geography(Point, 4326),

    -- Unique constraints
    CONSTRAINT uq_users_username     UNIQUE (username),
    CONSTRAINT uq_users_email        UNIQUE (email),
    CONSTRAINT uq_users_phone_number UNIQUE (phone_number)
);

CREATE INDEX idx_user_username       ON users (username);
CREATE INDEX idx_user_email          ON users (email);
CREATE INDEX idx_user_phone          ON users (phone_number);
CREATE INDEX idx_user_account_status ON users (account_status);
CREATE INDEX idx_user_banned         ON users (banned) WHERE banned = TRUE;
CREATE INDEX idx_user_is_deleted     ON users (is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_user_name_trgm      ON users USING GIN (name     gin_trgm_ops);
CREATE INDEX idx_user_username_trgm  ON users USING GIN (username gin_trgm_ops);
CREATE INDEX idx_user_location       ON users USING GIST (location);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_users_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();
