/**
 * Canonical list of signals. Names, descriptions and "why it matters" texts
 * live in the extension's i18n files keyed by these ids; this file only holds
 * machine-facing metadata.
 */
export const SIGNAL_IDS = [
  'burst_ratio',
  'rating_polarity',
  'single_review_accounts',
  'no_photo_short_text',
  'text_similarity',
  'template_phrases',
  'rating_text_mismatch',
  'date_entropy',
  'local_guide_ratio',
  'owner_response_pattern',
] as const;

export type SignalId = (typeof SIGNAL_IDS)[number];

export interface SignalDefinition {
  id: SignalId;
  /** How the raw `value` field should be rendered. */
  valueFormat: 'ratio' | 'score' | 'count';
  /** Minimum reviews for this individual signal to be meaningful. */
  minReviews: number;
}

export const SIGNAL_DEFINITIONS: Record<SignalId, SignalDefinition> = {
  burst_ratio: { id: 'burst_ratio', valueFormat: 'ratio', minReviews: 15 },
  rating_polarity: { id: 'rating_polarity', valueFormat: 'ratio', minReviews: 15 },
  single_review_accounts: { id: 'single_review_accounts', valueFormat: 'ratio', minReviews: 15 },
  no_photo_short_text: { id: 'no_photo_short_text', valueFormat: 'ratio', minReviews: 15 },
  text_similarity: { id: 'text_similarity', valueFormat: 'ratio', minReviews: 15 },
  template_phrases: { id: 'template_phrases', valueFormat: 'ratio', minReviews: 15 },
  rating_text_mismatch: { id: 'rating_text_mismatch', valueFormat: 'ratio', minReviews: 15 },
  date_entropy: { id: 'date_entropy', valueFormat: 'score', minReviews: 15 },
  local_guide_ratio: { id: 'local_guide_ratio', valueFormat: 'ratio', minReviews: 15 },
  owner_response_pattern: { id: 'owner_response_pattern', valueFormat: 'ratio', minReviews: 15 },
};

export function isSignalId(value: string): value is SignalId {
  return (SIGNAL_IDS as readonly string[]).includes(value);
}
