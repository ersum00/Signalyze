import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { clamp01, ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';

const T = thresholds.burst_ratio;

/**
 * Share of reviews inside the busiest 14-day window, compared with the share a
 * perfectly even flow would put there (window / lifespan). value = peak share.
 */
export function burstRatio(reviews: readonly PreparedReview[]): SignalResult {
  const days = reviews.map((r) => r.day).sort((a, b) => a - b);
  const n = days.length;
  const first = days[0]!;
  const last = days[n - 1]!;
  const lifespanDays = last - first + 1;

  let peak = 0;
  let peakStart = first;
  let lo = 0;
  for (let hi = 0; hi < n; hi += 1) {
    while (days[hi]! - days[lo]! >= T.windowDays) lo += 1;
    const count = hi - lo + 1;
    if (count > peak) {
      peak = count;
      peakStart = days[lo]!;
    }
  }
  const peakShare = peak / n;
  const expectedShare = lifespanDays <= T.windowDays ? 1 : T.windowDays / lifespanDays;
  const excess =
    expectedShare >= 1 ? 0 : clamp01((peakShare - expectedShare) / (1 - expectedShare));
  const unusualness = ramp(excess, T.excessLow, T.excessHigh);

  return {
    id: 'burst_ratio',
    unusualness: round6(unusualness),
    value: round6(peakShare),
    details: {
      peakShare: round6(peakShare),
      peakCount: peak,
      peakWindowStart: isoFromDay(peakStart),
      peakWindowEnd: isoFromDay(peakStart + T.windowDays - 1),
      lifespanDays,
      expectedShare: round6(expectedShare),
      excess: round6(excess),
      windowDays: T.windowDays,
    },
    available: true,
  };
}

function isoFromDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
