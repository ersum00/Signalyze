"""Twin of ``signals/template-phrases.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import TEMPLATE_PHRASES, THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.text import (
    EngineLanguage,
    code_point_length,
    contains_phrase,
    normalize_text,
)
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.template_phrases

PHRASES: dict[EngineLanguage, list[str]] = {
    "en": [normalize_text(p) for p in TEMPLATE_PHRASES.en],
    "tr": [normalize_text(p) for p in TEMPLATE_PHRASES.tr],
    "de": [normalize_text(p) for p in TEMPLATE_PHRASES.de],
    "es": [normalize_text(p) for p in TEMPLATE_PHRASES.es],
}


def template_phrases(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews whose stock phrases cover at least half of the normalised text."""
    with_text = [r for r in reviews if r.normalized_text != ""]
    if len(with_text) < T.minWithText:
        return unavailable(
            "template_phrases", {"withText": len(with_text), "minWithText": T.minWithText}
        )
    phrase_counts: dict[str, int] = {}
    phrase_based = 0
    any_hit = 0
    for r in with_text:
        text_len = code_point_length(r.normalized_text)
        covered = 0
        hit = False
        for phrase in PHRASES[r.language]:
            if contains_phrase(r.normalized_text, phrase):
                hit = True
                covered += code_point_length(phrase)
                phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1
        if hit:
            any_hit += 1
        if hit and min(covered, text_len) / text_len >= T.coverageThreshold:
            phrase_based += 1
    share = phrase_based / len(with_text)
    ranked = sorted(phrase_counts.items(), key=lambda item: (-item[1], item[0]))
    top = "; ".join(f"{phrase} ({count})" for phrase, count in ranked[:3])
    return SignalResult(
        id="template_phrases",
        unusualness=round6(ramp(share, T.low, T.high)),
        value=round6(share),
        details={
            "share": round6(share),
            "phraseBased": phrase_based,
            "withText": len(with_text),
            "anyPhraseShare": round6(any_hit / len(with_text)),
            "topPhrases": top,
        },
        available=True,
    )
