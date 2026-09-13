import type { MonthlyCount, RatingDistribution, ReviewerProfileSummary } from '@signalyze/shared';
import { addMonths, median, monthsBetweenInclusive, round6 } from './math';
import type { PreparedReview } from './prepare';

/** Review counts per calendar month from the first to the last month, gaps filled with 0. */
export function monthlyCounts(reviews: readonly PreparedReview[]): MonthlyCount[] {
  if (reviews.length === 0) return [];
  const counts = new Map<string, number>();
  let first = '';
  let last = '';
  for (const r of reviews) {
    counts.set(r.month, (counts.get(r.month) ?? 0) + 1);
    if (first === '' || r.month < first) first = r.month;
    if (last === '' || r.month > last) last = r.month;
  }
  const span = monthsBetweenInclusive(first, last);
  const out: MonthlyCount[] = [];
  for (let i = 0; i < span; i += 1) {
    const month = addMonths(first, i);
    out.push({ month, count: counts.get(month) ?? 0 });
  }
  return out;
}

export function ratingDistribution(reviews: readonly PreparedReview[]): RatingDistribution {
  const d: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const rating = r.review.rating as 1 | 2 | 3 | 4 | 5;
    d[rating] += 1;
  }
  return d;
}

export function reviewerProfile(reviews: readonly PreparedReview[]): ReviewerProfileSummary {
  const known: number[] = [];
  let singles = 0;
  let levelExposed = 0;
  let localGuides = 0;
  let withPhotos = 0;
  for (const r of reviews) {
    const c = r.review.reviewerReviewCount;
    if (c !== null) {
      known.push(c);
      if (c <= 1) singles += 1;
    }
    if (r.review.localGuideLevel !== null) {
      levelExposed += 1;
      if (r.review.localGuideLevel >= 1) localGuides += 1;
    }
    if (r.review.photoCount > 0) withPhotos += 1;
  }
  const n = reviews.length;
  return {
    singleReviewShare: known.length > 0 ? round6(singles / known.length) : null,
    medianReviewCount: known.length > 0 ? round6(median(known)) : null,
    localGuideShare: levelExposed > 0 ? round6(localGuides / n) : null,
    withPhotosShare: n > 0 ? round6(withPhotos / n) : 0,
  };
}
