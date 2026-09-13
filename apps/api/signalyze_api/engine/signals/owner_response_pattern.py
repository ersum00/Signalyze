"""Twin of ``signals/owner-response-pattern.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.owner_response_pattern


def owner_response_pattern(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Among reviews with an owner response, how identical the responses are.

    identicalShare = 1 - distinct / responded. value = identicalShare.
    """
    responses: list[str] = []
    for r in reviews:
        if r.normalized_owner_response is not None and r.normalized_owner_response != "":
            responses.append(r.normalized_owner_response)
    responded = len(responses)
    response_rate = responded / len(reviews)
    if responded < T.minResponded:
        return unavailable(
            "owner_response_pattern",
            {
                "responded": responded,
                "responseRate": round6(response_rate),
                "minResponded": T.minResponded,
            },
        )
    groups: dict[str, int] = {}
    for text in responses:
        groups[text] = groups.get(text, 0) + 1
    largest = 0
    for c in groups.values():
        if c > largest:
            largest = c
    identical_share = 1 - len(groups) / responded
    return SignalResult(
        id="owner_response_pattern",
        unusualness=round6(ramp(identical_share, T.low, T.high)),
        value=round6(identical_share),
        details={
            "identicalShare": round6(identical_share),
            "responded": responded,
            "responseRate": round6(response_rate),
            "distinctResponses": len(groups),
            "largestGroupShare": round6(largest / responded),
        },
        available=True,
    )
