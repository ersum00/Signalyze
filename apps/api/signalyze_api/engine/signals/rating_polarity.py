"""Twin of ``signals/rating-polarity.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.models import SignalResult

T = THRESHOLDS.rating_polarity


def rating_polarity(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of 1-star and 5-star ratings among all ratings."""
    n = len(reviews)
    five = 0
    one = 0
    for r in reviews:
        if r.review.rating == 5:
            five += 1
        elif r.review.rating == 1:
            one += 1
    share = (five + one) / n
    return SignalResult(
        id="rating_polarity",
        unusualness=round6(ramp(share, T.low, T.high)),
        value=round6(share),
        details={
            "share5": round6(five / n),
            "share1": round6(one / n),
            "shareMid": round6((n - five - one) / n),
        },
        available=True,
    )
