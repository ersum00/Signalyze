"""Derived per-review fields, computed once. Twin of ``packages/signals/src/prepare.ts``."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from signalyze_api.engine.mathutil import day_number, month_key
from signalyze_api.engine.text import (
    EngineLanguage,
    char_ngrams,
    code_point_length,
    detect_language,
    js_trim,
    normalize_text,
    tokenize,
)
from signalyze_api.models import Review


@dataclass(slots=True)
class PreparedReview:
    """A review plus the derived fields every signal needs."""

    review: Review
    day: int
    month: str
    normalized_text: str
    text_length: int
    tokens: list[str]
    language: EngineLanguage
    normalized_owner_response: str | None


def prepare_reviews(reviews: Sequence[Review], ngram_size: int) -> list[PreparedReview]:
    del ngram_size  # kept for signature parity with the reference
    prepared: list[PreparedReview] = []
    for review in reviews:
        normalized_text = normalize_text(review.text)
        tokens = tokenize(normalized_text)
        owner = review.ownerResponse
        prepared.append(
            PreparedReview(
                review=review,
                day=day_number(review.date),
                month=month_key(review.date),
                normalized_text=normalized_text,
                text_length=code_point_length(js_trim(review.text)),
                tokens=tokens,
                language=detect_language(tokens),
                normalized_owner_response=(
                    normalize_text(owner) if owner is not None and js_trim(owner) != "" else None
                ),
            )
        )
    return prepared


def ngrams_of(prepared: PreparedReview, n: int) -> set[str]:
    return char_ngrams(prepared.normalized_text, n)
