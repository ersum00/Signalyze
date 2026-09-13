/**
 * Text helpers. Line-for-line twin: apps/api/signalyze_api/engine/text.py.
 * All lengths are counted in Unicode code points so both runtimes agree.
 */
import languages from '../data/languages.json';
import stopwords from '../data/stopwords.json';

/**
 * Languages with a phrase dictionary and a tone lexicon, in the order of
 * data/languages.json (which is also the tie order of the stopword vote).
 */
export const ENGINE_LANGUAGES = [
  'en',
  'es',
  'pt',
  'fr',
  'de',
  'it',
  'tr',
  'nl',
  'pl',
  'id',
  'vi',
  'sv',
  'ru',
  'uk',
  'ar',
  'ja',
  'zh',
  'ko',
] as const;
export type EngineLanguage = (typeof ENGINE_LANGUAGES)[number];
/** Detection result: a dictionary language, or 'other' when no dictionary applies. */
export type DetectedLanguage = EngineLanguage | 'other';
export type Script = 'latin' | 'cyrillic' | 'arabic' | 'japanese' | 'han' | 'hangul';
/** 'word': space tokens and word-boundary phrases; 'substring': plain substrings (no word separators). */
export type MatchMode = 'word' | 'substring';

export interface LanguageEntry {
  code: EngineLanguage;
  script: Script;
  matchMode: MatchMode;
}

const SCRIPTS: readonly Script[] = ['latin', 'cyrillic', 'arabic', 'japanese', 'han', 'hangul'];
const MATCH_MODES: readonly MatchMode[] = ['word', 'substring'];

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** The language table of data/languages.json, validated once at load. */
export const LANGUAGE_TABLE: readonly LanguageEntry[] = languages.languages.map((entry) => {
  const { code, script, matchMode } = entry;
  if (
    !isOneOf(ENGINE_LANGUAGES, code) ||
    !isOneOf(SCRIPTS, script) ||
    !isOneOf(MATCH_MODES, matchMode)
  ) {
    throw new Error(`languages.json: unknown entry ${JSON.stringify(entry)}`);
  }
  return { code, script, matchMode };
});

/** Builds a table with one value per engine language. */
export function perLanguage<T>(build: (lang: EngineLanguage) => T): Record<EngineLanguage, T> {
  const out: Partial<Record<EngineLanguage, T>> = {};
  for (const lang of ENGINE_LANGUAGES) out[lang] = build(lang);
  return out as Record<EngineLanguage, T>;
}

/** How phrases and lexicon entries are matched per language (from languages.json). */
export const MATCH_MODE: Record<EngineLanguage, MatchMode> = perLanguage((lang) => {
  const entry = LANGUAGE_TABLE.find((e) => e.code === lang);
  if (entry === undefined) throw new Error(`languages.json has no entry for ${lang}`);
  return entry.matchMode;
});

function languagesOfScript(script: Script): readonly EngineLanguage[] {
  const codes = LANGUAGE_TABLE.filter((e) => e.script === script).map((e) => e.code);
  if (codes.length === 0) throw new Error(`languages.json has no ${script} language`);
  return codes;
}

/** Candidates of the stopword vote per script, in tie order; the first is the default. */
const LATIN_LANGUAGES = languagesOfScript('latin');
const CYRILLIC_LANGUAGES = languagesOfScript('cyrillic');

const STOPWORDS: Record<EngineLanguage, readonly string[]> = stopwords;

/** token -> languages whose stopword list contains it (ENGINE_LANGUAGES order), for an O(tokens) vote. */
const STOPWORD_LANGUAGES: ReadonlyMap<string, readonly EngineLanguage[]> = (() => {
  const map = new Map<string, EngineLanguage[]>();
  for (const lang of ENGINE_LANGUAGES) {
    for (const word of STOPWORDS[lang]) {
      const list = map.get(word);
      if (list === undefined) map.set(word, [lang]);
      else list.push(lang);
    }
  }
  return map;
})();

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

