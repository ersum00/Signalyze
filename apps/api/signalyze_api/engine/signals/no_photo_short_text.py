"""Twin of ``signals/no-photo-short-text.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.models import SignalResult

T = THRESHOLDS.no_photo_short_text


def no_photo_short_text(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews with no photo and fewer than 40 characters of text."""
    n = len(reviews)
    count = 0
    no_text = 0
    for r in reviews:
        if r.review.photoCount == 0 and r.text_length < T.shortTextChars:
            count += 1
        if r.text_length == 0:
            no_text += 1
    share = count / n
    return SignalResult(
        id="no_photo_short_text",
        unusualness=round6(ramp(share, T.low, T.high)),
        value=round6(share),
        details={
            "share": round6(share),
            "count": count,
            "noTextCount": no_text,
            "shortTextChars": T.shortTextChars,
        },
        available=True,
    )
