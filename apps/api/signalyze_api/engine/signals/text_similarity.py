"""Twin of ``signals/text-similarity.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.data_files import THRESHOLDS
from signalyze_api.engine.mathutil import ramp, round6
from signalyze_api.engine.prepare import PreparedReview, ngrams_of
from signalyze_api.engine.text import jaccard, utf16_length
from signalyze_api.engine.types import unavailable
from signalyze_api.models import SignalResult

T = THRESHOLDS.text_similarity


def text_similarity(reviews: Sequence[PreparedReview]) -> SignalResult:
    """Mean pairwise Jaccard similarity of character 3-gram sets plus the share of pairs > 0.5.

    Eligibility uses the reference's ``normalizedText.length`` (UTF-16 units). Pairs are
    visited in index order (i < j) so the running sum is reproducible across runtimes.
    value = mean Jaccard.
    """
    eligible = [r for r in reviews if utf16_length(r.normalized_text) >= T.minTextChars]
    if len(eligible) < T.minEligible:
        return unavailable(
            "text_similarity", {"eligible": len(eligible), "minEligible": T.minEligible}
        )
    grams = [ngrams_of(r, T.ngramSize) for r in eligible]
    total = 0.0
    pairs = 0
    high_pairs = 0
    max_pair = 0.0
    count = len(grams)
    for i in range(count):
        left = grams[i]
        for j in range(i + 1, count):
            s = jaccard(left, grams[j])
            total += s
            pairs += 1
            if s > T.pairThreshold:
                high_pairs += 1
            if s > max_pair:
                max_pair = s
    mean_jaccard = total / pairs
    high_pair_share = high_pairs / pairs
    unusualness = max(
        ramp(mean_jaccard, T.meanLow, T.meanHigh),
        ramp(high_pair_share, T.pairShareLow, T.pairShareHigh),
    )
    return SignalResult(
        id="text_similarity",
        unusualness=round6(unusualness),
        value=round6(mean_jaccard),
        details={
            "meanJaccard": round6(mean_jaccard),
            "highPairShare": round6(high_pair_share),
            "highPairs": high_pairs,
            "pairs": pairs,
            "maxPair": round6(max_pair),
            "eligible": len(eligible),
        },
        available=True,
    )
