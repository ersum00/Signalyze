import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import { unavailable } from '../types';

const T = thresholds.single_review_accounts;

/** Share of reviewers whose public review count is 0 or 1, among reviewers with a known count. */
export function singleReviewAccounts(reviews: readonly PreparedReview[]): SignalResult {
  let known = 0;
  let singles = 0;
  for (const r of reviews) {
    const c = r.review.reviewerReviewCount;
    if (c === null) continue;
    known += 1;
    if (c <= 1) singles += 1;
  }
  if (known < T.minKnown) {
    return unavailable('single_review_accounts', { known, minKnown: T.minKnown });
  }
  const share = singles / known;
  return {
    id: 'single_review_accounts',
    unusualness: round6(ramp(share, T.low, T.high)),
    value: round6(share),
    details: { share: round6(share), known, singles },
    available: true,
  };
}
