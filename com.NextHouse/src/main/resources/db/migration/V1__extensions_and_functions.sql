-- ══════════════════════════════════════════════════════════════════════════════
-- V1__extensions_and_functions.sql
-- Flyway migration: Enable PostGIS + helper extensions + utility functions
--
-- Runs FIRST before any table creation.
-- All geo columns (geography(Point,4326)) require PostGIS to exist first.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: trigram similarity for full-text LIKE acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- fuzzystrmatch: Soundex / Levenshtein for fuzzy user search
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ── Utility function: auto-set updated_at on every UPDATE ─────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Utility function: auto-populate PostGIS location from lat/lon ─────────────
-- Called by application-level trigger where location needs to stay in sync
-- with latitude/longitude columns.
CREATE OR REPLACE FUNCTION trigger_set_location_from_latlon()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify PostGIS is working
DO $$
BEGIN
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END;
$$;
