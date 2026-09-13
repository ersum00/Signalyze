"""Signalyze signal engine, Python port of ``packages/signals`` (the TypeScript reference).

Deterministic and explainable: ten signals, a weighted score, no language model. The port
mirrors the reference function-for-function and is held to the shared fixtures in
``packages/signals/fixtures/`` by ``tests/test_engine_fixtures.py``.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import Sequence
from typing import Literal

from signalyze_api.engine.aggregates import monthly_counts, rating_distribution, reviewer_profile
from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.prepare import prepare_reviews
from signalyze_api.engine.score import WEIGHTS, WEIGHTS_VERSION, compute_score
from signalyze_api.engine.signals import SIGNAL_FUNCTIONS
from signalyze_api.models import (
    MIN_REVIEWS_FOR_SCORE,
    SIGNAL_IDS,
    AnalysisResult,
    Review,
    SignalResult,
)

ENGINE_VERSION: str = WEIGHTS_VERSION

EngineSource = Literal["server", "offline"]


def to_js_iso(moment: dt.datetime) -> str:
    """``Date.prototype.toISOString`` equivalent: UTC, millisecond precision, trailing Z."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=dt.UTC)
    utc = moment.astimezone(dt.UTC)
    return (
        f"{utc.year:04d}-{utc.month:02d}-{utc.day:02d}"
        f"T{utc.hour:02d}:{utc.minute:02d}:{utc.second:02d}.{utc.microsecond // 1000:03d}Z"
    )


def compute_signals(reviews: Sequence[Review]) -> list[SignalResult]:
    prepared = prepare_reviews(reviews, THRESHOLDS.text_similarity.ngramSize)
    return [SIGNAL_FUNCTIONS[signal_id](prepared) for signal_id in SIGNAL_IDS]


def analyze(
    reviews: Sequence[Review],
    place_id: str,
    source: EngineSource,
    now: dt.datetime | None = None,
) -> AnalysisResult:
    """Compute the Review Profile for one place. ``now`` is injectable for determinism."""
    moment = now if now is not None else dt.datetime.now(dt.UTC)
    prepared = prepare_reviews(reviews, THRESHOLDS.text_similarity.ngramSize)
    sufficient = len(reviews) >= MIN_REVIEWS_FOR_SCORE
    signals = (
        [SIGNAL_FUNCTIONS[signal_id](prepared) for signal_id in SIGNAL_IDS] if sufficient else []
    )
    score = compute_score(signals) if sufficient else None
    return AnalysisResult(
        placeId=place_id,
        score=score,
        status="ok" if sufficient else "insufficient_data",
        reviewCount=len(reviews),
        signals=signals,
        monthly=monthly_counts(prepared),
        ratingDistribution=rating_distribution(prepared),
        reviewerProfile=reviewer_profile(prepared),
        source=source,
        engineVersion=ENGINE_VERSION,
        computedAt=to_js_iso(moment),
    )


__all__ = [
    "ENGINE_VERSION",
    "WEIGHTS",
    "EngineSource",
    "analyze",
    "compute_score",
    "compute_signals",
    "to_js_iso",
]
