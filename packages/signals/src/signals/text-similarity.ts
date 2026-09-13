import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import { ngramsOf, type PreparedReview } from '../prepare';
import { jaccard } from '../text';
import { unavailable } from '../types';

const T = thresholds.text_similarity;

/**
 * Mean pairwise Jaccard similarity of character 3-gram sets over reviews with
 * at least 20 characters of normalised text, plus the share of pairs above 0.5.
 * value = mean Jaccard. Pairs are visited in index order (i < j) so sums are
 * reproducible across runtimes.
 */
export function textSimilarity(reviews: readonly PreparedReview[]): SignalResult {
  const eligible = reviews.filter((r) => r.normalizedText.length >= T.minTextChars);
  if (eligible.length < T.minEligible) {
    return unavailable('text_similarity', {
      eligible: eligible.length,
      minEligible: T.minEligible,
    });
  }
  const grams = eligible.map((r) => ngramsOf(r, T.ngramSize));
  let total = 0;
  let pairs = 0;
  let highPairs = 0;
  let maxPair = 0;
  for (let i = 0; i < grams.length; i += 1) {
    for (let j = i + 1; j < grams.length; j += 1) {
      const s = jaccard(grams[i]!, grams[j]!);
      total += s;
      pairs += 1;
      if (s > T.pairThreshold) highPairs += 1;
      if (s > maxPair) maxPair = s;
    }
  }
  const meanJaccard = total / pairs;
  const highPairShare = highPairs / pairs;
  const unusualness = Math.max(
    ramp(meanJaccard, T.meanLow, T.meanHigh),
    ramp(highPairShare, T.pairShareLow, T.pairShareHigh),
  );
  return {
    id: 'text_similarity',
    unusualness: round6(unusualness),
    value: round6(meanJaccard),
    details: {
      meanJaccard: round6(meanJaccard),
      highPairShare: round6(highPairShare),
      highPairs,
      pairs,
      maxPair: round6(maxPair),
      eligible: eligible.length,
    },
    available: true,
  };
}
