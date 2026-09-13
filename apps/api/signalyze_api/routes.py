"""HTTP endpoints.

Routes are registered per application so the rate-limit string from ``Settings`` is bound
at construction time (tests build apps with different limits). The cache lives on
``app.state.cache`` because the PostgreSQL pool is created in the lifespan.
"""

from __future__ import annotations

import datetime as dt
import logging
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Request
from slowapi import Limiter

from signalyze_api import __version__
from signalyze_api.cache import MemoryCache, PostgresCache, ProfileCache
from signalyze_api.config import Settings
from signalyze_api.engine import ENGINE_VERSION, analyze
from signalyze_api.llm import annotate_text_similarity
from signalyze_api.models import (
    PLACE_ID_PATTERN,
    AnalysisRequest,
    AnalysisResult,
    HealthResponse,
)

log = logging.getLogger("signalyze.api")

PlaceIdPath = Annotated[str, Path(min_length=4, max_length=512, pattern=PLACE_ID_PATTERN)]


def cache_of(request: Request) -> ProfileCache:
    cache = request.app.state.cache
    if not isinstance(cache, MemoryCache | PostgresCache):
        raise RuntimeError("profile cache is not initialised")
    return cache


async def lookup(cache: ProfileCache, place_id: str) -> AnalysisResult | None:
    """Cache read that degrades to a miss (with a warning) instead of failing the request."""
    try:
        return await cache.get(place_id, ENGINE_VERSION)
    except Exception as exc:
        log.warning("cache lookup failed: %s", type(exc).__name__)
        return None


async def store(cache: ProfileCache, result: AnalysisResult, ttl_days: int) -> None:
    try:
        await cache.set(result, ttl_days)
    except Exception as exc:
        log.warning("cache write failed: %s", type(exc).__name__)


async def bump(cache: ProfileCache, analyze_calls: int, cache_hits: int) -> None:
    try:
        await cache.bump_daily_stats(analyze_calls, cache_hits)
    except Exception as exc:
        log.warning("daily stats update failed: %s", type(exc).__name__)


def register_routes(app: FastAPI, settings: Settings, limiter: Limiter) -> None:
    @app.get("/v1/health")
    async def health(request: Request) -> HealthResponse:
        return HealthResponse(
            status="ok",
            version=__version__,
            engineVersion=ENGINE_VERSION,
            cache=cache_of(request).kind,
        )

    @app.post("/v1/analyze")
    @limiter.limit(settings.analyze_rate_limit)
    async def analyze_place(request: Request, body: AnalysisRequest) -> AnalysisResult:
        cache = cache_of(request)
        cached = await lookup(cache, body.placeId)
        # A cached profile is reused unless this request carries a larger sample than the one
        # it was computed from (the user chose "Load more"); then it is recomputed.
        if cached is not None and cached.reviewCount >= len(body.reviews):
            await bump(cache, 1, 1)
            return cached.model_copy(update={"source": "server-cache"})
        result = analyze(body.reviews, body.placeId, "server", dt.datetime.now(dt.UTC))
        await annotate_text_similarity(result, body.reviews, settings)
        await store(cache, result, settings.cache_ttl_days)
        await bump(cache, 1, 0)
        return result

    @app.get("/v1/place/{place_id}")
    async def get_place(request: Request, place_id: PlaceIdPath) -> AnalysisResult:
        cache = cache_of(request)
        cached = await lookup(cache, place_id)
        if cached is None:
            raise HTTPException(status_code=404, detail="No cached profile for this place.")
        await bump(cache, 0, 1)
        return cached.model_copy(update={"source": "server-cache"})
