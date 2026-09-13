"""Twin of ``signals/local-guide-ratio.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.local_guide_ratio


def local_guide_ratio(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews by reviewers with Local Guide level >= 3; a low share is unusual.

    Only available when the page exposed a level for at least one reviewer.
    """
    exposed = 0
    established = 0
    for r in reviews:
        level = r.review.localGuideLevel
        if level is None:
            continue
        exposed += 1
        if level >= T.establishedLevel:
            established += 1
    if exposed == 0:
        return unavailable("local_guide_ratio", {"levelExposed": False})
    share = established / len(reviews)
    # ramp on the shortfall below shareHigh: share 0 -> 1, share >= shareHigh -> 0
    shortfall = T.shareHigh - share
    return SignalResult(
        id="local_guide_ratio",
        unusualness=round6(ramp(shortfall, T.shareLow, T.shareHigh)),
        value=round6(share),
        details={
            "share": round6(share),
            "established": established,
            "exposed": exposed,
            "establishedLevel": T.establishedLevel,
        },
        available=True,
    )
