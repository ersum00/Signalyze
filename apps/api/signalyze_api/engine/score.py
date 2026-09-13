"""Signalyze Score: weighted mean of unusualness over available signals. Twin of ``score.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import WEIGHTS_FILE
from signalyze_api.engine.mathutil import round_half_up
from signalyze_api.models import SIGNAL_IDS, SignalId, SignalResult

WEIGHTS: dict[SignalId, float] = {
    signal_id: WEIGHTS_FILE.weights[signal_id] for signal_id in SIGNAL_IDS
}
WEIGHTS_VERSION: str = WEIGHTS_FILE.version


def compute_score(signals: Sequence[SignalResult]) -> int | None:
    """0-100 weighted mean over available signals, weights renormalised over that subset.

    Returns None when no signal is available.
    """
    weight_sum = 0.0
    weighted = 0.0
    for signal_id in SIGNAL_IDS:
        s = next((x for x in signals if x.id == signal_id), None)
        if s is None or not s.available:
            continue
        w = WEIGHTS[signal_id]
        weight_sum += w
        weighted += w * s.unusualness
    if weight_sum == 0:
        return None
    return round_half_up((100 * weighted) / weight_sum)
