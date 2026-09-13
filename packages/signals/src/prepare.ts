import type { Review } from '@signalyze/shared';
import { dayNumber, monthKey } from './math';
import {
  charNgrams,
  codePointLength,
  detectLanguage,
  normalizeText,
  tokenize,
  type EngineLanguage,
} from './text';

/** A review plus the derived fields every signal needs. Computed once. */
export interface PreparedReview {
  review: Review;
  day: number;
  month: string;
  normalizedText: string;
  textLength: number;
  tokens: string[];
  language: EngineLanguage;
  normalizedOwnerResponse: string | null;
}

export function prepareReviews(reviews: readonly Review[]): PreparedReview[] {
  return reviews.map((review) => {
    const normalizedText = normalizeText(review.text);
    const tokens = tokenize(normalizedText);
    return {
      review,
      day: dayNumber(review.date),
      month: monthKey(review.date),
      normalizedText,
      textLength: codePointLength(review.text.trim()),
      tokens,
      language: detectLanguage(tokens),
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
