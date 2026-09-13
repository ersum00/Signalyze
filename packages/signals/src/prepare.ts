import type { Review } from '@signalyze/shared';
import { dayNumber, monthKey } from './math';
import {
  charNgrams,
  codePointLength,
  detectLanguage,
  normalizeText,
  tokenize,
  type DetectedLanguage,
} from './text';

/** A review plus the derived fields every signal needs. Computed once. */
export interface PreparedReview {
  review: Review;
  day: number;
  month: string;
  normalizedText: string;
  textLength: number;
  tokens: string[];
  /** Dictionary language of the text, or 'other' when no dictionary applies. */
  language: DetectedLanguage;
  normalizedOwnerResponse: string | null;
}

export function prepareReviews(reviews: readonly Review[]): PreparedReview[] {
  return reviews.map((review) => {
    const normalizedText = normalizeText(review.text);
    return {
      review,
      day: dayNumber(review.date),
      month: monthKey(review.date),
      normalizedText,
      textLength: codePointLength(review.text.trim()),
      tokens: tokenize(normalizedText),
      language: detectLanguage(normalizedText),
      normalizedOwnerResponse:
        review.ownerResponse !== null && review.ownerResponse.trim() !== ''
          ? normalizeText(review.ownerResponse)
          : null,
    };
  });
}

export function ngramsOf(prepared: PreparedReview, n: number): Set<string> {
  return charNgrams(prepared.normalizedText, n);
}
