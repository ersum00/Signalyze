"""Twin of ``signals/rating-text-mismatch.ts``."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from signalyze_api.engine.data_files import SENTIMENT_LEXICON, THRESHOLDS, LexiconEntry
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.text import (
    ENGINE_LANGUAGES,
    MATCH_MODE,
    DetectedLanguage,
    EngineLanguage,
    code_point_length,
    normalize_text,
)
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.rating_text_mismatch


@dataclass(frozen=True, slots=True)
class Lexicon:
    positive: frozenset[str]
    negative: frozenset[str]
    # Substring mode: every entry with its polarity, longest first (stable on file order).
    ordered: tuple[tuple[str, bool], ...]


def _lexicon(entry: LexiconEntry) -> Lexicon:
    positive = [w for w in (normalize_text(x) for x in entry.positive) if w != ""]
    negative = [w for w in (normalize_text(x) for x in entry.negative) if w != ""]
    ordered = sorted(
        [*((w, True) for w in positive), *((w, False) for w in negative)],
        key=lambda item: -code_point_length(item[0]),
    )
    return Lexicon(frozenset(positive), frozenset(negative), tuple(ordered))


LEXICON: dict[EngineLanguage, Lexicon] = {
    lang: _lexicon(SENTIMENT_LEXICON[lang]) for lang in ENGINE_LANGUAGES
}


def tone_of(normalized: str, tokens: Sequence[str], language: DetectedLanguage) -> float | None:
    """Tone in [-1, 1] from lexicon hits, or None when no lexicon word occurs.

    Word mode counts the tokens found in the lexicon. Substring mode (ja, zh) counts the
    lexicon entries found in the text, longest first, each once; a matched entry is removed
    before shorter entries are tried, so a negated form is not also counted as its stem.
    "other" has no lexicon.
    """
    if language == "other":
        return None
    lex = LEXICON[language]
    pos = 0
    neg = 0
    if MATCH_MODE[language] == "word":
        for t in tokens:
            if t in lex.positive:
                pos += 1
            elif t in lex.negative:
                neg += 1
    else:
        text = normalized
        for entry, positive in lex.ordered:
            if entry not in text:
                continue
            if positive:
                pos += 1
            else:
                neg += 1
            text = text.replace(entry, " ")
    if pos + neg == 0:
        return None
    return (pos - neg) / (pos + neg)


def rating_text_mismatch(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews whose text tone disagrees with the star rating."""
    scored = 0
    mismatches = 0
    for r in reviews:
        tone = tone_of(r.normalized_text, r.tokens, r.language)
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
