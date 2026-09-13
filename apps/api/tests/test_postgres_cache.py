"""PostgresCache integration test. Runs only when TEST_DATABASE_URL is set (CI provides it)."""

from __future__ import annotations

import datetime as dt
import os
import uuid

import pytest

from signalyze_api.cache import PostgresCache
from signalyze_api.engine import analyze
from signalyze_api.models import Review
from tests.helpers import synthesize_reviews

DSN = os.environ.get("TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(not DSN, reason="TEST_DATABASE_URL not set")


async def test_postgres_roundtrip_expiry_and_stats() -> None:
    place_id = f"0xtest:{uuid.uuid4().hex}"
    reviews = [Review.model_validate(r) for r in synthesize_reviews(20)]
    result = analyze(reviews, place_id, "server", dt.datetime.now(dt.UTC))

    cache = await PostgresCache.connect(DSN)
    try:
        await cache.ensure_schema()  # idempotent
        assert cache.kind == "postgres"
        assert await cache.get(place_id, result.engineVersion) is None

        await cache.set(result, ttl_days=7)
        stored = await cache.get(place_id, result.engineVersion)
        assert stored is not None
        assert stored.model_dump(by_alias=True) == result.model_dump(by_alias=True)
        assert await cache.get(place_id, "0.0.0-other") is None

        row = await cache._pool.fetchrow(
            "SELECT review_count, result::text AS result FROM place_profiles WHERE place_id = $1",
            place_id,
        )
        assert row is not None
        assert row["review_count"] == 20
        assert "reviewerHash" not in row["result"]
        assert reviews[0].text not in row["result"]

        await cache.set(result, ttl_days=0)
        assert await cache.get(place_id, result.engineVersion) is None
        await cache.set(result.model_copy(update={"placeId": place_id + "-b"}), ttl_days=1)
        gone = await cache._pool.fetchrow(
            "SELECT 1 FROM place_profiles WHERE place_id = $1", place_id
        )
        assert gone is None

        before = await cache._pool.fetchrow(
            "SELECT analyze_calls, cache_hits FROM daily_stats WHERE day = CURRENT_DATE"
        )
        await cache.bump_daily_stats(2, 1)
        after = await cache._pool.fetchrow(
            "SELECT analyze_calls, cache_hits FROM daily_stats WHERE day = CURRENT_DATE"
        )
        assert after is not None
        base_calls = before["analyze_calls"] if before is not None else 0
        base_hits = before["cache_hits"] if before is not None else 0
        assert after["analyze_calls"] == base_calls + 2
        assert after["cache_hits"] == base_hits + 1
    finally:
        await cache._pool.execute(
            "DELETE FROM place_profiles WHERE place_id IN ($1, $2)", place_id, place_id + "-b"
        )
        await cache.close()
