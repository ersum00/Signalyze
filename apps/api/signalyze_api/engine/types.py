"""Signal function type and the shared "unavailable" result. Twin of ``types.ts``."""

from __future__ import annotations

from collections.abc import Callable, Sequence

from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.models import SignalDetails, SignalId, SignalResult

SignalFn = Callable[[Sequence[PreparedReview]], SignalResult]


def unavailable(signal_id: SignalId, details: SignalDetails | None = None) -> SignalResult:
    return SignalResult(
        id=signal_id,
        unusualness=0.0,
        value=0.0,
        details={} if details is None else details,
        available=False,
    )
