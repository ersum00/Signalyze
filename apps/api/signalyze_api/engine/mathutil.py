"""Numeric helpers. Line-for-line twin of ``packages/signals/src/math.ts``.

Every function must produce bit-identical results to the TypeScript version, so the
formulas (and their evaluation order) are kept exactly as written there.
"""

from __future__ import annotations

import datetime as dt
import math
from collections.abc import Sequence

_EPOCH_ORDINAL = dt.date(1970, 1, 1).toordinal()


def clamp01(x: float) -> float:
    if x < 0:
        return 0.0
    if x > 1:
        return 1.0
    return x


def ramp(value: float, low: float, high: float) -> float:
    """Linear ramp: 0 at ``low`` and below, 1 at ``high`` and above."""
    if high <= low:
        return 1.0 if value >= high else 0.0
    return clamp01((value - low) / (high - low))


def round6(x: float) -> float:
    """Round half up to 6 decimals (avoids banker's rounding differences across languages)."""
    return math.floor(x * 1e6 + 0.5) / 1e6


def round_half_up(x: float) -> int:
    """Round half up to an integer."""
    return math.floor(x + 0.5)


def mean(values: Sequence[float]) -> float:
    if len(values) == 0:
        return 0.0
    total = 0.0
    for v in values:
        total += v
    return total / len(values)


def median(values: Sequence[float]) -> float:
    if len(values) == 0:
        return 0.0
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def entropy_bits(counts: Sequence[int]) -> float:
    """Shannon entropy in bits of a count vector (accumulated in input order)."""
    total = 0
    for c in counts:
        total += c
    if total == 0:
        return 0.0
    h = 0.0
    for c in counts:
        if c == 0:
            continue
        p = c / total
        h -= p * math.log2(p)
    return h


def day_number(iso_day: str) -> int:
    """Days since 1970-01-01 (UTC) for a YYYY-MM-DD string."""
    return dt.date.fromisoformat(iso_day).toordinal() - _EPOCH_ORDINAL


def iso_from_day(day: int) -> str:
    """Inverse of :func:`day_number` (``new Date(day * 86400000).toISOString().slice(0, 10)``)."""
    return dt.date.fromordinal(_EPOCH_ORDINAL + day).isoformat()


def month_key(iso_day: str) -> str:
    return iso_day[:7]


def months_between_inclusive(a: str, b: str) -> int:
    """Number of calendar months from month key ``a`` to month key ``b``, inclusive."""
    ay = int(a[:4])
    am = int(a[5:7])
    by = int(b[:4])
    bm = int(b[5:7])
    return (by - ay) * 12 + (bm - am) + 1


def add_months(key: str, offset: int) -> str:
    y = int(key[:4])
    m = int(key[5:7]) - 1 + offset
    year = y + m // 12
    month = m % 12
    return f"{year:04d}-{month + 1:02d}"
