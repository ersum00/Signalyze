-- Signalyze schema. Idempotent: safe to re-run.
-- The database and role are created by the Postgres container's POSTGRES_* env
-- (deploy/docker-compose.yml). For a shared, pre-existing PostgreSQL instead run:
--   CREATE DATABASE signalyze;
--   CREATE USER signalyze WITH PASSWORD '<from .env>';
--   GRANT ALL PRIVILEGES ON DATABASE signalyze TO signalyze;
-- and then apply the statements below as that user.

CREATE TABLE IF NOT EXISTS place_profiles (
    place_id        TEXT PRIMARY KEY,
    engine_version  TEXT        NOT NULL,
    review_count    INTEGER     NOT NULL,
    -- Only the computed profile (signals, score, aggregates). Never raw review text.
    result          JSONB       NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS place_profiles_expires_at_idx ON place_profiles (expires_at);

-- Anonymous daily aggregate for capacity planning (no IPs, no place ids).
CREATE TABLE IF NOT EXISTS daily_stats (
    day             DATE PRIMARY KEY,
    analyze_calls   INTEGER NOT NULL DEFAULT 0,
    cache_hits      INTEGER NOT NULL DEFAULT 0
);
