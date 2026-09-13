import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { entropyBits, monthsBetweenInclusive, ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import { unavailable } from '../types';

const T = thresholds.date_entropy;

/**
 * Normalised Shannon entropy of the per-month review counts over the span from
 * the first to the last review month. value = normalised entropy (1 = even).
 * Unusualness grows as the distribution concentrates (1 - entropy).
 */
export function dateEntropy(reviews: readonly PreparedReview[]): SignalResult {
  const counts = new Map<string, number>();
  let first = '';
  let last = '';
  for (const r of reviews) {
    counts.set(r.month, (counts.get(r.month) ?? 0) + 1);
    if (first === '' || r.month < first) first = r.month;
    if (last === '' || r.month > last) last = r.month;
  }
  const monthsInSpan = monthsBetweenInclusive(first, last);
  if (monthsInSpan < T.minMonths) {
    return unavailable('date_entropy', { monthsInSpan, minMonths: T.minMonths });
  }
  const values = [...counts.values()];
  const h = entropyBits(values);
  const normalized = h / Math.log2(monthsInSpan);
  let busiest = '';
  let busiestCount = 0;
  for (const [month, c] of [...counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (c > busiestCount) {
      busiest = month;
      busiestCount = c;
    }
  }
  return {
    id: 'date_entropy',
    unusualness: round6(ramp(1 - normalized, T.low, T.high)),
    value: round6(normalized),
    details: {
      normalizedEntropy: round6(normalized),
      monthsInSpan,
      activeMonths: counts.size,
      busiestMonth: busiest,
      busiestMonthShare: round6(busiestCount / reviews.length),
    },
    available: true,
  };
}
