import type { SignalResult } from '@signalyze/shared';
import phrases from '../../data/template-phrases.json';
import thresholds from '../../data/thresholds.json';
import { ramp, round6 } from '../math';
import type { PreparedReview } from '../prepare';
import {
  codePointLength,
  MATCH_MODE,
  matchesPhrase,
  normalizeText,
  perLanguage,
  type EngineLanguage,
} from '../text';
import { unavailable } from '../types';

const T = thresholds.template_phrases;

const PHRASES: Record<EngineLanguage, string[]> = perLanguage((lang) =>
  phrases[lang].map(normalizeText),
);

/**
 * A review is "phrase-based" when stock phrases from its language's dictionary
 * cover at least half of its normalised text. value = share of phrase-based
 * reviews among reviews with text. Texts whose language is 'other' have no
 * dictionary: they count in withText but are never phrase-based.
 */
export function templatePhrases(reviews: readonly PreparedReview[]): SignalResult {
  const withText = reviews.filter((r) => r.normalizedText !== '');
  if (withText.length < T.minWithText) {
    return unavailable('template_phrases', {
      withText: withText.length,
      minWithText: T.minWithText,
    });
  }
  const phraseCounts = new Map<string, number>();
  let phraseBased = 0;
  let anyHit = 0;
  for (const r of withText) {
    const textLen = codePointLength(r.normalizedText);
    let covered = 0;
    let hit = false;
    if (r.language !== 'other') {
      const mode = MATCH_MODE[r.language];
      for (const phrase of PHRASES[r.language]) {
        if (matchesPhrase(r.normalizedText, phrase, mode)) {
          hit = true;
          covered += codePointLength(phrase);
          phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
        }
      }
    }
    if (hit) anyHit += 1;
    if (hit && Math.min(covered, textLen) / textLen >= T.coverageThreshold) phraseBased += 1;
  }
  const share = phraseBased / withText.length;
  const top = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 3)
    .map(([p, c]) => `${p} (${c})`)
    .join('; ');
  return {
    id: 'template_phrases',
    unusualness: round6(ramp(share, T.low, T.high)),
    value: round6(share),
    details: {
      share: round6(share),
      phraseBased,
      withText: withText.length,
      anyPhraseShare: round6(anyHit / withText.length),
      topPhrases: top,
    },
    available: true,
  };
}
