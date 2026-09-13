import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';

const T = thresholds.rating_polarity;

/** Share of 1-star and 5-star ratings among all ratings (U-shaped distributions score high). */
export function ratingPolarity(reviews: readonly PreparedReview[]): SignalResult {
  const n = reviews.length;
  let five = 0;
  let one = 0;
  for (const r of reviews) {
    if (r.review.rating === 5) five += 1;
    else if (r.review.rating === 1) one += 1;
  }
  const share = (five + one) / n;
  return {
    id: 'rating_polarity',
    unusualness: round6(ramp(share, T.low, T.high)),
    value: round6(share),
    details: {
      share5: round6(five / n),
      share1: round6(one / n),
      shareMid: round6((n - five - one) / n),
    },
    available: true,
  };
}
