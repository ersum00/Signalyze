import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import { unavailable } from '../types';

const T = thresholds.local_guide_ratio;

/**
 * Share of reviews written by reviewers with Local Guide level >= 3. A low
 * share is the unusual direction. Only available when the page exposed a level
 * for at least one reviewer; otherwise nothing can be said.
 */
export function localGuideRatio(reviews: readonly PreparedReview[]): SignalResult {
  let exposed = 0;
  let established = 0;
  for (const r of reviews) {
    const level = r.review.localGuideLevel;
    if (level === null) continue;
    exposed += 1;
    if (level >= T.establishedLevel) established += 1;
  }
  if (exposed === 0) {
    return unavailable('local_guide_ratio', { levelExposed: false });
  }
  const share = established / reviews.length;
  // ramp on the shortfall below shareHigh: share 0 -> 1, share >= shareHigh -> 0
  const shortfall = T.shareHigh - share;
  return {
    id: 'local_guide_ratio',
    unusualness: round6(ramp(shortfall, T.shareLow, T.shareHigh)),
    value: round6(share),
    details: {
      share: round6(share),
      established,
      exposed,
      establishedLevel: T.establishedLevel,
    },
    available: true,
  };
}
