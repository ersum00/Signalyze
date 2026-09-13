import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import { unavailable } from '../types';

const T = thresholds.owner_response_pattern;

/**
 * Among reviews with an owner response, how identical the responses are:
 * identicalShare = 1 - distinct / responded. value = identicalShare.
 */
export function ownerResponsePattern(reviews: readonly PreparedReview[]): SignalResult {
  const responses: string[] = [];
  for (const r of reviews) {
    if (r.normalizedOwnerResponse !== null && r.normalizedOwnerResponse !== '') {
      responses.push(r.normalizedOwnerResponse);
    }
  }
  const responded = responses.length;
  const responseRate = responded / reviews.length;
  if (responded < T.minResponded) {
    return unavailable('owner_response_pattern', {
      responded,
      responseRate: round6(responseRate),
      minResponded: T.minResponded,
    });
  }
  const groups = new Map<string, number>();
  for (const text of responses) groups.set(text, (groups.get(text) ?? 0) + 1);
  let largest = 0;
  for (const c of groups.values()) if (c > largest) largest = c;
  const identicalShare = 1 - groups.size / responded;
  return {
    id: 'owner_response_pattern',
    unusualness: round6(ramp(identicalShare, T.low, T.high)),
    value: round6(identicalShare),
    details: {
      identicalShare: round6(identicalShare),
      responded,
      responseRate: round6(responseRate),
      distinctResponses: groups.size,
      largestGroupShare: round6(largest / responded),
    },
    available: true,
  };
}
