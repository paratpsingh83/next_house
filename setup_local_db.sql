-- NextHouse local dev database setup
-- Run ONCE as the postgres superuser:
--   $env:PGPASSWORD="<postgres superuser password set during installation>"
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f setup_local_db.sql

-- ── 1. Create user ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nexthouse') THEN
    CREATE USER nexthouse WITH PASSWORD 'changeme';
    RAISE NOTICE 'User nexthouse created.';
  ELSE
    RAISE NOTICE 'User nexthouse already exists, skipping.';
  END IF;
END
$$;

-- ── 2. Create database ────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nexthouse_db') THEN
    PERFORM dblink_exec('', 'CREATE DATABASE nexthouse_db OWNER nexthouse');
    RAISE NOTICE 'Database nexthouse_db created.';
  ELSE
    RAISE NOTICE 'Database nexthouse_db already exists, skipping.';
  END IF;
END
$$;

-- ── 3. Connect to nexthouse_db and install extensions ─────────────────────────
\connect nexthouse_db

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ── 4. Grant privileges (needed for Flyway migrations) ────────────────────────
GRANT ALL PRIVILEGES ON DATABASE nexthouse_db TO nexthouse;
GRANT ALL ON SCHEMA public TO nexthouse;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nexthouse;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nexthouse;