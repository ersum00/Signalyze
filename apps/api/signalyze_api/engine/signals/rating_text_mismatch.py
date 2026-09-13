"""Twin of ``signals/rating-text-mismatch.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import SENTIMENT_LEXICON, THRESHOLDS, LexiconEntry
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.text import EngineLanguage, normalize_text
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.rating_text_mismatch


def _sets(entry: LexiconEntry) -> tuple[frozenset[str], frozenset[str]]:
    return (
        frozenset(normalize_text(w) for w in entry.positive),
        frozenset(normalize_text(w) for w in entry.negative),
    )


LEXICON: dict[EngineLanguage, tuple[frozenset[str], frozenset[str]]] = {
    "en": _sets(SENTIMENT_LEXICON.en),
    "tr": _sets(SENTIMENT_LEXICON.tr),
    "de": _sets(SENTIMENT_LEXICON.de),
    "es": _sets(SENTIMENT_LEXICON.es),
}


def tone_of(tokens: Sequence[str], language: EngineLanguage) -> float | None:
    """Tone in [-1, 1] from lexicon hits, or None when no lexicon word occurs."""
    positive, negative = LEXICON[language]
    pos = 0
    neg = 0
    for t in tokens:
        if t in positive:
            pos += 1
        elif t in negative:
            neg += 1
    if pos + neg == 0:
        return None
    return (pos - neg) / (pos + neg)


def rating_text_mismatch(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews whose text tone disagrees with the star rating."""
    scored = 0
    mismatches = 0
    for r in reviews:
        tone = tone_of(r.tokens, r.language)
        if tone is None:
            continue
        scored += 1
        rating = r.review.rating
        if (rating >= 4 and tone <= -T.toneThreshold) or (rating <= 2 and tone >= T.toneThreshold):
            mismatches += 1
    if scored < T.minScored:
        return unavailable("rating_text_mismatch", {"scored": scored, "minScored": T.minScored})
    share = mismatches / scored
    return SignalResult(
        id="rating_text_mismatch",
        unusualness=round6(ramp(share, T.low, T.high)),
        value=round6(share),
        details={"share": round6(share), "scored": scored, "mismatches": mismatches},
        available=True,
    )
