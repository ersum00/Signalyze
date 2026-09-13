import type { SignalResult } from '@signalyze/shared';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';

const T = thresholds.no_photo_short_text;

/** Share of reviews with no photo and fewer than 40 characters of text. */
export function noPhotoShortText(reviews: readonly PreparedReview[]): SignalResult {
  const n = reviews.length;
  let count = 0;
  let noText = 0;
  for (const r of reviews) {
    if (r.review.photoCount === 0 && r.textLength < T.shortTextChars) count += 1;
    if (r.textLength === 0) noText += 1;
  }
  const share = count / n;
  return {
    id: 'no_photo_short_text',
    unusualness: round6(ramp(share, T.low, T.high)),
    value: round6(share),
    details: { share: round6(share), count, noTextCount: noText, shortTextChars: T.shortTextChars },
    available: true,
  };
}
