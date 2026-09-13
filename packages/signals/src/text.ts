/**
 * Text helpers. Line-for-line twin: apps/signalyze_api/engine/text.py.
 * All lengths are counted in Unicode code points so both runtimes agree.
 */
import stopwords from '../data/stopwords.json';

export type EngineLanguage = 'en' | 'tr' | 'de' | 'es';
export const ENGINE_LANGUAGES: readonly EngineLanguage[] = ['en', 'tr', 'de', 'es'];

const STOPWORDS: Record<EngineLanguage, Set<string>> = {
  en: new Set(stopwords.en),
  tr: new Set(stopwords.tr),
  de: new Set(stopwords.de),
  es: new Set(stopwords.es),
};

/**
 * NFKC, lower-case, keep letters/digits/whitespace, collapse whitespace, trim.
 * Python twin: unicodedata.normalize('NFKC', s).lower(); re.sub(r'[^\w\s]|_', ' '); re.sub(r'\s+', ' ').strip()
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function codePointLength(text: string): number {
  let n = 0;
  for (const _ of text) n += 1;
  return n;
}

export function tokenize(normalized: string): string[] {
  if (normalized === '') return [];
  return normalized.split(' ');
}

/** Picks the language whose stopwords occur most often; ties resolve in ENGINE_LANGUAGES order (en first). */
export function detectLanguage(tokens: readonly string[]): EngineLanguage {
  let best: EngineLanguage = 'en';
  let bestHits = 0;
  for (const lang of ENGINE_LANGUAGES) {
    let hits = 0;
    const set = STOPWORDS[lang];
    for (const t of tokens) if (set.has(t)) hits += 1;
    if (hits > bestHits) {
      bestHits = hits;
      best = lang;
    }
  }
  return best;
}

/** Character n-gram set over code points (spaces included). */
export function charNgrams(normalized: string, n: number): Set<string> {
  const chars = Array.from(normalized);
  const grams = new Set<string>();
  for (let i = 0; i + n <= chars.length; i += 1) {
    grams.add(chars.slice(i, i + n).join(''));
  }
  return grams;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const g of small) if (large.has(g)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Whole-word substring test on normalised text. */
export function containsPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}
