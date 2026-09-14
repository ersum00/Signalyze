"""Bound for the text-similarity signal at the request cap: 2000 reviews, 600 sampled texts."""

from __future__ import annotations

import datetime as dt
import time

from signalyze_api.engine import analyze
from signalyze_api.models import MAX_REVIEWS_PER_REQUEST, Review
from tests.helpers import synthesize_reviews


def test_2000_reviews_with_200_char_texts_complete_quickly() -> None:
    reviews = [
        Review.model_validate(r)
        for r in synthesize_reviews(MAX_REVIEWS_PER_REQUEST, seed=3, text_chars=200)
    ]
    start = time.perf_counter()
    result = analyze(reviews, "0xperf:0xtest", "server", dt.datetime.now(dt.UTC))
    elapsed = time.perf_counter() - start
    assert result.status == "ok"
    text_similarity = next(s for s in result.signals if s.id == "text_similarity")
    assert text_similarity.details["eligible"] == 2000
    assert text_similarity.details["sampled"] == 600
    assert text_similarity.details["pairs"] == 600 * 599 // 2
    assert elapsed < 4.0, f"analyze took {elapsed:.2f}s"
