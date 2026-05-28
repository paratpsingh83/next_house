-- ══════════════════════════════════════════════════════════════════════════════
-- V4__create_user_related_tables.sql
-- All tables that depend only on users + neighborhoods:
--   user_neighborhoods, user_presence, follows, blocked_users,
--   refresh_tokens, otp_verifications, device_tokens
-- ══════════════════════════════════════════════════════════════════════════════

-- ── user_neighborhoods ────────────────────────────────────────────────────────
CREATE TABLE user_neighborhoods (
    id                   BIGSERIAL   PRIMARY KEY,
    created_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
    active               BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted           BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id              BIGINT      NOT NULL
                            CONSTRAINT fk_user_neighborhood_user
                            REFERENCES users(id) ON DELETE CASCADE,
    neighborhood_id      BIGINT      NOT NULL
                            CONSTRAINT fk_user_neighborhood_nbh
                            REFERENCES neighborhoods(id) ON DELETE CASCADE,
    primary_neighborhood BOOLEAN     NOT NULL DEFAULT FALSE,
    verified             BOOLEAN     NOT NULL DEFAULT FALSE,
    verification_method  VARCHAR(30)
                            CONSTRAINT chk_verification_method
                            CHECK (verification_method IN
                                ('POSTCARD','GPS','DOCUMENT','ADMIN_OVERRIDE', NULL)),
    verified_at          TIMESTAMP,

    CONSTRAINT uq_user_neighborhood UNIQUE (user_id, neighborhood_id)
);

CREATE INDEX idx_user_neighborhood_user         ON user_neighborhoods (user_id);
CREATE INDEX idx_user_neighborhood_neighborhood ON user_neighborhoods (neighborhood_id);
CREATE INDEX idx_user_neighborhood_primary
    ON user_neighborhoods (user_id) WHERE primary_neighborhood = TRUE;

CREATE TRIGGER trg_user_neighborhoods_updated_at
    BEFORE UPDATE ON user_neighborhoods
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── user_presence ─────────────────────────────────────────────────────────────
CREATE TABLE user_presence (
    id                  BIGSERIAL   PRIMARY KEY,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    active              BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id             BIGINT      NOT NULL UNIQUE
                            CONSTRAINT fk_user_presence_user
                            REFERENCES users(id) ON DELETE CASCADE,
    online              BOOLEAN     NOT NULL DEFAULT FALSE,
    last_seen           TIMESTAMP,
    current_device_type VARCHAR(20)
                            CONSTRAINT chk_device_type
                            CHECK (current_device_type IN ('ANDROID','IOS','WEB', NULL)),
    socket_id           VARCHAR(200)
);

CREATE UNIQUE INDEX idx_user_presence_user   ON user_presence (user_id);
CREATE        INDEX idx_user_presence_online ON user_presence (online) WHERE online = TRUE;

CREATE TRIGGER trg_user_presence_updated_at
    BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── follows ───────────────────────────────────────────────────────────────────
CREATE TABLE follows (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    follower_id  BIGINT      NOT NULL
                    CONSTRAINT fk_follow_follower
                    REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT      NOT NULL
                    CONSTRAINT fk_follow_following
                    REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT uq_follow_pair    UNIQUE (follower_id, following_id),
    -- A user cannot follow themselves
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follow_follower  ON follows (follower_id);
CREATE INDEX idx_follow_following ON follows (following_id);

CREATE TRIGGER trg_follows_updated_at
    BEFORE UPDATE ON follows
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── blocked_users ─────────────────────────────────────────────────────────────
CREATE TABLE blocked_users (
    id              BIGSERIAL   PRIMARY KEY,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id         BIGINT      NOT NULL
                        CONSTRAINT fk_blocked_user
                        REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id BIGINT      NOT NULL
                        CONSTRAINT fk_blocked_target
                        REFERENCES users(id) ON DELETE CASCADE,
    reason          VARCHAR(50)
                        CONSTRAINT chk_block_reason
                        CHECK (reason IN ('SPAM','HARASSMENT','INAPPROPRIATE_CONTENT','OTHER', NULL)),

    CONSTRAINT uq_blocked_user_pair UNIQUE (user_id, blocked_user_id),
    CONSTRAINT chk_no_self_block    CHECK (user_id <> blocked_user_id)
);

CREATE INDEX idx_blocked_user_id         ON blocked_users (user_id);
CREATE INDEX idx_blocked_blocked_user_id ON blocked_users (blocked_user_id);

CREATE TRIGGER trg_blocked_users_updated_at
    BEFORE UPDATE ON blocked_users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── refresh_tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id              BIGSERIAL   PRIMARY KEY,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,

    user_id         BIGINT      NOT NULL
                        CONSTRAINT fk_refresh_token_user
                        REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(512) NOT NULL UNIQUE,
    expiry_date     TIMESTAMP   NOT NULL,
    revoked         BOOLEAN     NOT NULL DEFAULT FALSE,
    device_id       VARCHAR(100),
    user_agent      VARCHAR(500),
    ip_address      VARCHAR(50),
    parent_token_id BIGINT      -- self-reference for rotation audit, no FK (token may be deleted)
);

CREATE UNIQUE INDEX idx_refresh_token_value  ON refresh_tokens (token);
CREATE        INDEX idx_refresh_token_user   ON refresh_tokens (user_id);
CREATE        INDEX idx_refresh_token_device ON refresh_tokens (user_id, device_id);
CREATE        INDEX idx_refresh_token_expiry ON refresh_tokens (expiry_date)
                   WHERE revoked = FALSE;

CREATE TRIGGER trg_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── otp_verifications ─────────────────────────────────────────────────────────
CREATE TABLE otp_verifications (
    id          BIGSERIAL   PRIMARY KEY,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,

    phone       VARCHAR(20),
    email       VARCHAR(150),
    otp         VARCHAR(200) NOT NULL,   -- BCrypt hash of the raw OTP
    purpose     VARCHAR(30)  NOT NULL
                    CONSTRAINT chk_otp_purpose
                    CHECK (purpose IN (
                        'REGISTRATION','LOGIN','PASSWORD_RESET',
                        'PHONE_VERIFICATION','EMAIL_VERIFICATION','TWO_FACTOR_AUTH'
                    )),
    verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP   NOT NULL,
    attempts    INTEGER     NOT NULL DEFAULT 0
                    CONSTRAINT chk_otp_attempts CHECK (attempts >= 0),
    used_at     TIMESTAMP,

    -- At least one of phone or email must be provided
    CONSTRAINT chk_otp_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_otp_phone_purpose  ON otp_verifications (phone,  purpose) WHERE verified = FALSE;
CREATE INDEX idx_otp_email_purpose  ON otp_verifications (email,  purpose) WHERE verified = FALSE;
CREATE INDEX idx_otp_expires        ON otp_verifications (expires_at);

CREATE TRIGGER trg_otp_verifications_updated_at
    BEFORE UPDATE ON otp_verifications
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── device_tokens ─────────────────────────────────────────────────────────────
CREATE TABLE device_tokens (
    id           BIGSERIAL    PRIMARY KEY,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,

    user_id      BIGINT       NOT NULL
                     CONSTRAINT fk_device_token_user
                     REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(1000) NOT NULL UNIQUE,
    device_type  VARCHAR(20)
                     CONSTRAINT chk_device_token_type
                     CHECK (device_type IN ('ANDROID','IOS','WEB', NULL)),
    device_name  VARCHAR(100),
    os_version   VARCHAR(50),
    last_used_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_device_token_token ON device_tokens (device_token);
CREATE        INDEX idx_device_token_user  ON device_tokens (user_id);

CREATE TRIGGER trg_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
