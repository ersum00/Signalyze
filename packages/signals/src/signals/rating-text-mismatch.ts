import type { SignalResult } from '@signalyze/shared';
import lexicon from '../../data/sentiment-lexicon.json';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import { normalizeText, type EngineLanguage } from '../text';
import { unavailable } from '../types';

const T = thresholds.rating_text_mismatch;

const LEXICON: Record<EngineLanguage, { positive: Set<string>; negative: Set<string> }> = {
  en: sets(lexicon.en),
  tr: sets(lexicon.tr),
  de: sets(lexicon.de),
  es: sets(lexicon.es),
};

function sets(entry: { positive: string[]; negative: string[] }) {
  return {
    positive: new Set(entry.positive.map(normalizeText)),
    negative: new Set(entry.negative.map(normalizeText)),
  };
}

/** tone in [-1, 1] from lexicon hits, or null when no lexicon word occurs. */
export function toneOf(tokens: readonly string[], language: EngineLanguage): number | null {
  const lex = LEXICON[language];
  let pos = 0;
  let neg = 0;
  for (const t of tokens) {
    if (lex.positive.has(t)) pos += 1;
    else if (lex.negative.has(t)) neg += 1;
  }
  if (pos + neg === 0) return null;
  return (pos - neg) / (pos + neg);
}

/**
 * Share of reviews whose text tone disagrees with the star rating: rating >= 4
 * with tone <= -0.5, or rating <= 2 with tone >= 0.5. Reviews without lexicon
 * hits are not scored.
 */
export function ratingTextMismatch(reviews: readonly PreparedReview[]): SignalResult {
  let scored = 0;
  let mismatches = 0;
  for (const r of reviews) {
    const tone = toneOf(r.tokens, r.language);
    if (tone === null) continue;
    scored += 1;
    const rating = r.review.rating;
    if ((rating >= 4 && tone <= -T.toneThreshold) || (rating <= 2 && tone >= T.toneThreshold)) {
      mismatches += 1;
    }
  }
  if (scored < T.minScored) {
    return unavailable('rating_text_mismatch', { scored, minScored: T.minScored });
  }
  const share = mismatches / scored;
  return {
    id: 'rating_text_mismatch',
    unusualness: round6(ramp(share, T.low, T.high)),
    value: round6(share),
    details: { share: round6(share), scored, mismatches },
    available: true,
  };
}
