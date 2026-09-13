import type { SignalId } from '@signalyze/shared';
import type { SignalFn } from '../types';
import { burstRatio } from './burst-ratio';
import { dateEntropy } from './date-entropy';
import { localGuideRatio } from './local-guide-ratio';
import { noPhotoShortText } from './no-photo-short-text';
import { ownerResponsePattern } from './owner-response-pattern';
import { ratingPolarity } from './rating-polarity';
import { ratingTextMismatch } from './rating-text-mismatch';
import { singleReviewAccounts } from './single-review-accounts';
import { templatePhrases } from './template-phrases';
import { textSimilarity } from './text-similarity';

/** Evaluation order is the canonical SIGNAL_IDS order. */
export const SIGNAL_FUNCTIONS: Record<SignalId, SignalFn> = {
  burst_ratio: burstRatio,
  rating_polarity: ratingPolarity,
  single_review_accounts: singleReviewAccounts,
  no_photo_short_text: noPhotoShortText,
  text_similarity: textSimilarity,
  template_phrases: templatePhrases,
  rating_text_mismatch: ratingTextMismatch,
  date_entropy: dateEntropy,
  local_guide_ratio: localGuideRatio,
  owner_response_pattern: ownerResponsePattern,
};

export {
  burstRatio,
  dateEntropy,
  localGuideRatio,
  noPhotoShortText,
  ownerResponsePattern,
  ratingPolarity,
  ratingTextMismatch,
  singleReviewAccounts,
  templatePhrases,
  textSimilarity,
};
