"""Profile cache: in-memory (dev, tests, no DATABASE_URL) or PostgreSQL.

Only the computed ``AnalysisResult`` is stored, keyed by place id and engine version. Review
text, reviewer hashes and IP addresses are never written anywhere (docs/PRIVACY.md).
"""

from __future__ import annotations

import datetime as dt
import logging
from dataclasses import dataclass
from typing import Literal, Protocol

import asyncpg

from signalyze_api.models import AnalysisResult

log = logging.getLogger("signalyze.cache")

CacheKind = Literal["postgres", "memory"]

# Embedded copy of deploy/db/init.sql so a fresh database works without the init script.
SCHEMA_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS place_profiles (
        place_id        TEXT PRIMARY KEY,
        engine_version  TEXT        NOT NULL,
        review_count    INTEGER     NOT NULL,
        result          JSONB       NOT NULL,
        computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at      TIMESTAMPTZ NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS place_profiles_expires_at_idx ON place_profiles (expires_at)",
    """
    CREATE TABLE IF NOT EXISTS daily_stats (
        day             DATE PRIMARY KEY,
        analyze_calls   INTEGER NOT NULL DEFAULT 0,
        cache_hits      INTEGER NOT NULL DEFAULT 0
    )
    """,
)

_SELECT_PROFILE = """
    SELECT result::text AS result
    FROM place_profiles
    WHERE place_id = $1 AND engine_version = $2 AND expires_at > now()
"""

_UPSERT_PROFILE = """
    INSERT INTO place_profiles
        (place_id, engine_version, review_count, result, computed_at, expires_at)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6)
    ON CONFLICT (place_id) DO UPDATE SET
        engine_version = EXCLUDED.engine_version,
        review_count   = EXCLUDED.review_count,
        result         = EXCLUDED.result,
        computed_at    = EXCLUDED.computed_at,
        expires_at     = EXCLUDED.expires_at
"""

_DELETE_EXPIRED = "DELETE FROM place_profiles WHERE expires_at <= now()"

_BUMP_DAILY_STATS = """
    INSERT INTO daily_stats (day, analyze_calls, cache_hits)
    VALUES (CURRENT_DATE, $1, $2)
    ON CONFLICT (day) DO UPDATE SET
        analyze_calls = daily_stats.analyze_calls + EXCLUDED.analyze_calls,
        cache_hits    = daily_stats.cache_hits + EXCLUDED.cache_hits
"""


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


class ProfileCache(Protocol):
    kind: CacheKind

    async def get(self, place_id: str, engine_version: str) -> AnalysisResult | None: ...

    async def set(self, result: AnalysisResult, ttl_days: int) -> None: ...

    async def bump_daily_stats(self, analyze_calls: int, cache_hits: int) -> None: ...


@dataclass(slots=True)
class _Entry:
    engine_version: str
    expires_at: dt.datetime
    result: AnalysisResult


@dataclass(slots=True)
class DailyStat:
    analyze_calls: int = 0
    cache_hits: int = 0


class MemoryCache:
    """Process-local cache. Used when DATABASE_URL is empty and in tests."""

    kind: CacheKind = "memory"

    def __init__(self) -> None:
        self._entries: dict[str, _Entry] = {}
        self.daily_stats: dict[dt.date, DailyStat] = {}

    def __len__(self) -> int:
        return len(self._entries)

    async def get(self, place_id: str, engine_version: str) -> AnalysisResult | None:
        entry = self._entries.get(place_id)
        if entry is None or entry.engine_version != engine_version:
            return None
        if entry.expires_at <= utc_now():
            del self._entries[place_id]
            return None
        return entry.result.model_copy(deep=True)

    async def set(self, result: AnalysisResult, ttl_days: int) -> None:
        now = utc_now()
        self._purge_expired(now)
        self._entries[result.placeId] = _Entry(
            engine_version=result.engineVersion,
            expires_at=now + dt.timedelta(days=ttl_days),
            result=result.model_copy(deep=True),
        )

    async def bump_daily_stats(self, analyze_calls: int, cache_hits: int) -> None:
        stat = self.daily_stats.setdefault(utc_now().date(), DailyStat())
        stat.analyze_calls += analyze_calls
        stat.cache_hits += cache_hits

    def _purge_expired(self, now: dt.datetime) -> None:
        expired = [key for key, entry in self._entries.items() if entry.expires_at <= now]
        for key in expired:
            del self._entries[key]


class PostgresCache:
    """asyncpg-backed cache using the schema in deploy/db/init.sql."""

    kind: CacheKind = "postgres"

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    @classmethod
    async def connect(cls, dsn: str, *, min_size: int = 1, max_size: int = 4) -> PostgresCache:
        pool = await asyncpg.create_pool(dsn, min_size=min_size, max_size=max_size)
        cache = cls(pool)
        await cache.ensure_schema()
        return cache

    async def close(self) -> None:
        await self._pool.close()

    async def ensure_schema(self) -> None:
        async with self._pool.acquire() as conn:
            for statement in SCHEMA_STATEMENTS:
                await conn.execute(statement)

    async def get(self, place_id: str, engine_version: str) -> AnalysisResult | None:
        row = await self._pool.fetchrow(_SELECT_PROFILE, place_id, engine_version)
        if row is None:
            return None
        return AnalysisResult.model_validate_json(str(row["result"]))

    async def set(self, result: AnalysisResult, ttl_days: int) -> None:
        now = utc_now()
        payload = result.model_dump_json(by_alias=True)
        async with self._pool.acquire() as conn:
            await conn.execute(
                _UPSERT_PROFILE,
                result.placeId,
                result.engineVersion,
                result.reviewCount,
                payload,
                now,
                now + dt.timedelta(days=ttl_days),
            )
            await conn.execute(_DELETE_EXPIRED)

    async def bump_daily_stats(self, analyze_calls: int, cache_hits: int) -> None:
        await self._pool.execute(_BUMP_DAILY_STATS, analyze_calls, cache_hits)
