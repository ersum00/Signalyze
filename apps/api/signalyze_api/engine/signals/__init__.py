"""Signal functions in the canonical evaluation order. Twin of ``signals/index.ts``."""

from __future__ import annotations

from signalyze_api.engine.signals.burst_ratio import burst_ratio
from signalyze_api.engine.signals.date_entropy import date_entropy
from signalyze_api.engine.signals.local_guide_ratio import local_guide_ratio
from signalyze_api.engine.signals.no_photo_short_text import no_photo_short_text
from signalyze_api.engine.signals.owner_response_pattern import owner_response_pattern
from signalyze_api.engine.signals.rating_polarity import rating_polarity
from signalyze_api.engine.signals.rating_text_mismatch import rating_text_mismatch
from signalyze_api.engine.signals.single_review_accounts import single_review_accounts
from signalyze_api.engine.signals.template_phrases import template_phrases
from signalyze_api.engine.signals.text_similarity import text_similarity
from signalyze_api.engine.types import SignalFn
from signalyze_api.models import SignalId

# Evaluation order is the canonical SIGNAL_IDS order.
SIGNAL_FUNCTIONS: dict[SignalId, SignalFn] = {
    "burst_ratio": burst_ratio,
    "rating_polarity": rating_polarity,
    "single_review_accounts": single_review_accounts,
    "no_photo_short_text": no_photo_short_text,
    "text_similarity": text_similarity,
    "template_phrases": template_phrases,
    "rating_text_mismatch": rating_text_mismatch,
    "date_entropy": date_entropy,
    "local_guide_ratio": local_guide_ratio,
    "owner_response_pattern": owner_response_pattern,
}

__all__ = [
    "SIGNAL_FUNCTIONS",
    "burst_ratio",
    "date_entropy",
    "local_guide_ratio",
    "no_photo_short_text",
    "owner_response_pattern",
    "rating_polarity",
    "rating_text_mismatch",
    "single_review_accounts",
    "template_phrases",
    "text_similarity",
]
