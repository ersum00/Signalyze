"""Monthly counts, rating distribution and reviewer summary. Twin of ``aggregates.ts``."""

from __future__ import annotations

from collections.abc import Sequence

from signalyze_api.engine.mathutil import add_months, median, months_between_inclusive, round6
from signalyze_api.engine.prepare import PreparedReview
from signalyze_api.models import MonthlyCount, RatingDistribution, ReviewerProfileSummary


def monthly_counts(reviews: Sequence[PreparedReview]) -> list[MonthlyCount]:
    """Review counts per calendar month from the first to the last month, gaps filled with 0."""
    if len(reviews) == 0:
        return []
    counts: dict[str, int] = {}
    first = ""
    last = ""
    for r in reviews:
        counts[r.month] = counts.get(r.month, 0) + 1
        if first == "" or r.month < first:
            first = r.month
        if last == "" or r.month > last:
            last = r.month
    span = months_between_inclusive(first, last)
    out: list[MonthlyCount] = []
    for i in range(span):
        month = add_months(first, i)
        out.append(MonthlyCount(month=month, count=counts.get(month, 0)))
    return out


def rating_distribution(reviews: Sequence[PreparedReview]) -> RatingDistribution:
    d: dict[str, int] = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for r in reviews:
        d[str(r.review.rating)] += 1
    return RatingDistribution.model_validate(d)


def reviewer_profile(reviews: Sequence[PreparedReview]) -> ReviewerProfileSummary:
    known: list[int] = []
    singles = 0
    level_exposed = 0
    local_guides = 0
    with_photos = 0
    for r in reviews:
        c = r.review.reviewerReviewCount
        if c is not None:
            known.append(c)
            if c <= 1:
                singles += 1
        if r.review.localGuideLevel is not None:
            level_exposed += 1
            if r.review.localGuideLevel >= 1:
                local_guides += 1
        if r.review.photoCount > 0:
            with_photos += 1
    n = len(reviews)
    return ReviewerProfileSummary(
        singleReviewShare=round6(singles / len(known)) if len(known) > 0 else None,
        medianReviewCount=round6(median(known)) if len(known) > 0 else None,
        localGuideShare=round6(local_guides / n) if level_exposed > 0 else None,
        withPhotosShare=round6(with_photos / n) if n > 0 else 0.0,
    )