type ScriptBucket = 'kana' | 'hangul' | 'han' | 'arabic' | 'cyrillic' | 'latin' | 'other';

/**
 * Script bucket of one code point of normalised text, or null for characters
 * that carry no script (space, ASCII digits). The ranges are Unicode blocks;
 * the Python twin lists exactly the same ranges.
 */
function scriptOf(cp: number): ScriptBucket | null {
  if (cp <= 0x7f) return cp >= 0x61 && cp <= 0x7a ? 'latin' : null;
  if (
    (cp >= 0xc0 && cp <= 0x24f) ||
    (cp >= 0x1e00 && cp <= 0x1eff) ||
    (cp >= 0x2c60 && cp <= 0x2c7f) ||
    (cp >= 0xa720 && cp <= 0xa7ff)
  ) {
    return 'latin';
  }
  if (cp >= 0x400 && cp <= 0x52f) return 'cyrillic';
  if (
    (cp >= 0x600 && cp <= 0x6ff) ||
    (cp >= 0x750 && cp <= 0x77f) ||
    (cp >= 0x8a0 && cp <= 0x8ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfefe)
  ) {
    return 'arabic';
  }
  if (
    (cp >= 0x3040 && cp <= 0x30ff) ||
    (cp >= 0x31f0 && cp <= 0x31ff) ||
    (cp >= 0xff66 && cp <= 0xff9f)
  ) {
    return 'kana';
  }
  if (
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x3130 && cp <= 0x318f) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7ff)
  ) {
    return 'hangul';
  }
  if (
    (cp >= 0x3005 && cp <= 0x3007) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x20000 && cp <= 0x3134f)
  ) {
    return 'han';
  }
  return 'other';
}

/** Most stopword hits among `candidates`; ties resolve to the earlier candidate, no hits to the first. */
function stopwordVote(
  tokens: readonly string[],
  candidates: readonly EngineLanguage[],
): EngineLanguage {
  const hits = new Map<EngineLanguage, number>();
  for (const t of tokens) {
    const langs = STOPWORD_LANGUAGES.get(t);
    if (langs === undefined) continue;
    for (const lang of langs) hits.set(lang, (hits.get(lang) ?? 0) + 1);
  }
  let best = candidates[0]!;
  let bestHits = 0;
  for (const lang of candidates) {
    const h = hits.get(lang) ?? 0;
    if (h > bestHits) {
      bestHits = h;
      best = lang;
    }
  }
  return best;
}

/**
 * Language of a normalised text. The script of its letters decides first:
 * any kana → ja, any Hangul → ko, any Han → zh, any Arabic letter → ar.
 * Cyrillic and Latin texts vote with the stopword lists of the languages of
 * that script (most hits wins, ties in languages.json order, the script's
 * first language when nothing matches: ru and en). Texts whose letters are
 * mostly of another script, or that have no letters, are 'other'.
 */
export function detectLanguage(normalized: string): DetectedLanguage {
  const counts: Record<ScriptBucket, number> = {
    kana: 0,
    hangul: 0,
    han: 0,
    arabic: 0,
    cyrillic: 0,
    latin: 0,
    other: 0,
  };
  for (const ch of normalized) {
    const bucket = scriptOf(ch.codePointAt(0)!);
    if (bucket !== null) counts[bucket] += 1;
  }
  if (counts.kana > 0) return 'ja';
  if (counts.hangul > 0) return 'ko';
  if (counts.han > 0) return 'zh';
  if (counts.arabic > 0) return 'ar';
  if (counts.cyrillic > 0) return stopwordVote(tokenize(normalized), CYRILLIC_LANGUAGES);
  if (counts.latin > 0 && counts.latin >= counts.other) {
    return stopwordVote(tokenize(normalized), LATIN_LANGUAGES);
  }
  return 'other';
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

/** Phrase test on normalised text: whole words in 'word' mode, plain substring in 'substring' mode. */
export function matchesPhrase(normalized: string, phrase: string, mode: MatchMode): boolean {
  return mode === 'word' ? containsPhrase(normalized, phrase) : normalized.includes(phrase);
}
