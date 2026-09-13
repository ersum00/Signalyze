"""Twin of ``signals/single-review-accounts.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.single_review_accounts


def single_review_accounts(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviewers whose public review count is 0 or 1, among known counts."""
    known = 0
    singles = 0
    for r in reviews:
        c = r.review.reviewerReviewCount
        if c is None:
            continue
        known += 1
        if c <= 1:
            singles += 1
    if known < T.minKnown:
        return unavailable("single_review_accounts", {"known": known, "minKnown": T.minKnown})
    share = singles / known
    return SignalResult(
        id="single_review_accounts",
        unusualness=round6(ramp(share, T.low, T.high)),
        value=round6(share),
        details={"share": round6(share), "known": known, "singles": singles},
        available=True,
    )
