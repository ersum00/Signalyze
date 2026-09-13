"""Twin of ``signals/burst-ratio.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import clamp01, iso_from_day, ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.models import SignalResult

T = THRESHOLDS.burst_ratio


def burst_ratio(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Share of reviews inside the busiest 14-day window, compared with an even flow.

    value = peak share.
    """
    days = sorted(r.day for r in reviews)
    n = len(days)
    first = days[0]
    last = days[n - 1]
    lifespan_days = last - first + 1

    peak = 0
    peak_start = first
    lo = 0
    for hi in range(n):
        while days[hi] - days[lo] >= T.windowDays:
            lo += 1
        count = hi - lo + 1
        if count > peak:
            peak = count
            peak_start = days[lo]
    peak_share = peak / n
    expected_share = 1.0 if lifespan_days <= T.windowDays else T.windowDays / lifespan_days
    excess = (
        0.0
        if expected_share >= 1
        else clamp01((peak_share - expected_share) / (1 - expected_share))
    )
    unusualness = ramp(excess, T.excessLow, T.excessHigh)

    return SignalResult(
        id="burst_ratio",
        unusualness=round6(unusualness),
        value=round6(peak_share),
        details={
            "peakShare": round6(peak_share),
            "peakCount": peak,
            "peakWindowStart": iso_from_day(peak_start),
            "peakWindowEnd": iso_from_day(peak_start + T.windowDays - 1),
            "lifespanDays": lifespan_days,
            "expectedShare": round6(expected_share),
            "excess": round6(excess),
            "windowDays": T.windowDays,
        },
        available=True,
    )
