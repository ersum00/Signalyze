import type { SignalResult } from '@signalyze/shared';
import lexicon from '../../data/sentiment-lexicon.json';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import {
  codePointLength,
  MATCH_MODE,
  normalizeText,
  perLanguage,
  type DetectedLanguage,
  type EngineLanguage,
} from '../text';
import { unavailable } from '../types';

const T = thresholds.rating_text_mismatch;

interface Lexicon {
  positive: Set<string>;
  negative: Set<string>;
  /** Substring mode: every entry with its polarity, longest first (stable on file order). */
  ordered: readonly { entry: string; positive: boolean }[];
}

const LEXICON: Record<EngineLanguage, Lexicon> = perLanguage((lang) => {
  const positive = lexicon[lang].positive.map(normalizeText).filter((w) => w !== '');
  const negative = lexicon[lang].negative.map(normalizeText).filter((w) => w !== '');
  const ordered = [
    ...positive.map((entry) => ({ entry, positive: true })),
    ...negative.map((entry) => ({ entry, positive: false })),
  ].sort((a, b) => codePointLength(b.entry) - codePointLength(a.entry));
  return { positive: new Set(positive), negative: new Set(negative), ordered };
});

/**
 * tone in [-1, 1] from lexicon hits, or null when no lexicon word occurs.
 * Word mode counts the tokens found in the lexicon. Substring mode (ja, zh)
 * counts the lexicon entries found in the text, longest first, each once;
 * a matched entry is removed before shorter entries are tried, so a negated
 * form such as 不好吃 is not also counted as 好吃. 'other' has no lexicon.
 */
export function toneOf(
  normalized: string,
  tokens: readonly string[],
  language: DetectedLanguage,
): number | null {
  if (language === 'other') return null;
  const lex = LEXICON[language];
  let pos = 0;
  let neg = 0;
  if (MATCH_MODE[language] === 'word') {
    for (const t of tokens) {
      if (lex.positive.has(t)) pos += 1;
      else if (lex.negative.has(t)) neg += 1;
    }
  } else {
    let text = normalized;
    for (const { entry, positive } of lex.ordered) {
      if (!text.includes(entry)) continue;
      if (positive) pos += 1;
      else neg += 1;
      text = text.replaceAll(entry, ' ');
    }
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
    const tone = toneOf(r.normalizedText, r.tokens, r.language);
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
