"""Twin of ``signals/date-entropy.ts``."""

from __future__ import annotations

import math
from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import entropy_bits, months_between_inclusive, ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.date_entropy


def date_entropy(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Normalised Shannon entropy of per-month counts over the first..last month span.

    value = normalised entropy (1 = even). Unusualness grows as the distribution
    concentrates (1 - entropy).
    """
    counts: dict[str, int] = {}
    first = ""
    last = ""
    for r in reviews:
        counts[r.month] = counts.get(r.month, 0) + 1
        if first == "" or r.month < first:
            first = r.month
        if last == "" or r.month > last:
            last = r.month
    months_in_span = months_between_inclusive(first, last)
    if months_in_span < T.minMonths:
        return unavailable(
            "date_entropy", {"monthsInSpan": months_in_span, "minMonths": T.minMonths}
        )
    values = list(counts.values())
    h = entropy_bits(values)
    normalized = h / math.log2(months_in_span)
    busiest = ""
    busiest_count = 0
    for month, c in sorted(counts.items(), key=lambda item: item[0]):
        if c > busiest_count:
            busiest = month
            busiest_count = c
    return SignalResult(
        id="date_entropy",
        unusualness=round6(ramp(1 - normalized, T.low, T.high)),
        value=round6(normalized),
        details={
            "normalizedEntropy": round6(normalized),
            "monthsInSpan": months_in_span,
            "activeMonths": len(counts),
            "busiestMonth": busiest,
            "busiestMonthShare": round6(busiest_count / len(reviews)),
        },
        available=True,
    )
