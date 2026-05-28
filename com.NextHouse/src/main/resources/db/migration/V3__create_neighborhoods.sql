-- ══════════════════════════════════════════════════════════════════════════════
-- V3__create_neighborhoods.sql
-- Neighborhoods table with PostGIS geometry columns.
-- Inherits from GeoBaseEntity (lat/lon/address/city/state/country/zipCode + location point).
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE neighborhoods (
    -- BaseEntity
    id          BIGSERIAL    PRIMARY KEY,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,

    -- GeoBaseEntity fields
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    address     VARCHAR(500),
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100),
    zip_code    VARCHAR(20),

    -- PostGIS geography point (center of neighborhood)
    -- SRID 4326 = WGS84. Used for ST_DWithin nearest-neighbor queries.
    location    geography(Point, 4326),

    -- Neighborhood-specific
    name            VARCHAR(150)    NOT NULL,
    postal_code     VARCHAR(20),
    district        VARCHAR(100),
    region          VARCHAR(100),
    radius_meters   INTEGER,

    -- PostGIS polygon boundary for precise ST_Within containment checks.
    -- More accurate than a simple radius circle for irregular neighborhood shapes.
    boundary        geography(Polygon, 4326),

    population  INTEGER,
    verified    BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_neighborhood_postal   ON neighborhoods (postal_code);
CREATE INDEX idx_neighborhood_city     ON neighborhoods (city);
CREATE INDEX idx_neighborhood_verified ON neighborhoods (verified) WHERE verified = TRUE;
CREATE INDEX idx_neighborhood_deleted  ON neighborhoods (is_deleted) WHERE is_deleted = FALSE;

-- PostGIS spatial indexes — GIST required for ST_DWithin and ST_Within queries
CREATE INDEX idx_neighborhood_location ON neighborhoods USING GIST (location);
CREATE INDEX idx_neighborhood_boundary ON neighborhoods USING GIST (boundary);

-- Trigram index for neighborhood name search
CREATE INDEX idx_neighborhood_name_trgm ON neighborhoods USING GIN (name gin_trgm_ops);

-- ── Trigger ───────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_neighborhoods_updated_at
    BEFORE UPDATE ON neighborhoods
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-populate location point from lat/lon columns
CREATE TRIGGER trg_neighborhoods_set_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON neighborhoods
    FOR EACH ROW EXECUTE FUNCTION trigger_set_location_from_latlon();
