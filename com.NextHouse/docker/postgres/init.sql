-- ══════════════════════════════════════════════════════════════════════════════
-- NexHouse — PostgreSQL initialisation script
-- Runs once on first container start (docker-entrypoint-initdb.d)
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable UUID generation (useful for idempotency keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search dictionary (for Tier 2 search upgrade)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable fuzzy string matching
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Verify PostGIS is available
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END;
$$;
