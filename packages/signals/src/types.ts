import type { SignalId, SignalResult } from '@signalyze/shared';
import type { PreparedReview } from './prepare';

export type SignalFn = (reviews: readonly PreparedReview[]) => SignalResult;

export function unavailable(id: SignalId, details: SignalResult['details'] = {}): SignalResult {
  return { id, unusualness: 0, value: 0, details, available: false };
}
